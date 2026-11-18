# Changelog

All notable changes to this project are documented here. Format:
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).
Once a remote exists, release-please maintains this file from Conventional Commits (ADR-0006).

## [Unreleased]

### Added

- Pages, categories and Find channels (PR #9, ADR-0015):
  - views over 500 images get a page menu (1–500, 501–1,000, …);
  - LeMuse sorts images into ~70 categories (kind, material, medium, object, style) from titles, channel names
    and museum data; a genre-style filter includes or excludes them;
  - Find channels: ~1,100 search words that open Are.na's search in the browser, a channel preview before
    adding, and Related channels for the current image;
  - CLI `preview-channel` and `related`. Links now open only on Are.na and the museum sites.
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
- Renamed to **LeMuse** (PR #4). GitHub: <https://github.com/OopsieLazy/LeMuse>.
- Security gates (PR #5):
  - secret and personal-data scan in pre-commit, before the agent finishes, and in CI;
  - an admin-review agent hook on commits;
  - gitleaks, npm/cargo audit, dependency review;
  - a 10 MiB installer budget.
- Design system and Settings (PR #6):
  - tokens for every visual value;
  - 5 themes, 5 layouts, 4 typeface sets, an accent colour, sliders and toggles;
  - fullscreen and a hideable control bar;
  - links open in the system browser;
  - a layout test proving the image never sits under the bar.
- Followed channels and archive policy (PR #7): a new Objects topic plus 7 more channels; catalogued posts are never
  deleted by a refresh.
- Playlists, All and Add channel (PR #8): your own lists of images (links only; a refresh never touches them); an
  All slideshow across every topic; paste an Are.na link to add a channel to a topic (`lemuse add-channel` too).

### Security

- Vite 5.4 → 6.4.5 fixes a high-severity dev-server path traversal and the esbuild dev-server advisory (PR #5).
- PR #8:
  - rusqlite 0.41.1 bundles SQLite 3.54 (RUSTSEC-2026-0459; FTS5 CVE-2026-11822/11824);
  - the HTTP client is https-only and never forwards credentials on redirects;
  - config values that reach URLs or headers are validated;
  - CI installs npm packages with install scripts off;
  - an npm audit gate accepts only reviewed, expiring, dev-only exceptions.

  **Note for hand-edited configs:** `lemuse.toml` is now checked more strictly:
  - topic names must be one line of at most 60 visible characters and unique ignoring case;
  - channel slugs may contain only letters, digits, `-` and `_` (uppercase is lowercased automatically).

  A config that breaks a rule is refused, with a message naming the topic and value.
