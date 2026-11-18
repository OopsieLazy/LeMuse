//! Content-addressed blob store: files are named by their SHA-256, so the
//! same image saved in five channels is stored once, re-downloads are cheap
//! to detect, and a half-written file can never masquerade as a good one.

use std::io::Write;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};

use crate::model::StoredFile;
use crate::{Error, Result};

pub struct BlobStore {
    objects_dir: PathBuf,
}

impl BlobStore {
    pub fn new(objects_dir: impl Into<PathBuf>) -> Self {
        Self {
            objects_dir: objects_dir.into(),
        }
    }

    /// `objects/ab/cd/abcd…ef.jpg` — two-level fan-out keeps directories small.
    pub fn path_for(&self, sha256: &str, ext: &str) -> PathBuf {
        let ext = normalize_ext(ext);
        self.objects_dir
            .join(&sha256[0..2])
            .join(&sha256[2..4])
            .join(format!("{sha256}.{ext}"))
    }

    pub fn contains(&self, sha256: &str, ext: &str) -> bool {
        self.path_for(sha256, ext).is_file()
    }

    /// Store bytes, returning the file record. Writes to a temp file in the
    /// target directory and renames, so readers never see partial files.
    pub fn put(&self, bytes: &[u8], ext: &str, role: &str) -> Result<StoredFile> {
        let sha256 = hash_bytes(bytes);
        let ext = normalize_ext(ext);
        let dest = self.path_for(&sha256, &ext);
        if !dest.is_file() {
            let dir = dest.parent().expect("blob path has a parent");
            std::fs::create_dir_all(dir).map_err(|e| Error::io(dir, e))?;
            let tmp = dir.join(format!(".{sha256}.part"));
            write_all(&tmp, bytes)?;
            std::fs::rename(&tmp, &dest).map_err(|e| Error::io(&dest, e))?;
        }
        Ok(StoredFile {
            sha256,
            ext,
            size_bytes: bytes.len() as u64,
            role: role.to_string(),
        })
    }
}

fn write_all(path: &Path, bytes: &[u8]) -> Result<()> {
    let mut f = std::fs::File::create(path).map_err(|e| Error::io(path, e))?;
    f.write_all(bytes).map_err(|e| Error::io(path, e))?;
    f.sync_all().map_err(|e| Error::io(path, e))
}

pub fn hash_bytes(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

/// Lower-case, strip leading dot, fall back to `bin` for empty/odd input.
pub fn normalize_ext(ext: &str) -> String {
    let e = ext.trim().trim_start_matches('.').to_ascii_lowercase();
    if e.is_empty() || e.len() > 10 || !e.chars().all(|c| c.is_ascii_alphanumeric()) {
        "bin".to_string()
    } else {
        e
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identical_bytes_are_stored_once() {
        let dir = tempfile::tempdir().unwrap();
        let store = BlobStore::new(dir.path());
        let a = store.put(b"hello", "JPG", "original").unwrap();
        let b = store.put(b"hello", ".jpg", "original").unwrap();
        assert_eq!(a.sha256, b.sha256);
        assert_eq!(a.ext, "jpg");
        assert!(store.contains(&a.sha256, "jpg"));
        assert_eq!(
            a.sha256,
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        );
    }

    #[test]
    fn path_uses_two_level_fanout() {
        let store = BlobStore::new("objects");
        let p = store.path_for("abcdef0123", "png");
        assert_eq!(p, PathBuf::from("objects/ab/cd/abcdef0123.png"));
    }

    #[test]
    fn odd_extensions_fall_back_to_bin() {
        assert_eq!(normalize_ext(""), "bin");
        assert_eq!(normalize_ext("../../x"), "bin");
        assert_eq!(normalize_ext("STEP"), "step");
    }
}
