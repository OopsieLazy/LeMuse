//! Gathering orchestration. One code path for every trigger:
//! app launch, interval timer, "Gather now" button, and the CLI run by
//! Windows Task Scheduler. See ADR-0003 and ADR-0005.

pub mod engine;
pub mod lock;
pub mod throttle;

pub use engine::{RunSummary, SyncEngine, Trigger};
pub use lock::SyncLock;
