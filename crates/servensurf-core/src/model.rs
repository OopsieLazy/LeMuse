//! Source-agnostic local data model.
//!
//! A [`Block`] is the unit the user sees: one reference (image, CAD file,
//! link, note...) plus its provenance and licence. Every connector maps its
//! remote objects into this shape so the UI and search never care where a
//! block came from.

use serde::{Deserialize, Serialize};

/// What kind of reference a block holds. Mirrors Are.na v3 block types and
/// adds `Model3d` for CAD/3D sources (Poly Haven, Smithsonian 3D, ...).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BlockKind {
    Image,
    Text,
    Link,
    Attachment,
    Embed,
    Model3d,
}

impl BlockKind {
    pub fn as_str(self) -> &'static str {
        match self {
            BlockKind::Image => "image",
            BlockKind::Text => "text",
            BlockKind::Link => "link",
            BlockKind::Attachment => "attachment",
            BlockKind::Embed => "embed",
            BlockKind::Model3d => "model3d",
        }
    }
}

/// Where a block came from. `(connector, remote_id)` is the identity used
/// for idempotent upserts — re-syncing never duplicates a block.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceRef {
    /// Connector id, e.g. `"arena"`, `"met"`, `"polyhaven"`.
    pub connector: String,
    /// The remote object's id as a string (Are.na block id, Met objectID...).
    pub remote_id: String,
    /// Canonical page for the item on the source site.
    pub page_url: Option<String>,
    /// Original source the item was saved from (Are.na `source.url`).
    pub origin_url: Option<String>,
}

/// Licence and attribution, stored with every block. Many sources (Unsplash,
/// Pexels, Sketchfab, Wikimedia) make attribution a condition of use, and
/// Are.na content belongs to its creators — so this is not optional.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct LicenseInfo {
    /// SPDX-style id where known (`"CC0-1.0"`, `"CC-BY-4.0"`), else `None`
    /// meaning "unknown — all rights reserved; personal reference only".
    pub license_id: Option<String>,
    pub creator: Option<String>,
    pub attribution_text: Option<String>,
    pub non_commercial: bool,
    /// Creator opted out of AI use (Sketchfab NoAI flag and similar).
    pub no_ai: bool,
}

/// A file belonging to a block, stored in the content-addressed blob store.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StoredFile {
    /// Lower-case hex SHA-256 of the file bytes.
    pub sha256: String,
    /// Extension without dot, lower-case (`"jpg"`, `"step"`).
    pub ext: String,
    pub size_bytes: u64,
    /// `"original"`, `"thumb"`, `"snapshot"` (saved HTML for links)...
    pub role: String,
}

/// A remote image or file the UI can stream without saving it (ADR-0007).
/// Roles: `"original"` (full-resolution source), `"large"` (~1800 px),
/// `"medium"` (~1200 px), `"small"` (~400 px), `"attachment"` (e.g. a STEP
/// file). The slideshow displays `large` → `medium` → `original`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MediaRef {
    pub role: String,
    pub url: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

/// One local reference block.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Block {
    /// Local primary key (assigned by the catalog).
    pub id: Option<i64>,
    pub source: SourceRef,
    pub kind: BlockKind,
    pub title: Option<String>,
    pub description: Option<String>,
    /// Text body for text blocks / extracted page text for links.
    pub content: Option<String>,
    pub tags: Vec<String>,
    pub license: LicenseInfo,
    /// Streamable remote media (always recorded).
    pub media: Vec<MediaRef>,
    /// Locally saved files (only when the user saves, or in download mode).
    pub files: Vec<StoredFile>,
    /// Remote `updated_at` (RFC 3339) — drives incremental sync.
    pub remote_updated_at: Option<String>,
}

/// A remote grouping the user chose to gather (an Are.na channel, a museum
/// search query...). Becomes a local collection and a browsable folder.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Collection {
    pub id: Option<i64>,
    pub connector: String,
    /// Remote id or slug (`"industrial-design-refs"`).
    pub remote_key: String,
    pub title: String,
}
