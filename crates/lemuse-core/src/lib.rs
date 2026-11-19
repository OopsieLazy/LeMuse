//! lemuse-core — everything that is not UI.
//!
//! The GUI (Tauri shell) and the CLI (`lemuse`) are thin front-ends over this
//! crate, so a launch-time sync, a scheduled sync and a manual "Gather now"
//! button all run the exact same code path. See `docs/ARCHITECTURE.md`.
//!
//! Module map:
//! - [`model`]      — the local "block" data model (source-agnostic).
//! - [`categories`] — LeMuse's own sorting of images (built-in vocabulary).
//! - [`config`]     — user config: library root + gather list (TOML).
//! - [`config_edit`] — structural, validated edits to that config.
//! - [`import`]     — "Add channel": pasted link → checked slug → topic.
//! - [`store`]      — catalog (SQLite + FTS5) and content-addressed blob store.
//! - [`connectors`] — one adapter per source (Are.na first), behind a trait.
//! - [`sync`]       — orchestration: lock, plan, fetch, diff, download, backoff.

pub mod categories;
pub mod config;
pub mod config_edit;
pub mod connectors;
pub mod credentials;
pub mod error;
pub mod export;
pub mod import;
pub mod model;
pub mod save;
pub mod serve;
pub mod store;
pub mod sync;
pub mod ui_settings;

pub use error::{Error, Result};

/// Identifies this client to every remote service. Are.na's edge blocks
/// generic browser user agents, and Wikimedia/Poly Haven require a
/// descriptive one. Contact info is filled from config at runtime.
pub const USER_AGENT_PRODUCT: &str = concat!("LeMuse/", env!("CARGO_PKG_VERSION"));
