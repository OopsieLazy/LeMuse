//! Local library on disk.
//!
//! ```text
//! <library root>/
//!   servensurf.toml     user config + gather list
//!   catalog.db         SQLite (WAL) — the source of truth for metadata
//!   objects/ab/cd/<sha256>.<ext>   content-addressed originals (never edit)
//!   thumbs/<sha256>.webp           generated thumbnails (disposable cache)
//!   views/<collection>/<title> [<id>].<ext>   hardlinks for Explorer browsing
//!   .sync.lock         held while a gather run is active
//! ```
//!
//! `objects/` is the durable store; `views/` and `thumbs/` can always be
//! rebuilt from the catalog. See ADR-0002.

pub mod blobs;
pub mod catalog;
pub mod views;

use std::path::{Path, PathBuf};

pub const CATALOG_FILE: &str = "catalog.db";
pub const OBJECTS_DIR: &str = "objects";
pub const THUMBS_DIR: &str = "thumbs";
pub const VIEWS_DIR: &str = "views";
pub const LOCK_FILE: &str = ".sync.lock";

/// Resolved paths for one library root.
#[derive(Debug, Clone)]
pub struct LibraryPaths {
    pub root: PathBuf,
}

impl LibraryPaths {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }
    pub fn catalog(&self) -> PathBuf {
        self.root.join(CATALOG_FILE)
    }
    pub fn objects(&self) -> PathBuf {
        self.root.join(OBJECTS_DIR)
    }
    pub fn thumbs(&self) -> PathBuf {
        self.root.join(THUMBS_DIR)
    }
    pub fn views(&self) -> PathBuf {
        self.root.join(VIEWS_DIR)
    }
    pub fn lock(&self) -> PathBuf {
        self.root.join(LOCK_FILE)
    }
    pub fn config(&self) -> PathBuf {
        self.root.join(crate::config::CONFIG_FILE_NAME)
    }

    /// Create the directory skeleton if missing (idempotent).
    pub fn ensure(&self) -> crate::Result<()> {
        for dir in [
            self.root.clone(),
            self.objects(),
            self.thumbs(),
            self.views(),
        ] {
            std::fs::create_dir_all(&dir).map_err(|e| crate::Error::io(&dir, e))?;
        }
        Ok(())
    }

    pub fn root(&self) -> &Path {
        &self.root
    }
}
