//! Save: put an image's full-size original in the library (ADR-0022).
//!
//! The one place LeMuse writes image bytes in stream mode (ADR-0007). The
//! original comes only from the source's own CDN (checked before the request
//! and again after redirects), must really be an image (magic bytes, not the
//! URL decide the type), is stored once by content hash in `objects/`, and is
//! hard-linked into `views/<folder>/` where you can browse it.

use std::path::PathBuf;

use serde::Serialize;

use crate::connectors::download_allowed;
use crate::connectors::http::HttpClient;
use crate::store::blobs::BlobStore;
use crate::store::catalog::Catalog;
use crate::store::{views, LibraryPaths};
use crate::{Error, Result};

/// The folder for saves made from All (or with no folder given).
pub const DEFAULT_FOLDER: &str = "Saved";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Saved {
    pub block_id: i64,
    /// `views/<folder>/<file>`, relative to the library root.
    pub view: String,
    pub bytes: u64,
    /// The original was already stored; nothing was downloaded.
    pub already_stored: bool,
}

/// Image type from the file's first bytes; `None` for anything that isn't an
/// image we keep (HTML error pages, archives, executables...).
pub fn image_ext(bytes: &[u8]) -> Option<&'static str> {
    let b = bytes;
    if b.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("jpg")
    } else if b.starts_with(b"\x89PNG\r\n\x1a\n") {
        Some("png")
    } else if b.starts_with(b"GIF87a") || b.starts_with(b"GIF89a") {
        Some("gif")
    } else if b.len() >= 12 && &b[0..4] == b"RIFF" && &b[8..12] == b"WEBP" {
        Some("webp")
    } else if b.starts_with(b"II*\0") || b.starts_with(b"MM\0*") {
        Some("tif")
    } else if b.len() >= 12 && &b[4..8] == b"ftyp" && matches!(&b[8..12], b"avif" | b"avis") {
        Some("avif")
    } else if b.starts_with(b"BM") && b.len() > 26 {
        Some("bmp")
    } else {
        None
    }
}

fn refuse(message: impl Into<String>) -> Error {
    Error::Connector {
        connector: "save".into(),
        message: message.into(),
    }
}

/// Save one block's original into `views/<folder>/`. `folder` is a topic or
/// playlist name the caller resolved itself (never a raw path); it is
/// sanitised as a Windows folder name. `sleep` is false in tests (retries).
pub fn save_original(
    paths: &LibraryPaths,
    catalog: &Catalog,
    http: &dyn HttpClient,
    block_id: i64,
    folder: &str,
    sleep: bool,
) -> Result<Saved> {
    let target = catalog
        .save_target(block_id)?
        .ok_or_else(|| refuse("that image is no longer in the catalog"))?;
    let blobs = BlobStore::new(paths.objects());

    let (file, already_stored) = match &target.stored {
        Some((sha, ext)) if blobs.contains(sha, ext) => {
            let size = std::fs::metadata(blobs.path_for(sha, ext))
                .map(|m| m.len())
                .unwrap_or(0);
            let f = crate::model::StoredFile {
                sha256: sha.clone(),
                ext: ext.clone(),
                size_bytes: size,
                role: "original".into(),
            };
            (f, true)
        }
        _ => {
            let url = target
                .original_url
                .as_deref()
                .ok_or_else(|| refuse("this image has no full-size original to save"))?;
            if !download_allowed(&target.connector, url) {
                return Err(refuse(
                    "the original isn't on this source's own image server",
                ));
            }
            let resp = crate::sync::engine::retry(sleep, || {
                let r = http.get(url, &[("Accept", "image/*")])?;
                if (500..600).contains(&r.status) {
                    return Err(Error::Transient {
                        connector: "save".into(),
                        message: format!("HTTP {}", r.status),
                    });
                }
                Ok(r)
            })?;
            if !(200..300).contains(&resp.status) {
                return Err(refuse(format!(
                    "the image server answered HTTP {}",
                    resp.status
                )));
            }
            if let Some(final_url) = &resp.final_url {
                if !download_allowed(&target.connector, final_url) {
                    return Err(refuse("the image server redirected somewhere unexpected"));
                }
            }
            let ext = image_ext(&resp.body)
                .ok_or_else(|| refuse("the download isn't an image, so it wasn't saved"))?;
            (blobs.put(&resp.body, ext, "original")?, false)
        }
    };
    catalog.add_block_file(block_id, &file)?;

    let folder = if folder.trim().is_empty() {
        DEFAULT_FOLDER
    } else {
        folder
    };
    let view = views::view_path(
        &paths.views(),
        folder,
        target.title.as_deref(),
        block_id,
        &file.ext,
    );
    views::link_into_view(&blobs.path_for(&file.sha256, &file.ext), &view)?;
    let rel: PathBuf = view
        .strip_prefix(paths.root())
        .map(PathBuf::from)
        .unwrap_or_else(|_| view.clone());
    Ok(Saved {
        block_id,
        view: rel.to_string_lossy().replace('\\', "/"),
        bytes: file.size_bytes,
        already_stored,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::http::FixtureClient;
    use crate::model::{Block, BlockKind, LicenseInfo, MediaRef, SourceRef};

    const JPEG: &[u8] = &[
        0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, b'J', b'F', b'I', b'F', 0, 1,
    ];

    fn library() -> (tempfile::TempDir, LibraryPaths, Catalog) {
        let dir = tempfile::tempdir().unwrap();
        let paths = LibraryPaths::new(dir.path());
        paths.ensure().unwrap();
        let catalog = Catalog::open(&paths.catalog()).unwrap();
        (dir, paths, catalog)
    }

    fn block(c: &mut Catalog, connector: &str, original: &str) -> i64 {
        c.upsert_block(&Block {
            id: None,
            source: SourceRef {
                connector: connector.into(),
                remote_id: "7".into(),
                page_url: None,
                origin_url: None,
            },
            kind: BlockKind::Image,
            title: Some("Oak: chair?".into()),
            description: None,
            content: None,
            tags: vec![],
            license: LicenseInfo::default(),
            media: vec![MediaRef {
                role: "original".into(),
                url: original.into(),
                width: None,
                height: None,
            }],
            files: vec![],
            remote_updated_at: None,
        })
        .unwrap()
    }

    #[test]
    fn saves_once_into_the_folder_and_marks_the_slide() {
        let (_d, paths, mut c) = library();
        let url = "https://d2w9rnfcy7mm78.cloudfront.net/7/original.jpg";
        let id = block(&mut c, "arena", url);
        let http = FixtureClient::default();
        http.push(url, 503, "busy");
        http.push(url, 200, JPEG.to_vec());
        let s = save_original(&paths, &c, &http, id, "Wood objects", false).unwrap();
        assert!(!s.already_stored);
        assert_eq!(s.view, format!("views/Wood objects/Oak_ chair_ [{id}].jpg"));
        assert!(paths.root().join(&s.view).is_file());
        // Again, into another folder: no second download.
        let again = save_original(&paths, &c, &http, id, "", false).unwrap();
        assert!(again.already_stored);
        assert!(again.view.starts_with("views/Saved/"));
        assert_eq!(http.requests.lock().unwrap().len(), 2, "503 + 200 only");
        assert!(c.save_target(id).unwrap().unwrap().stored.is_some());
    }

    #[test]
    fn refuses_foreign_hosts_and_non_images() {
        let (_d, paths, mut c) = library();
        let http = FixtureClient::default();
        let evil = block(&mut c, "arena", "https://evil.example/x.jpg");
        assert!(save_original(&paths, &c, &http, evil, "x", false).is_err());
        assert!(
            http.requests.lock().unwrap().is_empty(),
            "no request to a foreign host"
        );

        let (_d2, paths2, mut c2) = library();
        let url = "https://openaccess-cdn.clevelandart.org/1/1_print.jpg";
        let id = block(&mut c2, "cleveland", url);
        let http2 = FixtureClient::default();
        http2.push(url, 200, b"<html>not an image</html>".to_vec());
        let e = save_original(&paths2, &c2, &http2, id, "x", false)
            .unwrap_err()
            .to_string();
        assert!(e.contains("isn't an image"), "{e}");
        assert!(c2.save_target(id).unwrap().unwrap().stored.is_none());
    }

    #[test]
    fn magic_bytes() {
        assert_eq!(image_ext(JPEG), Some("jpg"));
        assert_eq!(image_ext(b"\x89PNG\r\n\x1a\n...."), Some("png"));
        assert_eq!(image_ext(b"RIFF\0\0\0\0WEBPVP8 "), Some("webp"));
        assert_eq!(image_ext(b"MZ\x90\0"), None);
        assert_eq!(image_ext(b"%PDF-1.7"), None);
    }

    #[test]
    fn download_hosts_are_exact() {
        use crate::connectors::download_allowed as ok;
        assert!(ok("arena", "https://d2w9rnfcy7mm78.cloudfront.net/a.jpg"));
        assert!(!ok("arena", "http://d2w9rnfcy7mm78.cloudfront.net/a.jpg"));
        assert!(!ok(
            "arena",
            "https://d2w9rnfcy7mm78.cloudfront.net.evil.example/a.jpg"
        ));
        // A URL with user info ("x" at the CDN host) is refused.
        let userinfo = "https://x@d2w9rnfcy7mm78.cloudfront.net/a.jpg"; // secret-scan: allow userinfo test
        assert!(!ok("arena", userinfo));
        assert!(!ok(
            "arena",
            "https://openaccess-cdn.clevelandart.org/a.jpg"
        ));
        assert!(!ok("unknown", "https://images.are.na/a.jpg"));
    }
}
