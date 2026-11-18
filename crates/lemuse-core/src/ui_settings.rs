//! Look-and-feel settings (theme, layout, sliders) chosen in the app's
//! Settings panel (ADR-0012).
//!
//! The WebView runs InPrivate (ADR-0009), so browser storage is wiped on
//! exit; settings live in `<library>/ui.json` instead. The core treats them
//! as an opaque JSON object: the UI owns the schema and clamps every value it
//! reads (they're untrusted input, like any file a user can edit). The core
//! only enforces shape and size, and writes atomically.

use std::io::Write;

use serde_json::{Map, Value};

use crate::store::LibraryPaths;
use crate::{Error, Result};

/// Settings are a few hundred bytes; anything far larger is not ours.
pub const MAX_BYTES: usize = 16 * 1024;

/// Read the saved settings. A missing, unreadable or malformed file yields an
/// empty object (the UI then uses its defaults); it is never an error that
/// stops the app from opening.
pub fn load(paths: &LibraryPaths) -> Value {
    let path = paths.ui_settings();
    let parsed = std::fs::read(&path)
        .ok()
        .filter(|b| b.len() <= MAX_BYTES)
        .and_then(|b| serde_json::from_slice::<Value>(&b).ok());
    match parsed {
        Some(v @ Value::Object(_)) => v,
        _ => Value::Object(Map::new()),
    }
}

/// Save settings atomically (write a temp file next to it, then rename), so
/// a crash mid-write can't leave a half-written file.
pub fn save(paths: &LibraryPaths, value: &Value) -> Result<()> {
    if !value.is_object() {
        return Err(Error::Config("ui settings must be a JSON object".into()));
    }
    let bytes = serde_json::to_vec_pretty(value).map_err(|e| Error::Config(e.to_string()))?;
    if bytes.len() > MAX_BYTES {
        return Err(Error::Config(format!(
            "ui settings are {} bytes; the limit is {MAX_BYTES}",
            bytes.len()
        )));
    }
    paths.ensure()?;
    let path = paths.ui_settings();
    let tmp = path.with_extension("json.tmp");
    {
        let mut f = std::fs::File::create(&tmp).map_err(|e| Error::io(&tmp, e))?;
        f.write_all(&bytes).map_err(|e| Error::io(&tmp, e))?;
        f.sync_all().map_err(|e| Error::io(&tmp, e))?;
    }
    std::fs::rename(&tmp, &path).map_err(|e| Error::io(&path, e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn lib() -> (tempfile::TempDir, LibraryPaths) {
        let dir = tempfile::tempdir().unwrap();
        let paths = LibraryPaths::new(dir.path());
        (dir, paths)
    }

    #[test]
    fn round_trips_and_overwrites() {
        let (_d, paths) = lib();
        assert_eq!(load(&paths), json!({}));
        save(&paths, &json!({"preset": "gallery", "uiScale": 1.1})).unwrap();
        save(&paths, &json!({"preset": "paper"})).unwrap();
        assert_eq!(load(&paths), json!({"preset": "paper"}));
        assert!(!paths.ui_settings().with_extension("json.tmp").exists());
    }

    #[test]
    fn rejects_non_objects_and_oversized_values() {
        let (_d, paths) = lib();
        assert!(save(&paths, &json!(["not", "an", "object"])).is_err());
        let huge = json!({ "x": "a".repeat(MAX_BYTES) });
        assert!(save(&paths, &huge).is_err());
        assert!(!paths.ui_settings().exists());
    }

    #[test]
    fn malformed_file_loads_as_defaults() {
        let (_d, paths) = lib();
        paths.ensure().unwrap();
        std::fs::write(paths.ui_settings(), b"{ not json").unwrap();
        assert_eq!(load(&paths), json!({}));
        std::fs::write(paths.ui_settings(), b"[1,2]").unwrap();
        assert_eq!(load(&paths), json!({}));
    }
}
