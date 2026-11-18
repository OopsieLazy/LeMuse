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

use crate::config_edit::{self, AddOutcome};
use crate::connectors::arena::{self, ChannelInfo};
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
}
