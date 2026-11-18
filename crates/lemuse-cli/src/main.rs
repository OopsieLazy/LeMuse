//! `lemuse` — headless front-end over lemuse-core.
//!
//! Useful for setup, debugging and (optionally) Windows Task Scheduler
//! refreshes while the GUI is closed (ADR-0005):
//!
//! ```text
//! lemuse init    --library "D:\References"
//! lemuse topics  --library "D:\References"
//! lemuse sync    --library "D:\References" --trigger schedule
//! lemuse slides  --library "D:\References" "Industrial design"
//! lemuse preview-data --library "D:\References" > app/preview-data.json
//! lemuse status  --library "D:\References"
//! lemuse search  --library "D:\References" "gearbox"
//! lemuse add-channel --library "D:\References" https://www.are.na/someone/chairs --topic "Wood objects"
//! ```

use std::path::PathBuf;
use std::process::ExitCode;

use clap::{Parser, Subcommand, ValueEnum};
use lemuse_core::config::{ensure_library, Config};
use lemuse_core::store::catalog::Catalog;
use lemuse_core::store::LibraryPaths;
use lemuse_core::sync::{refresh_library, Trigger};

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
    /// Print a topic's slides as JSON (what the slideshow would show).
    Slides {
        topic: String,
        #[arg(long, default_value_t = 20)]
        limit: u32,
    },
    /// Print every topic with its first slides as JSON, for the browser
    /// preview of the UI (`app/preview-data.json`). Metadata only.
    PreviewData {
        #[arg(long, default_value_t = 40)]
        per_topic: u32,
    },
    /// Show library stats.
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
    /// Public Are.na channels a block is also in (1 read per page).
    Related {
        /// Are.na block id (the number in are.na/block/<id>).
        block_id: String,
        #[arg(long, default_value_t = 1)]
        page: u32,
    },
}

#[derive(Clone, Copy, ValueEnum)]
enum TriggerArg {
    Cli,
    Schedule,
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    let root = cli
        .library
        .or_else(|| std::env::var_os("LEMUSE_LIBRARY").map(PathBuf::from))
        .unwrap_or_else(Config::default_root);
    let paths = LibraryPaths::new(&root);
    match run(cli.command, &paths) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("error: {e}");
            ExitCode::FAILURE
        }
    }
}

fn run(cmd: Command, paths: &LibraryPaths) -> lemuse_core::Result<()> {
    match cmd {
        Command::PreviewChannel { link } => {
            let cfg = ensure_library(paths)?;
            let slug = lemuse_core::connectors::arena::parse_channel_ref(&link)
                .map_err(|e| lemuse_core::Error::Config(e.to_string()))?;
            let http = lemuse_core::sync::production_client(&cfg);
            let preview = lemuse_core::connectors::arena::preview_channel(http.as_ref(), &slug)?;
            println!(
                "{}",
                serde_json::to_string_pretty(&preview).unwrap_or_default()
            );
            Ok(())
        }
        Command::Related { block_id, page } => {
            let cfg = ensure_library(paths)?;
            let http = lemuse_core::sync::production_client(&cfg);
            let related =
                lemuse_core::connectors::arena::related_channels(http.as_ref(), &block_id, page)?;
            println!(
                "{}",
                serde_json::to_string_pretty(&related).unwrap_or_default()
            );
            Ok(())
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
                println!("{} is already in {}", added.channel.slug, added.topic);
                return Ok(());
            }
            println!("added {} to {}", added.channel.slug, added.topic);
            let cfg = Config::load(&paths.config())?;
            let s = lemuse_core::sync::refresh_channel(
                paths,
                &cfg,
                &added.topic,
                &added.channel.slug,
                Trigger::Cli,
            )?;
            println!(
                "{} images catalogued, {} errors",
                s.blocks_upserted,
                s.errors.len()
            );
            Ok(())
        }
        Command::Init => {
            ensure_library(paths)?;
            println!("library ready at {}", paths.root().display());
            println!("topics are in {} (edit to taste)", paths.config().display());
            Ok(())
        }
        Command::Topics => {
            let cfg = Config::load(&paths.config())?;
            if cfg.topics.is_empty() {
                println!(
                    "no topics yet; add a [[topic]] to {}",
                    paths.config().display()
                );
            }
            for t in &cfg.topics {
                println!(
                    "{}  ({}s per slide{})",
                    t.name,
                    t.slide_seconds,
                    if t.shuffle { ", shuffled" } else { "" }
                );
                for s in &t.sources {
                    match s.remote_key() {
                        Some(key) => println!("  - {}: {key}", s.source),
                        None => println!("  - {}: keywords {:?}", s.source, t.keywords),
                    }
                }
            }
            Ok(())
        }
        Command::Sync { trigger } => {
            let cfg = Config::load(&paths.config())?;
            let trigger = match trigger {
                TriggerArg::Cli => Trigger::Cli,
                TriggerArg::Schedule => Trigger::Schedule,
            };
            eprintln!("refreshing {} topic(s)...", cfg.topics.len());
            let summary = refresh_library(paths, &cfg, trigger)?;
            println!(
                "{}",
                serde_json::to_string_pretty(&summary).unwrap_or_default()
            );
            Ok(())
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
                topics.push(serde_json::json!({
                    "name": t.name,
                    "slide_seconds": t.slide_seconds,
                    "shuffle": t.shuffle,
                    "sources": t.resolved_sources().len(),
                    "slides": slides,
                }));
            }
            println!(
                "{}",
                serde_json::to_string_pretty(&serde_json::json!({
                    "generated_from": "lemuse preview-data",
                    "blocks": catalog.block_count()?,
                    "topics": topics,
                    "vocabulary": lemuse_core::categories::ui_vocabulary(vocabulary),
                }))
                .unwrap_or_default()
            );
            Ok(())
        }
        Command::Slides { topic, limit } => {
            let cfg = Config::load(&paths.config())?;
            let t = cfg
                .topic(&topic)
                .ok_or_else(|| lemuse_core::Error::Config(format!("no topic named `{topic}`")))?;
            let catalog = Catalog::open(&paths.catalog())?;
            let slides = catalog.slides(&t.collection_keys(), limit, 0)?;
            println!(
                "{}",
                serde_json::to_string_pretty(&slides).unwrap_or_default()
            );
            Ok(())
        }
        Command::Status => {
            let catalog = Catalog::open(&paths.catalog())?;
            println!("library: {}", paths.root().display());
            println!("schema:  v{}", catalog.schema_version()?);
            println!("blocks:  {}", catalog.block_count()?);
            Ok(())
        }
        Command::Search { query } => {
            let catalog = Catalog::open(&paths.catalog())?;
            let ids = catalog.search(&query, 50)?;
            println!("{}", serde_json::to_string(&ids).unwrap_or_default());
            Ok(())
        }
    }
}
