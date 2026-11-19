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

/// Account tier, from `GET /v3/me` (ADR-0023); guest without a token.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "lowercase")]
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

    /// Are.na's own name for the tier (`UserTier` in the API).
    pub fn name(self) -> &'static str {
        match self {
            Tier::Guest => "guest",
            Tier::Free => "free",
            Tier::Premium => "premium",
            Tier::Supporter => "supporter",
        }
    }

    /// The tier from Are.na's name for it.
    pub fn parse(s: &str) -> Option<Tier> {
        match s {
            "guest" => Some(Tier::Guest),
            "free" => Some(Tier::Free),
            "premium" => Some(Tier::Premium),
            "supporter" => Some(Tier::Supporter),
            _ => None,
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
        super::json_or_error(ID, url, resp)
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
            max_pages: None,      // sync.pages_per_refresh applies
            min_refresh_hours: 0, // channels change: refresh every launch
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

/// Longest channel slug we accept. Are.na slugs are a parameterised title
/// plus a short random suffix; real ones are well under this.
pub const MAX_SLUG_LEN: usize = 120;

/// Is `s` a safe channel slug or numeric id? Lowercase ASCII letters, digits,
/// `-` and `_`, starting with a letter or digit. Slugs go into API paths, so
/// anything else (`/`, `..`, `?`, `#`, `%`, spaces, Unicode) is refused
/// before a URL is ever built (review 0008, ADR-0014).
pub fn is_valid_slug(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= MAX_SLUG_LEN
        && s.as_bytes()[0].is_ascii_alphanumeric()
        && s.bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-' || b == b'_')
}

/// Why a pasted channel reference was refused. Shown to the user as text.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ChannelRefError {
    Empty,
    TooLong,
    NotArena,
    BlockLink,
    NotAChannel,
}

impl std::fmt::Display for ChannelRefError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Empty => "Paste an Are.na channel link or its slug.",
            Self::TooLong => "That's too long to be an Are.na channel link.",
            Self::NotArena => "Only are.na channel links can be added.",
            Self::BlockLink => "That's a link to a single block; paste the channel's link instead.",
            Self::NotAChannel => "That doesn't look like an Are.na channel link.",
        })
    }
}

/// Longest pasted text we look at.
pub const MAX_REF_LEN: usize = 2048;

/// Turn what the user pasted into a channel slug, without any network call.
///
/// Accepts a bare slug (`woodworking`), a site link
/// (`https://www.are.na/<user>/<slug>`, `are.na/channel/<slug>`), or an API
/// link (`https://api.are.na/v3/channels/<slug>`). The pasted URL is never
/// fetched: only the slug is kept, and the request goes to the fixed
/// [`API_BASE`], so a link can't change where the app connects (no SSRF).
/// The host must be exactly `are.na`, `www.are.na` or `api.are.na`, with no
/// port or user info; look-alike hosts (`are.na.evil.example`, Unicode
/// homographs, which the URL parser turns into `xn--` names) are refused.
pub fn parse_channel_ref(input: &str) -> std::result::Result<String, ChannelRefError> {
    let raw = input.trim();
    if raw.is_empty() {
        return Err(ChannelRefError::Empty);
    }
    if raw.len() > MAX_REF_LEN {
        return Err(ChannelRefError::TooLong);
    }
    // The URL parser silently drops tabs and newlines; refuse them instead.
    if raw.chars().any(char::is_control) {
        return Err(ChannelRefError::NotAChannel);
    }
    if !raw.contains('/') && !raw.contains(':') && !raw.contains('.') {
        let slug = raw.to_ascii_lowercase();
        return if is_valid_slug(&slug) {
            Ok(slug)
        } else {
            Err(ChannelRefError::NotAChannel)
        };
    }
    let lower = raw.to_ascii_lowercase();
    let with_scheme = if lower.starts_with("are.na/") || lower.starts_with("www.are.na/") {
        format!("https://{raw}")
    } else {
        raw.to_string()
    };
    let url = url::Url::parse(&with_scheme).map_err(|_| ChannelRefError::NotAChannel)?;
    if !matches!(url.scheme(), "https" | "http") {
        return Err(ChannelRefError::NotArena);
    }
    let host = url.host_str().unwrap_or_default();
    if !matches!(host, "are.na" | "www.are.na" | "api.are.na")
        || url.port().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err(ChannelRefError::NotArena);
    }
    let segs: Vec<&str> = url
        .path_segments()
        .map(|p| p.filter(|s| !s.is_empty()).collect())
        .unwrap_or_default();
    let slug = match (host, segs.as_slice()) {
        ("api.are.na", ["v3" | "v2", "channels", slug]) => *slug,
        ("api.are.na", _) => return Err(ChannelRefError::NotAChannel),
        (_, ["block" | "blocks", ..]) => return Err(ChannelRefError::BlockLink),
        (_, ["channel" | "channels", slug]) => *slug,
        (_, [_user, slug]) => *slug,
        _ => return Err(ChannelRefError::NotAChannel),
    };
    let slug = slug.to_ascii_lowercase();
    if is_valid_slug(&slug) {
        Ok(slug)
    } else {
        Err(ChannelRefError::NotAChannel)
    }
}

/// What the app shows after looking a channel up.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct ChannelInfo {
    pub slug: String,
    pub title: String,
    /// Items in the channel, when the API reports it.
    pub contents: Option<u64>,
}

/// Longest channel title we keep (display only).
const MAX_TITLE_CHARS: usize = 200;

/// Check a channel exists and is readable: exactly one
/// `GET /v3/channels/<slug>` through the shared [`HttpClient`]. Refuses an
/// invalid slug before building the URL. The response is untrusted: the
/// returned slug is re-validated and the title is cut down to plain text.
pub fn lookup_channel(http: &dyn HttpClient, slug: &str) -> Result<ChannelInfo> {
    let fail = |message: String| Error::Connector {
        connector: ID.into(),
        message,
    };
    if !is_valid_slug(slug) {
        return Err(fail(ChannelRefError::NotAChannel.to_string()));
    }
    let url = format!("{API_BASE}/channels/{slug}");
    let v = get_json(http, &url, "No Are.na channel has that link.")?;
    let returned = v["slug"].as_str().unwrap_or(slug).to_ascii_lowercase();
    if !is_valid_slug(&returned) {
        return Err(fail(
            "Are.na sent back a channel slug LeMuse can't use.".into(),
        ));
    }
    let title = plain_text(v["title"].as_str().unwrap_or(&returned));
    Ok(ChannelInfo {
        slug: returned,
        title,
        contents: v["counts"]["contents"].as_u64(),
    })
}

/// One GET through the shared client, with Are.na's statuses turned into
/// messages a person can act on. `missing` is the 404 message.
fn get_json(http: &dyn HttpClient, url: &str, missing: &str) -> Result<Value> {
    let resp = http.get(url, &[("Accept", "application/json")])?;
    let fail = |message: &str| Error::Connector {
        connector: ID.into(),
        message: message.into(),
    };
    match resp.status {
        401 | 403 => Err(fail(
            "That channel is private. Save your Are.na token in Settings to open your own private channels.",
        )),
        404 => Err(fail(missing)),
        _ => super::json_or_error(ID, url, resp),
    }
}

/// The Are.na account a token belongs to (ADR-0023).
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct Account {
    pub slug: String,
    pub name: String,
    pub tier: Tier,
}

/// Who the client's token belongs to: one read of `GET /v3/me`. `Ok(None)`
/// when Are.na refuses the token (401/403). Only the slug, name and tier
/// are read; the answer also holds the account's email, which LeMuse never
/// reads or keeps.
pub fn account(http: &dyn HttpClient) -> Result<Option<Account>> {
    let url = format!("{API_BASE}/me");
    let resp = http.get(&url, &[("Accept", "application/json")])?;
    if matches!(resp.status, 401 | 403) {
        return Ok(None);
    }
    let v = super::json_or_error(ID, &url, resp)?;
    parse_account(&v).map(Some)
}

fn parse_account(v: &Value) -> Result<Account> {
    let slug = plain_text(v["slug"].as_str().unwrap_or_default());
    if slug.is_empty() {
        return Err(Error::Connector {
            connector: ID.into(),
            message: "Are.na answered without an account name.".into(),
        });
    }
    Ok(Account {
        name: plain_text(v["name"].as_str().unwrap_or(&slug)),
        // A token always means at least a free account.
        tier: v["tier"]
            .as_str()
            .and_then(Tier::parse)
            .filter(|t| *t != Tier::Guest)
            .unwrap_or(Tier::Free),
        slug,
    })
}

/// Remote text cut down for display: no control characters, at most
/// [`MAX_TITLE_CHARS`], trimmed. The UI still renders it as text only.
fn plain_text(s: &str) -> String {
    let t: String = s
        .chars()
        .filter(|c| !c.is_control())
        .take(MAX_TITLE_CHARS)
        .collect();
    t.trim().to_string()
}

/// Is this a URL the preview may show as an image: https, no credentials.
/// The app's CSP still limits which hosts actually load.
fn is_https_image(u: &str) -> bool {
    url::Url::parse(u)
        .map(|p| p.scheme() == "https" && p.username().is_empty() && p.password().is_none())
        .unwrap_or(false)
}

// ── Discover (ADR-0015) ─────────────────────────────────────────────────
//
// Are.na's search API is Premium-only, so LeMuse never searches. These two
// calls run only when the user clicks: each is one or two GETs for one
// channel or one block the user is looking at. Nothing is followed further,
// stored, or fetched in the background.

/// Most items a channel preview shows (one page).
pub const PREVIEW_ITEMS: u32 = 24;
/// Most related channels one page shows.
pub const RELATED_PER_PAGE: u32 = 24;
/// Highest related-channels page we ask for.
pub const MAX_RELATED_PAGE: u32 = 20;

/// One thumbnail in a channel preview. Shown, never stored.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct PreviewItem {
    pub title: Option<String>,
    pub image_url: String,
    pub kind: &'static str,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct ChannelPreview {
    pub channel: ChannelInfo,
    pub items: Vec<PreviewItem>,
}

/// The channel's first images, for "look before you add": the lookup plus
/// one contents page (two GETs).
pub fn preview_channel(http: &dyn HttpClient, slug: &str) -> Result<ChannelPreview> {
    let channel = lookup_channel(http, slug)?;
    let url = format!(
        "{API_BASE}/channels/{}/contents?per={PREVIEW_ITEMS}&page=1",
        channel.slug
    );
    let v = get_json(http, &url, "No Are.na channel has that link.")?;
    let page = parse_contents_page(&v)?;
    let items = page
        .items
        .iter()
        .filter_map(|it| {
            let b = &it.block;
            let pick = ["small", "medium", "large"]
                .iter()
                .find_map(|role| b.media.iter().find(|m| m.role == *role))?;
            is_https_image(&pick.url).then(|| PreviewItem {
                title: b.title.as_deref().map(plain_text).filter(|t| !t.is_empty()),
                image_url: pick.url.clone(),
                kind: b.kind.as_str(),
            })
        })
        .take(PREVIEW_ITEMS as usize)
        .collect();
    Ok(ChannelPreview { channel, items })
}

/// A channel another Are.na user made, as listed under "Related channels".
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct ChannelSummary {
    pub slug: String,
    pub title: String,
    pub owner: Option<String>,
    pub contents: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct RelatedChannels {
    pub channels: Vec<ChannelSummary>,
    pub total: Option<u64>,
    pub next_page: Option<u32>,
}

/// Are.na block ids are decimal numbers.
pub fn is_valid_block_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 20 && id.bytes().all(|b| b.is_ascii_digit())
}

/// The public channels one block is connected to: one
/// `GET /v3/blocks/<id>/connections` page. Channel slugs that fail
/// [`is_valid_slug`] are dropped; titles and owners are plain text.
pub fn related_channels(
    http: &dyn HttpClient,
    block_id: &str,
    page: u32,
) -> Result<RelatedChannels> {
    if !is_valid_block_id(block_id) || page == 0 || page > MAX_RELATED_PAGE {
        return Err(Error::Connector {
            connector: ID.into(),
            message: "That image has no Are.na block to look up.".into(),
        });
    }
    let url =
        format!("{API_BASE}/blocks/{block_id}/connections?per={RELATED_PER_PAGE}&page={page}");
    let v = get_json(http, &url, "Are.na no longer has that image.")?;
    let data = v["data"].as_array().ok_or_else(|| Error::Connector {
        connector: ID.into(),
        message: "connections response missing `data` array".into(),
    })?;
    let channels = data
        .iter()
        .filter(|c| c["type"].as_str() == Some("Channel"))
        .filter(|c| c["state"].as_str().is_none_or(|s| s == "available"))
        .filter_map(|c| {
            let slug = c["slug"].as_str()?.to_ascii_lowercase();
            if !is_valid_slug(&slug) {
                return None;
            }
            Some(ChannelSummary {
                title: plain_text(c["title"].as_str().unwrap_or(&slug)),
                owner: c["owner"]["name"]
                    .as_str()
                    .map(plain_text)
                    .filter(|o| !o.is_empty()),
                contents: c["counts"]["contents"].as_u64(),
                slug,
            })
        })
        .take(RELATED_PER_PAGE as usize)
        .collect();
    let next_page = if v["meta"]["has_more_pages"].as_bool().unwrap_or(false) {
        v["meta"]["next_page"]
            .as_u64()
            .and_then(|n| u32::try_from(n).ok())
            .filter(|n| *n <= MAX_RELATED_PAGE)
    } else {
        None
    };
    Ok(RelatedChannels {
        channels,
        total: v["meta"]["total_count"].as_u64(),
        next_page,
    })
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

    /// Shaped from the `Me` schema in api.are.na/v3/openapi.json (no real
    /// account data; `email` left out on purpose).
    const ME: &str = include_str!("../../tests/fixtures/arena_me.json");

    #[test]
    fn account_check_reads_slug_name_and_tier_only() {
        let http = FixtureClient::default();
        http.push(&format!("{API_BASE}/me"), 200, ME);
        let a = account(&http).unwrap().unwrap();
        assert_eq!(
            a,
            Account {
                slug: "example-person".into(),
                name: "Example Person".into(),
                tier: Tier::Free
            }
        );
        assert_eq!(a.tier.budget_per_min(), 96);
        let json = serde_json::to_string(&a).unwrap();
        assert_eq!(
            json,
            r#"{"slug":"example-person","name":"Example Person","tier":"free"}"#
        );
    }

    #[test]
    fn account_check_refused_and_odd_answers() {
        let http = FixtureClient::default();
        let me = format!("{API_BASE}/me");
        http.push(&me, 401, r#"{"error":"Unauthorized","code":401}"#);
        assert_eq!(account(&http).unwrap(), None);
        // A token is never "guest"; an unknown tier counts as free.
        http.push(&me, 200, r#"{"slug":"a-b","name":"A","tier":"guest"}"#);
        assert_eq!(account(&http).unwrap().unwrap().tier, Tier::Free);
        http.push(&me, 200, r#"{"slug":"a-b","tier":"premium"}"#);
        let a = account(&http).unwrap().unwrap();
        assert_eq!((a.tier, a.name.as_str()), (Tier::Premium, "a-b"));
        http.push(&me, 200, r#"{"name":"no slug"}"#);
        assert!(account(&http).is_err());
        http.push(&me, 500, "oops");
        assert!(account(&http).is_err());
    }

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
    fn channel_refs_accept_real_link_shapes() {
        for (input, slug) in [
            ("woodworking", "woodworking"),
            ("  Woodworking \n", "woodworking"),
            ("https://www.are.na/some-user/woodworking", "woodworking"),
            ("https://are.na/some-user/objects-26/", "objects-26"),
            ("are.na/some-user/objects-26?tab=info#top", "objects-26"),
            ("www.are.na/channel/metal", "metal"),
            ("http://www.are.na/u/resonance", "resonance"),
            ("https://api.are.na/v3/channels/sitting", "sitting"),
            ("50205", "50205"),
        ] {
            assert_eq!(parse_channel_ref(input).as_deref(), Ok(slug), "{input}");
        }
    }

    /// Review 0008: pasted text can't change the host LeMuse connects to or
    /// smuggle path, query or header syntax into the API request.
    #[test]
    fn channel_refs_refuse_injection_and_other_hosts() {
        use ChannelRefError::*;
        for (input, why) in [
            ("", Empty),
            ("https://are.na.evil.example/u/x", NotArena),
            ("https://evil.example/are.na/u/x", NotArena),
            ("https://www.are.na@evil.example/u/x", NotArena),
            ("https://user:pw@www.are.na/u/x", NotArena), // secret-scan: allow URL user-info test case, not an address
            ("https://www.are.na:8443/u/x", NotArena),
            ("https://www.\u{0430}re.na/u/x", NotArena), // Cyrillic "a"
            ("javascript:alert(1)", NotArena),
            ("file:///C:/Windows/win.ini", NotArena),
            ("https://www.are.na/block/12345", BlockLink),
            ("https://www.are.na/u/..%2F..%2Fusers", NotAChannel),
            ("https://www.are.na/u/x%3Fper%3D1000", NotAChannel),
            ("https://www.are.na/u/a/b", NotAChannel),
            ("https://api.are.na/v3/users/someone", NotAChannel),
            ("../users/me", NotAChannel),
            ("x?per=1000", NotAChannel),
            ("x\r\nHost: evil", NotAChannel),
            ("-leading-dash", NotAChannel),
            ("caf\u{e9}", NotAChannel),
        ] {
            assert_eq!(parse_channel_ref(input), Err(why), "{input:?}");
        }
        assert_eq!(
            parse_channel_ref(&"a".repeat(MAX_REF_LEN + 1)),
            Err(TooLong)
        );
        assert!(!is_valid_slug(&"a".repeat(MAX_SLUG_LEN + 1)));
    }

    const CHANNEL: &str = include_str!("../../tests/fixtures/arena_channel.json");

    #[test]
    fn lookup_reads_title_and_count_with_one_request() {
        let http = FixtureClient::default();
        http.push(&format!("{API_BASE}/channels/woodworking"), 200, CHANNEL);
        let info = lookup_channel(&http, "woodworking").unwrap();
        assert_eq!(info.slug, "woodworking");
        assert_eq!(info.title, "Woodworking");
        assert_eq!(info.contents, Some(4));
        assert_eq!(http.requests.lock().unwrap().len(), 1);
    }

    #[test]
    fn lookup_explains_private_missing_and_hostile_answers() {
        let http = FixtureClient::default();
        let url = format!("{API_BASE}/channels/secret");
        http.push(&url, 401, "{}");
        let private = lookup_channel(&http, "secret").unwrap_err().to_string();
        assert!(private.contains("private"), "{private}");
        let missing = lookup_channel(&http, "gone").unwrap_err().to_string();
        assert!(missing.contains("No Are.na channel"), "{missing}");
        // A hostile or broken answer can't inject a bad slug.
        http.push(&url, 200, r#"{"slug":"../x","title":"t"}"#);
        assert!(lookup_channel(&http, "secret").is_err());
        // Markup stays inert text (the UI renders text, never HTML); control
        // characters are dropped.
        http.push(
            &url,
            200,
            r#"{"slug":"secret","title":"<img src=x onerror=alert(1)>\u0000\n"}"#,
        );
        let info = lookup_channel(&http, "secret").unwrap();
        assert_eq!(info.title, "<img src=x onerror=alert(1)>");
        // An invalid slug never reaches the network.
        assert!(lookup_channel(&http, "a/b").is_err());
        assert_eq!(http.requests.lock().unwrap().len(), 4);
    }

    #[test]
    fn budget_leaves_headroom() {
        assert_eq!(Tier::Free.budget_per_min(), 96);
        assert!(Tier::Guest.budget_per_min() < Tier::Guest.read_limit_per_min());
    }

    const CONNECTIONS: &str = include_str!("../../tests/fixtures/arena_block_connections.json");

    #[test]
    fn related_channels_is_one_request_and_drops_bad_slugs() {
        let http = FixtureClient::default();
        let url = format!("{API_BASE}/blocks/1000692/connections?per=24&page=1");
        http.push(&url, 200, CONNECTIONS);
        let r = related_channels(&http, "1000692", 1).unwrap();
        assert_eq!(http.requests.lock().unwrap().len(), 1);
        let slugs: Vec<_> = r.channels.iter().map(|c| c.slug.as_str()).collect();
        assert_eq!(
            slugs,
            ["pretty-things-s5g9f0kmw0s", "objects-forms-rituals"]
        );
        assert_eq!(r.channels[1].owner.as_deref(), Some("Another Owner"));
        assert_eq!((r.total, r.next_page), (Some(107), Some(2)));
    }

    #[test]
    fn related_channels_refuses_bad_ids_without_a_request() {
        let http = FixtureClient::default();
        for (id, page) in [
            ("", 1),
            ("12/../../me", 1),
            ("1 2", 1),
            ("12", 0),
            ("12", 21),
        ] {
            assert!(related_channels(&http, id, page).is_err(), "{id} {page}");
        }
        assert!(http.requests.lock().unwrap().is_empty());
    }

    #[test]
    fn preview_shows_first_images_only() {
        let http = FixtureClient::default();
        http.push(&format!("{API_BASE}/channels/woodworking"), 200, CHANNEL);
        http.push(
            &format!("{API_BASE}/channels/woodworking/contents?per=24&page=1"),
            200,
            FIXTURE,
        );
        let p = preview_channel(&http, "woodworking").unwrap();
        assert_eq!(http.requests.lock().unwrap().len(), 2);
        assert_eq!(p.channel.title, "Woodworking");
        assert!(!p.items.is_empty() && p.items.len() <= 24);
        assert!(p.items.iter().all(|i| i.image_url.starts_with("https://")));
    }

    #[test]
    fn preview_skips_non_https_images() {
        assert!(is_https_image("https://images.are.na/a.jpg"));
        assert!(!is_https_image("http://images.are.na/a.jpg"));
        assert!(!is_https_image("javascript:alert(1)"));
        assert!(!is_https_image("https://u:p@images.are.na/a.jpg")); // secret-scan: allow
    }
}
