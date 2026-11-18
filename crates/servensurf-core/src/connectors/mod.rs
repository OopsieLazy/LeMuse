//! Source connectors. Each source (Are.na, The Met, Poly Haven...) is one
//! adapter that turns remote pages into source-agnostic [`Block`]s plus a
//! list of files to download. The sync engine owns throttling, retries,
//! storage and dedup — connectors only describe and map. See ADR-0003.

pub mod arena;
pub mod http;

use crate::config::TopicSource;
use crate::model::{Block, Collection};
use crate::Result;

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

/// One page of results, newest-updated first.
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

    /// Resolve a gather target (channel slug / query) into a collection.
    fn resolve_collection(&mut self, target: &TopicSource) -> Result<Collection>;

    /// Fetch one page for a target. Pages MUST be ordered by remote
    /// `updated_at` descending so the engine can stop at its watermark.
    fn fetch_page(&mut self, target: &TopicSource, cursor: Option<&str>) -> Result<Page>;
}
