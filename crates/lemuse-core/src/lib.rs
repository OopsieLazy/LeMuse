//! lemuse-core — everything that is not UI.
//!
//! The GUI (Tauri shell) and the CLI (`lemuse`) are thin front-ends over this
//! crate, so a launch-time sync, a scheduled sync and a manual "Gather now"
//! button all run the exact same code path. See `docs/ARCHITECTURE.md`.
//!
//! Module map:
//! - [`model`]      — the local "block" data model (source-agnostic).
//! - [`config`]     — user config: library root + gather list (TOML).
//! - [`store`]      — catalog (SQLite + FTS5) and content-addressed blob store.
//! - [`connectors`] — one adapter per source (Are.na first), behind a trait.
//! - [`sync`]       — orchestration: lock, plan, fetch, diff, download, backoff.

pub mod config;
pub mod connectors;
pub mod error;
pub mod model;
pub mod store;
pub mod sync;
pub mod ui_settings;

pub use error::{Error, Result};

/// Identifies this client to every remote service. Are.na's edge blocks
/// generic browser user agents, and Wikimedia/Poly Haven require a
/// descriptive one. Contact info is filled from config at runtime.
pub const USER_AGENT_PRODUCT: &str = concat!("LeMuse/", env!("CARGO_PKG_VERSION"));
