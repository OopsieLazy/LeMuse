//! "Add channel": paste an Are.na link, LeMuse checks it and adds it to a
//! topic (ADR-0014). One code path for the app and the CLI.
//!
//! Steps, each a trust boundary (review 0008):
//! 1. [`arena::parse_channel_ref`]: pasted text → slug, with no network
//!    call. Only exact Are.na hosts; the pasted URL is never fetched.
//! 2. [`arena::lookup_channel`]: one GET to the fixed API host through the
//!    shared `HttpClient`, to confirm the channel exists and is public.
//! 3. [`config_edit::add_channel`]: a structural, validated, atomic edit of
//!    `lemuse.toml`.
//!
//! The caller then refreshes just that channel
//! ([`crate::sync::refresh_channel`]).

use std::path::Path;

use serde::Serialize;

use crate::config::Config;
use crate::config_edit::{self, AddOutcome};
use crate::connectors::arena::{self, ChannelInfo, ChannelSummary, RelatedChannels};
use crate::connectors::http::HttpClient;
use crate::{Error, Result};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct AddedChannel {
    pub topic: String,
    pub channel: ChannelInfo,
    /// False when the channel was already in that topic.
    pub added: bool,
}

/// Parse, look up and add. `http` is the production client in the app and a
/// fixture client in tests.
pub fn add_channel(
    http: &dyn HttpClient,
    config_path: &Path,
    input: &str,
    topic: &str,
    create_topic: bool,
) -> Result<AddedChannel> {
    // Fail on a bad topic name before spending an API request.
    crate::config::check_topic_name(topic)?;
    let slug = arena::parse_channel_ref(input).map_err(|e| Error::Config(e.to_string()))?;
    let channel = arena::lookup_channel(http, &slug)?;
    let (outcome, stored) =
        config_edit::add_channel(config_path, topic, &channel.slug, create_topic)?;
    Ok(AddedChannel {
        topic: stored,
        channel,
        added: outcome == AddOutcome::Added,
    })
}

// ── Channels you follow → topics (ADR-0026) ────────────────────────────
//
// The followed list comes from the owner's own Are.na account (one read per
// page, on a click). Adding from it needs no further reads: the list already
// says the channel exists and the account can see it. Nothing is added
// unless the owner asks; following a channel on Are.na never adds it by
// itself (ADR-0004: only channels the user chooses).

/// Topic for followed channels that match no existing topic.
pub const FOLLOWING_TOPIC: &str = "Following";

/// Most channels one "Add all" may add.
pub const MAX_FOLLOWED_ADD: usize = 100;

/// A followed channel with where it already is and where it would go.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct FollowedChannel {
    #[serde(flatten)]
    pub channel: ChannelSummary,
    /// Topics that already have this channel (empty: not imported yet).
    pub in_topics: Vec<String>,
    /// The topic "Add" picks unless told otherwise.
    pub suggested: String,
}

/// One page of followed channels, annotated against `lemuse.toml`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct FollowedPage {
    pub channels: Vec<FollowedChannel>,
    pub total: Option<u64>,
    pub next_page: Option<u32>,
}

/// What to add: a followed channel and, optionally, the topic for it.
#[derive(Debug, Clone, PartialEq, Eq, serde::Deserialize)]
pub struct FollowedPick {
    pub slug: String,
    pub title: String,
    /// None: the suggested topic.
    #[serde(default)]
    pub topic: Option<String>,
}

/// One result of "Add all".
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct AddedFollowed {
    pub slug: String,
    pub title: String,
    pub topic: String,
    /// False when it was already in that topic.
    pub added: bool,
}

/// Lower-case words of 3+ letters, plural "s" dropped, minus filler words.
fn topic_words(text: &str) -> Vec<String> {
    const FILLER: &[&str] = &[
        "the",
        "and",
        "for",
        "with",
        "from",
        "of",
        "my",
        "our",
        "your",
        "stuff",
        "things",
        "misc",
        "collection",
        "channel",
        "references",
        "reference",
        "inspo",
        "inspiration",
    ];
    text.split(|c: char| !c.is_alphanumeric())
        .map(str::to_lowercase)
        .filter(|w| w.chars().count() >= 3 || w.chars().any(|c| c.is_ascii_digit()))
        .map(|w| match w.strip_suffix('s') {
            Some(stem) if stem.chars().count() >= 3 && !w.ends_with("ss") => stem.to_string(),
            _ => w,
        })
        .filter(|w| !FILLER.contains(&w.as_str()))
        .collect()
}

/// A few words people use for the same subject (topic word → channel words).
const ALIASES: &[(&str, &[&str])] = &[
    (
        "tech",
        &["electronic", "computer", "gadget", "device", "hardware"],
    ),
    ("vintage", &["retro", "antique"]),
    ("wood", &["timber", "carpentry", "furniture"]),
    ("object", &["sitting", "seating", "stool"]),
    ("art", &["painting", "artwork"]),
    ("form", &["shape", "sculpture"]),
];

/// Whether a channel word counts as a topic word: equal, an alias, or a
/// longer word that starts with it ("woodworking" → wood, "y2kaesthetic…" → y2k).
fn related(topic_word: &str, channel_word: &str) -> bool {
    channel_word == topic_word
        || (topic_word.chars().count() >= 3 && channel_word.starts_with(topic_word))
        || ALIASES
            .iter()
            .any(|(t, ws)| *t == topic_word && ws.iter().any(|w| channel_word.starts_with(w)))
}

/// The existing topic whose name and keywords share the most words with a
/// channel's title and slug; [`FOLLOWING_TOPIC`] when none share any. Ties
/// go to the topic whose name is covered best, then the one listed first.
pub fn suggest_topic(cfg: &Config, title: &str, slug: &str) -> String {
    let mut channel: Vec<String> = topic_words(title);
    channel.extend(topic_words(&slug.replace('-', " ")));
    // Score: shared words first, then how much of the topic's own name they
    // cover ("Tech" beats "Vintage tech" for "tech stuff").
    let mut best: Option<(&str, (usize, usize))> = None;
    for t in &cfg.topics {
        let name: std::collections::BTreeSet<String> = topic_words(&t.name).into_iter().collect();
        let mut words = name.clone();
        for k in &t.keywords {
            words.extend(topic_words(k));
        }
        let hit = |w: &String| channel.iter().any(|c| related(w, c));
        let shared = words.iter().filter(|w| hit(w)).count();
        let cover = name.iter().filter(|w| hit(w)).count() * 1000 / name.len().max(1);
        let score = (shared, cover);
        if shared > 0 && best.is_none_or(|(_, b)| score > b) {
            best = Some((&t.name, score));
        }
    }
    best.map_or_else(|| FOLLOWING_TOPIC.to_string(), |(n, _)| n.to_string())
}

/// Mark each followed channel with the topics that have it and a suggestion.
pub fn annotate_followed(cfg: &Config, page: RelatedChannels) -> FollowedPage {
    let channels = page
        .channels
        .into_iter()
        .map(|c| {
            let in_topics = cfg
                .topics
                .iter()
                .filter(|t| {
                    t.sources.iter().any(|s| {
                        s.source == "arena" && s.channel.as_deref() == Some(c.slug.as_str())
                    })
                })
                .map(|t| t.name.clone())
                .collect();
            let suggested = suggest_topic(cfg, &c.title, &c.slug);
            FollowedChannel {
                channel: c,
                in_topics,
                suggested,
            }
        })
        .collect();
    FollowedPage {
        channels,
        total: page.total,
        next_page: page.next_page,
    }
}

/// Add followed channels to topics in one go (no API reads). Each slug is
/// checked again; a topic that doesn't exist yet is created. The caller then
/// runs one refresh for all of them.
pub fn add_followed(config_path: &Path, picks: &[FollowedPick]) -> Result<Vec<AddedFollowed>> {
    if picks.len() > MAX_FOLLOWED_ADD {
        return Err(Error::Config(format!(
            "add at most {MAX_FOLLOWED_ADD} channels at once"
        )));
    }
    let cfg = Config::load(config_path)?;
    let mut out = Vec::with_capacity(picks.len());
    for p in picks {
        let topic = match &p.topic {
            Some(t) => t.clone(),
            None => suggest_topic(&cfg, &p.title, &p.slug),
        };
        let (outcome, stored) = config_edit::add_channel(config_path, &topic, &p.slug, true)?;
        out.push(AddedFollowed {
            slug: p.slug.clone(),
            title: p.title.clone(),
            topic: stored,
            added: outcome == AddOutcome::Added,
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{starter_toml, Config};
    use crate::connectors::arena::API_BASE;
    use crate::connectors::http::FixtureClient;

    #[test]
    fn link_to_topic_end_to_end() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("lemuse.toml");
        std::fs::write(&path, starter_toml("D:/R").unwrap()).unwrap();
        let http = FixtureClient::default();
        http.push(
            &format!("{API_BASE}/channels/woodworking"),
            200,
            include_str!("../tests/fixtures/arena_channel.json"),
        );
        let added = add_channel(
            &http,
            &path,
            "https://www.are.na/someone/woodworking",
            "Lamps",
            true,
        )
        .unwrap();
        assert!(added.added);
        assert_eq!(added.channel.title, "Woodworking");
        let cfg = Config::load(&path).unwrap();
        assert_eq!(
            cfg.topic("Lamps").unwrap().sources[0].channel.as_deref(),
            Some("woodworking")
        );
        // Only the fixed API host was contacted, once.
        assert_eq!(
            *http.requests.lock().unwrap(),
            [format!("{API_BASE}/channels/woodworking")]
        );
    }

    #[test]
    fn refused_input_makes_no_request_and_no_edit() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("lemuse.toml");
        std::fs::write(&path, starter_toml("D:/R").unwrap()).unwrap();
        let before = std::fs::read_to_string(&path).unwrap();
        let http = FixtureClient::default();
        for (input, topic) in [
            ("https://evil.example/u/x", "Lamps"),
            ("woodworking", "bad\nname"),
            ("woodworking", ""),
        ] {
            assert!(add_channel(&http, &path, input, topic, true).is_err());
        }
        // A missing channel costs one lookup and changes nothing.
        assert!(add_channel(&http, &path, "missing", "Lamps", true).is_err());
        assert_eq!(http.requests.lock().unwrap().len(), 1);
        assert_eq!(std::fs::read_to_string(&path).unwrap(), before);
    }

    const LIB: &str = r#"
[library]
root = "D:/R"

[[topic]]
name = "Vintage tech"

[[topic.source]]
source = "arena"
channel = "old-computers"

[[topic]]
name = "Tech"

[[topic]]
name = "Wood objects"
keywords = ["chair", "joinery"]
"#;

    fn summary(slug: &str, title: &str) -> ChannelSummary {
        ChannelSummary {
            slug: slug.into(),
            title: title.into(),
            owner: Some("Someone".into()),
            contents: Some(10),
        }
    }

    #[test]
    fn followed_channels_get_the_best_matching_topic() {
        let cfg = Config::from_toml_str(LIB).unwrap();
        // More shared words wins: "vintage" + "tech" beats "tech".
        assert_eq!(
            suggest_topic(&cfg, "Vintage Tech Ads", "vintage-tech-ads"),
            "Vintage tech"
        );
        assert_eq!(suggest_topic(&cfg, "tech stuff", "tech-stuff-2"), "Tech");
        // Keywords count, plurals too ("Chairs" → chair).
        assert_eq!(suggest_topic(&cfg, "Chairs", "chairs-x1"), "Wood objects");
        // Nothing in common: the Following topic. Filler words never match.
        assert_eq!(
            suggest_topic(&cfg, "Reference collection", "misc"),
            FOLLOWING_TOPIC
        );
        // Longer words and aliases: "woodworking" → wood, "electronics" → tech.
        assert_eq!(
            suggest_topic(&cfg, "woodworking", "woodworking"),
            "Wood objects"
        );
        assert_eq!(suggest_topic(&cfg, "Translucent electronics", "x"), "Tech");
        assert_eq!(suggest_topic(&cfg, "Typography retro", "x"), "Vintage tech");
        let page = annotate_followed(
            &cfg,
            RelatedChannels {
                channels: vec![
                    summary("old-computers", "Old computers"),
                    summary("brutalism", "Brutalism"),
                ],
                total: Some(2),
                next_page: None,
            },
        );
        assert_eq!(page.channels[0].in_topics, ["Vintage tech"]);
        assert!(page.channels[1].in_topics.is_empty());
        assert_eq!(page.channels[1].suggested, FOLLOWING_TOPIC);
    }

    #[test]
    fn add_followed_adds_without_reads_and_is_idempotent() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("lemuse.toml");
        std::fs::write(&path, LIB).unwrap();
        let picks = vec![
            FollowedPick {
                slug: "chair-studies".into(),
                title: "Chair studies".into(),
                topic: None,
            },
            FollowedPick {
                slug: "brutalism".into(),
                title: "Brutalism".into(),
                topic: None,
            },
            FollowedPick {
                slug: "old-computers".into(),
                title: "Old computers".into(),
                topic: Some("Vintage tech".into()),
            },
        ];
        let out = add_followed(&path, &picks).unwrap();
        assert_eq!(out[0].topic, "Wood objects");
        assert_eq!(out[1].topic, FOLLOWING_TOPIC);
        assert!(out[0].added && out[1].added);
        assert!(!out[2].added, "already in Vintage tech");
        let cfg = Config::load(&path).unwrap();
        assert!(
            cfg.topic(FOLLOWING_TOPIC).is_some(),
            "Following was created"
        );
        // Running it again adds nothing.
        assert!(add_followed(&path, &picks)
            .unwrap()
            .iter()
            .all(|a| !a.added));
        // Bad slugs and too many picks are refused before any edit.
        let bad = [FollowedPick {
            slug: "../evil".into(),
            title: "x".into(),
            topic: None,
        }];
        assert!(add_followed(&path, &bad).is_err());
        let many: Vec<_> = (0..=MAX_FOLLOWED_ADD)
            .map(|i| FollowedPick {
                slug: format!("c-{i}"),
                title: "x".into(),
                topic: None,
            })
            .collect();
        assert!(add_followed(&path, &many).is_err());
    }
}
