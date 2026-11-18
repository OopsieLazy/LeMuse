//! `lemuse` — headless front-end over lemuse-core.
//!
//! Useful for setup, debugging, automation (ADR-0017) and Windows Task
//! Scheduler refreshes while the GUI is closed (ADR-0005):
//!
//! ```text
//! lemuse init    --library "D:\References"
//! lemuse topics  --library "D:\References" --json
//! lemuse sync    --library "D:\References" --trigger schedule
//! lemuse slides  --library "D:\References" "Industrial design"
//! lemuse status  --json
//! lemuse search  "gearbox"
//! lemuse add-channel https://www.are.na/someone/chairs --topic "Wood objects"
//! lemuse export-links --playlist "Chairs" --format csv > chairs.csv
//! lemuse sheet --topic "Wood objects" --count 24 > sheet.html
//! lemuse serve            # dashboard on http://127.0.0.1:47555
//! ```
//!
//! `--json` makes every command print exactly one JSON document on stdout:
//! `{"lemuse":1,"command":"…","ok":true,"data":…}`, or `"ok":false` with an
//! `"error"` (exit code 1). Shapes are documented in docs/automation.md.

use std::path::PathBuf;
use std::process::ExitCode;

use clap::{Parser, Subcommand, ValueEnum};
use lemuse_core::config::{ensure_library, Config};
use lemuse_core::store::catalog::{Catalog, Scope};
use lemuse_core::store::LibraryPaths;
use lemuse_core::sync::{refresh_library, Trigger};
use serde_json::{json, Value};

/// Version of the `--json` envelope; bumped only for breaking changes.
const JSON_VERSION: u32 = 1;

#[derive(Parser)]
#[command(
    name = "lemuse",
    version,
    about = "Stream reference images by topic from Are.na channels you choose"
)]
struct Cli {
    /// Library root. Defaults to $LEMUSE_LIBRARY, then
    /// %USERPROFILE%\Pictures\LeMuse.
    #[arg(long, global = true)]
    library: Option<PathBuf>,

    /// Print one JSON document (for scripts and automation; docs/automation.md).
    #[arg(long, global = true)]
    json: bool,

    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Create the library folders, catalog and a starter lemuse.toml.
    Init,
    /// List configured topics and their sources.
    Topics,
    /// Refresh topic metadata (and files in download mode).
    Sync {
        #[arg(long, value_enum, default_value_t = TriggerArg::Cli)]
        trigger: TriggerArg,
        /// Read every channel to its end now (up to 100,000 items each),
        /// instead of resuming over several refreshes.
        #[arg(long)]
        full: bool,
    },
    /// A topic's slides (what the slideshow would show).
    Slides {
        topic: String,
        #[arg(long, default_value_t = 20)]
        limit: u32,
    },
    /// Every topic with its first slides, for the browser preview of the UI
    /// (`app/preview/preview-data.json`). Metadata only; always JSON.
    PreviewData {
        #[arg(long, default_value_t = 40)]
        per_topic: u32,
    },
    /// Library stats, including channels still loading in full.
    Status,
    /// Full-text search the catalog.
    Search { query: String },
    /// Add an Are.na channel (link or slug) to a topic, then refresh it.
    AddChannel {
        link: String,
        #[arg(long)]
        topic: String,
        /// Create the topic if it does not exist.
        #[arg(long)]
        new_topic: bool,
    },
    /// Show an Are.na channel's first images without adding it (2 reads).
    PreviewChannel { link: String },
    /// Every stored link of a topic, a playlist, or All (default), to stdout.
    /// Links only; no image is downloaded.
    ExportLinks {
        #[arg(long, conflicts_with = "playlist")]
        topic: Option<String>,
        #[arg(long)]
        playlist: Option<String>,
        /// Ignored with --json (the envelope holds JSON rows).
        #[arg(long, value_enum, default_value_t = LinkFormat::Csv)]
        format: LinkFormat,
    },
    /// Run the read-only dashboard: the LeMuse page and a JSON API on
    /// http://127.0.0.1 (ADR-0019). Prints the address with its token.
    Serve {
        #[arg(long, default_value_t = lemuse_core::serve::DEFAULT_PORT)]
        port: u16,
        /// Also listen on your network (wall screen, phone). Trusted Wi-Fi only.
        #[arg(long)]
        lan: bool,
        /// The built page (`npm run build:dashboard` → app/dist-dashboard).
        #[arg(long)]
        ui: Option<PathBuf>,
    },
    /// A printable reference sheet of images as HTML (Print → Save as PDF).
    /// The same seed (default: today's date) gives the same pick.
    Sheet {
        #[arg(long, conflicts_with = "playlist")]
        topic: Option<String>,
        #[arg(long)]
        playlist: Option<String>,
        #[arg(long, default_value_t = 24)]
        count: usize,
        #[arg(long)]
        seed: Option<String>,
    },
    /// Save an image's full-size original into views/<topic or playlist>/
    /// (views/Saved/ by default). The block id is in `slides` output.
    Save {
        block_id: i64,
        #[arg(long, conflicts_with = "playlist")]
        topic: Option<String>,
        #[arg(long)]
        playlist: Option<String>,
    },
    /// Public Are.na channels a block is also in (1 read per page).
    Related {
        /// Are.na block id (the number in are.na/block/<id>).
        block_id: String,
        #[arg(long, default_value_t = 1)]
        page: u32,
    },
}

impl Command {
    fn name(&self) -> &'static str {
        match self {
            Command::Init => "init",
            Command::Topics => "topics",
            Command::Sync { .. } => "sync",
            Command::Slides { .. } => "slides",
            Command::PreviewData { .. } => "preview-data",
            Command::Status => "status",
            Command::Search { .. } => "search",
            Command::AddChannel { .. } => "add-channel",
            Command::PreviewChannel { .. } => "preview-channel",
            Command::ExportLinks { .. } => "export-links",
            Command::Related { .. } => "related",
            Command::Serve { .. } => "serve",
            Command::Sheet { .. } => "sheet",
            Command::Save { .. } => "save",
        }
    }
}

#[derive(Clone, Copy, ValueEnum)]
enum LinkFormat {
    Csv,
    Json,
    Txt,
}

#[derive(Clone, Copy, ValueEnum)]
enum TriggerArg {
    Cli,
    Schedule,
}

/// What a command produced: data for `--json`, and the human text.
struct Output {
    data: Value,
    text: String,
}

fn out(data: Value, text: impl Into<String>) -> Output {
    Output {
        data,
        text: text.into(),
    }
}

/// Human output that is itself JSON (slides, related, …).
fn pretty(data: Value) -> Output {
    let text = serde_json::to_string_pretty(&data).unwrap_or_default() + "\n";
    Output { data, text }
}

/// Any serializable value as JSON (Null if it can't be).
macro_rules! to_value {
    ($e:expr) => {
        serde_json::to_value($e).unwrap_or(Value::Null)
    };
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    let root = cli
        .library
        .or_else(|| std::env::var_os("LEMUSE_LIBRARY").map(PathBuf::from))
        .unwrap_or_else(Config::default_root);
    let paths = LibraryPaths::new(&root);
    let name = cli.command.name();
    let result = run(cli.command, &paths, cli.json);
    if cli.json {
        let doc = match &result {
            Ok(o) => json!({ "lemuse": JSON_VERSION, "command": name, "ok": true, "data": o.data }),
            Err(e) => {
                json!({ "lemuse": JSON_VERSION, "command": name, "ok": false, "error": e.to_string() })
            }
        };
        println!("{}", serde_json::to_string_pretty(&doc).unwrap_or_default());
        return if result.is_ok() {
            ExitCode::SUCCESS
        } else {
            ExitCode::FAILURE
        };
    }
    match result {
        Ok(o) => {
            print!("{}", o.text);
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("error: {e}");
            ExitCode::FAILURE
        }
    }
}

/// Pages a `sync --full` may read per channel (100,000 items).
const FULL_PAGES: u32 = 1000;
/// Pages of 500 a sheet draws from (10,000 images).
const SHEET_PAGES: u32 = 20;

/// Collections of one topic, or of every topic (All), deduplicated.
fn scope_keys(cfg: &Config, topic: Option<&str>) -> lemuse_core::Result<Vec<(String, String)>> {
    Ok(match topic {
        Some(name) => cfg
            .topic(name)
            .ok_or_else(|| no_topic(name))?
            .collection_keys(),
        None => cfg
            .topics
            .iter()
            .flat_map(|t| t.collection_keys())
            .collect::<std::collections::BTreeSet<_>>()
            .into_iter()
            .collect(),
    })
}

/// The dashboard page next to the program (installed), else the dev build.
fn default_ui_dir() -> Option<PathBuf> {
    let beside = std::env::current_exe()
        .ok()
        .and_then(|e| e.parent().map(|d| d.join("dashboard")));
    [beside, Some(PathBuf::from("app/dist-dashboard"))]
        .into_iter()
        .flatten()
        .find(|d| d.join("index.html").is_file())
}

fn no_topic(name: &str) -> lemuse_core::Error {
    lemuse_core::Error::Config(format!("no topic named `{name}`"))
}

fn run(cmd: Command, paths: &LibraryPaths, json_mode: bool) -> lemuse_core::Result<Output> {
    match cmd {
        Command::Init => {
            ensure_library(paths)?;
            Ok(out(
                json!({ "root": paths.root(), "config": paths.config() }),
                format!(
                    "library ready at {}\ntopics are in {} (edit to taste)\n",
                    paths.root().display(),
                    paths.config().display()
                ),
            ))
        }
        Command::Topics => {
            let cfg = Config::load(&paths.config())?;
            let catalog = Catalog::open(&paths.catalog())?;
            let mut data = Vec::new();
            let mut text = String::new();
            if cfg.topics.is_empty() {
                text.push_str(&format!(
                    "no topics yet; add a [[topic]] to {}\n",
                    paths.config().display()
                ));
            }
            for t in &cfg.topics {
                let slides = catalog.count_slides(&t.collection_keys())?;
                let sources: Vec<Value> = t
                    .sources
                    .iter()
                    .map(|s| json!({ "source": s.source, "key": s.remote_key() }))
                    .collect();
                text.push_str(&format!(
                    "{}  ({} images, {}s per slide{})\n",
                    t.name,
                    slides,
                    t.slide_seconds,
                    if t.shuffle { ", shuffled" } else { "" }
                ));
                for s in &t.sources {
                    match s.remote_key() {
                        Some(key) => text.push_str(&format!("  - {}: {key}\n", s.source)),
                        None => {
                            text.push_str(&format!("  - {}: keywords {:?}\n", s.source, t.keywords))
                        }
                    }
                }
                data.push(json!({
                    "name": t.name,
                    "images": slides,
                    "slide_seconds": t.slide_seconds,
                    "shuffle": t.shuffle,
                    "keywords": t.keywords,
                    "sources": sources,
                }));
            }
            Ok(out(Value::Array(data), text))
        }
        Command::Sync { trigger, full } => {
            // ensure_library also applies the one-time page-default upgrade.
            let mut cfg = ensure_library(paths)?;
            if full {
                cfg.sync.pages_per_refresh = FULL_PAGES;
            }
            let trigger = match trigger {
                TriggerArg::Cli => Trigger::Cli,
                TriggerArg::Schedule => Trigger::Schedule,
            };
            if !json_mode {
                eprintln!("refreshing {} topic(s)...", cfg.topics.len());
            }
            let summary = refresh_library(paths, &cfg, trigger)?;
            Ok(pretty(to_value!(&summary)))
        }
        Command::Slides { topic, limit } => {
            let cfg = Config::load(&paths.config())?;
            let t = cfg.topic(&topic).ok_or_else(|| no_topic(&topic))?;
            let catalog = Catalog::open(&paths.catalog())?;
            let slides = catalog.slides(&t.collection_keys(), limit, 0)?;
            Ok(pretty(to_value!(&slides)))
        }
        Command::PreviewData { per_topic } => {
            // Metadata only (titles, creators, CDN URLs). No image bytes are
            // fetched or written: the preview streams them (ADR-0009).
            let cfg = Config::load(&paths.config())?;
            let mut catalog = Catalog::open(&paths.catalog())?;
            catalog.ensure_categories(lemuse_core::categories::vocabulary())?;
            Ok(pretty(lemuse_core::serve::preview_data(
                &cfg, &catalog, per_topic,
            )?))
        }
        Command::Status => {
            let catalog = Catalog::open(&paths.catalog())?;
            let unfinished = catalog.unfinished()?;
            let blocks = catalog.block_count()?;
            let schema = catalog.schema_version()?;
            let mut text = format!(
                "library: {}\nschema:  v{schema}\nblocks:  {blocks}\n",
                paths.root().display()
            );
            if !unfinished.is_empty() {
                text.push_str("still loading in full (continues each refresh):\n");
                for (title, n) in &unfinished {
                    text.push_str(&format!("  - {title}: {n} so far\n"));
                }
            }
            let loading: Vec<Value> = unfinished
                .iter()
                .map(|(t, n)| json!({ "collection": t, "images_so_far": n }))
                .collect();
            Ok(out(
                json!({ "root": paths.root(), "schema": schema, "blocks": blocks, "loading": loading }),
                text,
            ))
        }
        Command::Search { query } => {
            let catalog = Catalog::open(&paths.catalog())?;
            let ids = catalog.search(&query, 50)?;
            let text = serde_json::to_string(&ids).unwrap_or_default() + "\n";
            Ok(out(json!({ "query": query, "block_ids": ids }), text))
        }
        Command::AddChannel {
            link,
            topic,
            new_topic,
        } => {
            let cfg = ensure_library(paths)?;
            let http = lemuse_core::sync::production_client(&cfg);
            let added = lemuse_core::import::add_channel(
                http.as_ref(),
                &paths.config(),
                &link,
                &topic,
                new_topic,
            )?;
            if !added.added {
                let text = format!("{} is already in {}\n", added.channel.slug, added.topic);
                return Ok(out(
                    json!({ "added": to_value!(&added), "refresh": null }),
                    text,
                ));
            }
            let cfg = Config::load(&paths.config())?;
            let s = lemuse_core::sync::refresh_channel(
                paths,
                &cfg,
                &added.topic,
                &added.channel.slug,
                Trigger::Cli,
            )?;
            let text = format!(
                "added {} to {}\n{} images catalogued, {} errors\n",
                added.channel.slug,
                added.topic,
                s.blocks_upserted,
                s.errors.len()
            );
            Ok(out(
                json!({ "added": to_value!(&added), "refresh": to_value!(&s) }),
                text,
            ))
        }
        Command::PreviewChannel { link } => {
            let cfg = ensure_library(paths)?;
            let slug = lemuse_core::connectors::arena::parse_channel_ref(&link)
                .map_err(|e| lemuse_core::Error::Config(e.to_string()))?;
            let http = lemuse_core::sync::production_client(&cfg);
            let preview = lemuse_core::connectors::arena::preview_channel(http.as_ref(), &slug)?;
            Ok(pretty(to_value!(&preview)))
        }
        Command::ExportLinks {
            topic,
            playlist,
            format,
        } => {
            let cfg = Config::load(&paths.config())?;
            let catalog = Catalog::open(&paths.catalog())?;
            let rows = if let Some(name) = playlist {
                let id = catalog.playlist_id(&name)?.ok_or_else(|| {
                    lemuse_core::Error::Config(format!("no playlist named `{name}`"))
                })?;
                catalog.links(&Scope::Playlist(id))?
            } else {
                let keys = scope_keys(&cfg, topic.as_deref())?;
                catalog.links(&Scope::collections(&keys))?
            };
            let text = match format {
                LinkFormat::Csv => lemuse_core::export::to_csv(&rows),
                LinkFormat::Txt => lemuse_core::export::to_text(&rows),
                LinkFormat::Json => serde_json::to_string_pretty(&rows).unwrap_or_default() + "\n",
            };
            if !json_mode {
                eprintln!("{} image(s)", rows.len());
            }
            Ok(out(to_value!(&rows), text))
        }
        Command::Serve { port, lan, ui } => {
            use lemuse_core::serve;
            ensure_library(paths)?;
            let token = match std::env::var("LEMUSE_SERVE_TOKEN") {
                Ok(t) if serve::is_valid_token(&t) => t,
                Ok(_) => {
                    return Err(lemuse_core::Error::Config(
                        "LEMUSE_SERVE_TOKEN must be 32-128 letters, digits, - or _".into(),
                    ))
                }
                Err(_) => serve::new_token()?,
            };
            let ui_dir = ui.or_else(default_ui_dir);
            let bundle = ui_dir.as_deref().map(serve::load_ui).transpose()?;
            let mut server = serve::Server::new(paths.clone(), token.clone(), bundle, port, lan);
            let listener = server.bind()?;
            let port = server.port();
            let url = format!("http://127.0.0.1:{port}/#token={token}");
            if json_mode {
                let doc = json!({ "lemuse": JSON_VERSION, "command": "serve", "ok": true,
                    "data": { "url": url, "port": port, "lan": lan, "token": token,
                              "page": ui_dir.is_some() } });
                println!("{}", serde_json::to_string(&doc).unwrap_or_default());
            } else {
                println!("LeMuse dashboard (read-only). Keep this window open; Ctrl+C stops it.");
                println!("  open:  {url}");
                println!("  API:   curl -H \"Authorization: Bearer {token}\" http://127.0.0.1:{port}/api/v1/status");
                if ui_dir.is_none() {
                    println!("  page:  not built; run `npm run build:dashboard` in app/ (the API works already)");
                }
                if lan {
                    println!("  LAN:   also on http://<this PC's address>:{port}/#token=... (find it with `ipconfig`)");
                    eprintln!("warning: LAN mode sends the token unencrypted over your network; use trusted Wi-Fi only");
                }
            }
            std::sync::Arc::new(server).serve(listener);
            // serve() only returns if the listener fails.
            std::process::exit(1);
        }
        Command::Sheet {
            topic,
            playlist,
            count,
            seed,
        } => {
            use lemuse_core::export;
            let cfg = Config::load(&paths.config())?;
            let catalog = Catalog::open(&paths.catalog())?;
            let keys;
            let (scope, heading) = if let Some(name) = playlist {
                let id = catalog.playlist_id(&name)?.ok_or_else(|| {
                    lemuse_core::Error::Config(format!("no playlist named `{name}`"))
                })?;
                (Scope::Playlist(id), name)
            } else {
                keys = scope_keys(&cfg, topic.as_deref())?;
                (
                    Scope::collections(&keys),
                    topic.unwrap_or_else(|| "All".into()),
                )
            };
            let mut all = Vec::new();
            for page in 0..SHEET_PAGES {
                let got = catalog.slides_in(&scope, &Default::default(), 500, page * 500)?;
                let last = got.len() < 500;
                all.extend(got);
                if last {
                    break;
                }
            }
            let seed = seed.unwrap_or_else(export::today_utc);
            let picked = export::pick(&all, count.clamp(1, 200), &seed);
            let html = export::to_sheet_html(
                &format!("{heading}: reference sheet"),
                &seed,
                &picked,
                lemuse_core::serve::IMAGE_HOSTS,
            );
            if !json_mode {
                eprintln!(
                    "{} of {} image(s); open the file in a browser and print to PDF",
                    picked.len(),
                    all.len()
                );
            }
            Ok(out(
                json!({ "heading": heading, "seed": seed, "count": picked.len(), "html": html }),
                html,
            ))
        }
        Command::Save {
            block_id,
            topic,
            playlist,
        } => {
            let cfg = ensure_library(paths)?;
            let catalog = Catalog::open(&paths.catalog())?;
            let folder = match (topic, playlist) {
                (Some(t), _) => cfg.topic(&t).ok_or_else(|| no_topic(&t))?.name.clone(),
                (_, Some(p)) => {
                    catalog.playlist_id(&p)?.ok_or_else(|| {
                        lemuse_core::Error::Config(format!("no playlist named `{p}`"))
                    })?;
                    p
                }
                _ => lemuse_core::save::DEFAULT_FOLDER.to_string(),
            };
            let http = lemuse_core::sync::production_client(&cfg);
            let saved = lemuse_core::save::save_original(
                paths,
                &catalog,
                http.as_ref(),
                block_id,
                &folder,
                true,
            )?;
            let text = format!(
                "{} {}\n",
                if saved.already_stored {
                    "already stored; linked to"
                } else {
                    "saved to"
                },
                saved.view
            );
            Ok(out(to_value!(&saved), text))
        }
        Command::Related { block_id, page } => {
            let cfg = ensure_library(paths)?;
            let http = lemuse_core::sync::production_client(&cfg);
            let related =
                lemuse_core::connectors::arena::related_channels(http.as_ref(), &block_id, page)?;
            Ok(pretty(to_value!(&related)))
        }
    }
}
