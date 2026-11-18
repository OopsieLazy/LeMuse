//! Minimal HTTP abstraction. Connectors and the downloader talk to this
//! trait, never to an HTTP library directly, so tests can replay recorded
//! fixtures and inject 429/5xx without a network.
//!
//! [`UreqClient`] is the production implementation (blocking, on worker
//! threads; ADR-0003).

use std::collections::BTreeMap;

use crate::Result;

#[derive(Debug, Clone, Default)]
pub struct HttpResponse {
    pub status: u16,
    /// Lower-cased header names.
    pub headers: BTreeMap<String, String>,
    pub body: Vec<u8>,
}

impl HttpResponse {
    pub fn header(&self, name: &str) -> Option<&str> {
        self.headers
            .get(&name.to_ascii_lowercase())
            .map(String::as_str)
    }
}

pub trait HttpClient: Send + Sync {
    /// GET `url`. `headers` are added on top of the client's defaults
    /// (User-Agent, Authorization). Non-2xx statuses are returned, not
    /// turned into errors — the caller decides about retries.
    fn get(&self, url: &str, headers: &[(&str, &str)]) -> Result<HttpResponse>;
}

/// Test double: answers from a URL → response map and records requests.
#[derive(Default)]
pub struct FixtureClient {
    pub responses: std::sync::Mutex<BTreeMap<String, Vec<HttpResponse>>>,
    pub requests: std::sync::Mutex<Vec<String>>,
}

impl FixtureClient {
    /// Queue a response for `url`. Multiple responses for the same URL are
    /// served in order (e.g. a 429 followed by a 200).
    pub fn push(&self, url: &str, status: u16, body: impl Into<Vec<u8>>) {
        self.responses
            .lock()
            .unwrap()
            .entry(url.to_string())
            .or_default()
            .push(HttpResponse {
                status,
                headers: BTreeMap::new(),
                body: body.into(),
            });
    }
}

impl HttpClient for FixtureClient {
    fn get(&self, url: &str, _headers: &[(&str, &str)]) -> Result<HttpResponse> {
        self.requests.lock().unwrap().push(url.to_string());
        let mut map = self.responses.lock().unwrap();
        match map.get_mut(url) {
            Some(queue) if !queue.is_empty() => Ok(queue.remove(0)),
            _ => Ok(HttpResponse {
                status: 404,
                ..Default::default()
            }),
        }
    }
}

/// Largest response body we accept (an original image can be big; API pages
/// are small). Protects against a misbehaving server filling memory.
const MAX_BODY_BYTES: u64 = 64 * 1024 * 1024;

/// The User-Agent every request sends: `ServeNSurf/<ver> (+<contact>)`.
/// Are.na refuses generic agents (ADR-0004). `contact` comes from
/// `sync.contact`; without it we still identify the product.
pub fn user_agent(contact: Option<&str>) -> String {
    match contact.map(str::trim).filter(|c| !c.is_empty()) {
        Some(c) => format!("{} (+{c})", crate::USER_AGENT_PRODUCT),
        None => format!("{} (personal reference viewer)", crate::USER_AGENT_PRODUCT),
    }
}

/// Production client: blocking `ureq` over rustls, run on a worker thread
/// (ADR-0003). Non-2xx statuses come back as responses so the engine's retry
/// logic sees 429/`Retry-After`.
pub struct UreqClient {
    agent: ureq::Agent,
    user_agent: String,
    /// Are.na personal token (from Credential Manager, M1+). Sent only to
    /// api.are.na, never to CDNs or other sources.
    arena_token: Option<String>,
}

impl UreqClient {
    pub fn new(user_agent: String, arena_token: Option<String>) -> Self {
        let agent = ureq::AgentBuilder::new()
            .timeout_connect(std::time::Duration::from_secs(15))
            .timeout_read(std::time::Duration::from_secs(60))
            .redirects(5)
            .build();
        Self {
            agent,
            user_agent,
            arena_token,
        }
    }
}

impl HttpClient for UreqClient {
    fn get(&self, url: &str, headers: &[(&str, &str)]) -> Result<HttpResponse> {
        let mut req = self
            .agent
            .get(url)
            .set("User-Agent", &self.user_agent)
            .set("Accept", "application/json, image/*;q=0.9, */*;q=0.5");
        if let Some(token) = &self.arena_token {
            if url.starts_with("https://api.are.na/") {
                req = req.set("Authorization", &format!("Bearer {token}"));
            }
        }
        for (k, v) in headers {
            req = req.set(k, v);
        }
        let resp = match req.call() {
            Ok(r) => r,
            Err(ureq::Error::Status(_, r)) => r,
            Err(ureq::Error::Transport(t)) => {
                return Err(crate::Error::Connector {
                    connector: "http".into(),
                    message: format!("{url}: {t}"),
                })
            }
        };
        let status = resp.status();
        let mut out_headers = BTreeMap::new();
        for name in resp.headers_names() {
            if let Some(v) = resp.header(&name) {
                out_headers.insert(name.to_ascii_lowercase(), v.to_string());
            }
        }
        let mut body = Vec::new();
        use std::io::Read;
        resp.into_reader()
            .take(MAX_BODY_BYTES + 1)
            .read_to_end(&mut body)
            .map_err(|e| crate::Error::Connector {
                connector: "http".into(),
                message: format!("{url}: reading body: {e}"),
            })?;
        // Never hand back a silently truncated file (review 0003 D-22).
        if body.len() as u64 > MAX_BODY_BYTES {
            return Err(crate::Error::Connector {
                connector: "http".into(),
                message: format!("{url}: response larger than {MAX_BODY_BYTES} bytes"),
            });
        }
        Ok(HttpResponse {
            status,
            headers: out_headers,
            body,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn user_agent_names_product_and_contact() {
        assert_eq!(
            user_agent(Some(" https://example.invalid/me ")),
            format!(
                "{} (+https://example.invalid/me)",
                crate::USER_AGENT_PRODUCT
            )
        );
        assert!(user_agent(None).starts_with("ServeNSurf/"));
        assert!(user_agent(Some("  ")).contains("personal reference viewer"));
    }
}
