//! Are.na connector (API v3, `https://api.are.na/v3`).
//!
//! Facts this relies on (see `reports/Arena reference gatherer architecture.md`):
//! - Channel contents: `GET /v3/channels/{id|slug}/contents?page=&per=&sort=`,
//!   `per` max 100, `sort=updated_at_desc` enables watermark-based sync.
//! - Response shape `{ data: [...], meta: { has_more_pages, next_page, ... } }`.
//! - Block `type`: Text | Image | Link | Attachment | Embed | PendingBlock.
//! - Originals: `image.src` (unsigned CloudFront). Resized variants are
//!   re-encoded at q75 — never store those as the original.
//! - Read limits/min: guest 30, free 120, premium 300, supporter 600.
//! - A descriptive `AppName/version (+contact)` User-Agent is mandatory;
//!   generic UAs get a Cloudflare 403.
//! - API terms forbid systematic/mass downloading: only user-chosen channels,
//!   incremental, throttled (ADR-0004).

use std::sync::Arc;

use serde_json::Value;

use super::http::HttpClient;
use super::{Connector, DownloadRequest, Page, RemoteItem, SourcePolicy};
use crate::config::TopicSource;
use crate::model::{Block, BlockKind, Collection, LicenseInfo, MediaRef, SourceRef};
use crate::{Error, Result};

pub const ID: &str = "arena";
pub const API_BASE: &str = "https://api.are.na/v3";
pub const PAGE_SIZE: u32 = 100;

/// Account tier, from the `X-RateLimit-Tier` header or the user's setting.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tier {
    Guest,
    Free,
    Premium,
    Supporter,
}

impl Tier {
    /// Published read limit per minute.
    pub fn read_limit_per_min(self) -> u32 {
        match self {
            Tier::Guest => 30,
            Tier::Free => 120,
            Tier::Premium => 300,
            Tier::Supporter => 600,
        }
    }

    /// What we actually budget: 80% of the published limit (headroom for
    /// the user browsing Are.na at the same time — the limit is per account).
    pub fn budget_per_min(self) -> u32 {
        self.read_limit_per_min() * 4 / 5
    }
}

pub struct ArenaConnector {
    http: Arc<dyn HttpClient>,
    tier: Tier,
}

impl ArenaConnector {
    pub fn new(http: Arc<dyn HttpClient>, tier: Tier) -> Self {
        Self { http, tier }
    }

    fn channel_key(target: &TopicSource) -> Result<&str> {
        target.channel.as_deref().ok_or_else(|| Error::Connector {
            connector: ID.into(),
            message: "gather target needs `channel` (slug or id)".into(),
        })
    }

    fn get_json(&self, url: &str) -> Result<Value> {
        let resp = self.http.get(url, &[("Accept", "application/json")])?;
        match resp.status {
            200..=299 => serde_json::from_slice(&resp.body).map_err(|e| Error::Connector {
                connector: ID.into(),
                message: format!("bad JSON from {url}: {e}"),
            }),
            429 => {
                let retry = serde_json::from_slice::<Value>(&resp.body)
                    .ok()
                    .and_then(|v| v["error"]["retry_after"].as_u64())
                    .or_else(|| resp.header("retry-after").and_then(|s| s.parse().ok()))
                    .unwrap_or(60);
                Err(Error::RateLimited {
                    connector: ID.into(),
                    retry_after_secs: retry,
                })
            }
            s => Err(Error::Connector {
                connector: ID.into(),
                message: format!("HTTP {s} from {url}"),
            }),
        }
    }
}

impl Connector for ArenaConnector {
    fn id(&self) -> &'static str {
        ID
    }

    fn policy(&self) -> SourcePolicy {
        SourcePolicy {
            requests_per_minute: self.tier.budget_per_min(),
            min_interval_ms: 500,
            background_sync_allowed: true,
            attribution_required: true,
        }
    }

    fn resolve_collection(&mut self, target: &TopicSource) -> Result<Collection> {
        let key = Self::channel_key(target)?;
        let v = self.get_json(&format!("{API_BASE}/channels/{key}"))?;
        let title = target
            .collection
            .clone()
            .or_else(|| v["title"].as_str().map(str::to_string))
            .unwrap_or_else(|| key.to_string());
        Ok(Collection {
            id: None,
            connector: ID.into(),
            remote_key: key.to_string(),
            title,
        })
    }

    fn fetch_page(&mut self, target: &TopicSource, cursor: Option<&str>) -> Result<Page> {
        let key = Self::channel_key(target)?;
        let page_no = cursor.unwrap_or("1");
        let url = format!(
            "{API_BASE}/channels/{key}/contents?page={page_no}&per={PAGE_SIZE}&sort=updated_at_desc"
        );
        let v = self.get_json(&url)?;
        parse_contents_page(&v)
    }
}

/// Map a `/channels/{id}/contents` response. Pure; tested with fixtures.
pub fn parse_contents_page(v: &Value) -> Result<Page> {
    let data = v["data"].as_array().ok_or_else(|| Error::Connector {
        connector: ID.into(),
        message: "contents response missing `data` array".into(),
    })?;
    let items = data.iter().filter_map(map_block).collect();
    let next = if v["meta"]["has_more_pages"].as_bool().unwrap_or(false) {
        v["meta"]["next_page"].as_u64().map(|n| n.to_string())
    } else {
        None
    };
    Ok(Page { items, next })
}

/// Map one v3 block. Returns `None` for things we don't store: nested
/// channels, and blocks not yet `available` (retried on a later run).
pub fn map_block(v: &Value) -> Option<RemoteItem> {
    let kind = match v["type"].as_str()? {
        "Image" => BlockKind::Image,
        "Text" => BlockKind::Text,
        "Link" => BlockKind::Link,
        "Attachment" => BlockKind::Attachment,
        "Embed" => BlockKind::Embed,
        _ => return None, // Channel, PendingBlock, unknown future types
    };
    if v["state"].as_str().is_some_and(|s| s != "available") {
        return None;
    }
    let id = v["id"].as_u64()?.to_string();

    let mut downloads = Vec::new();
    if let Some(att) = v["attachment"].as_object() {
        if let Some(url) = att.get("url").and_then(Value::as_str) {
            downloads.push(DownloadRequest {
                url: url.to_string(),
                role: "original".into(),
                ext_hint: att
                    .get("file_extension")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                expected_size: att.get("file_size").and_then(Value::as_u64),
            });
        }
    }
    if let Some(img) = v["image"].as_object() {
        if let Some(src) = img.get("src").and_then(Value::as_str) {
            let role = if kind == BlockKind::Image {
                "original"
            } else {
                "preview"
            };
            downloads.push(DownloadRequest {
                url: src.to_string(),
                role: role.into(),
                ext_hint: img
                    .get("filename")
                    .and_then(Value::as_str)
                    .and_then(|f| f.rsplit_once('.'))
                    .map(|(_, e)| e.to_string()),
                expected_size: img.get("file_size").and_then(Value::as_u64),
            });
        }
    }

    let creator = v["user"]["name"]
        .as_str()
        .or_else(|| v["user"]["slug"].as_str())
        .map(str::to_string);

    let block = Block {
        id: None,
        source: SourceRef {
            connector: ID.into(),
            remote_id: id.clone(),
            page_url: Some(format!("https://www.are.na/block/{id}")),
            origin_url: v["source"]["url"].as_str().map(str::to_string),
        },
        kind,
        title: v["title"]
            .as_str()
            .filter(|s| !s.is_empty())
            .map(str::to_string),
        description: markdown_plain(&v["description"]),
        content: markdown_plain(&v["content"]),
        tags: Vec::new(),
        license: LicenseInfo {
            // Are.na grants no reuse rights; content belongs to its creators.
            license_id: None,
            attribution_text: creator.as_ref().map(|c| format!("Saved to Are.na by {c}")),
            creator,
            non_commercial: false,
            no_ai: false,
        },
        media: map_media(v),
        files: Vec::new(),
        remote_updated_at: v["updated_at"].as_str().map(str::to_string),
    };

    Some(RemoteItem {
        block,
        downloads,
        position: v["connection"]["position"].as_i64(),
    })
}

/// Streamable media for the slideshow (ADR-0007). The `large`/`medium`/
/// `small` variants come from Are.na's `images.are.na` resizer (q75 webp/jpeg):
/// fine to *display*, never stored as the original.
fn map_media(v: &Value) -> Vec<MediaRef> {
    let dim = |x: &Value| x.as_u64().and_then(|n| u32::try_from(n).ok());
    let mut out = Vec::new();
    let img = &v["image"];
    if let Some(src) = img["src"].as_str() {
        out.push(MediaRef {
            role: "original".into(),
            url: src.to_string(),
            width: dim(&img["width"]),
            height: dim(&img["height"]),
        });
    }
    for role in ["large", "medium", "small"] {
        if let Some(src) = img[role]["src"].as_str() {
            out.push(MediaRef {
                role: role.into(),
                url: src.to_string(),
                width: dim(&img[role]["width"]),
                height: dim(&img[role]["height"]),
            });
        }
    }
    if let Some(url) = v["attachment"]["url"].as_str() {
        out.push(MediaRef {
            role: "attachment".into(),
            url: url.to_string(),
            width: None,
            height: None,
        });
    }
    out
}

/// v3 `MarkdownContent` is `{markdown, html, plain}`; v2 used plain strings.
fn markdown_plain(v: &Value) -> Option<String> {
    v["plain"]
        .as_str()
        .or_else(|| v.as_str())
        .filter(|s| !s.is_empty())
        .map(str::to_string)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::http::FixtureClient;

    const FIXTURE: &str = include_str!("../../tests/fixtures/arena_contents_page1.json");

    #[test]
    fn maps_fixture_page() {
        let v: Value = serde_json::from_str(FIXTURE).unwrap();
        let page = parse_contents_page(&v).unwrap();
        // fixture: image, attachment (STEP), text, nested channel, pending block
        assert_eq!(page.items.len(), 3);
        assert_eq!(page.next.as_deref(), Some("2"));

        let img = &page.items[0];
        assert_eq!(img.block.kind, BlockKind::Image);
        assert_eq!(img.downloads[0].role, "original");
        assert!(img.downloads[0].url.contains("cloudfront.net"));
        assert_eq!(img.downloads[0].ext_hint.as_deref(), Some("jpg"));

        let att = &page.items[1];
        assert_eq!(att.block.kind, BlockKind::Attachment);
        assert_eq!(att.downloads[0].ext_hint.as_deref(), Some("step"));
        assert_eq!(att.downloads[1].role, "preview");

        let text = &page.items[2];
        assert_eq!(
            text.block.content.as_deref(),
            Some("Hatch at 45 degrees for section cuts.")
        );
        assert!(text.downloads.is_empty());
        assert!(text.block.media.is_empty());
    }

    #[test]
    fn records_streamable_media() {
        let v: Value = serde_json::from_str(FIXTURE).unwrap();
        let page = parse_contents_page(&v).unwrap();
        let roles = |i: usize| -> Vec<String> {
            page.items[i]
                .block
                .media
                .iter()
                .map(|m| m.role.clone())
                .collect()
        };
        assert_eq!(roles(0), ["original", "large", "medium", "small"]);
        let large = &page.items[0].block.media[1];
        assert!(large.url.starts_with("https://images.are.na/"));
        assert_eq!((large.width, large.height), (Some(1800), Some(1076)));
        // Attachment: preview image (original only) + the file itself.
        assert_eq!(roles(1), ["original", "attachment"]);
    }

    #[test]
    fn rate_limit_is_surfaced_with_retry_after() {
        let http = Arc::new(FixtureClient::default());
        let url = format!(
            "{API_BASE}/channels/refs/contents?page=1&per={PAGE_SIZE}&sort=updated_at_desc"
        );
        http.push(
            &url,
            429,
            r#"{"error":{"type":"rate_limit_exceeded","retry_after":17}}"#,
        );
        let mut c = ArenaConnector::new(http, Tier::Free);
        let target = TopicSource {
            source: "arena".into(),
            channel: Some("refs".into()),
            query: None,
            collection: None,
        };
        let err = c.fetch_page(&target, None).unwrap_err();
        assert!(matches!(
            err,
            Error::RateLimited {
                retry_after_secs: 17,
                ..
            }
        ));
    }

    #[test]
    fn budget_leaves_headroom() {
        assert_eq!(Tier::Free.budget_per_min(), 96);
        assert!(Tier::Guest.budget_per_min() < Tier::Guest.read_limit_per_min());
    }
}
