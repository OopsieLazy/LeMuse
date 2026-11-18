//! Gathering orchestration. One code path for every trigger:
//! app launch, interval timer, "Gather now" button, and the CLI run by
//! Windows Task Scheduler. See ADR-0003 and ADR-0005.

pub mod engine;
pub mod lock;
pub mod throttle;

pub use engine::{RunSummary, SyncEngine, Trigger};
pub use lock::SyncLock;

use std::sync::Arc;

use crate::config::Config;
use crate::connectors::{self, arena, http};
use crate::store::catalog::Catalog;
use crate::store::LibraryPaths;

/// The one entry point every front-end uses for a network refresh: launch,
/// the Refresh button, the CLI and Task Scheduler (ADR-0005). Builds the
/// production HTTP client and connectors, then runs the engine.
///
/// No Are.na token yet, so it runs at the guest budget (Credential Manager
/// token storage is a later milestone).
pub fn refresh_library(
    paths: &LibraryPaths,
    cfg: &Config,
    trigger: Trigger,
) -> crate::Result<RunSummary> {
    paths.ensure()?;
    let client = production_client(cfg);
    let mut conns = connectors::all(client.clone(), arena::Tier::Guest);
    let mut catalog = Catalog::open(&paths.catalog())?;
    let summary = {
        let mut engine = SyncEngine::new(paths.clone(), &mut catalog, client);
        engine.run(cfg, &mut conns, trigger)?
    };
    // Categories are derived from what was just fetched (ADR-0015).
    catalog.rebuild_categories(crate::categories::vocabulary())?;
    Ok(summary)
}

/// The production HTTP client every front-end shares: rustls, `https_only`,
/// the descriptive User-Agent. No Are.na token yet (guest budget).
pub fn production_client(cfg: &Config) -> Arc<dyn http::HttpClient> {
    Arc::new(http::UreqClient::new(
        http::user_agent(cfg.sync.contact.as_deref()),
        None,
    ))
}

/// Refresh one channel of one topic, right after "Add channel", instead of
/// every source (keeps the first look fast and inside the read budget).
/// Same engine, lock, throttle and policies as a full refresh.
pub fn refresh_channel(
    paths: &LibraryPaths,
    cfg: &Config,
    topic: &str,
    channel: &str,
    trigger: Trigger,
) -> crate::Result<RunSummary> {
    let Some(t) = cfg.topic(topic) else {
        return Err(crate::Error::Config(format!("no topic named `{topic}`")));
    };
    let mut one = cfg.clone();
    // A just-added channel may read more at once (up to 5,000 items), so a
    // big channel shows in full right away; the rest resumes later.
    one.sync.pages_per_refresh = one
        .sync
        .pages_per_refresh
        .max(crate::config::ADD_CHANNEL_PAGES);
    let mut t = t.clone();
    t.sources
        .retain(|s| s.source == arena::ID && s.channel.as_deref() == Some(channel));
    one.topics = vec![t];
    refresh_library(paths, &one, trigger)
}
