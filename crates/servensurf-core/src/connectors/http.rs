//! Minimal HTTP abstraction. Connectors and the downloader talk to this
//! trait, never to an HTTP library directly, so tests can replay recorded
//! fixtures and inject 429/5xx without a network.
//!
//! The production implementation (blocking client on worker threads, see
//! ADR-0003) lands in the next milestone.

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
