//! Tauri shell. Deliberately thin: every command delegates to
//! lemuse-core so GUI and CLI behaviour can never drift (ADR-0001).
//!
//! Launch flow (ADR-0005, ADR-0007): the window opens immediately from the
//! local catalog; if `sync.on_launch` is set, a metadata refresh starts on a
//! background thread and reports through the `refresh://status` event.
//! Images are streamed by the WebView straight from the source CDN, and the
//! WebView runs InPrivate (`incognito` in tauri.conf.json), so no image is
//! ever written to a disk cache (ADR-0009).
//!
//! Every command runs off the main thread (ADR-0024): Tauri runs plain
//! `fn` commands on the UI thread, where a slow catalog query would freeze
//! the window. Failures reach the page as `{ code, message }`.

use std::collections::BTreeSet;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use lemuse_core::categories;
use lemuse_core::config::Config;
use lemuse_core::connectors::arena;
use lemuse_core::error::code;
use lemuse_core::import::AddedChannel;
use lemuse_core::store::catalog::{Catalog, CategoryCount, CategoryFilter, Playlist, Scope, Slide};
use lemuse_core::store::LibraryPaths;
use lemuse_core::sync::{refresh_channel, refresh_library, Trigger};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

/// Most slides one `slides` call returns: one page of the page menu.
const PAGE_LIMIT: u32 = 500;
/// Longest a UI-started Are.na read waits for its turn before giving up.
const MAX_READ_WAIT: Duration = Duration::from_secs(30);
/// Failed sources listed in Refresh details.
const MAX_FAILED_LISTED: usize = 20;

/// A command's failure as the page sees it (ADR-0024): a stable code from
/// `lemuse_core::error::code` (or `internal`) and a message for people.
/// Never the token.
#[derive(Debug, Serialize)]
struct AppError {
    code: &'static str,
    message: String,
}

impl AppError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
    fn internal(message: impl Into<String>) -> Self {
        Self::new("internal", message)
    }
}

impl From<lemuse_core::Error> for AppError {
    fn from(e: lemuse_core::Error) -> Self {
        Self::new(e.code(), e.to_string())
    }
}

type Cmd<T> = Result<T, AppError>;

/// Run `f` on Tauri's blocking pool, never on the UI thread.
async fn blocking<T: Send + 'static>(f: impl FnOnce() -> Cmd<T> + Send + 'static) -> Cmd<T> {
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| AppError::internal(e.to_string()))?
}

fn poisoned<T>(_: T) -> AppError {
    AppError::internal("a lock was poisoned; restart LeMuse")
}

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
    /// The topic-list heading it sits under (e.g. "Following on Are.na").
    group: Option<String>,
}

/// About LeMuse (Settings → About).
#[derive(Serialize)]
struct About {
    version: &'static str,
    licence: &'static str,
    repository: &'static str,
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
    /// Everything you saved (ADR-0029).
    Saved,
    /// Full-text search over the catalog (ADR-0029).
    Search {
        query: String,
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
        /// Such as a refused Are.na token (ADR-0023).
        #[serde(skip_serializing_if = "Option::is_none")]
        note: Option<String>,
        /// What failed and why, for Refresh details (ADR-0024).
        #[serde(skip_serializing_if = "Vec::is_empty")]
        failed: Vec<String>,
    },
    Error {
        trigger: &'static str,
        code: &'static str,
        message: String,
    },
}

#[derive(Default)]
struct Refreshing(Arc<AtomicBool>);

/// Spacing between saves, so a script in a compromised page can't fill the
/// disk quickly (at most 120 saves a minute; review 0017).
const SAVE_SPACING: Duration = Duration::from_millis(500);

#[derive(Default)]
struct SaveGate(Mutex<Option<Instant>>);

/// Serialises edits to lemuse.toml and holds the time the next UI-started
/// Are.na read may start (shared by Add channel, Preview, Related, Following).
#[derive(Default)]
struct ConfigEdits {
    next_read: Mutex<Option<Instant>>,
    /// Held while lemuse.toml is edited (the core's file lock also guards
    /// against the CLI).
    edit: Mutex<()>,
}

/// Wait for this UI action's turn to read Are.na (D-74, ADR-0024), then
/// return when it started. Reads are spaced so they fit what the account's
/// limit leaves: while a refresh runs, the 20 % the engine keeps free
/// (guest 6 a minute, free 24); otherwise the 80 % budget (guest 24, free
/// 96). This also stops a script in a compromised page from spending the
/// budget (review 0008 A-30). Gives up after [`MAX_READ_WAIT`].
fn wait_for_reads(app: &AppHandle, reads: u32) -> Cmd<Instant> {
    let tier = if lemuse_core::credentials::arena_status().is_ok_and(|s| s.saved) {
        arena::Tier::Free
    } else {
        arena::Tier::Guest
    };
    let per_min = if app.state::<Refreshing>().0.load(Ordering::SeqCst) {
        tier.read_limit_per_min() - tier.budget_per_min()
    } else {
        tier.budget_per_min()
    }
    .max(1);
    let spacing = Duration::from_millis(60_000 / u64::from(per_min));
    let start = {
        let edits = app.state::<ConfigEdits>();
        let mut next = edits.next_read.lock().map_err(poisoned)?;
        let now = Instant::now();
        let start = next.map_or(now, |at| at.max(now));
        if start - now > MAX_READ_WAIT {
            let secs = (start - now).as_secs() + 1;
            return Err(AppError::new(
                code::BUSY,
                format!("Are.na's read limit is in use. Try again in {secs} s."),
            ));
        }
        *next = Some(start + spacing * reads);
        start
    };
    let now = Instant::now();
    if start > now {
        std::thread::sleep(start - now);
    }
    Ok(start)
}

/// Honour Are.na's Retry-After before the next UI-started read.
fn note_rate_limit<T>(app: &AppHandle, started: Instant, result: &lemuse_core::Result<T>) {
    if let Err(lemuse_core::Error::RateLimited {
        retry_after_secs, ..
    }) = result
    {
        if let Ok(mut next) = app.state::<ConfigEdits>().next_read.lock() {
            *next = Some(started + Duration::from_secs((*retry_after_secs).clamp(1, 600)));
        }
    }
}

fn catalog() -> Cmd<Catalog> {
    Ok(Catalog::open(&library_paths().catalog())?)
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

fn load_config(paths: &LibraryPaths) -> Cmd<Config> {
    Ok(lemuse_core::config::ensure_library(paths)?)
}

fn no_topic(name: &str) -> AppError {
    AppError::new(code::NOT_FOUND, format!("no topic named `{name}`"))
}

#[tauri::command]
async fn library_status(app: AppHandle) -> Cmd<LibraryStatus> {
    let flag = app.state::<Refreshing>().0.clone();
    blocking(move || {
        let paths = library_paths();
        load_config(&paths)?;
        let catalog = Catalog::open(&paths.catalog())?;
        Ok(LibraryStatus {
            root: paths.root().display().to_string(),
            blocks: catalog.block_count()?,
            schema_version: catalog.schema_version()?,
            refreshing: flag.load(Ordering::SeqCst),
        })
    })
    .await
}

#[tauri::command]
async fn topics() -> Cmd<Vec<TopicInfo>> {
    blocking(|| {
        let paths = library_paths();
        let cfg = load_config(&paths)?;
        let catalog = Catalog::open(&paths.catalog())?;
        cfg.topics
            .iter()
            .map(|t| {
                Ok(TopicInfo {
                    name: t.name.clone(),
                    slide_seconds: t.slide_seconds,
                    shuffle: t.shuffle,
                    sources: t.resolved_sources().len(),
                    slides: catalog.count_slides(&t.collection_keys())?,
                    channels: t
                        .sources
                        .iter()
                        .filter(|s| s.source == arena::ID)
                        .filter_map(|s| s.channel.clone())
                        .collect(),
                    group: t.group.clone(),
                })
            })
            .collect()
    })
    .await
}

/// Image count for "All".
#[tauri::command]
async fn all_count() -> Cmd<u64> {
    blocking(|| {
        let cfg = load_config(&library_paths())?;
        Ok(catalog()?.count_slides(&all_keys(&cfg))?)
    })
    .await
}

/// Run `f` on the catalog with the scope a [`SlideSource`] names.
fn with_scope<T>(
    source: &SlideSource,
    f: impl FnOnce(&Catalog, &Scope<'_>) -> lemuse_core::Result<T>,
) -> Cmd<T> {
    let catalog = catalog()?;
    let keys = match source {
        SlideSource::Playlist { id } => return Ok(f(&catalog, &Scope::Playlist(*id))?),
        SlideSource::Saved => return Ok(f(&catalog, &Scope::Saved)?),
        SlideSource::Search { query } => {
            // A bounded, plain query; the core turns words into safe FTS terms.
            let q: String = query.chars().take(200).collect();
            return Ok(f(&catalog, &Scope::Search(q))?);
        }
        SlideSource::All => all_keys(&load_config(&library_paths())?),
        SlideSource::Topic { name } => load_config(&library_paths())?
            .topic(name)
            .ok_or_else(|| no_topic(name))?
            .collection_keys(),
    };
    Ok(f(&catalog, &Scope::collections(&keys))?)
}

/// One page of slides (at most [`PAGE_LIMIT`]); the core checks the filter.
#[tauri::command]
async fn slides(
    source: SlideSource,
    filter: Option<CategoryFilter>,
    limit: u32,
    offset: u32,
) -> Cmd<Vec<Slide>> {
    blocking(move || {
        let filter = filter.unwrap_or_default();
        with_scope(&source, |c, scope| {
            c.slides_in(scope, &filter, limit.min(PAGE_LIMIT), offset)
        })
    })
    .await
}

/// Images in a view after the filter, over all pages (the page menu).
#[tauri::command]
async fn slide_count(source: SlideSource, filter: Option<CategoryFilter>) -> Cmd<u64> {
    blocking(move || {
        let filter = filter.unwrap_or_default();
        with_scope(&source, |c, scope| c.count_in(scope, &filter))
    })
    .await
}

/// Per-category counts for the filter's chips.
#[tauri::command]
async fn category_counts(
    source: SlideSource,
    filter: Option<CategoryFilter>,
) -> Cmd<Vec<CategoryCount>> {
    blocking(move || {
        let filter = filter.unwrap_or_default();
        with_scope(&source, |c, scope| c.category_counts(scope, &filter))
    })
    .await
}

/// The built-in category groups and the Discover word lists (ADR-0015).
#[tauri::command]
fn vocabulary() -> categories::UiVocabulary {
    categories::ui_vocabulary(categories::vocabulary())
}

/// Version, licence and project link (Settings → About).
#[tauri::command]
fn about() -> About {
    About {
        version: env!("CARGO_PKG_VERSION"),
        licence: "MIT",
        repository: lemuse_core::connectors::http::PROJECT_URL,
    }
}

// ── Save (ADR-0022) ─────────────────────────────────────────────────────

/// Save the current image's original into `views/<topic or playlist>/`
/// (`views/Saved/` from All). The folder comes from the source the core
/// resolves, never from a path the page sends.
#[tauri::command]
async fn save_image(
    app: AppHandle,
    block_id: i64,
    source: SlideSource,
) -> Cmd<lemuse_core::save::Saved> {
    blocking(move || {
        {
            let gate = app.state::<SaveGate>();
            let mut next = gate.0.lock().map_err(poisoned)?;
            let now = Instant::now();
            if next.is_some_and(|at| now < at) {
                return Err(AppError::new(
                    code::BUSY,
                    "One moment: the last save is still finishing.",
                ));
            }
            *next = Some(now + SAVE_SPACING);
        }
        let paths = library_paths();
        let cfg = load_config(&paths)?;
        let catalog = catalog()?;
        let folder = match &source {
            // From All, Saved or a search: the default Saved folder.
            SlideSource::All | SlideSource::Saved | SlideSource::Search { .. } => {
                lemuse_core::save::DEFAULT_FOLDER.to_string()
            }
            SlideSource::Topic { name } => cfg
                .topic(name)
                .map(|t| t.name.clone())
                .ok_or_else(|| no_topic(name))?,
            SlideSource::Playlist { id } => catalog
                .playlists()?
                .into_iter()
                .find(|p| p.id == *id)
                .map(|p| p.name)
                .ok_or_else(|| AppError::new(code::NOT_FOUND, "That playlist no longer exists."))?,
        };
        let http = lemuse_core::sync::production_client(&cfg);
        Ok(lemuse_core::save::save_original(
            &paths,
            &catalog,
            http.as_ref(),
            block_id,
            &folder,
            true,
        )?)
    })
    .await
}

// ── Are.na token (ADR-0023) ─────────────────────────────────────────────

/// Whether a token is saved, and for which account. The token itself never
/// goes to the page.
#[tauri::command]
async fn arena_token_status() -> Cmd<lemuse_core::credentials::TokenStatus> {
    blocking(|| Ok(lemuse_core::credentials::arena_status()?)).await
}

/// Check a pasted token with Are.na (one read), then keep it in Windows
/// Credential Manager. Nothing is saved if Are.na refuses it.
#[tauri::command]
async fn set_arena_token(token: String) -> Cmd<arena::Account> {
    blocking(move || {
        let cfg = load_config(&library_paths())?;
        Ok(lemuse_core::sync::save_arena_token(&cfg, &token)?)
    })
    .await
}

/// Remove the saved token; refreshes run as a guest again.
#[tauri::command]
async fn clear_arena_token() -> Cmd<bool> {
    blocking(|| Ok(lemuse_core::credentials::clear_arena_token()?)).await
}

/// The channels the token's Are.na account follows: one page, one read,
/// only when asked (ADR-0024). Nothing is followed further or stored.
#[tauri::command]
async fn followed_channels(app: AppHandle, page: u32) -> Cmd<lemuse_core::import::FollowedPage> {
    blocking(move || {
        let account = lemuse_core::credentials::arena_status()?
            .account
            .ok_or_else(|| {
                AppError::new(
                    code::TOKEN,
                    "Save your Are.na token in Settings to see the channels you follow.",
                )
            })?;
        let started = wait_for_reads(&app, 1)?;
        let cfg = load_config(&library_paths())?;
        let http = lemuse_core::sync::production_client(&cfg);
        let result = arena::followed_channels(http.as_ref(), &account, page);
        note_rate_limit(&app, started, &result);
        // Mark which topics already have each channel, and where Add puts it.
        Ok(lemuse_core::import::annotate_followed(&cfg, result?))
    })
    .await
}

/// "Add all new" from Channels you follow (ADR-0026): no API reads, one
/// lemuse.toml edit per channel, then one refresh for all of them.
#[tauri::command]
async fn add_followed(
    app: AppHandle,
    picks: Vec<lemuse_core::import::FollowedPick>,
) -> Cmd<Vec<lemuse_core::import::AddedFollowed>> {
    let added = blocking({
        let app = app.clone();
        move || {
            let edits = app.state::<ConfigEdits>();
            let _edit = edits.edit.lock().map_err(poisoned)?;
            let paths = library_paths();
            Ok(lemuse_core::import::add_followed(&paths.config(), &picks)?)
        }
    })
    .await?;
    if added.iter().any(|a| a.added) {
        let flag = app.state::<Refreshing>().0.clone();
        spawn_refresh(app, flag, Trigger::Manual);
    }
    Ok(added)
}

// ── Discover (ADR-0015) ─────────────────────────────────────────────────

/// "Look before you add": a pasted link's channel and its first images.
/// The link is parsed by the core (exact Are.na hosts; never fetched);
/// two reads, spaced like Add channel.
#[tauri::command]
async fn preview_channel(app: AppHandle, link: String) -> Cmd<arena::ChannelPreview> {
    blocking(move || {
        let slug = arena::parse_channel_ref(&link)
            .map_err(|e| AppError::new(code::INVALID, e.to_string()))?;
        let started = wait_for_reads(&app, 2)?;
        let cfg = load_config(&library_paths())?;
        let http = lemuse_core::sync::production_client(&cfg);
        let result = arena::preview_channel(http.as_ref(), &slug);
        note_rate_limit(&app, started, &result);
        Ok(result?)
    })
    .await
}

/// The public channels an Are.na image also appears in: one read, only
/// when the user asks. Nothing is followed further or stored.
#[tauri::command]
async fn related_channels(app: AppHandle, block_id: i64, page: u32) -> Cmd<arena::RelatedChannels> {
    blocking(move || {
        let remote = catalog()?.arena_block_id(block_id)?.ok_or_else(|| {
            AppError::new(
                code::INVALID,
                "Related channels work for Are.na images only.",
            )
        })?;
        let started = wait_for_reads(&app, 1)?;
        let cfg = load_config(&library_paths())?;
        let http = lemuse_core::sync::production_client(&cfg);
        let result = arena::related_channels(http.as_ref(), &remote, page);
        note_rate_limit(&app, started, &result);
        Ok(result?)
    })
    .await
}

// ── Add channel (ADR-0014) ──────────────────────────────────────────────

/// Paste-a-link import. The core parses the link (exact Are.na hosts only;
/// the pasted URL itself is never fetched), looks the channel up once,
/// edits lemuse.toml structurally, and then this channel alone is refreshed
/// in the background. During a refresh the lookup waits its turn (D-74).
#[tauri::command]
async fn add_channel(
    app: AppHandle,
    link: String,
    topic: String,
    create_topic: bool,
) -> Cmd<AddedChannel> {
    let added = blocking({
        let app = app.clone();
        move || {
            let started = wait_for_reads(&app, 1)?;
            // lemuse.toml edits from the app go one at a time.
            let edits = app.state::<ConfigEdits>();
            let _edit = edits.edit.lock().map_err(poisoned)?;
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
            note_rate_limit(&app, started, &result);
            Ok(result?)
        }
    })
    .await?;
    let flag = app.state::<Refreshing>().0.clone();
    spawn_channel_refresh(app, flag, added.topic.clone(), added.channel.slug.clone());
    Ok(added)
}

/// Rename a topic (ADR-0029). Returns the stored name.
#[tauri::command]
async fn rename_topic(app: AppHandle, from: String, to: String) -> Cmd<String> {
    blocking(move || {
        let edits = app.state::<ConfigEdits>();
        let _guard = edits.edit.lock().map_err(poisoned)?;
        lemuse_core::config_edit::rename_topic(&library_paths().config(), &from, &to)?.ok_or_else(
            || AppError::new(code::NOT_FOUND, format!("There's no topic named {from}.")),
        )
    })
    .await
}

/// Remove a topic with its channels (asked for in the app). Images stay in
/// the catalog and in playlists; saved files are untouched.
#[tauri::command]
async fn remove_topic(app: AppHandle, name: String) -> Cmd<bool> {
    blocking(move || {
        let edits = app.state::<ConfigEdits>();
        let _guard = edits.edit.lock().map_err(poisoned)?;
        Ok(lemuse_core::config_edit::remove_topic(
            &library_paths().config(),
            &name,
        )?)
    })
    .await
}

#[tauri::command]
async fn remove_channel(app: AppHandle, topic: String, channel: String) -> Cmd<bool> {
    blocking(move || {
        let edits = app.state::<ConfigEdits>();
        let _guard = edits.edit.lock().map_err(poisoned)?;
        Ok(lemuse_core::config_edit::remove_channel(
            &library_paths().config(),
            &topic,
            &channel,
        )?)
    })
    .await
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
            Ok(refresh_channel(
                &paths,
                &cfg,
                &topic,
                &channel,
                Trigger::Manual,
            )?)
        });
        flag.store(false, Ordering::SeqCst);
        let _ = app.emit("refresh://status", done_event(name, result));
    });
}

// ── Playlists: local lists of images (ADR-0014) ─────────────────────────

#[tauri::command]
async fn playlists() -> Cmd<Vec<Playlist>> {
    blocking(|| Ok(catalog()?.playlists()?)).await
}

#[tauri::command]
async fn create_playlist(name: String) -> Cmd<Playlist> {
    blocking(move || Ok(catalog()?.create_playlist(&name)?)).await
}

#[tauri::command]
async fn rename_playlist(id: i64, name: String) -> Cmd<bool> {
    blocking(move || Ok(catalog()?.rename_playlist(id, &name)?)).await
}

#[tauri::command]
async fn delete_playlist(id: i64) -> Cmd<bool> {
    blocking(move || Ok(catalog()?.delete_playlist(id)?)).await
}

#[tauri::command]
async fn set_in_playlist(playlist_id: i64, block_id: i64, present: bool) -> Cmd<()> {
    blocking(move || Ok(catalog()?.set_in_playlist(playlist_id, block_id, present)?)).await
}

#[tauri::command]
async fn playlists_with(block_id: i64) -> Cmd<Vec<i64>> {
    blocking(move || Ok(catalog()?.playlists_with(block_id)?)).await
}

/// The licences of the open-source parts LeMuse is built from (ADR-0030):
/// the THIRD-PARTY-NOTICES.txt the installer carries. Plain text.
#[tauri::command]
async fn third_party_notices(app: AppHandle) -> Cmd<String> {
    blocking(move || {
        let path = app
            .path()
            .resolve(
                "THIRD-PARTY-NOTICES.txt",
                tauri::path::BaseDirectory::Resource,
            )
            .map_err(|e| {
                AppError::new(
                    code::NOT_FOUND,
                    format!("The licence list isn't available: {e}"),
                )
            })?;
        std::fs::read_to_string(&path).map_err(|_| {
            AppError::new(
                code::NOT_FOUND,
                "The licence list isn't in this build (installer builds include it).",
            )
        })
    })
    .await
}

/// Is there a newer LeMuse? One GET to GitHub's Releases API, without the
/// Are.na token; nothing is downloaded (ADR-0028).
#[tauri::command]
async fn check_update() -> Cmd<Option<lemuse_core::update::Release>> {
    blocking(|| {
        let http = lemuse_core::update::client();
        Ok(lemuse_core::update::latest_release(
            http.as_ref(),
            env!("CARGO_PKG_VERSION"),
        )?)
    })
    .await
}

// ── Content marks and the practice log (ADR-0027) ───────────────────────

/// Hide an image, or mark nudity the sensor missed (right-click menu).
#[tauri::command]
async fn set_block_flag(block_id: i64, flag: String, on: bool) -> Cmd<()> {
    blocking(move || Ok(catalog()?.set_block_flag(block_id, &flag, on)?)).await
}

/// How many images you hid or marked, for Settings → Content.
#[tauri::command]
async fn flag_counts() -> Cmd<Vec<(String, i64)>> {
    blocking(|| Ok(catalog()?.flag_counts()?)).await
}

/// "Show hidden images again" / "Forget my nudity marks".
#[tauri::command]
async fn clear_block_flags(flag: String) -> Cmd<usize> {
    blocking(move || Ok(catalog()?.clear_block_flags(&flag)?)).await
}

/// Keep a finished or stopped timed session (only if something was drawn).
#[tauri::command]
async fn record_practice(record: lemuse_core::store::catalog::PracticeRecord) -> Cmd<Option<i64>> {
    blocking(move || Ok(catalog()?.record_practice(&record)?)).await
}

/// Sessions since `since` (Unix seconds), newest first.
#[tauri::command]
async fn practice_sessions(since: i64) -> Cmd<Vec<lemuse_core::store::catalog::PracticeSession>> {
    blocking(move || Ok(catalog()?.practice_sessions(since)?)).await
}

#[tauri::command]
async fn clear_practice() -> Cmd<usize> {
    blocking(|| Ok(catalog()?.clear_practice()?)).await
}

/// The Settings panel's saved look and feel (ADR-0012). Opaque JSON; the
/// UI validates and clamps every value it reads.
#[tauri::command]
async fn get_ui_settings() -> Cmd<serde_json::Value> {
    blocking(|| Ok(lemuse_core::ui_settings::load(&library_paths()))).await
}

#[tauri::command]
async fn set_ui_settings(settings: serde_json::Value) -> Cmd<()> {
    blocking(move || Ok(lemuse_core::ui_settings::save(&library_paths(), &settings)?)).await
}

#[tauri::command]
async fn search(query: String) -> Cmd<Vec<i64>> {
    blocking(move || Ok(catalog()?.search(&query, 200)?)).await
}

/// Starts a refresh on a worker thread and returns at once; progress
/// arrives as `refresh://status` events. A second press while one runs is
/// a no-op (the core's lock file also guards against the CLI).
#[tauri::command]
fn refresh_now(app: AppHandle) {
    let flag = app.state::<Refreshing>().0.clone();
    spawn_refresh(app, flag, Trigger::Manual);
}

fn spawn_refresh(app: AppHandle, flag: Arc<AtomicBool>, trigger: Trigger) {
    if flag.swap(true, Ordering::SeqCst) {
        return;
    }
    let name = trigger.as_str();
    let _ = app.emit("refresh://status", RefreshEvent::Running { trigger: name });
    std::thread::spawn(move || {
        let paths = library_paths();
        let result =
            load_config(&paths).and_then(|cfg| Ok(refresh_library(&paths, &cfg, trigger)?));
        flag.store(false, Ordering::SeqCst);
        let _ = app.emit("refresh://status", done_event(name, result));
    });
}

/// Refresh again every `sync.interval_minutes` while the app runs
/// (ADR-0017; default 60, 0 = off). Checked once a minute, so a changed
/// setting applies without a restart. Uses the same path as every other
/// refresh, and skips a tick if one is already running.
fn spawn_auto_refresh(app: AppHandle) {
    std::thread::spawn(move || {
        let mut minutes_waited: u32 = 0;
        loop {
            std::thread::sleep(Duration::from_secs(60));
            minutes_waited = minutes_waited.saturating_add(1);
            let every = load_config(&library_paths())
                .ok()
                .and_then(|c| c.sync.interval_minutes)
                .unwrap_or(0);
            if every == 0 || minutes_waited < every {
                continue;
            }
            minutes_waited = 0;
            let flag = app.state::<Refreshing>().0.clone();
            spawn_refresh(app.clone(), flag, Trigger::Schedule);
        }
    });
}

fn done_event(trigger: &'static str, result: Cmd<lemuse_core::sync::RunSummary>) -> RefreshEvent {
    match result {
        Ok(s) => RefreshEvent::Done {
            trigger,
            blocks_upserted: s.blocks_upserted,
            errors: s.errors.len(),
            note: s.notes.into_iter().next(),
            failed: s.errors.into_iter().take(MAX_FAILED_LISTED).collect(),
        },
        Err(e) => RefreshEvent::Error {
            trigger,
            code: e.code,
            message: e.message,
        },
    }
}

pub fn run() {
    tauri::Builder::default()
        // First, so a second launch hands over before anything else starts:
        // it focuses the running window instead of opening another (and two
        // windows can't refresh the same library at once).
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .manage(Refreshing::default())
        .manage(ConfigEdits::default())
        .manage(SaveGate::default())
        .setup(|app| {
            // Sort images into categories if this build's vocabulary hasn't
            // yet (first launch after an update). Never blocks the window.
            std::thread::spawn(|| {
                if let Ok(mut c) = catalog() {
                    let _ = c.ensure_categories(categories::vocabulary());
                    let _ = c.ensure_dupes();
                }
            });
            // The window is already up from the cached catalog; the launch
            // refresh never blocks it.
            let on_launch = load_config(&library_paths())
                .map(|c| c.sync.on_launch)
                .unwrap_or(false);
            if on_launch {
                let flag = app.state::<Refreshing>().0.clone();
                spawn_refresh(app.handle().clone(), flag, Trigger::Launch);
            }
            spawn_auto_refresh(app.handle().clone());
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
            slide_count,
            category_counts,
            vocabulary,
            about,
            preview_channel,
            related_channels,
            save_image,
            arena_token_status,
            set_arena_token,
            clear_arena_token,
            followed_channels,
            add_followed,
            check_update,
            third_party_notices,
            rename_topic,
            remove_topic,
            set_block_flag,
            flag_counts,
            clear_block_flags,
            record_practice,
            practice_sessions,
            clear_practice,
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
