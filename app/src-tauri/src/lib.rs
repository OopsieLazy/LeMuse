//! Tauri shell. Deliberately thin: every command delegates to
//! lemuse-core so GUI and CLI behaviour can never drift (ADR-0001).
//!
//! Launch flow (ADR-0005, ADR-0007): the window opens immediately from the
//! local catalog; if `sync.on_launch` is set, a metadata refresh starts on a
//! background thread and reports through the `refresh://status` event.
//! Images are streamed by the WebView straight from the source CDN, and the
//! WebView runs InPrivate (`incognito` in tauri.conf.json), so no image is
//! ever written to a disk cache (ADR-0009).

use std::collections::BTreeSet;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use lemuse_core::config::Config;
use lemuse_core::import::AddedChannel;
use lemuse_core::store::catalog::{Catalog, Playlist, Slide};
use lemuse_core::store::LibraryPaths;
use lemuse_core::sync::{refresh_channel, refresh_library, Trigger};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};

/// Most slides one `slides` call returns.
const PAGE_LIMIT: u32 = 500;
/// Minimum time between two "Add channel" lookups. Each costs one Are.na
/// read; this stops a script in a compromised page from spending the read
/// budget: at most 24 lookups a minute, the 80% guest budget (review 0008 A-30).
const ADD_COOLDOWN: Duration = Duration::from_millis(2500);

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
    slides: u64,
    /// Are.na channel slugs, for the Add-channel dialog's remove list.
    channels: Vec<String>,
}

/// What the slideshow plays. Every field is checked by the core before use.
#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
enum SlideSource {
    /// Every topic's images at once.
    All,
    Topic {
        name: String,
    },
    Playlist {
        id: i64,
    },
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

/// Serialises edits to lemuse.toml and holds the Add-channel cooldown.
#[derive(Default)]
struct ConfigEdits(Mutex<Option<Instant>>);

fn catalog() -> Result<Catalog, String> {
    Catalog::open(&library_paths().catalog()).map_err(|e| e.to_string())
}

/// `(connector, key)` pairs of every topic, deduplicated, for "All".
fn all_keys(cfg: &Config) -> Vec<(String, String)> {
    cfg.topics
        .iter()
        .flat_map(|t| t.collection_keys())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

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
            Ok(TopicInfo {
                name: t.name.clone(),
                slide_seconds: t.slide_seconds,
                shuffle: t.shuffle,
                sources: t.resolved_sources().len(),
                slides: catalog
                    .count_slides(&t.collection_keys())
                    .map_err(|e| e.to_string())?,
                channels: t
                    .sources
                    .iter()
                    .filter(|s| s.source == lemuse_core::connectors::arena::ID)
                    .filter_map(|s| s.channel.clone())
                    .collect(),
            })
        })
        .collect()
}

/// Image count for "All".
#[tauri::command]
fn all_count() -> Result<u64, String> {
    let cfg = load_config(&library_paths())?;
    catalog()?
        .count_slides(&all_keys(&cfg))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn slides(source: SlideSource, limit: u32, offset: u32) -> Result<Vec<Slide>, String> {
    let limit = limit.min(PAGE_LIMIT);
    let catalog = catalog()?;
    match source {
        SlideSource::All => {
            let cfg = load_config(&library_paths())?;
            catalog.slides(&all_keys(&cfg), limit, offset)
        }
        SlideSource::Topic { name } => {
            let cfg = load_config(&library_paths())?;
            let t = cfg
                .topic(&name)
                .ok_or_else(|| format!("no topic named `{name}`"))?;
            catalog.slides(&t.collection_keys(), limit, offset)
        }
        SlideSource::Playlist { id } => catalog.playlist_slides(id, limit, offset),
    }
    .map_err(|e| e.to_string())
}

// ── Add channel (ADR-0014) ──────────────────────────────────────────────

/// Paste-a-link import. The core parses the link (exact Are.na hosts only;
/// the pasted URL itself is never fetched), looks the channel up once,
/// edits lemuse.toml structurally, and then this channel alone is refreshed
/// in the background. Runs off the main thread so the window stays live.
#[tauri::command]
async fn add_channel(
    app: AppHandle,
    link: String,
    topic: String,
    create_topic: bool,
) -> Result<AddedChannel, String> {
    let added = tauri::async_runtime::spawn_blocking({
        let app = app.clone();
        move || -> Result<AddedChannel, String> {
            // A refresh is already spending Are.na's read budget; a lookup on
            // top could push past it (review 0008 A-30).
            if app.state::<Refreshing>().0.load(Ordering::SeqCst) {
                return Err(
                    "A refresh is running. Add the channel when it finishes (they share Are.na's read limit)."
                        .into(),
                );
            }
            let edits = app.state::<ConfigEdits>();
            let mut next_allowed = edits
                .0
                .lock()
                .map_err(|_| "config lock poisoned".to_string())?;
            let now = Instant::now();
            if let Some(at) = *next_allowed {
                if now < at {
                    let wait = (at - now).as_secs() + 1;
                    return Err(format!("One moment: try again in {wait} s."));
                }
            }
            *next_allowed = Some(now + ADD_COOLDOWN);
            let paths = library_paths();
            let cfg = load_config(&paths)?;
            let http = lemuse_core::sync::production_client(&cfg);
            let result = lemuse_core::import::add_channel(
                http.as_ref(),
                &paths.config(),
                &link,
                &topic,
                create_topic,
            );
            // Honour Are.na's Retry-After before the next lookup.
            if let Err(lemuse_core::Error::RateLimited {
                retry_after_secs, ..
            }) = &result
            {
                *next_allowed = Some(now + Duration::from_secs((*retry_after_secs).clamp(1, 600)));
            }
            result.map_err(|e| e.to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())??;
    let flag = app.state::<Refreshing>().0.clone();
    spawn_channel_refresh(app, flag, added.topic.clone(), added.channel.slug.clone());
    Ok(added)
}

#[tauri::command]
fn remove_channel(
    edits: State<'_, ConfigEdits>,
    topic: String,
    channel: String,
) -> Result<bool, String> {
    let _guard = edits
        .0
        .lock()
        .map_err(|_| "config lock poisoned".to_string())?;
    lemuse_core::config_edit::remove_channel(&library_paths().config(), &topic, &channel)
        .map_err(|e| e.to_string())
}

/// Refresh only the new channel. If a full refresh is running, wait for it
/// (it read the config before the channel existed), then go.
fn spawn_channel_refresh(app: AppHandle, flag: Arc<AtomicBool>, topic: String, channel: String) {
    std::thread::spawn(move || {
        let deadline = Instant::now() + Duration::from_secs(15 * 60);
        while flag.swap(true, Ordering::SeqCst) {
            if Instant::now() > deadline {
                return;
            }
            std::thread::sleep(Duration::from_millis(500));
        }
        let name = Trigger::Manual.as_str();
        let _ = app.emit("refresh://status", RefreshEvent::Running { trigger: name });
        let paths = library_paths();
        let result = load_config(&paths).and_then(|cfg| {
            refresh_channel(&paths, &cfg, &topic, &channel, Trigger::Manual)
                .map_err(|e| e.to_string())
        });
        flag.store(false, Ordering::SeqCst);
        let _ = app.emit("refresh://status", done_event(name, result));
    });
}

// ── Playlists: local lists of images (ADR-0014) ─────────────────────────

#[tauri::command]
fn playlists() -> Result<Vec<Playlist>, String> {
    catalog()?.playlists().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_playlist(name: String) -> Result<Playlist, String> {
    catalog()?.create_playlist(&name).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_playlist(id: i64, name: String) -> Result<bool, String> {
    catalog()?
        .rename_playlist(id, &name)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_playlist(id: i64) -> Result<bool, String> {
    catalog()?.delete_playlist(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_in_playlist(playlist_id: i64, block_id: i64, present: bool) -> Result<(), String> {
    catalog()?
        .set_in_playlist(playlist_id, block_id, present)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn playlists_with(block_id: i64) -> Result<Vec<i64>, String> {
    catalog()?
        .playlists_with(block_id)
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
        let _ = app.emit("refresh://status", done_event(name, result));
    });
}

fn done_event(
    trigger: &'static str,
    result: Result<lemuse_core::sync::RunSummary, String>,
) -> RefreshEvent {
    match result {
        Ok(s) => RefreshEvent::Done {
            trigger,
            blocks_upserted: s.blocks_upserted,
            errors: s.errors.len(),
        },
        Err(message) => RefreshEvent::Error { trigger, message },
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Refreshing::default())
        .manage(ConfigEdits::default())
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
            set_ui_settings,
            all_count,
            add_channel,
            remove_channel,
            playlists,
            create_playlist,
            rename_playlist,
            delete_playlist,
            set_in_playlist,
            playlists_with
        ])
        .run(tauri::generate_context!())
        .expect("error while running LeMuse");
}
