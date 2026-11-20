//! Changes to `lemuse.toml` made from the app or the CLI (Add channel,
//! ADR-0014).
//!
//! Edits go through `toml_edit`, a structural TOML editor, so the user's
//! comments and layout survive and no user input is ever spliced into TOML
//! text (a topic name with quotes or newlines can't inject keys). Every edit:
//! - holds an OS lock on `lemuse.toml.lock`, shared by the app and the CLI,
//!   so two writers can't lose each other's change (review 0008 A-32);
//! - is re-parsed with [`Config::from_toml_str`] and fully validated *before*
//!   it is written;
//! - is written to a uniquely named temp file and renamed over the config
//!   only if the file still holds exactly what was read (an editor saving
//!   in between wins, and the app reports it), so the app never leaves a
//!   broken, half-written or clobbered config behind.

use std::fs::{File, OpenOptions, TryLockError};
use std::io::Write;
use std::path::Path;
use std::time::{Duration, Instant};

use toml_edit::{value, ArrayOfTables, DocumentMut, Item, Table};

use crate::config::{check_topic_name, Config};
use crate::connectors::arena;
use crate::{Error, Result};

/// What [`add_channel`] did.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AddOutcome {
    Added,
    /// The channel was already in that topic; nothing changed.
    AlreadyThere,
}

/// Held for the whole read-modify-write. The OS drops the lock if the
/// process dies, so it can't go stale.
struct EditLock(#[allow(dead_code)] File);

fn lock(path: &Path) -> Result<EditLock> {
    let lock_path = path.with_extension("toml.lock");
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(&lock_path)
        .map_err(|e| Error::io(&lock_path, e))?;
    let deadline = Instant::now() + Duration::from_secs(3);
    loop {
        match file.try_lock() {
            Ok(()) => return Ok(EditLock(file)),
            Err(TryLockError::WouldBlock) if Instant::now() < deadline => {
                std::thread::sleep(Duration::from_millis(100))
            }
            Err(TryLockError::WouldBlock) => {
                return Err(Error::Config(
                    "lemuse.toml is being changed by another LeMuse window or command; try again"
                        .into(),
                ))
            }
            Err(TryLockError::Error(e)) => return Err(Error::io(&lock_path, e)),
        }
    }
}

fn read_doc(path: &Path) -> Result<(String, DocumentMut)> {
    let text = std::fs::read_to_string(path).map_err(|e| Error::io(path, e))?;
    let doc = text
        .parse::<DocumentMut>()
        .map_err(|e| Error::Config(e.to_string()))?;
    Ok((text, doc))
}

fn topics_mut(doc: &mut DocumentMut) -> Result<&mut ArrayOfTables> {
    let root = doc.as_table_mut();
    if !root.contains_key("topic") {
        root.insert("topic", Item::ArrayOfTables(ArrayOfTables::new()));
    }
    root["topic"]
        .as_array_of_tables_mut()
        .ok_or_else(|| Error::Config("`topic` must be a list of [[topic]] tables".into()))
}

fn topic_name(t: &Table) -> Option<&str> {
    t.get("name").and_then(Item::as_str)
}

/// Topic names match case-insensitively ("lamps" finds "Lamps"), like the
/// duplicate check in `Config::validate` (review 0008 A-34).
fn is_named(t: &Table, name: &str) -> bool {
    topic_name(t).is_some_and(|n| n.to_lowercase() == name.to_lowercase())
}

fn is_arena_channel(t: &Table, slug: &str) -> bool {
    t.get("source").and_then(Item::as_str) == Some(arena::ID)
        && t.get("channel").and_then(Item::as_str) == Some(slug)
}

/// Validate the edited document as a whole, then replace the file, but only
/// if nobody changed it since `original` was read.
fn validate_and_write(path: &Path, original: &str, doc: &DocumentMut) -> Result<Config> {
    let text = doc.to_string();
    let cfg = Config::from_toml_str(&text)?;
    let dir = path.parent().unwrap_or_else(|| Path::new("."));
    let mut tmp = tempfile::Builder::new()
        .prefix(".lemuse.toml.")
        .suffix(".tmp")
        .tempfile_in(dir)
        .map_err(|e| Error::io(dir, e))?;
    tmp.write_all(text.as_bytes())
        .map_err(|e| Error::io(tmp.path(), e))?;
    tmp.as_file()
        .sync_all()
        .map_err(|e| Error::io(tmp.path(), e))?;
    let now = std::fs::read_to_string(path).map_err(|e| Error::io(path, e))?;
    if now != original {
        return Err(Error::Config(
            "lemuse.toml changed while LeMuse was editing it, so nothing was written; try again"
                .into(),
        ));
    }
    // On any failure the temp file is deleted when `tmp` drops: no leftovers.
    tmp.persist(path).map_err(|e| Error::io(path, e.error))?;
    Ok(cfg)
}

/// Add an Are.na channel to a topic, creating the topic when `create` is set.
/// Returns what happened and the topic's name as stored (an existing topic's
/// spelling wins over the case typed). `slug` must already be validated by
/// [`arena::parse_channel_ref`]; it is checked again here because this is the
/// last stop before the file.
pub fn add_channel(
    path: &Path,
    topic: &str,
    slug: &str,
    create: bool,
) -> Result<(AddOutcome, String)> {
    add_channel_in_group(path, topic, slug, create, None)
}

/// Like [`add_channel`]; a topic it creates goes under `group` in the topic
/// list (an existing topic keeps its own group).
pub fn add_channel_in_group(
    path: &Path,
    topic: &str,
    slug: &str,
    create: bool,
    group: Option<&str>,
) -> Result<(AddOutcome, String)> {
    check_topic_name(topic)?;
    if let Some(g) = group {
        crate::config::check_name("group", g)?;
    }
    if !arena::is_valid_slug(slug) {
        return Err(Error::Config(
            arena::ChannelRefError::NotAChannel.to_string(),
        ));
    }
    let _guard = lock(path)?;
    let (original, mut doc) = read_doc(path)?;
    let topics = topics_mut(&mut doc)?;
    let found = topics.iter().position(|t| is_named(t, topic));
    let idx = match found {
        Some(i) => i,
        None if create => {
            let mut t = Table::new();
            t.insert("name", value(topic));
            t.insert("shuffle", value(true));
            if let Some(g) = group {
                t.insert("group", value(g));
            }
            topics.push(t);
            topics.len() - 1
        }
        None => return Err(Error::Config(format!("no topic named `{topic}`"))),
    };
    let t = topics
        .get_mut(idx)
        .ok_or_else(|| Error::Config("topic vanished while editing".into()))?;
    let stored = topic_name(t).unwrap_or(topic).to_string();
    if !t.contains_key("source") {
        t.insert("source", Item::ArrayOfTables(ArrayOfTables::new()));
    }
    let sources = t["source"].as_array_of_tables_mut().ok_or_else(|| {
        Error::Config(format!(
            "topic `{topic}`: `source` must be [[topic.source]] tables"
        ))
    })?;
    if sources.iter().any(|s| is_arena_channel(s, slug)) {
        return Ok((AddOutcome::AlreadyThere, stored));
    }
    let mut s = Table::new();
    s.insert("source", value(arena::ID));
    s.insert("channel", value(slug));
    sources.push(s);
    validate_and_write(path, &original, &doc)?;
    Ok((AddOutcome::Added, stored))
}

/// Remove an Are.na channel from a topic. Returns whether anything changed.
/// Catalogued images stay in the catalog (archive policy, ADR-0013); they
/// just stop showing under that topic, and playlists keep them.
/// Marks a config already upgraded by [`upgrade_page_default`].
const PAGE_UPGRADE_NOTE: &str = "pages_per_refresh: 2 was the old default";

/// One-time upgrade (ADR-0017): `lemuse init` used to write
/// `pages_per_refresh = 2`, which kept big channels at their newest 200
/// items. Raise exactly that value to the new default and leave a comment,
/// which also stops this from running again if the user sets 2 on purpose.
/// Returns whether the file changed.
pub fn upgrade_page_default(path: &Path) -> Result<bool> {
    let _guard = lock(path)?;
    let (original, mut doc) = read_doc(path)?;
    if original.contains(PAGE_UPGRADE_NOTE) {
        return Ok(false);
    }
    let Some(sync) = doc.get_mut("sync").and_then(Item::as_table_mut) else {
        return Ok(false);
    };
    if sync.get("pages_per_refresh").and_then(Item::as_integer) != Some(2) {
        return Ok(false);
    }
    sync["pages_per_refresh"] = toml_edit::value(i64::from(crate::config::DEFAULT_PAGES));
    if let Some(mut key) = sync.key_mut("pages_per_refresh") {
        key.leaf_decor_mut().set_prefix(format!(
            "# {PAGE_UPGRADE_NOTE}; LeMuse now resumes big channels on each refresh (ADR-0017)\n"
        ));
    }
    validate_and_write(path, &original, &doc)?;
    Ok(true)
}

/// Rename a topic (ADR-0029). The new name follows the usual rules and must
/// not belong to another topic (case doesn't make a name different). Returns
/// the stored name, or false-y None if there is no such topic.
pub fn rename_topic(path: &Path, from: &str, to: &str) -> Result<Option<String>> {
    check_topic_name(to)?;
    let _guard = lock(path)?;
    let (original, mut doc) = read_doc(path)?;
    let topics = topics_mut(&mut doc)?;
    let Some(i) = topics.iter().position(|t| is_named(t, from)) else {
        return Ok(None);
    };
    if topics
        .iter()
        .enumerate()
        .any(|(j, t)| j != i && is_named(t, to))
    {
        return Err(Error::Config(format!(
            "there's already a topic named `{to}`"
        )));
    }
    let t = topics
        .get_mut(i)
        .ok_or_else(|| Error::Config("topic vanished while editing".into()))?;
    t.insert("name", value(to));
    validate_and_write(path, &original, &doc)?;
    Ok(Some(to.to_string()))
}

/// Remove a topic with everything in it (the user asked, in the app or with
/// `lemuse remove-topic --with-channels`). Images stay in the catalog and in
/// playlists; saved files are untouched. Returns false if there's no such topic.
pub fn remove_topic(path: &Path, topic: &str) -> Result<bool> {
    let _guard = lock(path)?;
    let (original, mut doc) = read_doc(path)?;
    let topics = topics_mut(&mut doc)?;
    let Some(i) = topics.iter().position(|t| is_named(t, topic)) else {
        return Ok(false);
    };
    topics.remove(i);
    validate_and_write(path, &original, &doc)?;
    Ok(true)
}

/// Remove a topic, but only an empty one (no sources, no keywords): a topic
/// with channels or searches is the user's work and stays. Returns false if
/// there is no such topic.
pub fn remove_empty_topic(path: &Path, topic: &str) -> Result<bool> {
    let _guard = lock(path)?;
    let (original, mut doc) = read_doc(path)?;
    let topics = topics_mut(&mut doc)?;
    let Some(i) = topics.iter().position(|t| is_named(t, topic)) else {
        return Ok(false);
    };
    let t = topics
        .get(i)
        .ok_or_else(|| Error::Config("topic vanished while editing".into()))?;
    let has_sources = t
        .get("source")
        .and_then(Item::as_array_of_tables)
        .is_some_and(|a| !a.is_empty());
    let has_keywords = t
        .get("keywords")
        .and_then(Item::as_array)
        .is_some_and(|a| !a.is_empty());
    if has_sources || has_keywords {
        return Err(Error::Config(format!(
            "topic `{topic}` still has channels or keywords; remove those first"
        )));
    }
    topics.remove(i);
    validate_and_write(path, &original, &doc)?;
    Ok(true)
}

pub fn remove_channel(path: &Path, topic: &str, slug: &str) -> Result<bool> {
    let _guard = lock(path)?;
    let (original, mut doc) = read_doc(path)?;
    let topics = topics_mut(&mut doc)?;
    let Some(t) = topics.iter_mut().find(|t| is_named(t, topic)) else {
        return Ok(false);
    };
    let Some(sources) = t.get_mut("source").and_then(Item::as_array_of_tables_mut) else {
        return Ok(false);
    };
    let before = sources.len();
    sources.retain(|s| !is_arena_channel(s, slug));
    if sources.len() == before {
        return Ok(false);
    }
    validate_and_write(path, &original, &doc)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::starter_toml;

    fn starter() -> (tempfile::TempDir, std::path::PathBuf) {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("lemuse.toml");
        std::fs::write(&path, starter_toml("D:/References").unwrap()).unwrap();
        (dir, path)
    }

    fn arena_channels(path: &Path, topic: &str) -> Vec<String> {
        Config::load(path)
            .unwrap()
            .topic(topic)
            .unwrap()
            .sources
            .iter()
            .filter(|s| s.source == "arena")
            .filter_map(|s| s.channel.clone())
            .collect()
    }

    #[test]
    fn adds_to_a_middle_topic_and_keeps_comments() {
        let (_d, path) = starter();
        assert_eq!(
            add_channel(&path, "Castle", "castles-x", false).unwrap().0,
            AddOutcome::Added
        );
        assert!(arena_channels(&path, "Castle").contains(&"castles-x".to_string()));
        // Nothing leaked into the topic after it.
        assert!(!arena_channels(&path, "Y2K tech").contains(&"castles-x".to_string()));
        let text = std::fs::read_to_string(&path).unwrap();
        assert!(text.contains("# Add your own"), "comments were lost");
        assert_eq!(
            add_channel(&path, "Castle", "castles-x", false).unwrap().0,
            AddOutcome::AlreadyThere
        );
        assert!(remove_channel(&path, "Castle", "castles-x").unwrap());
        assert!(!arena_channels(&path, "Castle").contains(&"castles-x".to_string()));
        assert!(!remove_channel(&path, "Castle", "castles-x").unwrap());
    }

    #[test]
    fn creates_a_topic_only_when_asked() {
        let (_d, path) = starter();
        assert!(add_channel(&path, "Lamps", "lamps", false).is_err());
        add_channel(&path, "Lamps", "lamps", true).unwrap();
        assert_eq!(arena_channels(&path, "Lamps"), ["lamps"]);
        assert!(Config::load(&path).unwrap().topic("Lamps").unwrap().shuffle);
        // Review 0008 A-34: "lamps" is the same topic, not a second one.
        let (_, stored) = add_channel(&path, "lamps", "lamps-2", true).unwrap();
        assert_eq!(stored, "Lamps");
        assert_eq!(arena_channels(&path, "Lamps"), ["lamps", "lamps-2"]);
    }

    /// Review 0008 A-32: a second writer (app vs CLI) waits, then gives up
    /// without touching the file; no temp files are left behind.
    #[test]
    fn concurrent_writer_is_refused_cleanly() {
        let (dir, path) = starter();
        let before = std::fs::read_to_string(&path).unwrap();
        let held = lock(&path).unwrap();
        let err = add_channel(&path, "Castle", "castles-y", false).unwrap_err();
        assert!(err.to_string().contains("another LeMuse"), "{err}");
        drop(held);
        assert_eq!(std::fs::read_to_string(&path).unwrap(), before);
        add_channel(&path, "Castle", "castles-y", false).unwrap();
        let leftovers: Vec<_> = std::fs::read_dir(dir.path())
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().ends_with(".tmp"))
            .collect();
        assert!(leftovers.is_empty());
    }

    /// Review 0008: names with TOML syntax stay plain strings; bad slugs and
    /// names never reach the file.
    #[test]
    fn hostile_names_cannot_inject_toml() {
        let (_d, path) = starter();
        let sneaky = "x\"]\n[sync]\nfiles = \"download";
        assert!(add_channel(&path, sneaky, "lamps", true).is_err()); // newline → refused
        let quoted = "Lamps \"and\" [lights] = 1 # not a comment";
        add_channel(&path, quoted, "lamps", true).unwrap();
        let cfg = Config::load(&path).unwrap();
        assert!(cfg.topic(quoted).is_some());
        assert_eq!(cfg.sync.files, crate::config::FileMode::Stream);
        let before = std::fs::read_to_string(&path).unwrap();
        for slug in ["../x", "a\"b", "a\nb", ""] {
            assert!(
                add_channel(&path, "Castle", slug, false).is_err(),
                "{slug:?}"
            );
        }
        assert_eq!(std::fs::read_to_string(&path).unwrap(), before);
    }

    #[test]
    fn never_writes_an_invalid_config() {
        let (_d, path) = starter();
        // A config that's already broken by hand stays as the user left it.
        std::fs::write(
            &path,
            "[library]\nroot = \"x\"\n[[topic]]\nname = \"a\"\n[[topic]]\nname = \"a\"\n",
        )
        .unwrap();
        let before = std::fs::read_to_string(&path).unwrap();
        assert!(add_channel(&path, "a", "lamps", false).is_err());
        assert_eq!(std::fs::read_to_string(&path).unwrap(), before);
        assert!(!path.with_extension("toml.tmp").exists());
    }

    #[test]
    fn old_page_default_is_raised_once_and_comments_survive() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("lemuse.toml");
        std::fs::write(
            &path,
            "[library]\nroot = \"./library\"\n\n[sync]\n# mine\non_launch = true\npages_per_refresh = 2\n",
        )
        .unwrap();
        assert!(upgrade_page_default(&path).unwrap());
        let text = std::fs::read_to_string(&path).unwrap();
        assert!(
            text.contains("pages_per_refresh = 5") && text.contains("# mine"),
            "{text}"
        );
        assert!(text.contains(PAGE_UPGRADE_NOTE));
        // Set back to 2 on purpose: left alone from now on.
        std::fs::write(&path, text.replace("= 5", "= 2")).unwrap();
        assert!(!upgrade_page_default(&path).unwrap());
        // Any other value is the user's choice.
        std::fs::write(
            &path,
            "[library]\nroot = \"./library\"\n\n[sync]\npages_per_refresh = 3\n",
        )
        .unwrap();
        assert!(!upgrade_page_default(&path).unwrap());
    }
}
