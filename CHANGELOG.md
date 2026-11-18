# Changelog

All notable changes to this project are documented here. Format:
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).
Once a remote exists, release-please maintains this file from Conventional Commits (ADR-0006).

## [Unreleased]

### Added

- Architecture skeleton for LeMuse (PR #1):
  - Rust workspace with `lemuse-core`, the `lemuse` CLI, and a Tauri 2 + React desktop shell.
  - Topics: `[[topic]]` / `[[topic.source]]` config. Each topic is a slideshow fed by Are.na channels you pick.
  - Stream-first refresh:
    - metadata and image URLs go into a SQLite catalog (FTS5, migrations v1–v2);
    - images stream from Are.na's CDN, with `Catalog::slides()` feeding the UI;
    - at most 2 API pages per channel per refresh;
    - opt-in download mode.
  - Content-addressed store and hardlinked `views/<topic>/` for saved images.
  - Are.na v3 mapping, connector trait and source policy. Refresh engine with a single-run lock, throttling,
    retry and watermarks.
  - CLI: `init` (starter config with an example topic), `topics`, `slides`, `status`, `search`; `sync` is a
    placeholder until M1.
- Research report, ADR-0001…0007, plan, architecture overview, templates, progress log.
- GitHub PR and issue templates, CODEOWNERS placeholder, Windows CI workflow.
- MIT licence.
- Keyword topics (PR #2): the owner's 15 starter topics; Cleveland Museum of Art and Art Institute of Chicago
  keyword-search connectors (CC0 only; weekly refresh); 13 verified Are.na channels; one shared throttle per
  source per refresh.
- Live preview (PR #3):
  - the slideshow UI: topic rail, full-window image, attribution, timer, ←/→/Space/S keys, shuffle, preload ≤ 2;
    images that fail to load are skipped;
  - real refresh: production HTTP client, `lemuse sync`, refresh on app launch and with the Refresh button;
  - previews: browser preview, a design artifact and a Windows test-build CI job;
  - W3C Nu HTML Checker gate in a pre-commit hook and in CI;
  - InPrivate WebView, so no streamed image is written to a disk cache.
