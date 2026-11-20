//! Save: put an image's full-size original in the library (ADR-0022).
//!
//! The one place LeMuse writes image bytes in stream mode (ADR-0007). The
//! original comes only from the source's own CDN (checked before the request
//! and again after redirects), must really be an image (magic bytes, not the
//! URL decide the type), is stored once by content hash in `objects/`, and is
//! hard-linked into `views/<folder>/` where you can browse it.
//!
//! Save as (ADR-0031): the app then copies that original to a file the user
//! chose in the native Save dialog (`copy_to`).

use std::path::{Path, PathBuf};

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

/// Image extensions a Save-as name may already carry.
const IMAGE_EXTS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "webp", "avif", "tif", "tiff", "bmp",
];

/// The file name Save as offers: the library's own name for it
/// ("Oak_ chair_ [7].jpg"), with the stored type, else the original URL's,
/// else jpg. A suggestion only; the user can change it in the dialog.
pub fn suggested_name(catalog: &Catalog, block_id: i64) -> Result<String> {
    let target = catalog
        .save_target(block_id)?
        .ok_or_else(|| refuse("that image is no longer in the catalog"))?;
    let ext = match &target.stored {
        Some((_, ext)) => ext.clone(),
        None => target
            .original_url
            .as_deref()
            .and_then(|u| u.split(['?', '#']).next())
            .and_then(|u| u.rsplit('/').next())
            .and_then(|f| f.rsplit_once('.'))
            .map(|(_, e)| e.to_ascii_lowercase())
            .filter(|e| IMAGE_EXTS.contains(&e.as_str()))
            .unwrap_or_else(|| "jpg".into()),
    };
    let view = views::view_path(Path::new(""), "x", target.title.as_deref(), block_id, &ext);
    Ok(view
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| format!("image [{block_id}].{ext}")))
}

/// `dest` with the image's real extension: kept when it already matches
/// (jpg = jpeg, tif = tiff), replaced when it names another image type,
/// appended otherwise ("notes" → "notes.png").
fn with_real_ext(dest: &Path, real: &str) -> PathBuf {
    let same = |a: &str, b: &str| {
        let norm = |e: &str| match e {
            "jpeg" => "jpg".to_string(),
            "tiff" => "tif".to_string(),
            other => other.to_string(),
        };
        norm(a) == norm(b)
    };
    match dest
        .extension()
        .map(|e| e.to_string_lossy().to_ascii_lowercase())
    {
        Some(e) if same(&e, real) => dest.to_path_buf(),
        Some(e) if IMAGE_EXTS.contains(&e.as_str()) => dest.with_extension(real),
        _ => {
            let mut name = dest
                .file_name()
                .map(|n| n.to_os_string())
                .unwrap_or_default();
            name.push(format!(".{real}"));
            dest.with_file_name(name)
        }
    }
}

/// Copy a saved original to `dest` (chosen in the Save dialog). It's written
/// to `<name>.part` beside it and then renamed, so a failed copy never leaves
/// half an image under the user's name; an existing file (the dialog asked)
/// is replaced. The extension is corrected to the image's real type.
/// Returns the final path.
pub fn copy_to(paths: &LibraryPaths, saved: &Saved, dest: &Path) -> Result<PathBuf> {
    let source = paths.root().join(&saved.view);
    let real = source
        .extension()
        .map(|e| e.to_string_lossy().to_ascii_lowercase())
        .ok_or_else(|| refuse("the saved original has no file type"))?;
    if !dest.is_absolute() || dest.file_name().is_none() {
        return Err(refuse("choose a file name in a folder"));
    }
    let dest = with_real_ext(dest, &real);
    let mut part_name = dest
        .file_name()
        .map(|n| n.to_os_string())
        .unwrap_or_default();
    part_name.push(".part");
    let part = dest.with_file_name(part_name);
    std::fs::copy(&source, &part).map_err(|e| Error::io(&part, e))?;
    if let Err(e) = std::fs::rename(&part, &dest) {
        let _ = std::fs::remove_file(&part);
        return Err(Error::io(&dest, e));
    }
    Ok(dest)
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
            label: Default::default(),
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
    fn save_as_copies_the_original_where_the_user_chose() {
        let (d, paths, mut c) = library();
        let url = "https://d2w9rnfcy7mm78.cloudfront.net/7/original.jpg?v=2";
        let id = block(&mut c, "arena", url);
        // Before any download: the title and the URL's type.
        assert_eq!(
            suggested_name(&c, id).unwrap(),
            format!("Oak_ chair_ [{id}].jpg")
        );
        let http = FixtureClient::default();
        http.push(url, 200, JPEG.to_vec());
        let s = save_original(&paths, &c, &http, id, "Wood", false).unwrap();
        let out = d.path().join("My refs");
        std::fs::create_dir_all(&out).unwrap();
        // The typed name keeps a matching type (jpeg = jpg)...
        let a = copy_to(&paths, &s, &out.join("chair.JPEG")).unwrap();
        assert_eq!(a, out.join("chair.JPEG"));
        assert_eq!(std::fs::read(&a).unwrap(), JPEG);
        // ...a wrong image type is corrected, a non-image one appended.
        assert_eq!(
            copy_to(&paths, &s, &out.join("chair.png")).unwrap(),
            out.join("chair.jpg")
        );
        assert_eq!(
            copy_to(&paths, &s, &out.join("chair v2")).unwrap(),
            out.join("chair v2.jpg")
        );
        // An existing file is replaced (the dialog asked); no .part left behind.
        std::fs::write(out.join("old.jpg"), b"old").unwrap();
        copy_to(&paths, &s, &out.join("old.jpg")).unwrap();
        assert_eq!(std::fs::read(out.join("old.jpg")).unwrap(), JPEG);
        let parts = std::fs::read_dir(&out)
            .unwrap()
            .filter(|e| {
                e.as_ref()
                    .unwrap()
                    .file_name()
                    .to_string_lossy()
                    .ends_with(".part")
            })
            .count();
        assert_eq!(parts, 0);
        // The library copy is untouched, and a missing folder is an error.
        assert!(paths.root().join(&s.view).is_file());
        assert!(copy_to(&paths, &s, &out.join("nope").join("x.jpg")).is_err());
        assert!(copy_to(&paths, &s, Path::new("relative.jpg")).is_err());
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
