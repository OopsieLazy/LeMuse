//! Categories: LeMuse's own sorting of images (ADR-0015).
//!
//! Are.na has no tags or genres; a block only carries its type (image, link,
//! attachment, embed, text). So LeMuse assigns categories itself from a
//! built-in vocabulary (`assets/categories.toml`): words in the block's
//! title, description and museum object type, plus the names of the
//! channels or searches it was gathered from.
//!
//! The result lives in `block_categories`, a derived table rebuilt after
//! every refresh and whenever the vocabulary changes, like `thumbs/`. It is
//! never edited by hand and never sent anywhere.

use std::collections::{BTreeSet, HashMap, HashSet};
use std::sync::OnceLock;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::{Error, Result};

const VOCABULARY_TOML: &str = include_str!("../assets/categories.toml");

/// Longest phrase (in words) a term may have.
const MAX_PHRASE_WORDS: usize = 4;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub label: String,
    #[serde(default)]
    pub terms: Vec<String>,
    /// Are.na block kinds (`image`, `link`...) instead of words.
    #[serde(default)]
    pub kinds: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Group {
    pub id: String,
    pub label: String,
    #[serde(rename = "category")]
    pub categories: Vec<Category>,
}

/// A labelled list of extra words for Discover.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordList {
    pub label: String,
    pub words: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vocabulary {
    #[serde(rename = "group")]
    pub groups: Vec<Group>,
    #[serde(default)]
    pub discover: Vec<WordList>,
    /// Hash of the vocabulary file; a change triggers a rebuild.
    #[serde(skip_deserializing)]
    pub fingerprint: String,
}

/// The built-in vocabulary, parsed and checked once.
pub fn vocabulary() -> &'static Vocabulary {
    static V: OnceLock<Vocabulary> = OnceLock::new();
    V.get_or_init(|| parse(VOCABULARY_TOML).expect("assets/categories.toml is valid"))
}

/// Is `id` a category the vocabulary defines? Filters from the UI are
/// checked against this before they reach SQL.
pub fn is_known(id: &str) -> bool {
    vocabulary()
        .groups
        .iter()
        .flat_map(|g| &g.categories)
        .any(|c| c.id == id)
}

fn is_valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 40
        && id
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

pub fn parse(text: &str) -> Result<Vocabulary> {
    let mut v: Vocabulary =
        toml::from_str(text).map_err(|e| Error::Config(format!("categories: {e}")))?;
    let mut seen = HashSet::new();
    for c in v.groups.iter().flat_map(|g| &g.categories) {
        if !is_valid_id(&c.id) || !seen.insert(c.id.clone()) {
            return Err(Error::Config(format!(
                "categories: bad or repeated id `{}`",
                c.id
            )));
        }
        for t in &c.terms {
            let n = words(t).len();
            if n == 0 || n > MAX_PHRASE_WORDS {
                return Err(Error::Config(format!(
                    "categories: bad term `{t}` in `{}`",
                    c.id
                )));
            }
        }
    }
    v.fingerprint = hex::encode(Sha256::digest(text.as_bytes()));
    Ok(v)
}

/// Lower-case words of `text`: runs of letters and digits. `_`, `-`, `.`,
/// `/` and spaces all separate words, so file names like
/// `the-planets-sculpture.jpg` still yield `sculpture`.
fn words(text: &str) -> Vec<String> {
    text.split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty())
        .map(|w| w.to_lowercase())
        .collect()
}

/// The singular a plural word most likely has (`chairs` → `chair`,
/// `boxes` → `box`, `bodies` → `body`). Short words are left alone.
fn singular(w: &str) -> Option<String> {
    if w.len() <= 3 || !w.ends_with('s') || w.ends_with("ss") {
        return None;
    }
    if let Some(stem) = w.strip_suffix("ies") {
        return Some(format!("{stem}y"));
    }
    for suffix in ["xes", "ches", "shes", "sses", "zes"] {
        if w.ends_with(suffix) {
            return Some(w[..w.len() - 2].to_string());
        }
    }
    Some(w[..w.len() - 1].to_string())
}

/// Matches text against the vocabulary's terms.
pub struct Matcher {
    /// Phrase (words joined by one space) → category ids.
    terms: HashMap<String, Vec<String>>,
    /// Block kind → category ids.
    kinds: HashMap<String, Vec<String>>,
}

impl Matcher {
    pub fn new(v: &Vocabulary) -> Self {
        let mut terms: HashMap<String, Vec<String>> = HashMap::new();
        let mut kinds: HashMap<String, Vec<String>> = HashMap::new();
        for c in v.groups.iter().flat_map(|g| &g.categories) {
            for t in &c.terms {
                terms
                    .entry(words(t).join(" "))
                    .or_default()
                    .push(c.id.clone());
            }
            for k in &c.kinds {
                kinds.entry(k.clone()).or_default().push(c.id.clone());
            }
        }
        Self { terms, kinds }
    }

    /// Category ids for one block: its `kind` plus every term found in
    /// `texts` (title, description, museum type, channel names...).
    pub fn categorize<'a>(
        &self,
        kind: &str,
        texts: impl IntoIterator<Item = &'a str>,
    ) -> BTreeSet<String> {
        let mut out = BTreeSet::new();
        if let Some(ids) = self.kinds.get(kind) {
            out.extend(ids.iter().cloned());
        }
        for text in texts {
            let ws = words(text);
            // Each word as written and in its singular form; phrases are
            // matched on the singular of their last word only.
            for i in 0..ws.len() {
                let mut phrase = String::new();
                for (n, w) in ws[i..].iter().take(MAX_PHRASE_WORDS).enumerate() {
                    if n > 0 {
                        phrase.push(' ');
                    }
                    let base = phrase.clone();
                    phrase.push_str(w);
                    self.add(&phrase, &mut out);
                    if let Some(s) = singular(w) {
                        self.add(&format!("{base}{s}"), &mut out);
                    }
                }
            }
        }
        out
    }

    fn add(&self, phrase: &str, out: &mut BTreeSet<String>) {
        if let Some(ids) = self.terms.get(phrase) {
            out.extend(ids.iter().cloned());
        }
    }
}

/// Every word Discover offers: each list from the vocabulary, then one list
/// per category group (labels and terms), deduplicated and sorted.
pub fn discover_words(v: &Vocabulary) -> Vec<WordList> {
    let mut out: Vec<WordList> = v.discover.clone();
    for g in &v.groups {
        if g.categories.iter().all(|c| c.terms.is_empty()) {
            continue;
        }
        let mut set = BTreeSet::new();
        for c in &g.categories {
            set.insert(c.label.to_lowercase());
            set.extend(c.terms.iter().filter(|t| t.len() > 2).cloned());
        }
        out.push(WordList {
            label: g.label.clone(),
            words: set.into_iter().collect(),
        });
    }
    out
}

/// What the UI needs: groups with category ids and labels (no terms), and
/// the Discover word lists. Shared by the app and `lemuse preview-data`.
#[derive(Debug, Clone, Serialize)]
pub struct UiVocabulary {
    pub groups: Vec<UiGroup>,
    pub discover: Vec<WordList>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UiGroup {
    pub id: String,
    pub label: String,
    pub categories: Vec<UiCategory>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UiCategory {
    pub id: String,
    pub label: String,
}

pub fn ui_vocabulary(v: &Vocabulary) -> UiVocabulary {
    UiVocabulary {
        groups: v
            .groups
            .iter()
            .map(|g| UiGroup {
                id: g.id.clone(),
                label: g.label.clone(),
                categories: g
                    .categories
                    .iter()
                    .map(|c| UiCategory {
                        id: c.id.clone(),
                        label: c.label.clone(),
                    })
                    .collect(),
            })
            .collect(),
        discover: discover_words(v),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(m: &Matcher, kind: &str, texts: &[&str]) -> Vec<String> {
        m.categorize(kind, texts.iter().copied())
            .into_iter()
            .collect()
    }

    #[test]
    fn built_in_vocabulary_parses() {
        let v = vocabulary();
        assert!(v.groups.len() >= 5);
        assert!(is_known("wood") && is_known("rubber") && is_known("document"));
        assert!(!is_known("Wood") && !is_known("x'); DROP TABLE blocks; --"));
        assert_eq!(v.fingerprint.len(), 64);
    }

    #[test]
    fn matches_words_plurals_phrases_and_kinds() {
        let m = Matcher::new(vocabulary());
        assert_eq!(
            ids(&m, "image", &["Oak chairs"]),
            ["furniture", "image", "wood"]
        );
        assert_eq!(
            ids(&m, "link", &["8c8c6c-the-planets-sculpture.jpg"]),
            ["sculpture", "web-page"]
        );
        // A phrase, and a channel name as context.
        let got = ids(&m, "image", &["Untitled", "Art Deco lamps"]);
        assert!(got.contains(&"art-deco".to_string()) && got.contains(&"lighting".to_string()));
        // Museum object types.
        assert!(ids(&m, "image", &["Furniture and woodwork"]).contains(&"wood".to_string()));
        assert!(ids(&m, "attachment", &[]).contains(&"document".to_string()));
    }

    #[test]
    fn does_not_match_inside_words() {
        let m = Matcher::new(vocabulary());
        // "oak" inside "cloak", "tin" inside "painting", "ring" inside "string".
        let got = ids(&m, "text", &["cloak", "string theory"]);
        assert_eq!(got, ["text"]);
        assert!(!ids(&m, "image", &["Oil painting"]).contains(&"metal".to_string()));
    }

    #[test]
    fn singular_rules() {
        assert_eq!(singular("chairs").as_deref(), Some("chair"));
        assert_eq!(singular("boxes").as_deref(), Some("box"));
        assert_eq!(singular("bodies").as_deref(), Some("body"));
        assert_eq!(singular("glass"), None);
        assert_eq!(singular("bus"), None);
    }

    #[test]
    fn rejects_bad_vocabularies() {
        let bad_id = "[[group]]\nid='g'\nlabel='G'\n[[group.category]]\nid='Bad Id'\nlabel='x'\n";
        assert!(parse(bad_id).is_err());
        let dup = "[[group]]\nid='g'\nlabel='G'\n[[group.category]]\nid='a'\nlabel='x'\n[[group.category]]\nid='a'\nlabel='y'\n";
        assert!(parse(dup).is_err());
    }

    #[test]
    fn discover_lists_are_deduplicated() {
        let lists = discover_words(vocabulary());
        assert!(lists.iter().any(|l| l.label == "Drawing practice"));
        let material = lists.iter().find(|l| l.label == "Material").unwrap();
        assert!(material.words.contains(&"rubber".to_string()));
        let unique: BTreeSet<_> = material.words.iter().collect();
        assert_eq!(unique.len(), material.words.len());
    }
}
