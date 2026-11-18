//! The refresh run. For each source of each topic (a channel shared by two
//! topics is refreshed once):
//!
//! 1. resolve the collection, read its watermark (newest `updated_at` seen
//!    in the last *complete* pass);
//! 2. page through remote items newest-updated first, at most
//!    `sync.pages_per_refresh` pages ("paginate, don't enumerate");
//! 3. stop at the first item strictly older than the watermark;
//! 4. skip items whose stored `remote_updated_at` is unchanged;
//! 5. upsert the block with its streamable media URLs and link it to the
//!    collection. In `download` mode (ADR-0007) also store the files and
//!    hardlink originals into `views/<topic>/`;
//! 6. advance the watermark only if the pass was complete (reached the
//!    watermark or the last page) and had no errors, so nothing is skipped.
//!
//! Whole channels (ADR-0017): when the page budget stops a pass early, the
//! next page's cursor is saved. The next refresh first walks the head down
//! to the newest item of that unfinished pass (catching new items), then
//! resumes at the saved cursor, so a 1,200-item channel completes over a few
//! refreshes instead of being stuck at its newest pages.
//!
//! Known gap (tracked in docs/PLAN.md): items *removed* from a remote
//! channel don't show up in an updated_at walk — a periodic full reconcile
//! pass is planned for M3.

use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;

use crate::config::{Config, FileMode, TopicSource};
use crate::connectors::http::HttpClient;
use crate::connectors::{Connector, DownloadRequest, PageOrdering};
use crate::model::StoredFile;
use crate::store::blobs::BlobStore;
use crate::store::catalog::Catalog;
use crate::store::{views, LibraryPaths};
use crate::sync::lock::SyncLock;
use crate::sync::throttle::{backoff_ceiling, Throttle};
use crate::{Error, Result};

const MAX_ATTEMPTS: u32 = 4;
const MAX_RETRY_WAIT: Duration = Duration::from_secs(120);

/// What started this run. Background triggers honour
/// `SourcePolicy::background_sync_allowed`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Trigger {
    Launch,
    Schedule,
    Manual,
    Cli,
}

impl Trigger {
    pub fn as_str(self) -> &'static str {
        match self {
            Trigger::Launch => "launch",
            Trigger::Schedule => "schedule",
            Trigger::Manual => "manual",
            Trigger::Cli => "cli",
        }
    }
    fn is_background(self) -> bool {
        matches!(self, Trigger::Launch | Trigger::Schedule)
    }
}

#[derive(Debug, Default, Clone, Serialize)]
pub struct RunSummary {
    pub targets_seen: u32,
    pub targets_skipped: u32,
    /// Skipped because refreshed within the source's `min_refresh_hours`.
    pub targets_recent: u32,
    pub blocks_upserted: u32,
    pub blocks_unchanged: u32,
    pub files_stored: u32,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Copy)]
struct PassOptions {
    mode: FileMode,
    max_pages: u32,
}

/// Why a walk over pages ended.
#[derive(Debug, PartialEq, Eq)]
enum WalkEnd {
    /// No more pages.
    LastPage,
    /// Reached an item strictly older than the stop timestamp.
    ReachedStop,
    /// Out of page budget; the cursor of the next unfetched page.
    Budget(Option<String>),
}

struct Walk {
    pages: u32,
    newest: Option<String>,
    end: WalkEnd,
}

fn newer(a: Option<String>, b: Option<String>) -> Option<String> {
    match (a, b) {
        (Some(x), Some(y)) => Some(if x > y { x } else { y }),
        (x, y) => x.or(y),
    }
}

pub struct SyncEngine<'a> {
    paths: LibraryPaths,
    catalog: &'a mut Catalog,
    blobs: BlobStore,
    http: Arc<dyn HttpClient>,
    /// Sleeps are skipped in tests.
    pub sleep_enabled: bool,
}

impl<'a> SyncEngine<'a> {
    pub fn new(paths: LibraryPaths, catalog: &'a mut Catalog, http: Arc<dyn HttpClient>) -> Self {
        let blobs = BlobStore::new(paths.objects());
        Self {
            paths,
            catalog,
            blobs,
            http,
            sleep_enabled: true,
        }
    }

    pub fn run(
        &mut self,
        cfg: &Config,
        connectors: &mut [Box<dyn Connector>],
        trigger: Trigger,
    ) -> Result<RunSummary> {
        self.paths.ensure()?;
        let _lock = SyncLock::acquire(&self.paths.lock())?;
        let run_id = self.catalog.start_run(trigger.as_str())?;
        let mut summary = RunSummary::default();

        let opts = PassOptions {
            mode: cfg.sync.files,
            max_pages: cfg.sync.pages_per_refresh,
        };
        let mut done: HashSet<(String, String)> = HashSet::new();
        // One throttle per source for the whole run, so consecutive targets
        // on the same API are paced against each other (review D-13).
        let mut throttles: HashMap<&'static str, Throttle> = HashMap::new();
        for topic in &cfg.topics {
            for target in topic.resolved_sources() {
                let key = (
                    target.source.clone(),
                    target.remote_key().unwrap_or_default().to_string(),
                );
                if !done.insert(key.clone()) {
                    continue; // shared by an earlier topic; already refreshed
                }
                summary.targets_seen += 1;
                let Some(conn) = connectors.iter_mut().find(|c| c.id() == target.source) else {
                    summary
                        .errors
                        .push(format!("no connector for source `{}`", target.source));
                    summary.targets_skipped += 1;
                    continue;
                };
                let policy = conn.policy();
                if trigger.is_background() && !policy.background_sync_allowed {
                    summary.targets_skipped += 1;
                    continue;
                }
                if policy.min_refresh_hours > 0
                    && self
                        .catalog
                        .synced_within(&key.0, &key.1, policy.min_refresh_hours)?
                {
                    summary.targets_recent += 1;
                    continue;
                }
                let throttle = throttles
                    .entry(conn.id())
                    .or_insert_with(|| Throttle::for_policy(&policy));
                if let Err(e) = self.refresh_source(
                    conn.as_mut(),
                    &topic.name,
                    &target,
                    opts,
                    throttle,
                    &mut summary,
                ) {
                    summary.errors.push(format!("{}: {e}", target.source));
                }
            }
        }

        let status = if summary.errors.is_empty() {
            "ok"
        } else {
            "partial"
        };
        let json = serde_json::to_string(&summary).unwrap_or_default();
        self.catalog.finish_run(run_id, status, &json)?;
        Ok(summary)
    }

    fn refresh_source(
        &mut self,
        conn: &mut dyn Connector,
        topic: &str,
        target: &TopicSource,
        opts: PassOptions,
        throttle: &mut Throttle,
        summary: &mut RunSummary,
    ) -> Result<()> {
        let policy = conn.policy();
        let ordered = conn.ordering() == PageOrdering::UpdatedDesc;
        let max_pages = policy
            .max_pages
            .map_or(opts.max_pages, |p| p.min(opts.max_pages));

        // Known collections skip the remote lookup (one request saved per
        // channel per refresh).
        let key = target.remote_key().unwrap_or_default();
        let collection = match self.catalog.find_collection(conn.id(), key)? {
            Some(c) => c,
            None => {
                self.pace(throttle);
                self.with_retry(|| conn.resolve_collection(target))?
            }
        };
        let collection_id = self.catalog.upsert_collection(&collection)?;
        // Watermarks only make sense for newest-first sources.
        let watermark = if ordered {
            self.catalog.watermark(collection_id)?
        } else {
            None
        };
        let errors_before = summary.errors.len();

        if !ordered {
            // Search results: the first page(s) are the point; mark the
            // collection fresh so `min_refresh_hours` applies.
            self.walk(
                conn,
                topic,
                target,
                collection_id,
                opts,
                throttle,
                summary,
                None,
                None,
                max_pages,
            )?;
            if summary.errors.len() == errors_before {
                self.catalog.touch_synced(collection_id)?;
            }
            return Ok(());
        }

        // 1. Head: newest items down to where we stopped last time (the
        //    unfinished pass's newest item) or to the watermark.
        let resume = self.catalog.resume_state(collection_id)?;
        let head_stop = resume
            .as_ref()
            .and_then(|(_, newest)| newest.clone())
            .or_else(|| watermark.clone());
        let head = self.walk(
            conn,
            topic,
            target,
            collection_id,
            opts,
            throttle,
            summary,
            None,
            head_stop.as_deref(),
            max_pages,
        )?;
        let mut pass_newest = newer(head.newest, resume.as_ref().and_then(|(_, n)| n.clone()));
        let mut end = head.end;
        // 2. Backfill: continue the unfinished pass at its saved cursor, down
        //    to the old watermark or the last page. Always at least one page,
        //    so every refresh makes progress.
        if end == WalkEnd::ReachedStop {
            if let Some((cursor, _)) = resume {
                let budget = max_pages.saturating_sub(head.pages).max(1);
                let back = self.walk(
                    conn,
                    topic,
                    target,
                    collection_id,
                    opts,
                    throttle,
                    summary,
                    Some(cursor),
                    watermark.as_deref(),
                    budget,
                )?;
                pass_newest = newer(pass_newest, back.newest);
                end = back.end;
            }
        }

        if summary.errors.len() != errors_before {
            return Ok(()); // retry from the same state next time
        }
        match end {
            WalkEnd::Budget(next) => match next {
                Some(cursor) => {
                    self.catalog
                        .set_resume(collection_id, &cursor, pass_newest.as_deref())?
                }
                None => self.catalog.clear_resume(collection_id)?,
            },
            WalkEnd::LastPage | WalkEnd::ReachedStop => {
                let new_wm = newer(pass_newest, watermark);
                self.catalog
                    .set_watermark(collection_id, new_wm.as_deref())?;
                self.catalog.clear_resume(collection_id)?;
            }
        }
        Ok(())
    }

    /// Fetch pages from `start` (None = first page) until the last page, an
    /// item strictly older than `stop_at`, or `budget` pages.
    #[allow(clippy::too_many_arguments)] // one call site per phase; a struct would only rename them
    fn walk(
        &mut self,
        conn: &mut dyn Connector,
        topic: &str,
        target: &TopicSource,
        collection_id: i64,
        opts: PassOptions,
        throttle: &mut Throttle,
        summary: &mut RunSummary,
        start: Option<String>,
        stop_at: Option<&str>,
        budget: u32,
    ) -> Result<Walk> {
        let mut cursor = start;
        let mut pages = 0u32;
        let mut newest: Option<String> = None;
        loop {
            if pages == budget {
                return Ok(Walk {
                    pages,
                    newest,
                    end: WalkEnd::Budget(cursor),
                });
            }
            self.pace(throttle);
            let page = self.with_retry(|| conn.fetch_page(target, cursor.as_deref()))?;
            pages += 1;

            for item in page.items {
                let updated = item.block.remote_updated_at.clone();
                if let (Some(stop), Some(u)) = (stop_at, &updated) {
                    // RFC 3339 UTC strings compare lexicographically. Strictly
                    // older only: items *at* the stop fall through to the
                    // unchanged-check below, so a block sharing its timestamp
                    // is never silently skipped (review A-3).
                    if u.as_str() < stop {
                        return Ok(Walk {
                            pages,
                            newest,
                            end: WalkEnd::ReachedStop,
                        });
                    }
                }
                if newest.is_none() {
                    newest = updated.clone();
                }

                let src = &item.block.source;
                if updated.is_some()
                    && self
                        .catalog
                        .remote_updated_at(&src.connector, &src.remote_id)?
                        == updated
                {
                    summary.blocks_unchanged += 1;
                    continue;
                }

                let mut block = item.block;
                if opts.mode == FileMode::Download {
                    match self.download_all(conn.id(), &item.downloads, throttle) {
                        Ok(files) => {
                            summary.files_stored += files.len() as u32;
                            block.files = files;
                        }
                        Err(e) => {
                            summary
                                .errors
                                .push(format!("block {}: {e}", src_id(&block)));
                            continue;
                        }
                    }
                }
                let block_id = self.catalog.upsert_block(&block)?;
                self.catalog
                    .link_block(collection_id, block_id, item.position)?;
                for f in &block.files {
                    if f.role == "original" {
                        let object = self.blobs.path_for(&f.sha256, &f.ext);
                        let view = views::view_path(
                            &self.paths.views(),
                            topic,
                            block.title.as_deref(),
                            block_id,
                            &f.ext,
                        );
                        views::link_into_view(&object, &view)?;
                    }
                }
                summary.blocks_upserted += 1;
            }

            match page.next {
                Some(next) => cursor = Some(next),
                None => {
                    return Ok(Walk {
                        pages,
                        newest,
                        end: WalkEnd::LastPage,
                    })
                }
            }
        }
    }

    fn download_all(
        &self,
        connector: &str,
        reqs: &[DownloadRequest],
        throttle: &mut Throttle,
    ) -> Result<Vec<StoredFile>> {
        let mut out = Vec::with_capacity(reqs.len());
        for r in reqs {
            // Only from the source's own CDN (review 0008 A-37).
            if !crate::connectors::download_allowed(connector, &r.url) {
                return Err(Error::Connector {
                    connector: "download".into(),
                    message: format!("refused a file from an unexpected host: {}", r.url),
                });
            }
            // File CDNs aren't the API, but we still pace to be a good citizen.
            self.pace(throttle);
            let resp = self.http.get(&r.url, &[])?;
            if !(200..300).contains(&resp.status) {
                return Err(Error::Connector {
                    connector: "download".into(),
                    message: format!("HTTP {} for {}", resp.status, r.url),
                });
            }
            if let Some(expected) = r.expected_size {
                if expected != resp.body.len() as u64 {
                    return Err(Error::Connector {
                        connector: "download".into(),
                        message: format!(
                            "size mismatch for {} (expected {expected}, got {})",
                            r.url,
                            resp.body.len()
                        ),
                    });
                }
            }
            let ext = r.ext_hint.clone().unwrap_or_else(|| ext_from_url(&r.url));
            out.push(self.blobs.put(&resp.body, &ext, &r.role)?);
        }
        Ok(out)
    }

    fn pace(&self, throttle: &mut Throttle) {
        if self.sleep_enabled {
            throttle.wait();
        }
    }

    fn with_retry<T>(&self, f: impl FnMut() -> Result<T>) -> Result<T> {
        retry(self.sleep_enabled, f)
    }
}

/// Retry rate-limited calls (honouring `retry_after`) and temporary network
/// or 5xx failures (backing off 1 s, 2 s, 4 s), up to [`MAX_ATTEMPTS`] tries.
pub fn retry<T>(sleep: bool, mut f: impl FnMut() -> Result<T>) -> Result<T> {
    let mut attempt = 0;
    loop {
        let wait = match f() {
            Err(Error::RateLimited {
                retry_after_secs, ..
            }) if attempt + 1 < MAX_ATTEMPTS => Duration::from_secs(retry_after_secs)
                .max(backoff_ceiling(
                    attempt,
                    Duration::from_secs(1),
                    MAX_RETRY_WAIT,
                ))
                .min(MAX_RETRY_WAIT),
            Err(Error::Transient { .. }) if attempt + 1 < MAX_ATTEMPTS => {
                Duration::from_secs(1 << attempt)
            }
            other => return other,
        };
        if sleep {
            std::thread::sleep(wait);
        }
        attempt += 1;
    }
}

fn src_id(b: &crate::model::Block) -> String {
    format!("{}:{}", b.source.connector, b.source.remote_id)
}

/// `https://x/y/file.JPG?123` → `"jpg"`; no extension → `"bin"`.
pub fn ext_from_url(url: &str) -> String {
    let path = url.split(['?', '#']).next().unwrap_or("");
    let last = path.rsplit('/').next().unwrap_or("");
    match last.rsplit_once('.') {
        Some((_, ext)) => crate::store::blobs::normalize_ext(ext),
        None => "bin".into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::arena::{ArenaConnector, Tier, API_BASE, PAGE_SIZE};
    use crate::connectors::http::FixtureClient;

    const PAGE1: &str = include_str!("../../tests/fixtures/arena_contents_page1.json");

    fn contents_url(page: u32) -> String {
        format!(
            "{API_BASE}/channels/refs/contents?page={page}&per={PAGE_SIZE}&sort=updated_at_desc"
        )
    }

    fn refs_source() -> TopicSource {
        TopicSource {
            source: "arena".into(),
            channel: Some("refs".into()),
            query: None,
            collection: None,
        }
    }

    fn topic(name: &str) -> crate::config::Topic {
        crate::config::Topic {
            name: name.into(),
            slide_seconds: 8,
            shuffle: false,
            keywords: vec![],
            sources: vec![refs_source()],
        }
    }

    fn setup(mode: FileMode) -> (tempfile::TempDir, Arc<FixtureClient>, Config) {
        let dir = tempfile::tempdir().unwrap();
        let http = Arc::new(FixtureClient::default());
        let mut cfg = Config::new(dir.path());
        cfg.sync.files = mode;
        cfg.topics.push(topic("CAD refs"));
        (dir, http, cfg)
    }

    fn arena(http: &Arc<FixtureClient>) -> Vec<Box<dyn Connector>> {
        vec![Box::new(ArenaConnector::new(http.clone(), Tier::Free))]
    }

    #[test]
    fn stream_mode_records_media_without_downloading() {
        let (dir, http, cfg) = setup(FileMode::Stream);
        let paths = LibraryPaths::new(dir.path());
        let mut catalog = Catalog::open_in_memory().unwrap();
        queue_channel(&http); // no file responses queued: none may be requested
        let mut engine = SyncEngine::new(paths, &mut catalog, http.clone());
        engine.sleep_enabled = false;
        let s = engine
            .run(&cfg, &mut arena(&http), Trigger::Launch)
            .unwrap();
        assert!(s.errors.is_empty(), "{:?}", s.errors);
        assert_eq!((s.blocks_upserted, s.files_stored), (3, 0));
        let reqs = http.requests.lock().unwrap().clone();
        assert_eq!(reqs.len(), 3, "channel + 2 pages only: {reqs:?}");
        drop(engine);
        let slides = catalog.slides(&[("arena", "refs")], 10, 0).unwrap();
        assert_eq!(slides.len(), 2); // image + attachment preview; text excluded
        assert!(slides[0].display_url.starts_with("https://images.are.na/"));
        assert!(slides.iter().all(|s| !s.saved));
        assert!(catalog.watermark(1).unwrap().is_some());
    }

    #[test]
    fn museum_keywords_refresh_once_then_wait_a_week() {
        use crate::connectors::aic::AicConnector;
        let dir = tempfile::tempdir().unwrap();
        let http = Arc::new(FixtureClient::default());
        let mut cfg = Config::new(dir.path());
        cfg.topics.push(crate::config::Topic {
            name: "Wood objects".into(),
            slide_seconds: 8,
            shuffle: true,
            keywords: vec!["wooden chair".into()],
            sources: vec![TopicSource {
                source: "aic".into(),
                channel: None,
                query: None,
                collection: None,
            }],
        });
        http.push(
            &AicConnector::search_url("wooden chair", 1),
            200,
            include_str!("../../tests/fixtures/aic_search_page1.json"),
        );
        let mut catalog = Catalog::open_in_memory().unwrap();
        let mut conns = crate::connectors::all(http.clone(), Tier::Guest);
        let mut engine = SyncEngine::new(LibraryPaths::new(dir.path()), &mut catalog, http.clone());
        engine.sleep_enabled = false;

        let s1 = engine.run(&cfg, &mut conns, Trigger::Launch).unwrap();
        assert!(s1.errors.is_empty(), "{:?}", s1.errors);
        assert_eq!(s1.blocks_upserted, 2);
        // AIC policy caps at 1 page even though the fixture has a page 2.
        assert_eq!(http.requests.lock().unwrap().len(), 1);

        let s2 = engine.run(&cfg, &mut conns, Trigger::Launch).unwrap();
        assert_eq!(s2.targets_recent, 1);
        assert_eq!(http.requests.lock().unwrap().len(), 1, "no new requests");
        drop(engine);

        let keys = cfg.topic("Wood objects").unwrap().collection_keys();
        let slides = catalog.slides(&keys, 10, 0).unwrap();
        assert_eq!(slides.len(), 2);
        assert!(slides
            .iter()
            .all(|s| s.display_url.contains("/full/1686,/")));
        assert!(slides[0].attribution.as_deref().unwrap().contains("CC0"));
    }

    #[test]
    fn page_budget_stops_early_and_holds_watermark() {
        let (dir, http, mut cfg) = setup(FileMode::Stream);
        cfg.sync.pages_per_refresh = 1;
        let mut catalog = Catalog::open_in_memory().unwrap();
        queue_channel(&http);
        let mut engine = SyncEngine::new(LibraryPaths::new(dir.path()), &mut catalog, http.clone());
        engine.sleep_enabled = false;
        engine
            .run(&cfg, &mut arena(&http), Trigger::Launch)
            .unwrap();
        assert!(!http.requests.lock().unwrap().contains(&contents_url(2)));
        drop(engine);
        assert_eq!(catalog.block_count().unwrap(), 3);
        assert_eq!(catalog.watermark(1).unwrap(), None); // pass incomplete
    }

    #[test]
    fn channel_shared_by_two_topics_is_refreshed_once() {
        let (dir, http, mut cfg) = setup(FileMode::Stream);
        cfg.topics.push(topic("Also CAD"));
        let mut catalog = Catalog::open_in_memory().unwrap();
        queue_channel(&http);
        let mut engine = SyncEngine::new(LibraryPaths::new(dir.path()), &mut catalog, http.clone());
        engine.sleep_enabled = false;
        let s = engine
            .run(&cfg, &mut arena(&http), Trigger::Launch)
            .unwrap();
        assert_eq!(s.targets_seen, 1);
        assert!(s.errors.is_empty(), "{:?}", s.errors);
    }

    fn queue_channel(http: &FixtureClient) {
        http.push(
            &format!("{API_BASE}/channels/refs"),
            200,
            r#"{"title":"CAD refs"}"#,
        );
        http.push(&contents_url(1), 200, PAGE1);
        http.push(
            &contents_url(2),
            200,
            r#"{"data":[],"meta":{"has_more_pages":false}}"#,
        );
    }

    fn queue_files(http: &FixtureClient) {
        // Sizes must match the fixture's file_size fields.
        http.push(
            "https://d2w9rnfcy7mm78.cloudfront.net/9613792/original_abc.jpg?1606117715",
            200,
            vec![1u8; 1925505],
        );
        http.push(
            "https://attachments.are.na/9700001/Bracket.step",
            200,
            vec![2u8; 48213],
        );
        http.push(
            "https://d2w9rnfcy7mm78.cloudfront.net/9700001/original_preview.png",
            200,
            vec![3u8; 20311],
        );
    }

    #[test]
    fn download_mode_stores_files_then_second_run_is_incremental() {
        let (dir, http, cfg) = setup(FileMode::Download);
        let paths = LibraryPaths::new(dir.path());
        paths.ensure().unwrap();
        let mut catalog = Catalog::open(&paths.catalog()).unwrap();

        queue_channel(&http);
        queue_files(&http);
        let mut connectors: Vec<Box<dyn Connector>> =
            vec![Box::new(ArenaConnector::new(http.clone(), Tier::Free))];
        let mut engine = SyncEngine::new(paths.clone(), &mut catalog, http.clone());
        engine.sleep_enabled = false;

        let s1 = engine.run(&cfg, &mut connectors, Trigger::Launch).unwrap();
        assert!(s1.errors.is_empty(), "{:?}", s1.errors);
        assert_eq!(s1.blocks_upserted, 3);
        assert_eq!(s1.files_stored, 3);
        assert!(paths
            .views()
            .join("CAD refs")
            .join("Bracket.step [2].step")
            .is_file());

        // Second run: the channel is already known (no lookup), the same
        // page comes back, its first item is at the watermark, so the engine
        // stops after one request without downloading anything.
        let before = http.requests.lock().unwrap().len();
        http.push(&contents_url(1), 200, PAGE1);
        let s2 = engine.run(&cfg, &mut connectors, Trigger::Launch).unwrap();
        assert_eq!(s2.blocks_upserted, 0);
        assert_eq!(http.requests.lock().unwrap().len() - before, 1);
        drop(engine);
        assert_eq!(catalog.block_count().unwrap(), 3);
    }

    #[test]
    fn failed_download_keeps_watermark_unchanged() {
        let (dir, http, cfg) = setup(FileMode::Download);
        let paths = LibraryPaths::new(dir.path());
        paths.ensure().unwrap();
        let mut catalog = Catalog::open(&paths.catalog()).unwrap();
        queue_channel(&http); // no files queued → downloads 404
        let mut connectors: Vec<Box<dyn Connector>> =
            vec![Box::new(ArenaConnector::new(http.clone(), Tier::Free))];
        let mut engine = SyncEngine::new(paths, &mut catalog, http);
        engine.sleep_enabled = false;
        let s = engine.run(&cfg, &mut connectors, Trigger::Manual).unwrap();
        assert!(!s.errors.is_empty());
        assert_eq!(s.blocks_upserted, 1); // the text block has no files
        drop(engine);
        assert_eq!(catalog.watermark(1).unwrap(), None);
    }

    /// Archive policy (ADR-0013): a refresh never deletes what the catalog
    /// already knows. Items that vanish from the remote channel keep their
    /// metadata, link and attribution in the local catalog.
    #[test]
    fn items_removed_remotely_stay_in_the_catalog() {
        let (dir, http, cfg) = setup(FileMode::Stream);
        let mut catalog = Catalog::open_in_memory().unwrap();
        queue_channel(&http);
        let mut engine = SyncEngine::new(LibraryPaths::new(dir.path()), &mut catalog, http.clone());
        engine.sleep_enabled = false;
        engine
            .run(&cfg, &mut arena(&http), Trigger::Launch)
            .unwrap();
        // Later the channel is emptied upstream.
        http.push(
            &contents_url(1),
            200,
            r#"{"data":[],"meta":{"has_more_pages":false}}"#,
        );
        let s = engine
            .run(&cfg, &mut arena(&http), Trigger::Manual)
            .unwrap();
        assert!(s.errors.is_empty(), "{:?}", s.errors);
        drop(engine);
        assert_eq!(catalog.block_count().unwrap(), 3);
        assert_eq!(
            catalog.slides(&[("arena", "refs")], 10, 0).unwrap().len(),
            2
        );
    }

    #[test]
    fn ext_from_url_handles_queries_and_missing_ext() {
        assert_eq!(ext_from_url("https://x/a/b.JPG?123"), "jpg");
        assert_eq!(ext_from_url("https://x/a/b"), "bin");
    }

    /// A page of image blocks `(id, updated_at)`; `next` is the next page.
    fn image_page(items: &[(u64, &str)], next: Option<u32>) -> String {
        let data: Vec<String> = items
            .iter()
            .map(|(id, at)| {
                format!(
                    r#"{{"id":{id},"type":"Image","state":"available","updated_at":"{at}","title":"img {id}",
                    "image":{{"src":"https://d2w9rnfcy7mm78.cloudfront.net/{id}/o.jpg",
                    "large":{{"src":"https://images.are.na/{id}/l.jpg"}}}}}}"#
                )
            })
            .collect();
        let meta = match next {
            Some(n) => format!(r#"{{"has_more_pages":true,"next_page":{n}}}"#),
            None => r#"{"has_more_pages":false}"#.to_string(),
        };
        format!(r#"{{"data":[{}],"meta":{meta}}}"#, data.join(","))
    }

    #[test]
    fn large_channels_complete_over_several_refreshes() {
        let (dir, http, mut cfg) = setup(FileMode::Stream);
        cfg.sync.pages_per_refresh = 1;
        http.push(
            &format!("{API_BASE}/channels/refs"),
            200,
            r#"{"title":"CAD refs"}"#,
        );
        let p1 = image_page(
            &[(5, "2026-11-05T00:00:00Z"), (4, "2026-11-04T00:00:00Z")],
            Some(2),
        );
        let p2 = image_page(
            &[(3, "2026-11-03T00:00:00Z"), (2, "2026-11-02T00:00:00Z")],
            Some(3),
        );
        let p3 = image_page(&[(1, "2026-11-01T00:00:00Z")], None);
        for _ in 0..4 {
            http.push(&contents_url(1), 200, p1.clone());
        }
        http.push(&contents_url(2), 200, p2);
        http.push(&contents_url(3), 200, p3);
        let mut catalog = Catalog::open_in_memory().unwrap();
        let mut engine = SyncEngine::new(LibraryPaths::new(dir.path()), &mut catalog, http.clone());
        engine.sleep_enabled = false;
        let mut conns = arena(&http);
        for _ in 0..3 {
            let s = engine.run(&cfg, &mut conns, Trigger::Launch).unwrap();
            assert!(s.errors.is_empty(), "{:?}", s.errors);
        }
        // A fourth refresh: only the head page, nothing new.
        let s4 = engine.run(&cfg, &mut conns, Trigger::Launch).unwrap();
        assert_eq!(s4.blocks_upserted, 0);
        drop(engine);
        assert_eq!(catalog.block_count().unwrap(), 5, "every page reached");
        assert_eq!(
            catalog.watermark(1).unwrap().as_deref(),
            Some("2026-11-05T00:00:00Z")
        );
        assert_eq!(catalog.resume_state(1).unwrap(), None);
        let reqs = http.requests.lock().unwrap().clone();
        let pages: Vec<&String> = reqs.iter().filter(|u| u.contains("/contents")).collect();
        assert_eq!(pages.len(), 6, "p1, p1+p2, p1+p3, p1: {pages:?}");
    }

    #[test]
    fn new_items_during_a_backfill_are_caught_by_the_head() {
        let (dir, http, mut cfg) = setup(FileMode::Stream);
        cfg.sync.pages_per_refresh = 1;
        http.push(
            &format!("{API_BASE}/channels/refs"),
            200,
            r#"{"title":"CAD refs"}"#,
        );
        http.push(
            &contents_url(1),
            200,
            image_page(
                &[(5, "2026-11-05T00:00:00Z"), (4, "2026-11-04T00:00:00Z")],
                Some(2),
            ),
        );
        // Before the second refresh, block 6 is added at the top.
        for _ in 0..2 {
            http.push(
                &contents_url(1),
                200,
                image_page(
                    &[(6, "2026-11-06T00:00:00Z"), (5, "2026-11-05T00:00:00Z")],
                    Some(2),
                ),
            );
        }
        http.push(
            &contents_url(2),
            200,
            image_page(
                &[(4, "2026-11-04T00:00:00Z"), (3, "2026-11-03T00:00:00Z")],
                None,
            ),
        );
        let mut catalog = Catalog::open_in_memory().unwrap();
        let mut engine = SyncEngine::new(LibraryPaths::new(dir.path()), &mut catalog, http.clone());
        engine.sleep_enabled = false;
        let mut conns = arena(&http);
        for _ in 0..3 {
            engine.run(&cfg, &mut conns, Trigger::Launch).unwrap();
        }
        drop(engine);
        assert_eq!(catalog.block_count().unwrap(), 4, "blocks 3 to 6");
        assert_eq!(
            catalog.watermark(1).unwrap().as_deref(),
            Some("2026-11-06T00:00:00Z")
        );
    }

    #[test]
    fn transient_failures_are_retried_then_succeed() {
        let (dir, http, cfg) = setup(FileMode::Stream);
        http.push(&format!("{API_BASE}/channels/refs"), 503, "busy");
        queue_channel(&http);
        let mut catalog = Catalog::open_in_memory().unwrap();
        let mut engine = SyncEngine::new(LibraryPaths::new(dir.path()), &mut catalog, http.clone());
        engine.sleep_enabled = false;
        let s = engine
            .run(&cfg, &mut arena(&http), Trigger::Launch)
            .unwrap();
        assert!(s.errors.is_empty(), "{:?}", s.errors);
        assert_eq!(s.blocks_upserted, 3);
    }
}
