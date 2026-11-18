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
    let client: Arc<dyn http::HttpClient> = Arc::new(http::UreqClient::new(
        http::user_agent(cfg.sync.contact.as_deref()),
        None,
    ));
    let mut conns = connectors::all(client.clone(), arena::Tier::Guest);
    let mut catalog = Catalog::open(&paths.catalog())?;
    let mut engine = SyncEngine::new(paths.clone(), &mut catalog, client);
    engine.run(cfg, &mut conns, trigger)
}
