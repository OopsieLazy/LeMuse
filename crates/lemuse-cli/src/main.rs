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
        Command::Sync { trigger } => {
            // ensure_library also applies the one-time page-default upgrade.
            let cfg = ensure_library(paths)?;
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
            let vocabulary = lemuse_core::categories::vocabulary();
            catalog.ensure_categories(vocabulary)?;
            let mut topics = Vec::new();
            for t in &cfg.topics {
                let slides = catalog.slides(&t.collection_keys(), per_topic, 0)?;
                topics.push(json!({
                    "name": t.name,
                    "slide_seconds": t.slide_seconds,
                    "shuffle": t.shuffle,
                    "sources": t.resolved_sources().len(),
                    "slides": slides,
                }));
            }
            Ok(pretty(json!({
                "generated_from": "lemuse preview-data",
                "blocks": catalog.block_count()?,
                "topics": topics,
                "vocabulary": lemuse_core::categories::ui_vocabulary(vocabulary),
            })))
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
                let keys: Vec<(String, String)> = match topic {
                    Some(name) => cfg
                        .topic(&name)
                        .ok_or_else(|| no_topic(&name))?
                        .collection_keys(),
                    None => cfg
                        .topics
                        .iter()
                        .flat_map(|t| t.collection_keys())
                        .collect::<std::collections::BTreeSet<_>>()
                        .into_iter()
                        .collect(),
                };
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
        Command::Related { block_id, page } => {
            let cfg = ensure_library(paths)?;
            let http = lemuse_core::sync::production_client(&cfg);
            let related =
                lemuse_core::connectors::arena::related_channels(http.as_ref(), &block_id, page)?;
            Ok(pretty(to_value!(&related)))
        }
    }
}
