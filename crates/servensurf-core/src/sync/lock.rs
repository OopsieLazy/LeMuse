//! Single-run lock so the GUI's launch refresh and a scheduled CLI refresh
//! never write the library at the same time.
//!
//! It is an OS file lock (`LockFileEx` on Windows), not a marker file: the
//! OS releases it when the holding process exits for any reason, so closing
//! the app mid-refresh or a crash can't leave a stale lock that blocks
//! refreshes (review 0003 D-25). The `.sync.lock` file itself may stay on
//! disk; only the lock on it matters.

use std::fs::{File, OpenOptions, TryLockError};
use std::io::Write;
use std::path::{Path, PathBuf};

use crate::{Error, Result};

#[derive(Debug)]
pub struct SyncLock {
    /// Holding the handle holds the lock; dropping it releases the lock.
    _file: File,
    path: PathBuf,
}

impl SyncLock {
    pub fn acquire(path: &Path) -> Result<Self> {
        let mut file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(path)
            .map_err(|e| Error::io(path, e))?;
        match file.try_lock() {
            Ok(()) => {}
            Err(TryLockError::WouldBlock) => return Err(Error::SyncLocked(path.to_path_buf())),
            Err(TryLockError::Error(e)) => return Err(Error::io(path, e)),
        }
        // Informational only (who holds it); the lock is what counts.
        let _ = file.set_len(0);
        let _ = writeln!(file, "pid={}", std::process::id());
        Ok(Self {
            _file: file,
            path: path.to_path_buf(),
        })
    }

    pub fn path(&self) -> &Path {
        &self.path
    }
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

    #[test]
    fn leftover_lock_file_without_a_holder_is_not_a_lock() {
        // What a killed process leaves behind: the file, but no OS lock.
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join(".sync.lock");
        std::fs::write(&p, "pid=999999\n").unwrap();
        assert!(SyncLock::acquire(&p).is_ok());
    }
}
