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
//! servensurf status  --library "D:\References"
//! servensurf search  --library "D:\References" "gearbox"
//! ```

use std::path::PathBuf;
use std::process::ExitCode;

use clap::{Parser, Subcommand, ValueEnum};
use servensurf_core::config::{starter_toml, Config};
use servensurf_core::store::catalog::Catalog;
use servensurf_core::store::LibraryPaths;
use servensurf_core::sync::Trigger;

#[derive(Parser)]
#[command(
    name = "servensurf",
    version,
    about = "Stream reference images by topic from Are.na channels you choose"
)]
struct Cli {
    /// Library root. Defaults to %USERPROFILE%\Pictures\ServeNSurf.
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
    let root = cli.library.unwrap_or_else(Config::default_root);
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
            paths.ensure()?;
            Catalog::open(&paths.catalog())?;
            let cfg_path = paths.config();
            if !cfg_path.exists() {
                let text = starter_toml(paths.root())?;
                std::fs::write(&cfg_path, text)
                    .map_err(|e| servensurf_core::Error::io(&cfg_path, e))?;
            }
            println!("library ready at {}", paths.root().display());
            println!(
                "starter topics written to {} (edit to taste)",
                cfg_path.display()
            );
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
            let _cfg = Config::load(&paths.config())?;
            let _trigger = match trigger {
                TriggerArg::Cli => Trigger::Cli,
                TriggerArg::Schedule => Trigger::Schedule,
            };
            // M1 wires the production HTTP client (+ optional token from
            // Credential Manager) here, then calls SyncEngine::run.
            Err(servensurf_core::Error::NotImplemented(
                "network refresh (M1: production HTTP client)",
            ))
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
