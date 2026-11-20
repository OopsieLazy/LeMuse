//! "Is there a newer LeMuse?" (ADR-0028).
//!
//! One GET to GitHub's public Releases API for this project's repository,
//! through the shared [`HttpClient`] (never with the Are.na token, which is
//! only ever sent to api.are.na). Nothing is downloaded: a newer release is
//! shown with a link to its page, and the user installs it. Full automatic
//! updates (Tauri updater) need a permanent signing key and are planned in
//! the ADR.
//!
//! The answer is untrusted: the version must look like a version, and the
//! link must be a release page of this repository, or the release is ignored.

use serde::Serialize;
use serde_json::Value;

use crate::connectors::http::HttpClient;
use crate::{Error, Result};

/// GitHub's "latest release" for LeMuse (drafts and pre-releases excluded).
pub const LATEST_RELEASE_API: &str =
    "https://api.github.com/repos/OopsieLazy/LeMuse/releases/latest";

/// Only links under this prefix are shown.
pub const RELEASES_PAGE: &str = "https://github.com/OopsieLazy/LeMuse/releases/";

/// The newest published release.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Release {
    /// "1.0.0" (without the leading "v").
    pub version: String,
    pub name: String,
    /// The release page (https, this repository only).
    pub url: String,
    pub published_at: Option<String>,
    /// Newer than the running version.
    pub newer: bool,
}

/// `major.minor.patch` with an optional `-pre` part; anything else is None.
fn parse(v: &str) -> Option<([u64; 3], Option<&str>)> {
    let v = v.strip_prefix('v').unwrap_or(v);
    let (core, pre) = match v.split_once('-') {
        Some((c, p)) => (c, Some(p)),
        None => (v, None),
    };
    let mut parts = core.split('.');
    let mut out = [0u64; 3];
    for slot in &mut out {
        let p = parts.next()?;
        if p.is_empty() || p.len() > 6 || !p.bytes().all(|b| b.is_ascii_digit()) {
            return None;
        }
        *slot = p.parse().ok()?;
    }
    if parts.next().is_some() {
        return None;
    }
    Some((out, pre))
}

/// A plain client for the update check: LeMuse's User-Agent, no token.
pub fn client() -> std::sync::Arc<dyn HttpClient> {
    use crate::connectors::http;
    std::sync::Arc::new(http::UreqClient::new(http::user_agent(None), None))
}

/// Whether `candidate` is a later version than `current` (SemVer order: a
/// pre-release sorts before its release).
pub fn is_newer(candidate: &str, current: &str) -> bool {
    match (parse(candidate), parse(current)) {
        (Some((a, ap)), Some((b, bp))) => match a.cmp(&b) {
            std::cmp::Ordering::Greater => true,
            std::cmp::Ordering::Less => false,
            std::cmp::Ordering::Equal => matches!((ap, bp), (None, Some(_))),
        },
        _ => false,
    }
}

/// Ask GitHub for the latest release. `Ok(None)`: no release published yet
/// (GitHub answers 404). Errors: network trouble or GitHub's rate limit.
pub fn latest_release(http: &dyn HttpClient, current: &str) -> Result<Option<Release>> {
    let resp = http.get(
        LATEST_RELEASE_API,
        &[
            ("Accept", "application/vnd.github+json"),
            ("X-GitHub-Api-Version", "2022-11-28"),
        ],
    )?;
    match resp.status {
        200 => {}
        404 => return Ok(None),
        403 | 429 => {
            return Err(Error::RateLimited {
                connector: "github".into(),
                retry_after_secs: resp
                    .headers
                    .get("retry-after")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(3600),
            })
        }
        s => return Err(gh_error(format!("GitHub answered {s} to the update check"))),
    }
    let v: Value = serde_json::from_slice(&resp.body)
        .map_err(|e| gh_error(format!("GitHub's release answer wasn't JSON: {e}")))?;
    let tag = v["tag_name"].as_str().unwrap_or_default();
    let url = v["html_url"].as_str().unwrap_or_default();
    if v["draft"].as_bool() == Some(true) || v["prerelease"].as_bool() == Some(true) {
        return Ok(None);
    }
    let Some(_) = parse(tag) else { return Ok(None) };
    if !url.starts_with(RELEASES_PAGE) || url.contains(['"', '<', '>', ' ', '\\']) {
        return Ok(None);
    }
    let version = tag.strip_prefix('v').unwrap_or(tag).to_string();
    let name: String = v["name"]
        .as_str()
        .unwrap_or(tag)
        .chars()
        .filter(|c| !c.is_control())
        .take(80)
        .collect();
    Ok(Some(Release {
        newer: is_newer(&version, current),
        version,
        name,
        url: url.to_string(),
        published_at: v["published_at"].as_str().map(str::to_string),
    }))
}

/// A problem with GitHub's answer (code `source`).
fn gh_error(message: String) -> Error {
    Error::Connector {
        connector: "github".into(),
        message,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::http::FixtureClient;

    const FIXTURE: &str = include_str!("../tests/fixtures/github_release_latest.json");

    #[test]
    fn versions_compare_like_semver() {
        assert!(is_newer("1.0.0", "0.10.0"));
        assert!(is_newer("v0.10.1", "0.10.0"));
        assert!(
            is_newer("0.10.0", "0.10.0-rc1"),
            "a release beats its pre-release"
        );
        assert!(!is_newer("0.10.0-rc1", "0.10.0"));
        assert!(!is_newer("0.9.9", "0.10.0"), "numbers, not text");
        assert!(!is_newer("1.0.0", "1.0.0"));
        for junk in ["", "latest", "1.0", "1.0.0.0", "1.x.0", "99999999.0.0"] {
            assert!(!is_newer(junk, "0.1.0"), "{junk}");
        }
    }

    #[test]
    fn latest_release_reads_one_page_and_checks_it() {
        let http = FixtureClient::default();
        http.push(LATEST_RELEASE_API, 200, FIXTURE);
        let r = latest_release(&http, "0.10.0").unwrap().unwrap();
        assert_eq!(r.version, "1.0.0");
        assert!(r.newer);
        assert_eq!(
            r.url,
            "https://github.com/OopsieLazy/LeMuse/releases/tag/v1.0.0"
        );
        assert_eq!(*http.requests.lock().unwrap(), [LATEST_RELEASE_API]);
        // Same version: not newer.
        http.push(LATEST_RELEASE_API, 200, FIXTURE);
        assert!(!latest_release(&http, "1.0.0").unwrap().unwrap().newer);
    }

    #[test]
    fn no_release_bad_links_and_limits_are_handled() {
        let http = FixtureClient::default();
        // No release published yet.
        http.push(LATEST_RELEASE_API, 404, "{\"message\":\"Not Found\"}");
        assert_eq!(latest_release(&http, "0.10.0").unwrap(), None);
        // A link to anywhere else is ignored.
        let evil = FIXTURE.replace(
            "https://github.com/OopsieLazy/LeMuse/releases/tag/v1.0.0",
            "https://evil.example/download",
        );
        http.push(LATEST_RELEASE_API, 200, evil);
        assert_eq!(latest_release(&http, "0.10.0").unwrap(), None);
        // A pre-release or a junk tag is ignored.
        http.push(
            LATEST_RELEASE_API,
            200,
            FIXTURE.replace("\"prerelease\": false", "\"prerelease\": true"),
        );
        assert_eq!(latest_release(&http, "0.10.0").unwrap(), None);
        http.push(
            LATEST_RELEASE_API,
            200,
            FIXTURE.replace("\"v1.0.0\"", "\"nightly\""),
        );
        assert_eq!(latest_release(&http, "0.10.0").unwrap(), None);
        // GitHub's rate limit is a rate limit, not a crash.
        http.push(LATEST_RELEASE_API, 403, "{}");
        assert!(matches!(
            latest_release(&http, "0.10.0"),
            Err(Error::RateLimited { .. })
        ));
        http.push(LATEST_RELEASE_API, 200, "not json");
        assert!(latest_release(&http, "0.10.0").is_err());
    }
}
