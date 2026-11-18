//! Art Institute of Chicago connector (keyword search, no key).
//!
//! - Search: `GET https://api.artic.edu/api/v1/artworks/search?q=&limit=&page=&fields=`
//!   filtered to `is_public_domain = true`, so every result is CC0 (ADR-0008).
//! - Images via IIIF: `{iiif}/{image_id}/full/843,/0/default.jpg` (AIC's
//!   recommended size) and `/full/1686,/0/` for public-domain works.
//! - Published limit: 60 requests/min (`x-ratelimit-limit: 60`, observed
//!   2026-11-16). AIC asks clients to send an `AIC-User-Agent` header.
//! - Results are relevance-ordered, not by `updated_at` → `PageOrdering::Relevance`.

use std::sync::Arc;

use serde_json::Value;

use super::http::HttpClient;
use super::{
    encode_query, search_collection, Connector, DownloadRequest, Page, PageOrdering, RemoteItem,
    SourcePolicy,
};
use crate::config::TopicSource;
use crate::model::{Block, BlockKind, Collection, LicenseInfo, MediaRef, SourceRef};
use crate::{Error, Result, USER_AGENT_PRODUCT};

pub const ID: &str = "aic";
pub const API_BASE: &str = "https://api.artic.edu/api/v1";
pub const IIIF_BASE: &str = "https://www.artic.edu/iiif/2";
pub const PAGE_SIZE: u32 = 100;
const FIELDS: &str =
    "id,title,image_id,artist_display,date_display,is_public_domain,updated_at,thumbnail";

pub struct AicConnector {
    http: Arc<dyn HttpClient>,
}

impl AicConnector {
    pub fn new(http: Arc<dyn HttpClient>) -> Self {
        Self { http }
    }

    pub fn search_url(query: &str, page: u32) -> String {
        format!(
            "{API_BASE}/artworks/search?q={}&limit={PAGE_SIZE}&page={page}&fields={FIELDS}\
             &query%5Bterm%5D%5Bis_public_domain%5D=true",
            encode_query(query)
        )
    }
}

impl Connector for AicConnector {
    fn id(&self) -> &'static str {
        ID
    }

    fn policy(&self) -> SourcePolicy {
        SourcePolicy {
            requests_per_minute: 48, // 80% of the published 60/min
            min_interval_ms: 500,
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
        search_collection(ID, "Art Institute of Chicago", target)
    }

    fn fetch_page(&mut self, target: &TopicSource, cursor: Option<&str>) -> Result<Page> {
        let query = target.query.as_deref().ok_or_else(|| Error::Connector {
            connector: ID.into(),
            message: "needs a `query` or topic `keywords`".into(),
        })?;
        let page: u32 = cursor.and_then(|c| c.parse().ok()).unwrap_or(1);
        let url = Self::search_url(query, page);
        let resp = self
            .http
            .get(&url, &[("AIC-User-Agent", USER_AGENT_PRODUCT)])?;
        let v = super::json_or_error(ID, &url, resp)?;
        parse_search_page(&v)
    }
}

pub fn parse_search_page(v: &Value) -> Result<Page> {
    let data = v["data"].as_array().ok_or_else(|| Error::Connector {
        connector: ID.into(),
        message: "search response missing `data` array".into(),
    })?;
    let iiif = v["config"]["iiif_url"].as_str().unwrap_or(IIIF_BASE);
    let items = data.iter().filter_map(|a| map_artwork(a, iiif)).collect();
    let current = v["pagination"]["current_page"].as_u64().unwrap_or(1);
    let total = v["pagination"]["total_pages"].as_u64().unwrap_or(1);
    let next = (current < total).then(|| (current + 1).to_string());
    Ok(Page { items, next })
}

fn map_artwork(a: &Value, iiif: &str) -> Option<RemoteItem> {
    if a["is_public_domain"].as_bool() != Some(true) {
        return None; // belt and braces: the query already filters these
    }
    let id = a["id"].as_u64()?.to_string();
    let image_id = a["image_id"].as_str()?;
    let (w, h) = (
        a["thumbnail"]["width"].as_u64(),
        a["thumbnail"]["height"].as_u64(),
    );
    let scaled = |target: u64| -> (Option<u32>, Option<u32>) {
        match (w, h) {
            (Some(w), Some(h)) if w > 0 => (
                u32::try_from(target).ok(),
                u32::try_from(h * target / w).ok(),
            ),
            _ => (u32::try_from(target).ok(), None),
        }
    };
    let iiif_url = |width: u32| format!("{iiif}/{image_id}/full/{width},/0/default.jpg");
    let (mw, mh) = scaled(843);
    let (lw, lh) = scaled(1686);
    let media = vec![
        MediaRef {
            role: "large".into(),
            url: iiif_url(1686),
            width: lw,
            height: lh,
        },
        MediaRef {
            role: "medium".into(),
            url: iiif_url(843),
            width: mw,
            height: mh,
        },
        // Largest size AIC serves publicly; used by Save.
        MediaRef {
            role: "original".into(),
            url: iiif_url(1686),
            width: lw,
            height: lh,
        },
    ];
    let creator = a["artist_display"]
        .as_str()
        .and_then(|s| s.lines().next())
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    let block = Block {
        id: None,
        source: SourceRef {
            connector: ID.into(),
            remote_id: id.clone(),
            page_url: Some(format!("https://www.artic.edu/artworks/{id}")),
            origin_url: None,
        },
        kind: BlockKind::Image,
        title: a["title"].as_str().map(str::to_string),
        description: a["date_display"].as_str().map(str::to_string),
        content: None,
        tags: Vec::new(),
        license: LicenseInfo {
            license_id: Some("CC0-1.0".into()),
            attribution_text: Some(match &creator {
                Some(c) => format!("{c} · Art Institute of Chicago (CC0)"),
                None => "Art Institute of Chicago (CC0)".into(),
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
        downloads: vec![DownloadRequest {
            url: iiif_url(1686),
            role: "original".into(),
            ext_hint: Some("jpg".into()),
            expected_size: None,
        }],
        position: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE: &str = include_str!("../../tests/fixtures/aic_search_page1.json");

    #[test]
    fn maps_real_search_response() {
        let v: Value = serde_json::from_str(FIXTURE).unwrap();
        let page = parse_search_page(&v).unwrap();
        assert_eq!(page.items.len(), 2);
        assert_eq!(page.next.as_deref(), Some("2"));
        let chair = &page.items[1].block;
        assert_eq!(chair.title.as_deref(), Some("Rocking Chair"));
        assert_eq!(chair.license.license_id.as_deref(), Some("CC0-1.0"));
        assert_eq!(
            chair.license.creator.as_deref(),
            Some("Made by Jacob And Josef Kohn")
        );
        assert_eq!(
            chair.source.page_url.as_deref(),
            Some("https://www.artic.edu/artworks/33053")
        );
        let large = &chair.media[0];
        assert_eq!(large.role, "large");
        assert_eq!(
            large.url,
            "https://www.artic.edu/iiif/2/2a491673-72e1-34a9-8e2a-b45a6e0da51f/full/1686,/0/default.jpg"
        );
        assert_eq!((large.width, large.height), (Some(1686), Some(1805)));
    }

    #[test]
    fn search_url_encodes_query_and_filters_public_domain() {
        let url = AicConnector::search_url("wrought iron", 2);
        assert!(url.contains("q=wrought%20iron"));
        assert!(url.contains("page=2"));
        assert!(url.contains("is_public_domain%5D=true"));
    }
}
