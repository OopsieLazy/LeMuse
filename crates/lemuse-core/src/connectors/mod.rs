//! Source connectors. Each source (Are.na, Art Institute of Chicago,
//! Cleveland Museum of Art...) is one adapter that turns remote pages into
//! source-agnostic [`Block`]s with streamable media plus a list of files to
//! download on Save. The sync engine owns throttling, retries, storage and
//! dedup — connectors only describe and map. See ADR-0003 and ADR-0008.

pub mod aic;
pub mod arena;
pub mod cleveland;
pub mod http;

use std::sync::Arc;

use serde_json::Value;

use self::http::{HttpClient, HttpResponse};
use crate::config::TopicSource;
use crate::model::{Block, Collection};
use crate::{Error, Result};

/// Every source id the config may name. Kept in sync with [`all`].
pub const KNOWN_SOURCES: &[&str] = &[arena::ID, aic::ID, cleveland::ID];

/// Sources that can search by keyword on the owner's plan, so a topic's
/// `keywords` can feed them. Are.na search is Premium-only (ADR-0008).
pub const KEYWORD_SOURCES: &[&str] = &[aic::ID, cleveland::ID];

/// Build one instance of every connector.
pub fn all(http: Arc<dyn HttpClient>, arena_tier: arena::Tier) -> Vec<Box<dyn Connector>> {
    vec![
        Box::new(arena::ArenaConnector::new(http.clone(), arena_tier)),
        Box::new(aic::AicConnector::new(http.clone())),
        Box::new(cleveland::ClevelandConnector::new(http)),
    ]
}

/// How a source wants to be treated. Encodes ToS constraints as data so the
/// engine can enforce them uniformly (ADR-0004).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourcePolicy {
    /// Budget the engine throttles to (already below the published limit).
    pub requests_per_minute: u32,
    /// Minimum spacing between API calls (Are.na asks for 200–500 ms).
    pub min_interval_ms: u64,
    /// May this source be gathered unattended (on launch / on schedule)?
    /// `false` for Unsplash-style terms that require user-initiated saves.
    pub background_sync_allowed: bool,
    /// Must the UI show attribution next to each block?
    pub attribution_required: bool,
    /// Cap on pages per refresh, below `sync.pages_per_refresh` if set.
    pub max_pages: Option<u32>,
    /// Skip a collection refreshed less than this many hours ago. Museum
    /// search results barely change, so they refresh weekly, not per launch.
    pub min_refresh_hours: u32,
}

/// How a connector orders its pages. Watermark early-stop is only valid
/// for `UpdatedDesc`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PageOrdering {
    /// Newest `updated_at` first (Are.na channel contents).
    UpdatedDesc,
    /// Search relevance (museum keyword search).
    Relevance,
}

/// A file the engine should fetch for a block.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DownloadRequest {
    pub url: String,
    /// `"original"`, `"preview"`...
    pub role: String,
    /// Extension guess from the API (`file_extension`, filename suffix).
    pub ext_hint: Option<String>,
    /// Expected size in bytes when the API reports it (integrity check).
    pub expected_size: Option<u64>,
}

/// One remote item, mapped. `block.files` is empty; the engine fills it
/// after downloading `downloads`.
#[derive(Debug, Clone)]
pub struct RemoteItem {
    pub block: Block,
    pub downloads: Vec<DownloadRequest>,
    /// Position within the remote collection, when the source has one.
    pub position: Option<i64>,
}

/// One page of results, in the connector's [`PageOrdering`].
#[derive(Debug, Clone, Default)]
pub struct Page {
    pub items: Vec<RemoteItem>,
    /// Opaque cursor for the next page; `None` when exhausted.
    pub next: Option<String>,
}

/// A source adapter. Implementations must be deterministic given the same
/// HTTP responses, so they can be tested against recorded fixtures.
pub trait Connector: Send {
    /// Stable id used in config and in the catalog (`"arena"`).
    fn id(&self) -> &'static str;

    fn policy(&self) -> SourcePolicy;

    /// Page order. Defaults to newest-updated first.
    fn ordering(&self) -> PageOrdering {
        PageOrdering::UpdatedDesc
    }

    /// Resolve a topic source (channel slug / query) into a collection.
    fn resolve_collection(&mut self, target: &TopicSource) -> Result<Collection>;

    /// Fetch one page for a target, in [`Connector::ordering`] order.
    fn fetch_page(&mut self, target: &TopicSource, cursor: Option<&str>) -> Result<Page>;
}

/// Collection for a keyword search source: no network call needed.
pub fn search_collection(id: &str, label: &str, target: &TopicSource) -> Result<Collection> {
    let query = target.query.as_deref().ok_or_else(|| Error::Connector {
        connector: id.into(),
        message: "needs a `query` or topic `keywords`".into(),
    })?;
    Ok(Collection {
        id: None,
        connector: id.into(),
        remote_key: query.to_string(),
        title: target
            .collection
            .clone()
            .unwrap_or_else(|| format!("{label}: {query}")),
    })
}

/// Shared status handling: 2xx → JSON, 429 → `RateLimited` (honouring
/// `Retry-After` or a body `error.retry_after`), anything else → error.
pub fn json_or_error(connector: &str, url: &str, resp: HttpResponse) -> Result<Value> {
    match resp.status {
        200..=299 => serde_json::from_slice(&resp.body).map_err(|e| Error::Connector {
            connector: connector.into(),
            message: format!("bad JSON from {url}: {e}"),
        }),
        429 => {
            let retry = serde_json::from_slice::<Value>(&resp.body)
                .ok()
                .and_then(|v| v["error"]["retry_after"].as_u64())
                .or_else(|| resp.header("retry-after").and_then(|s| s.parse().ok()))
                .unwrap_or(60);
            Err(Error::RateLimited {
                connector: connector.into(),
                retry_after_secs: retry,
            })
        }
        s => Err(Error::Connector {
            connector: connector.into(),
            message: format!("HTTP {s} from {url}"),
        }),
    }
}

/// Percent-encode a query-string value (RFC 3986 unreserved chars kept).
pub fn encode_query(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encodes_query_values() {
        assert_eq!(encode_query("wrought iron"), "wrought%20iron");
        assert_eq!(encode_query("y2k&tech"), "y2k%26tech");
        assert_eq!(encode_query("café"), "caf%C3%A9");
    }

    #[test]
    fn registry_matches_known_sources() {
        let http: Arc<dyn HttpClient> = Arc::new(http::FixtureClient::default());
        let ids: Vec<_> = all(http, arena::Tier::Guest)
            .iter()
            .map(|c| c.id())
            .collect();
        assert_eq!(ids, KNOWN_SOURCES);
    }
}
