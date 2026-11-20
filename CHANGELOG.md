# Changelog

All notable changes to this project are documented here. Format:
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).
Once a remote exists, release-please maintains this file from Conventional Commits (ADR-0006).

## [Unreleased]

### Added

- Before 1.0 (work item 23, ADR-0031): **Save as** (Q): the Windows Save dialog picks the folder and name, and a
  note says where it went until you close it (×); **changeable shortcuts** in the ? sheet; **H brings the bar
  back** in compact windows and the mini player too; channels made of channels (such as "Translucent
  electronics") list the channels inside in the preview, to add each as its own topic.
- 1.0 (work item 23, ADR-0030): third-party licences in the installer and Settings → About (and attached to each
  release); a catalog backup before every schema upgrade; a `guardrails` CI check that needs the owner's label
  when CI, hooks, scanners, permissions or CLAUDE.md change; Claude can no longer push; version 1.0.0.
- Finishing 1.0 (work item 22, ADR-0029):
  - LeMuse **remembers where you were** (view, page, image, study aids);
  - sessions get a **large ring clock** (or small, or hidden) and a soft **flash** on each new pose;
  - images **fade in** once loaded; pick the **grey behind the image** (Settings → Image); **Undo** after Hide
    this image, Mark as nudity and removing a ♥;
  - a first-run welcome: "What are you drawing today?";
  - a **museum label**: creator, CC0 or © creator, date · medium · dimensions, credit line; **sharper museum
    images** on big windows;
  - **grid view** (W), **search** (/), a **Saved** view, and **rename / remove topics** in the app; CLI
    `rename-topic`, `remove-topic --with-channels`; version 0.11.0.
- Road to 1.0 (work item 21, ADR-0026, ADR-0027, ADR-0028):
  - **values** in 2, 3, 4, 5, 7 or 9 tones, and **darks only / lights only / darks + lights** (I) to find the
    absolute darks and their light counterparts; a value strip on the image;
  - **drawing effects** (E), on screen only: lines, strokes ↕ (grass, hair, rain), strokes ↔ (water, wood grain),
    cross-hatch. Marks follow the picture's values;
  - **Channels you follow** shows where each channel is and adds the new ones (Add, Add all), each as **its own
    topic named after the channel**, under a "Following on Are.na" heading (or into the best-matching topic);
    `lemuse import-following`, `remove-channel`, `remove-topic`;
  - a **nudity sensor**: likely nudity is hidden by default (app, dashboard, sheets); right-click Hide this image
    or Mark as nudity; Settings → Content;
  - a **practice log** in the session planner: this week and eight weekly bars, no streaks;
  - an **update check** (Settings → About, daily at most, can be off) and `lemuse update-check`; a release workflow
    with SHA256SUMS, an SBOM and build provenance;
  - single-key shortcuts can be turned off; every control is at least 24 px and text meets contrast (checked in
    every state); docs: privacy statement, user guide, release guide; version 0.10.0.
- Practice tools (work item 20, ADR-0025):
  - **timed sessions** (N): gesture warm-up, relaxed, class (30 min), long class (1 h), sketches, long study or
    your own plan. The clock starts when the image has loaded and pauses when LeMuse is minimised. Soft ticks
    in the last 3 s and a tone on each new pose (can be switched off). Space pause, → skip, ← back, Esc end;
  - a **summary** of what you drew, with ♥ on each image, **Keep as a playlist**, and **Resume** after an early
    end;
  - **study aids**, on screen only: mirror (X), upside down (U), greyscale (G), values 2–5 and notan with a
    darker/lighter balance (V), squint (B), grids: thirds, 4 × 4, squares, diagonals (O), all off (0). A badge
    says when one is on;
  - **♥ Favourites** (K), a playlist made on your first ♥; **?** lists every shortcut;
  - Settings → About tells what LeMuse is for; alt text includes the creator; Studio's stage is neutral grey;
  - Copy details hides your Windows user name and token-like text; Report a problem fills in only the version;
    the bug form warns that issues are public. Code of conduct, privacy and takedown notes; version 0.9.0.
- Polish (work item 19, ADR-0024):
  - error codes everywhere: `--json` has `code`, the CLI exits 3–10 by kind, the app shows what to do;
  - error pages: the dashboard answers with real HTML pages and the right headers, the app has a crash page
    instead of a blank window, plus offline, "can't load" and Refresh details states;
  - the window stays responsive: nothing runs on the UI thread, and Find channels and Add channel wait their
    turn during a refresh instead of refusing;
  - **Channels you follow** in Find channels; `lemuse arena-token check` and `following`;
  - one running copy (a second launch focuses it); Settings → About; version 0.8.0.
- Are.na token (work item 18, ADR-0023): paste a personal access token (free accounts too) in Settings →
  Are.na account, or run `lemuse arena-token set`. It's checked with Are.na, then kept in Windows Credential
  Manager, never in a file. Refreshes go about 4× faster (120 reads a minute), your private channels open,
  and a refused token falls back to guest with a note.
- Save (work item 17, ADR-0022): the Save button and `lemuse save` put an image's full-size original into
  `views/<topic or playlist>/`; downloads come only from each source's own image server and must be real
  images; network and 5xx failures are retried. Right-click on the image opens Save original, Copy link and
  Open source page. The same picture saved twice on Are.na shows once, and a page's end moves on to the
  next page.
- Compact windows (work item 16): on tablets and windows under 1,024 px wide or 560 px tall, the image fills
  the window, topics open from ☰, and the bar shows when you tap the image.
- Dashboard, reference sheets, mini player v2 (work item 14, ADR-0019, ADR-0021):
  - `lemuse serve`: a read-only dashboard on `127.0.0.1` with a token, a JSON API and the LeMuse page for OBS,
    Home Assistant or a wall screen (`npm run build:dashboard`);
  - `lemuse sheet`: a printable reference sheet (Print → PDF), a fresh pick each day;
  - `lemuse sync --full` reads every channel to its end; a just-added channel reads up to 10,000 items;
  - mini player v2: smaller, the image fills it, tap for the bottom bar, ☰ to switch topics and playlists.
- Whole channels, auto refresh and JSON (work item 13, ADR-0017):
  - big channels load in full: each refresh resumes where the last one stopped; a just-added channel reads up
    to 5,000 items at once;
  - the app refreshes every 60 minutes while it runs (`sync.interval_minutes`, 0 = off);
  - `--json` on every CLI command, one envelope `{"lemuse":1,"command","ok","data"|"error"}`
    (docs/automation.md); `status` lists channels still loading.
  - **Release note:** a `lemuse.toml` with `pages_per_refresh = 2` (the old default written by `init`) is
    raised to 5 once, with a comment beside it. Set it back to 2 and it stays.
- Mini player and kept links (work item 12, ADR-0016): mini player (M), Copy link (L), image fallbacks,
  `lemuse export-links`.
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

### Fixed

- Saving an image no longer reshuffles the slideshow, so the saved image stays on screen.
- The mini player's menu fits the window at the smallest size.

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
