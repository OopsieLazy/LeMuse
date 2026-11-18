//! User configuration (`servensurf.toml` in the library root).
//!
//! The app is organised around **topics**: a named slideshow fed by sources
//! the user picks (Are.na channels now, museum keyword queries later).
//! Sources are explicit and user-curated on purpose: Are.na's API terms
//! prohibit crawling and structured harvesting, and Are.na search is
//! Premium-only, so a topic is defined by the channels you choose (ADR-0004,
//! ADR-0007).

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::connectors::{KEYWORD_SOURCES, KNOWN_SOURCES};
use crate::{Error, Result};

pub const CONFIG_FILE_NAME: &str = "servensurf.toml";

/// The owner's topic list (Q8, 2026-11-16), written by `servensurf init`.
pub const STARTER_TOPICS_TOML: &str = include_str!("../assets/starter_topics.toml");

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Config {
    pub library: LibraryConfig,
    #[serde(default)]
    pub sync: SyncConfig,
    #[serde(default, rename = "topic", skip_serializing_if = "Vec::is_empty")]
    pub topics: Vec<Topic>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LibraryConfig {
    /// Absolute path of the library root (catalog, saved objects, views).
    pub root: PathBuf,
}

/// What a refresh does with images (ADR-0007).
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FileMode {
    /// Record metadata + media URLs only; the UI streams images from the
    /// source CDN. Files are saved only when the user clicks Save.
    #[default]
    Stream,
    /// Also download every original into the local store (offline library).
    Download,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SyncConfig {
    /// Refresh topic metadata when the app launches.
    #[serde(default = "default_true")]
    pub on_launch: bool,
    /// Optional repeat interval while the app (or tray) is running.
    #[serde(default)]
    pub interval_minutes: Option<u32>,
    /// `stream` (default) or `download`.
    #[serde(default)]
    pub files: FileMode,
    /// Max API pages (100 items each) per source per refresh. "Paginate,
    /// don't enumerate": older pages load lazily as the slideshow needs them.
    #[serde(default = "default_pages")]
    pub pages_per_refresh: u32,
    /// Max concurrent file downloads (download mode / saves).
    #[serde(default = "default_concurrency")]
    pub max_concurrent_downloads: u8,
    /// Contact string appended to the User-Agent (URL or email), required
    /// by Are.na/Wikimedia etiquette. Left empty until the user sets it.
    #[serde(default)]
    pub contact: Option<String>,
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self {
            on_launch: true,
            interval_minutes: None,
            files: FileMode::default(),
            pages_per_refresh: default_pages(),
            max_concurrent_downloads: default_concurrency(),
            contact: None,
        }
    }
}

/// A named slideshow of reference images.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Topic {
    pub name: String,
    /// Seconds per slide in slideshow mode.
    #[serde(default = "default_slide_seconds")]
    pub slide_seconds: u32,
    /// Shuffle instead of newest-first.
    #[serde(default)]
    pub shuffle: bool,
    /// Search terms for keyword sources (museums). A keyword source with
    /// no explicit `query` runs one search per keyword (ADR-0008).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub keywords: Vec<String>,
    #[serde(default, rename = "source")]
    pub sources: Vec<TopicSource>,
}

/// One source feeding a topic. `source` selects the connector.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TopicSource {
    pub source: String,
    /// Are.na channel slug or id.
    #[serde(default)]
    pub channel: Option<String>,
    /// Free-text query for search-based sources (museums, M5).
    #[serde(default)]
    pub query: Option<String>,
    /// Optional local collection name override.
    #[serde(default)]
    pub collection: Option<String>,
}

impl Topic {
    /// Concrete sources after keyword expansion: a source with a `channel`
    /// or `query` is kept as-is; a keyword source with neither becomes one
    /// source per topic keyword.
    pub fn resolved_sources(&self) -> Vec<TopicSource> {
        let mut out = Vec::new();
        for s in &self.sources {
            if s.remote_key().is_some() {
                out.push(s.clone());
            } else {
                for k in &self.keywords {
                    out.push(TopicSource {
                        query: Some(k.clone()),
                        ..s.clone()
                    });
                }
            }
        }
        out
    }

    /// `(connector, remote_key)` pairs for `Catalog::slides`.
    pub fn collection_keys(&self) -> Vec<(String, String)> {
        self.resolved_sources()
            .into_iter()
            .filter_map(|s| {
                let key = s.remote_key()?.to_string();
                Some((s.source, key))
            })
            .collect()
    }
}

impl TopicSource {
    /// The remote key the catalog stores for this source's collection.
    pub fn remote_key(&self) -> Option<&str> {
        self.channel.as_deref().or(self.query.as_deref())
    }
}

fn default_true() -> bool {
    true
}
fn default_concurrency() -> u8 {
    2
}
fn default_pages() -> u32 {
    2
}
fn default_slide_seconds() -> u32 {
    8
}

/// Text `servensurf init` writes: the base settings plus the starter topics.
pub fn starter_toml(root: impl Into<PathBuf>) -> Result<String> {
    Ok(Config::new(root).to_toml()? + "\n" + STARTER_TOPICS_TOML)
}

impl Config {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self {
            library: LibraryConfig { root: root.into() },
            sync: SyncConfig::default(),
            topics: Vec::new(),
        }
    }

    pub fn from_toml_str(s: &str) -> Result<Self> {
        let cfg: Config = toml::from_str(s).map_err(|e| Error::Config(e.to_string()))?;
        cfg.validate()?;
        Ok(cfg)
    }

    pub fn load(path: &Path) -> Result<Self> {
        let text = std::fs::read_to_string(path).map_err(|e| Error::io(path, e))?;
        Self::from_toml_str(&text)
    }

    pub fn to_toml(&self) -> Result<String> {
        toml::to_string_pretty(self).map_err(|e| Error::Config(e.to_string()))
    }

    pub fn save(&self, path: &Path) -> Result<()> {
        std::fs::write(path, self.to_toml()?).map_err(|e| Error::io(path, e))
    }

    pub fn topic(&self, name: &str) -> Option<&Topic> {
        self.topics.iter().find(|t| t.name == name)
    }

    pub fn validate(&self) -> Result<()> {
        if self.sync.max_concurrent_downloads == 0 {
            return Err(Error::Config(
                "sync.max_concurrent_downloads must be >= 1".into(),
            ));
        }
        if self.sync.pages_per_refresh == 0 {
            return Err(Error::Config("sync.pages_per_refresh must be >= 1".into()));
        }
        let mut names = HashSet::new();
        for t in &self.topics {
            if t.name.trim().is_empty() {
                return Err(Error::Config("every [[topic]] needs a `name`".into()));
            }
            if !names.insert(t.name.as_str()) {
                return Err(Error::Config(format!("duplicate topic name `{}`", t.name)));
            }
            if t.slide_seconds == 0 {
                return Err(Error::Config(format!(
                    "topic `{}`: slide_seconds must be >= 1",
                    t.name
                )));
            }
            for (i, s) in t.sources.iter().enumerate() {
                let here = format!("topic `{}` source[{i}] ({})", t.name, s.source);
                if !KNOWN_SOURCES.contains(&s.source.as_str()) {
                    return Err(Error::Config(format!(
                        "{here}: unknown source; expected one of {KNOWN_SOURCES:?}"
                    )));
                }
                let keyword_capable = KEYWORD_SOURCES.contains(&s.source.as_str());
                let fed_by_keywords = keyword_capable && !t.keywords.is_empty();
                if s.remote_key().is_none() && !fed_by_keywords {
                    return Err(Error::Config(if keyword_capable {
                        format!("{here}: needs a `query`, or the topic needs `keywords`")
                    } else {
                        format!(
                            "{here}: needs a `channel` (Are.na keyword search needs a Premium plan)"
                        )
                    }));
                }
            }
        }
        Ok(())
    }

    /// Default library root: `%USERPROFILE%\Pictures\ServeNSurf` on Windows,
    /// `$HOME/Pictures/ServeNSurf` elsewhere.
    pub fn default_root() -> PathBuf {
        let home = std::env::var_os("USERPROFILE")
            .or_else(|| std::env::var_os("HOME"))
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from("."));
        home.join("Pictures").join("ServeNSurf")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const EXAMPLE: &str = r#"
        [library]
        root = "D:/References"

        [sync]
        contact = "https://example.invalid/servensurf"

        [[topic]]
        name = "Industrial design"
        shuffle = true

        [[topic.source]]
        source = "arena"
        channel = "industrial-design-refs"

        [[topic.source]]
        source = "aic"
        query = "technical drawing"

        [[topic]]
        name = "Hatching"

        [[topic.source]]
        source = "arena"
        channel = "hatching"
    "#;

    #[test]
    fn parses_topics_with_defaults() {
        let cfg = Config::from_toml_str(EXAMPLE).unwrap();
        assert_eq!(cfg.topics.len(), 2);
        let t = cfg.topic("Industrial design").unwrap();
        assert_eq!(t.sources.len(), 2);
        assert!(t.shuffle);
        assert_eq!(t.slide_seconds, 8);
        assert_eq!(cfg.sync.files, FileMode::Stream);
        assert_eq!(cfg.sync.pages_per_refresh, 2);
        assert!(cfg.sync.on_launch);
    }

    #[test]
    fn rejects_source_without_channel_or_query() {
        let err = Config::from_toml_str(
            r#"
            [library]
            root = "D:/References"
            [[topic]]
            name = "x"
            [[topic.source]]
            source = "arena"
            "#,
        )
        .unwrap_err();
        assert!(matches!(err, Error::Config(_)));
    }

    #[test]
    fn rejects_duplicate_topic_names() {
        let err = Config::from_toml_str(
            r#"
            [library]
            root = "D:/References"
            [[topic]]
            name = "x"
            [[topic]]
            name = "x"
            "#,
        )
        .unwrap_err();
        assert!(err.to_string().contains("duplicate"));
    }

    #[test]
    fn starter_topics_are_the_owners_list_and_valid() {
        let cfg = Config::from_toml_str(&starter_toml("D:/References").unwrap()).unwrap();
        let names: Vec<_> = cfg.topics.iter().map(|t| t.name.as_str()).collect();
        assert_eq!(
            names,
            [
                "Molds",
                "Wood objects",
                "Wrought iron",
                "Castle",
                "Y2K tech",
                "Tech",
                "Form",
                "Product design",
                "Art",
                "Candles",
                "Chess",
                "Vintage",
                "Vintage tech",
                "Renaissance",
                "Contemporary"
            ]
        );
        // Every topic has at least one concrete source after expansion.
        for t in &cfg.topics {
            assert!(
                !t.resolved_sources().is_empty(),
                "{} has no sources",
                t.name
            );
        }
    }

    #[test]
    fn keywords_expand_into_one_search_per_keyword() {
        let cfg = Config::from_toml_str(
            r#"
            [library]
            root = "D:/References"
            [[topic]]
            name = "Chess"
            keywords = ["chess", "chessmen"]
            [[topic.source]]
            source = "aic"
            [[topic.source]]
            source = "cleveland"
            query = "chess set"
            [[topic.source]]
            source = "arena"
            channel = "chess-refs"
            "#,
        )
        .unwrap();
        let keys = cfg.topic("Chess").unwrap().collection_keys();
        let keys: Vec<(&str, &str)> = keys.iter().map(|(a, b)| (a.as_str(), b.as_str())).collect();
        assert_eq!(
            keys,
            [
                ("aic", "chess"),
                ("aic", "chessmen"),
                ("cleveland", "chess set"),
                ("arena", "chess-refs")
            ]
        );
    }

    #[test]
    fn rejects_unknown_source_and_arena_without_channel() {
        let base = "[library]\nroot = \"D:/R\"\n[[topic]]\nname = \"x\"\nkeywords = [\"a\"]\n";
        let unknown = format!("{base}[[topic.source]]\nsource = \"pinterest\"\n");
        assert!(Config::from_toml_str(&unknown)
            .unwrap_err()
            .to_string()
            .contains("unknown source"));
        let arena = format!("{base}[[topic.source]]\nsource = \"arena\"\n");
        assert!(Config::from_toml_str(&arena)
            .unwrap_err()
            .to_string()
            .contains("Premium"));
    }
}
