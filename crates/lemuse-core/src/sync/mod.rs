//! Gathering orchestration. One code path for every trigger:
//! app launch, interval timer, "Gather now" button, and the CLI run by
//! Windows Task Scheduler. See ADR-0003 and ADR-0005.

pub mod engine;
pub mod lock;
pub mod throttle;

pub use engine::{RunSummary, SyncEngine, Trigger};
pub use lock::SyncLock;

use std::sync::Arc;

use crate::config::Config;
use crate::connectors::{self, arena, http};
use crate::store::catalog::Catalog;
use crate::store::LibraryPaths;

/// The one entry point every front-end uses for a network refresh: launch,
/// the Refresh button, the CLI and Task Scheduler (ADR-0005). Builds the
/// production HTTP client and connectors, then runs the engine.
///
/// With a saved Are.na token it first checks the token (one read) and keeps
/// to that account's budget; without one, or if Are.na refuses it, it runs
/// at the guest budget (ADR-0023).
pub fn refresh_library(
    paths: &LibraryPaths,
    cfg: &Config,
    trigger: Trigger,
) -> crate::Result<RunSummary> {
    paths.ensure()?;
    let session = arena_session(cfg);
    let client = session.client;
    let mut conns = connectors::all(client.clone(), session.tier);
    let mut catalog = Catalog::open(&paths.catalog())?;
    let mut summary = {
        let mut engine = SyncEngine::new(paths.clone(), &mut catalog, client);
        engine.run(cfg, &mut conns, trigger)?
    };
    summary.notes.extend(session.note);
    // Categories are derived from what was just fetched (ADR-0015).
    catalog.rebuild_categories(crate::categories::vocabulary())?;
    catalog.rebuild_dupes()?;
    Ok(summary)
}

/// The production HTTP client every front-end shares: rustls, `https_only`,
/// the descriptive User-Agent, and the saved Are.na token if there is one
/// (sent to `https://api.are.na` only). A vault error means no token.
pub fn production_client(cfg: &Config) -> Arc<dyn http::HttpClient> {
    client_with(cfg, crate::credentials::arena_token().ok().flatten())
}

/// The production client with an explicit token (or none).
pub fn client_with(cfg: &Config, arena_token: Option<String>) -> Arc<dyn http::HttpClient> {
    Arc::new(http::UreqClient::new(
        http::user_agent(cfg.sync.contact.as_deref()),
        arena_token,
    ))
}

/// How a refresh talks to Are.na (ADR-0023).
pub struct ArenaSession {
    /// The client: with the saved token, or without one.
    pub client: Arc<dyn http::HttpClient>,
    /// Whose read budget the engine keeps to.
    pub tier: arena::Tier,
    /// Something the person should know (a refused token), shown after the refresh.
    pub note: Option<String>,
}

/// Shown when Are.na refuses the token (no refresh involved).
pub const TOKEN_REFUSED_SHORT: &str = "Are.na refused the saved token (revoked or mistyped). \
Make a new one at are.na/settings/personal-access-tokens and save it again.";

/// Shown when Are.na refuses the saved token.
pub const TOKEN_REFUSED: &str = "Are.na refused your saved token, so this refresh ran as a guest \
(30 reads a minute, public channels only). Make a new token and paste it in Settings.";

/// The session for a refresh: the saved token is checked once (`GET /v3/me`)
/// so a revoked token doesn't run at a budget Are.na won't give (Are.na
/// quietly treats a bad token as a guest on public reads).
pub fn arena_session(cfg: &Config) -> ArenaSession {
    let guest = client_with(cfg, None);
    match crate::credentials::arena_token() {
        Ok(Some(token)) => {
            let s = check_session(client_with(cfg, Some(token)), guest);
            // Keep Are.na's minimum gap before the engine's first read.
            std::thread::sleep(std::time::Duration::from_millis(500));
            s
        }
        Ok(None) => ArenaSession {
            client: guest,
            tier: arena::Tier::Guest,
            note: None,
        },
        Err(e) => ArenaSession {
            client: guest,
            tier: arena::Tier::Guest,
            note: Some(format!("{e} This refresh ran as a guest.")),
        },
    }
}

/// [`arena_session`] after the vault read; split out for tests.
pub fn check_session(
    with_token: Arc<dyn http::HttpClient>,
    guest: Arc<dyn http::HttpClient>,
) -> ArenaSession {
    match arena::account(with_token.as_ref()) {
        Ok(Some(account)) => ArenaSession {
            client: with_token,
            tier: account.tier,
            note: None,
        },
        Ok(None) => ArenaSession {
            client: guest,
            tier: arena::Tier::Guest,
            note: Some(TOKEN_REFUSED.into()),
        },
        // Network trouble or a rate limit: keep the token, but stay at the
        // guest budget until a check succeeds.
        Err(_) => ArenaSession {
            client: with_token,
            tier: arena::Tier::Guest,
            note: None,
        },
    }
}

/// Check a pasted token with Are.na, then save it in Credential Manager.
/// Nothing is saved unless Are.na accepts it (ADR-0023).
pub fn save_arena_token(cfg: &Config, raw: &str) -> crate::Result<arena::Account> {
    let token = crate::credentials::clean_token(raw)?;
    let client = client_with(cfg, Some(token.clone()));
    match arena::account(client.as_ref())? {
        Some(account) => {
            crate::credentials::set_arena_token(&token, &account.slug)?;
            Ok(account)
        }
        None => Err(crate::Error::Token(
            "Are.na didn't accept that token. Make a new one at are.na/settings/personal-access-tokens and paste it again.".into(),
        )),
    }
}

/// Refresh one channel of one topic, right after "Add channel", instead of
/// every source (keeps the first look fast and inside the read budget).
/// Same engine, lock, throttle and policies as a full refresh.
pub fn refresh_channel(
    paths: &LibraryPaths,
    cfg: &Config,
    topic: &str,
    channel: &str,
    trigger: Trigger,
) -> crate::Result<RunSummary> {
    let Some(t) = cfg.topic(topic) else {
        return Err(crate::Error::Config(format!("no topic named `{topic}`")));
    };
    let mut one = cfg.clone();
    // A just-added channel may read more at once (up to 5,000 items), so a
    // big channel shows in full right away; the rest resumes later.
    one.sync.pages_per_refresh = one
        .sync
        .pages_per_refresh
        .max(crate::config::ADD_CHANNEL_PAGES);
    let mut t = t.clone();
    t.sources
        .retain(|s| s.source == arena::ID && s.channel.as_deref() == Some(channel));
    one.topics = vec![t];
    refresh_library(paths, &one, trigger)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::http::FixtureClient;

    fn me_url() -> String {
        format!("{}/me", arena::API_BASE)
    }

    #[test]
    fn a_good_token_sets_the_budget() {
        let token = Arc::new(FixtureClient::default());
        token.push(&me_url(), 200, r#"{"slug":"a-b","name":"A","tier":"free"}"#);
        let s = check_session(token, Arc::new(FixtureClient::default()));
        assert_eq!(s.tier, arena::Tier::Free);
        assert!(s.note.is_none());
    }

    #[test]
    fn a_refused_token_falls_back_to_guest_and_says_so() {
        let token = Arc::new(FixtureClient::default());
        token.push(&me_url(), 401, "{}");
        let guest = Arc::new(FixtureClient::default());
        let s = check_session(token.clone(), guest.clone());
        assert_eq!(s.tier, arena::Tier::Guest);
        assert_eq!(s.note.as_deref(), Some(TOKEN_REFUSED));
        // Later reads go through the guest client, not the refused token.
        s.client
            .get("https://api.are.na/v3/channels/x", &[])
            .unwrap();
        assert_eq!(guest.requests.lock().unwrap().len(), 1);
        assert_eq!(token.requests.lock().unwrap().len(), 1);
    }

    #[test]
    fn a_failed_check_keeps_the_token_at_the_guest_budget() {
        let token = Arc::new(FixtureClient::default());
        token.push(&me_url(), 503, "busy");
        let s = check_session(token.clone(), Arc::new(FixtureClient::default()));
        assert_eq!(s.tier, arena::Tier::Guest);
        assert!(s.note.is_none());
        s.client
            .get("https://api.are.na/v3/channels/x", &[])
            .unwrap();
        assert_eq!(token.requests.lock().unwrap().len(), 2);
    }
}
