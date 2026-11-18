//! Tauri shell. Deliberately thin: every command delegates to
//! lemuse-core so GUI and CLI behaviour can never drift (ADR-0001).
//!
//! Launch flow (ADR-0005, ADR-0007): the window opens immediately from the
//! local catalog; if `sync.on_launch` is set, a metadata refresh starts on a
//! background thread and reports through the `refresh://status` event.
//! Images are streamed by the WebView straight from the source CDN, and the
//! WebView runs InPrivate (`incognito` in tauri.conf.json), so no image is
//! ever written to a disk cache (ADR-0009).

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use lemuse_core::config::Config;
use lemuse_core::store::catalog::{Catalog, Slide};
use lemuse_core::store::LibraryPaths;
use lemuse_core::sync::{refresh_library, Trigger};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

/// Upper bound when counting a topic's slides for the rail.
const COUNT_LIMIT: u32 = 10_000;

#[derive(Serialize)]
struct LibraryStatus {
    root: String,
    blocks: u64,
    schema_version: u32,
    refreshing: bool,
}

#[derive(Serialize)]
struct TopicInfo {
    name: String,
    slide_seconds: u32,
    shuffle: bool,
    sources: usize,
    slides: usize,
}

#[derive(Clone, Serialize)]
#[serde(tag = "state", rename_all = "lowercase")]
enum RefreshEvent {
    Running {
        trigger: &'static str,
    },
    Done {
        trigger: &'static str,
        blocks_upserted: u32,
        errors: usize,
    },
    Error {
        trigger: &'static str,
        message: String,
    },
}

#[derive(Default)]
struct Refreshing(Arc<AtomicBool>);

/// `LEMUSE_LIBRARY` overrides the default folder (testing, portable use).
fn library_paths() -> LibraryPaths {
    let root = std::env::var_os("LEMUSE_LIBRARY")
        .map(PathBuf::from)
        .unwrap_or_else(Config::default_root);
    LibraryPaths::new(root)
}

fn load_config(paths: &LibraryPaths) -> Result<Config, String> {
    lemuse_core::config::ensure_library(paths).map_err(|e| e.to_string())
}

#[tauri::command]
fn library_status(refreshing: State<'_, Refreshing>) -> Result<LibraryStatus, String> {
    let paths = library_paths();
    load_config(&paths)?;
    let catalog = Catalog::open(&paths.catalog()).map_err(|e| e.to_string())?;
    Ok(LibraryStatus {
        root: paths.root().display().to_string(),
        blocks: catalog.block_count().map_err(|e| e.to_string())?,
        schema_version: catalog.schema_version().map_err(|e| e.to_string())?,
        refreshing: refreshing.0.load(Ordering::SeqCst),
    })
}

#[tauri::command]
fn topics() -> Result<Vec<TopicInfo>, String> {
    let paths = library_paths();
    let cfg = load_config(&paths)?;
    let catalog = Catalog::open(&paths.catalog()).map_err(|e| e.to_string())?;
    cfg.topics
        .iter()
        .map(|t| {
            let slides = catalog
                .slides(&t.collection_keys(), COUNT_LIMIT, 0)
                .map_err(|e| e.to_string())?
                .len();
            Ok(TopicInfo {
                name: t.name.clone(),
                slide_seconds: t.slide_seconds,
                shuffle: t.shuffle,
                sources: t.resolved_sources().len(),
                slides,
            })
        })
        .collect()
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

/// The Settings panel's saved look and feel (ADR-0012). Opaque JSON; the
/// UI validates and clamps every value it reads.
#[tauri::command]
fn get_ui_settings() -> serde_json::Value {
    lemuse_core::ui_settings::load(&library_paths())
}

#[tauri::command]
fn set_ui_settings(settings: serde_json::Value) -> Result<(), String> {
    lemuse_core::ui_settings::save(&library_paths(), &settings).map_err(|e| e.to_string())
}

#[tauri::command]
fn search(query: String) -> Result<Vec<i64>, String> {
    let catalog = Catalog::open(&library_paths().catalog()).map_err(|e| e.to_string())?;
    catalog.search(&query, 200).map_err(|e| e.to_string())
}

/// Starts a refresh on a worker thread and returns at once; progress
/// arrives as `refresh://status` events. A second press while one runs is
/// a no-op (the core's lock file also guards against the CLI).
#[tauri::command]
fn refresh_now(app: AppHandle, refreshing: State<'_, Refreshing>) -> Result<(), String> {
    spawn_refresh(app, refreshing.0.clone(), Trigger::Manual);
    Ok(())
}

fn spawn_refresh(app: AppHandle, flag: Arc<AtomicBool>, trigger: Trigger) {
    if flag.swap(true, Ordering::SeqCst) {
        return;
    }
    let name = trigger.as_str();
    let _ = app.emit("refresh://status", RefreshEvent::Running { trigger: name });
    std::thread::spawn(move || {
        let paths = library_paths();
        let result = load_config(&paths)
            .and_then(|cfg| refresh_library(&paths, &cfg, trigger).map_err(|e| e.to_string()));
        flag.store(false, Ordering::SeqCst);
        let event = match result {
            Ok(s) => RefreshEvent::Done {
                trigger: name,
                blocks_upserted: s.blocks_upserted,
                errors: s.errors.len(),
            },
            Err(message) => RefreshEvent::Error {
                trigger: name,
                message,
            },
        };
        let _ = app.emit("refresh://status", event);
    });
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Refreshing::default())
        .setup(|app| {
            // The window is already up from the cached catalog; the launch
            // refresh never blocks it.
            let on_launch = load_config(&library_paths())
                .map(|c| c.sync.on_launch)
                .unwrap_or(false);
            if on_launch {
                let flag = app.state::<Refreshing>().0.clone();
                spawn_refresh(app.handle().clone(), flag, Trigger::Launch);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            library_status,
            topics,
            slides,
            search,
            refresh_now,
            get_ui_settings,
            set_ui_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running LeMuse");
}
