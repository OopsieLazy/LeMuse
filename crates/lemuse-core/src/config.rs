//! User configuration (`lemuse.toml` in the library root).
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

pub const CONFIG_FILE_NAME: &str = "lemuse.toml";

/// The owner's topic list (Q8, 2026-11-16), written by `lemuse init`.
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

/// Longest topic name (it becomes a folder name under `views/` on Save).
pub const MAX_TOPIC_NAME: usize = 60;
/// Longest keyword, query or contact string.
pub const MAX_TEXT: usize = 200;
/// Upper bounds that keep a refresh within the Are.na read budget and stop a
/// runaway or scripted import from growing the config without limit.
pub const MAX_TOPICS: usize = 200;
pub const MAX_SOURCES: usize = 100;
/// Total sources across all topics, and keywords per topic (review 0008 A-33).
pub const MAX_TOTAL_SOURCES: usize = 500;
pub const MAX_KEYWORDS: usize = 50;

/// Invisible formatting characters that can disguise a name in the UI:
/// bidi overrides and isolates, zero-width characters, the BOM, the soft
/// hyphen (review 0008 A-34). `char::is_control` only covers Cc.
pub fn is_invisible(c: char) -> bool {
    matches!(c,
        '\u{00AD}' | '\u{061C}' | '\u{180E}' | '\u{200B}'..='\u{200F}' | '\u{202A}'..='\u{202E}'
        | '\u{2060}'..='\u{2064}' | '\u{2066}'..='\u{2069}' | '\u{FEFF}' | '\u{FFF9}'..='\u{FFFB}')
}

/// One line of visible text: no control or invisible formatting characters.
pub fn is_plain_line(s: &str) -> bool {
    !s.chars().any(|c| c.is_control() || is_invisible(c))
}

/// A topic name is one line of 1–60 characters with no control characters.
/// It is shown as text and sanitised again before any use as a file name
/// (`store::views::sanitize_name`).
pub fn check_topic_name(name: &str) -> Result<()> {
    check_name("topic", name)
}

/// Shared rule for names the user types (topics, playlists).
pub fn check_name(what: &str, name: &str) -> Result<()> {
    let trimmed = name.trim();
    if trimmed.is_empty()
        || trimmed != name
        || name.chars().count() > MAX_TOPIC_NAME
        || !is_plain_line(name)
    {
        return Err(Error::Config(format!(
            "{what} names are 1–{MAX_TOPIC_NAME} visible characters on one line, without leading or trailing spaces"
        )));
    }
    Ok(())
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

/// Text `lemuse init` writes: the base settings plus the starter topics.
pub fn starter_toml(root: impl Into<PathBuf>) -> Result<String> {
    Ok(Config::new(root).to_toml()? + "\n" + STARTER_TOPICS_TOML)
}

/// Make sure a library exists at `paths` and return its config: create the
/// folders and catalog, and write the starter topics on first use. Shared by
/// `lemuse init` and the desktop app's first launch.
pub fn ensure_library(paths: &crate::store::LibraryPaths) -> Result<Config> {
    paths.ensure()?;
    crate::store::catalog::Catalog::open(&paths.catalog())?;
    let cfg_path = paths.config();
    if !cfg_path.exists() {
        let text = starter_toml(paths.root())?;
        std::fs::write(&cfg_path, text).map_err(|e| Error::io(&cfg_path, e))?;
    }
    Config::load(&cfg_path)
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
        let mut cfg: Config = toml::from_str(s).map_err(|e| Error::Config(e.to_string()))?;
        // Slugs are lowercase on Are.na; accept a hand-typed `Woodworking`
        // rather than refusing the whole config (review 0008 A-35).
        for t in &mut cfg.topics {
            for src in &mut t.sources {
                if let Some(ch) = &mut src.channel {
                    *ch = ch.trim().to_ascii_lowercase();
                }
            }
        }
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
        // Review 0008 ("what if someone changes what we fetch"): every value
        // that reaches a URL or a header is checked here, so a hand-edited or
        // tampered lemuse.toml can't steer requests. Hosts are compile-time
        // constants in each connector; the config can't name one.
        if let Some(c) = &self.sync.contact {
            if c.chars().count() > MAX_TEXT || !is_plain_line(c) {
                return Err(Error::Config(format!(
                    "sync.contact must be one line of at most {MAX_TEXT} characters"
                )));
            }
        }
        if self.topics.len() > MAX_TOPICS {
            return Err(Error::Config(format!("at most {MAX_TOPICS} topics")));
        }
        let total: usize = self.topics.iter().map(|t| t.sources.len()).sum();
        if total > MAX_TOTAL_SOURCES {
            return Err(Error::Config(format!(
                "at most {MAX_TOTAL_SOURCES} sources across all topics (found {total})"
            )));
        }
        let mut names = HashSet::new();
        for t in &self.topics {
            if t.name.trim().is_empty() {
                return Err(Error::Config("every [[topic]] needs a `name`".into()));
            }
            check_topic_name(&t.name)?;
            if t.sources.len() > MAX_SOURCES {
                return Err(Error::Config(format!(
                    "topic `{}`: at most {MAX_SOURCES} sources",
                    t.name
                )));
            }
            if t.keywords.len() > MAX_KEYWORDS {
                return Err(Error::Config(format!(
                    "topic `{}`: at most {MAX_KEYWORDS} keywords",
                    t.name
                )));
            }
            for k in t
                .keywords
                .iter()
                .chain(t.sources.iter().filter_map(|s| s.query.as_ref()))
            {
                if k.trim().is_empty() || k.chars().count() > MAX_TEXT || !is_plain_line(k) {
                    return Err(Error::Config(format!(
                        "topic `{}`: keywords and queries must be one line of 1–{MAX_TEXT} characters",
                        t.name
                    )));
                }
            }
            for s in &t.sources {
                if let Some(ch) = &s.channel {
                    if !crate::connectors::arena::is_valid_slug(ch) {
                        return Err(Error::Config(format!(
                            "topic `{}`: channel `{}` isn't a valid Are.na slug (lowercase letters, digits, - and _)",
                            t.name,
                            ch.escape_default()
                        )));
                    }
                }
            }
            // Case-insensitive: "Lamps" and "lamps" would share one folder
            // on Windows (review 0008 A-34).
            if !names.insert(t.name.to_lowercase()) {
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

    /// Default library root: `%USERPROFILE%\Pictures\LeMuse` on Windows,
    /// `$HOME/Pictures/LeMuse` elsewhere.
    pub fn default_root() -> PathBuf {
        let home = std::env::var_os("USERPROFILE")
            .or_else(|| std::env::var_os("HOME"))
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from("."));
        home.join("Pictures").join("LeMuse")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const EXAMPLE: &str = r#"
        [library]
        root = "D:/References"

        [sync]
        contact = "https://example.invalid/lemuse"

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
                "Objects",
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

    /// Review 0008: a tampered config can't steer a request path or header.
    #[test]
    fn rejects_values_that_could_steer_requests() {
        let base = "[library]\nroot = \"D:/R\"\n";
        let topic = |src: &str| format!("{base}[[topic]]\nname = \"x\"\n[[topic.source]]\n{src}\n");
        for bad in [
            topic("source = \"arena\"\nchannel = \"../users/me\""),
            topic("source = \"arena\"\nchannel = \"x?per=100000\""),
            topic("source = \"arena\"\nchannel = \"x#\""),
            topic("source = \"arena\"\nchannel = \"X Y\""),
            topic("source = \"cleveland\"\nquery = \"a\\nb\""),
            format!("{base}[sync]\ncontact = \"x\\r\\nX-Evil: 1\"\n"),
            format!("{base}[[topic]]\nname = \" padded \"\n"),
            format!(
                "{base}[[topic]]\nname = \"{}\"\n",
                "n".repeat(MAX_TOPIC_NAME + 1)
            ),
        ] {
            assert!(
                matches!(Config::from_toml_str(&bad), Err(Error::Config(_))),
                "accepted: {bad}"
            );
        }
        assert!(
            Config::from_toml_str(&topic("source = \"arena\"\nchannel = \"objects-26\"")).is_ok()
        );
        // Review 0008 A-34: invisible characters and case-only duplicates.
        for bad in [
            format!("{base}[[topic]]\nname = \"gnp.\u{202E}exe\"\n"),
            format!("{base}[[topic]]\nname = \"Lamps\u{200B}\"\n"),
            format!("{base}[[topic]]\nname = \"Lamps\"\n[[topic]]\nname = \"lamps\"\n"),
        ] {
            assert!(Config::from_toml_str(&bad).is_err(), "accepted: {bad:?}");
        }
        // Review 0008 A-35: a hand-typed uppercase slug is normalised, not fatal.
        let cfg = Config::from_toml_str(&topic("source = \"arena\"\nchannel = \" Woodworking \""))
            .unwrap();
        assert_eq!(
            cfg.topics[0].sources[0].channel.as_deref(),
            Some("woodworking")
        );
    }

    #[test]
    fn ensure_library_writes_starter_topics_once() {
        let dir = tempfile::tempdir().unwrap();
        let paths = crate::store::LibraryPaths::new(dir.path());
        let cfg = ensure_library(&paths).unwrap();
        assert_eq!(cfg.topics.len(), 16);
        // A user's edits survive the next launch.
        std::fs::write(
            paths.config(),
            "[library]
root = \"x\"
",
        )
        .unwrap();
        assert!(ensure_library(&paths).unwrap().topics.is_empty());
    }
}
