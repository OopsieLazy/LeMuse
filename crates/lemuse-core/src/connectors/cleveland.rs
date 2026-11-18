//! Cleveland Museum of Art Open Access connector (keyword search, no key).
//!
//! - Search: `GET https://openaccess-api.clevelandart.org/api/artworks/?q=&has_image=1&cc0=1&limit=&skip=`.
//!   `cc0=1` means every result is CC0 (ADR-0008).
//! - Images: `images.web` (~1000 px JPEG) for display; `images.print`
//!   (~3400 px JPEG) for Save. `images.full` is a TIFF of tens to hundreds of
//!   MB and is never used.
//! - No published rate limit, so we budget conservatively (30/min).
//! - Results are relevance-ordered → `PageOrdering::Relevance`.

use std::sync::Arc;

use serde_json::Value;

use super::http::HttpClient;
use super::{
    encode_query, search_collection, Connector, DownloadRequest, Page, PageOrdering, RemoteItem,
    SourcePolicy,
};
use crate::config::TopicSource;
use crate::model::{Block, BlockKind, Collection, LicenseInfo, MediaRef, SourceRef};
use crate::{Error, Result};

pub const ID: &str = "cleveland";
pub const API_BASE: &str = "https://openaccess-api.clevelandart.org/api";
pub const PAGE_SIZE: u32 = 100;

pub struct ClevelandConnector {
    http: Arc<dyn HttpClient>,
}

impl ClevelandConnector {
    pub fn new(http: Arc<dyn HttpClient>) -> Self {
        Self { http }
    }

    pub fn search_url(query: &str, skip: u64) -> String {
        format!(
            "{API_BASE}/artworks/?q={}&has_image=1&cc0=1&limit={PAGE_SIZE}&skip={skip}",
            encode_query(query)
        )
    }
}

impl Connector for ClevelandConnector {
    fn id(&self) -> &'static str {
        ID
    }

    fn policy(&self) -> SourcePolicy {
        SourcePolicy {
            requests_per_minute: 30,
            min_interval_ms: 1000,
            background_sync_allowed: true,
            attribution_required: true,
            max_pages: Some(1),
            min_refresh_hours: 24 * 7,
        }
    }

    fn ordering(&self) -> PageOrdering {
        PageOrdering::Relevance
    }

    fn resolve_collection(&mut self, target: &TopicSource) -> Result<Collection> {
        search_collection(ID, "Cleveland Museum of Art", target)
    }

    fn fetch_page(&mut self, target: &TopicSource, cursor: Option<&str>) -> Result<Page> {
        let query = target.query.as_deref().ok_or_else(|| Error::Connector {
            connector: ID.into(),
            message: "needs a `query` or topic `keywords`".into(),
        })?;
        let skip: u64 = cursor.and_then(|c| c.parse().ok()).unwrap_or(0);
        let url = Self::search_url(query, skip);
        let resp = self.http.get(&url, &[])?;
        let v = super::json_or_error(ID, &url, resp)?;
        parse_search_page(&v, skip)
    }
}

pub fn parse_search_page(v: &Value, skip: u64) -> Result<Page> {
    let data = v["data"].as_array().ok_or_else(|| Error::Connector {
        connector: ID.into(),
        message: "search response missing `data` array".into(),
    })?;
    let items = data.iter().filter_map(map_artwork).collect();
    let total = v["info"]["total"].as_u64().unwrap_or(0);
    let seen = skip + data.len() as u64;
    let next = (!data.is_empty() && seen < total).then(|| seen.to_string());
    Ok(Page { items, next })
}

/// Cleveland returns image dimensions as strings ("1019").
fn dim(v: &Value) -> Option<u32> {
    v.as_str()
        .and_then(|s| s.parse().ok())
        .or_else(|| v.as_u64().and_then(|n| u32::try_from(n).ok()))
}

fn map_artwork(a: &Value) -> Option<RemoteItem> {
    if a["share_license_status"].as_str() != Some("CC0") {
        return None;
    }
    let id = a["id"].as_u64()?.to_string();
    let web = &a["images"]["web"];
    let web_url = web["url"].as_str()?;
    let print = &a["images"]["print"];

    let mut media = vec![MediaRef {
        role: "medium".into(),
        url: web_url.to_string(),
        width: dim(&web["width"]),
        height: dim(&web["height"]),
    }];
    let mut downloads = Vec::new();
    if let Some(print_url) = print["url"].as_str() {
        media.push(MediaRef {
            role: "original".into(),
            url: print_url.to_string(),
            width: dim(&print["width"]),
            height: dim(&print["height"]),
        });
        downloads.push(DownloadRequest {
            url: print_url.to_string(),
            role: "original".into(),
            ext_hint: Some("jpg".into()),
            expected_size: print["filesize"]
                .as_str()
                .and_then(|s| s.parse().ok())
                .or_else(|| print["filesize"].as_u64()),
        });
    }

    let creator = a["creators"]
        .as_array()
        .and_then(|cs| cs.first())
        .and_then(|c| c["description"].as_str())
        .or_else(|| {
            a["culture"]
                .as_array()
                .and_then(|c| c.first())
                .and_then(Value::as_str)
        })
        .map(str::to_string);

    let block = Block {
        id: None,
        source: SourceRef {
            connector: ID.into(),
            remote_id: id,
            page_url: a["url"].as_str().map(str::to_string),
            origin_url: None,
        },
        kind: BlockKind::Image,
        title: a["title"].as_str().map(str::to_string),
        description: a["creation_date"].as_str().map(str::to_string),
        content: a["type"].as_str().map(str::to_string),
        tags: Vec::new(),
        license: LicenseInfo {
            license_id: Some("CC0-1.0".into()),
            attribution_text: Some(match &creator {
                Some(c) => format!("{c} · Cleveland Museum of Art (CC0)"),
                None => "Cleveland Museum of Art (CC0)".into(),
            }),
            creator,
            non_commercial: false,
            no_ai: false,
        },
        media,
        files: Vec::new(),
        remote_updated_at: a["updated_at"].as_str().map(str::to_string),
    };
    Some(RemoteItem {
        block,
        downloads,
        position: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE: &str = include_str!("../../tests/fixtures/cleveland_search_page1.json");

    #[test]
    fn maps_real_search_response() {
        let v: Value = serde_json::from_str(FIXTURE).unwrap();
        let page = parse_search_page(&v, 0).unwrap();
        assert_eq!(page.items.len(), 2);
        assert_eq!(page.next.as_deref(), Some("2")); // fixture total = 3
        let b = &page.items[0].block;
        assert_eq!(b.title.as_deref(), Some("Part of a chair"));
        assert_eq!(b.license.license_id.as_deref(), Some("CC0-1.0"));
        assert_eq!(
            b.source.page_url.as_deref(),
            Some("https://clevelandart.org/art/1929.323")
        );
        assert_eq!(b.media[0].role, "medium");
        assert!(b.media[0].url.ends_with("_web.jpg"));
        assert_eq!(
            (b.media[0].width, b.media[0].height),
            (Some(1019), Some(893))
        );
        assert!(page.items[0].downloads[0].url.ends_with("_print.jpg"));
        assert_eq!(page.items[0].downloads[0].expected_size, Some(4_397_507));
    }

    #[test]
    fn last_page_has_no_next() {
        let v: Value = serde_json::from_str(FIXTURE).unwrap();
        assert_eq!(parse_search_page(&v, 1).unwrap().next, None); // 1 + 2 = 3 = total
    }

    #[test]
    fn search_url_encodes_query_and_requires_cc0() {
        let url = ClevelandConnector::search_url("chess set", 100);
        assert!(url.contains("q=chess%20set"));
        assert!(url.contains("cc0=1"));
        assert!(url.contains("skip=100"));
    }
}
