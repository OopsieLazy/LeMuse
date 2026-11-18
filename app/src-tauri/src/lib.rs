//! Tauri shell. Deliberately thin: every command delegates to
//! servensurf-core so GUI and CLI behaviour can never drift (ADR-0001).
//!
//! Launch flow (ADR-0005, ADR-0007): the window opens immediately from the
//! local catalog; if `sync.on_launch` is set, a metadata refresh starts on a
//! background thread and reports progress through `refresh://progress`.
//! Images are streamed by the WebView straight from the source CDN.

use serde::Serialize;
use servensurf_core::config::Config;
use servensurf_core::store::catalog::{Catalog, Slide};
use servensurf_core::store::LibraryPaths;

#[derive(Serialize)]
struct LibraryStatus {
    root: String,
    blocks: u64,
    schema_version: u32,
}

#[derive(Serialize)]
struct TopicInfo {
    name: String,
    slide_seconds: u32,
    shuffle: bool,
    sources: usize,
}

fn library_paths() -> LibraryPaths {
    LibraryPaths::new(Config::default_root())
}

fn load_config(paths: &LibraryPaths) -> Result<Config, String> {
    let path = paths.config();
    if !path.exists() {
        return Ok(Config::new(paths.root()));
    }
    Config::load(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn library_status() -> Result<LibraryStatus, String> {
    let paths = library_paths();
    paths.ensure().map_err(|e| e.to_string())?;
    let catalog = Catalog::open(&paths.catalog()).map_err(|e| e.to_string())?;
    Ok(LibraryStatus {
        root: paths.root().display().to_string(),
        blocks: catalog.block_count().map_err(|e| e.to_string())?,
        schema_version: catalog.schema_version().map_err(|e| e.to_string())?,
    })
}

#[tauri::command]
fn topics() -> Result<Vec<TopicInfo>, String> {
    let cfg = load_config(&library_paths())?;
    Ok(cfg
        .topics
        .iter()
        .map(|t| TopicInfo {
            name: t.name.clone(),
            slide_seconds: t.slide_seconds,
            shuffle: t.shuffle,
            sources: t.sources.len(),
        })
        .collect())
}

#[tauri::command]
fn slides(topic: String, limit: u32, offset: u32) -> Result<Vec<Slide>, String> {
    let paths = library_paths();
    let cfg = load_config(&paths)?;
    let t = cfg
        .topic(&topic)
        .ok_or_else(|| format!("no topic named `{topic}`"))?;
    let catalog = Catalog::open(&paths.catalog()).map_err(|e| e.to_string())?;
    catalog
        .slides(&t.collection_keys(), limit.min(500), offset)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn search(query: String) -> Result<Vec<i64>, String> {
    let catalog = Catalog::open(&library_paths().catalog()).map_err(|e| e.to_string())?;
    catalog.search(&query, 200).map_err(|e| e.to_string())
}

#[tauri::command]
fn refresh_now() -> Result<(), String> {
    // M1: spawn SyncEngine::run(Trigger::Manual) on a worker thread and emit
    // `refresh://progress` events. Shares the code path with launch refresh.
    Err("refresh lands in M1 (see docs/PLAN.md)".into())
}

pub fn run() {
    tauri::Builder::default()
        .setup(|_app| {
            // M1: read config; if sync.on_launch, spawn the launch refresh
            // thread here (Trigger::Launch). The UI never waits on it.
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            library_status,
            topics,
            slides,
            search,
            refresh_now
        ])
        .run(tauri::generate_context!())
        .expect("error while running ServeNSurf");
}
