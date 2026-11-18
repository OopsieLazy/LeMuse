//! `servensurf` — headless front-end over servensurf-core.
//!
//! Useful for setup, debugging and (optionally) Windows Task Scheduler
//! refreshes while the GUI is closed (ADR-0005):
//!
//! ```text
//! servensurf init    --library "D:\References"
//! servensurf topics  --library "D:\References"
//! servensurf sync    --library "D:\References" --trigger schedule
//! servensurf slides  --library "D:\References" "Industrial design"
//! servensurf preview-data --library "D:\References" > app/preview-data.json
//! servensurf status  --library "D:\References"
//! servensurf search  --library "D:\References" "gearbox"
//! ```

use std::path::PathBuf;
use std::process::ExitCode;

use clap::{Parser, Subcommand, ValueEnum};
use servensurf_core::config::{ensure_library, Config};
use servensurf_core::store::catalog::Catalog;
use servensurf_core::store::LibraryPaths;
use servensurf_core::sync::{refresh_library, Trigger};

#[derive(Parser)]
#[command(
    name = "servensurf",
    version,
    about = "Stream reference images by topic from Are.na channels you choose"
)]
struct Cli {
    /// Library root. Defaults to $SERVENSURF_LIBRARY, then
    /// %USERPROFILE%\Pictures\ServeNSurf.
    #[arg(long, global = true)]
    library: Option<PathBuf>,

    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Create the library folders, catalog and a starter servensurf.toml.
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
        .or_else(|| std::env::var_os("SERVENSURF_LIBRARY").map(PathBuf::from))
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

fn run(cmd: Command, paths: &LibraryPaths) -> servensurf_core::Result<()> {
    match cmd {
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
            let catalog = Catalog::open(&paths.catalog())?;
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
                    "generated_from": "servensurf preview-data",
                    "blocks": catalog.block_count()?,
                    "topics": topics,
                }))
                .unwrap_or_default()
            );
            Ok(())
        }
        Command::Slides { topic, limit } => {
            let cfg = Config::load(&paths.config())?;
            let t = cfg.topic(&topic).ok_or_else(|| {
                servensurf_core::Error::Config(format!("no topic named `{topic}`"))
            })?;
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
