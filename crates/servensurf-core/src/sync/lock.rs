//! Single-run lock so the GUI's launch sync and a scheduled CLI sync never
//! write the library at the same time.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

use crate::{Error, Result};

/// A lock older than this is assumed to belong to a crashed run.
pub const STALE_AFTER: Duration = Duration::from_secs(6 * 60 * 60);

#[derive(Debug)]
pub struct SyncLock {
    path: PathBuf,
}

impl SyncLock {
    pub fn acquire(path: &Path) -> Result<Self> {
        if is_stale(path) {
            let _ = std::fs::remove_file(path);
        }
        let mut f = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(path)
            .map_err(|e| match e.kind() {
                std::io::ErrorKind::AlreadyExists => Error::SyncLocked(path.to_path_buf()),
                _ => Error::io(path, e),
            })?;
        let _ = writeln!(f, "pid={}", std::process::id());
        Ok(Self {
            path: path.to_path_buf(),
        })
    }
}

impl Drop for SyncLock {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.path);
    }
}

fn is_stale(path: &Path) -> bool {
    std::fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| SystemTime::now().duration_since(t).ok())
        .is_some_and(|age| age > STALE_AFTER)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn second_acquire_fails_until_released() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join(".sync.lock");
        let first = SyncLock::acquire(&p).unwrap();
        assert!(matches!(SyncLock::acquire(&p), Err(Error::SyncLocked(_))));
        drop(first);
        assert!(SyncLock::acquire(&p).is_ok());
    }
}
