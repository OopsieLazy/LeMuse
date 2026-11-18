//! Human-browsable folder views: `views/<collection>/<title> [<id>].<ext>`.
//!
//! Hardlinks, not symlinks: Windows symlinks need Developer Mode or admin,
//! hardlinks don't, and they cost no extra disk space. If hardlinking fails
//! (e.g. the library spans volumes) we fall back to a copy.

use std::path::{Path, PathBuf};

use crate::{Error, Result};

/// Characters Windows forbids in file names, plus control chars.
const FORBIDDEN: &[char] = &['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
const RESERVED: &[&str] = &[
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];
const MAX_STEM: usize = 80;

/// Make an arbitrary title safe as a Windows file/folder name.
pub fn sanitize_name(raw: &str) -> String {
    let mut s: String = raw
        .chars()
        .map(|c| {
            if FORBIDDEN.contains(&c) || c.is_control() {
                '_'
            } else {
                c
            }
        })
        .collect();
    s = s.trim().trim_end_matches(['.', ' ']).to_string();
    if s.chars().count() > MAX_STEM {
        s = s
            .chars()
            .take(MAX_STEM)
            .collect::<String>()
            .trim_end()
            .to_string();
    }
    if s.is_empty() {
        s = "untitled".into();
    }
    if RESERVED.iter().any(|r| r.eq_ignore_ascii_case(&s)) {
        s.push('_');
    }
    s
}

/// The view path for one block file. The local id keeps names unique.
pub fn view_path(
    views_dir: &Path,
    collection: &str,
    title: Option<&str>,
    block_id: i64,
    ext: &str,
) -> PathBuf {
    let stem = sanitize_name(title.unwrap_or("untitled"));
    views_dir
        .join(sanitize_name(collection))
        .join(format!("{stem} [{block_id}].{ext}"))
}

/// Hardlink `object` into the view location, falling back to copy.
pub fn link_into_view(object: &Path, view: &Path) -> Result<()> {
    if view.exists() {
        return Ok(());
    }
    if let Some(dir) = view.parent() {
        std::fs::create_dir_all(dir).map_err(|e| Error::io(dir, e))?;
    }
    if std::fs::hard_link(object, view).is_err() {
        std::fs::copy(object, view).map_err(|e| Error::io(view, e))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitizes_windows_hostile_names() {
        assert_eq!(sanitize_name("a/b:c*d?"), "a_b_c_d_");
        assert_eq!(sanitize_name("  trailing dots... "), "trailing dots");
        assert_eq!(sanitize_name("CON"), "CON_");
        assert_eq!(sanitize_name(""), "untitled");
        assert_eq!(sanitize_name(&"x".repeat(200)).len(), MAX_STEM);
    }

    #[test]
    fn view_path_is_unique_per_block() {
        let p = view_path(Path::new("views"), "Chairs", Some("Eames: side"), 42, "jpg");
        assert_eq!(p, PathBuf::from("views/Chairs/Eames_ side [42].jpg"));
    }

    #[test]
    fn link_into_view_creates_file() {
        let dir = tempfile::tempdir().unwrap();
        let obj = dir.path().join("obj.bin");
        std::fs::write(&obj, b"data").unwrap();
        let view = dir.path().join("views/c/x [1].bin");
        link_into_view(&obj, &view).unwrap();
        assert_eq!(std::fs::read(&view).unwrap(), b"data");
    }
}
