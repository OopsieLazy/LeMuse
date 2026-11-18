# feat: dashboard, reference sheets and mini player v2 (work item 14)

**Branch:** `feat/0014-dashboard-sheets-mini` → `main` · **Stacked on:** #13 (open this PR against
`feat/0013-full-channels-refresh-json`; GitHub retargets it when #13 merges) · **Merge:** Squash and merge, last

## What

- **Dashboard (`lemuse serve`):** a read-only page and JSON API on `http://127.0.0.1:47555`, protected by a
  token. It runs the LeMuse slideshow in any browser, an OBS browser source, a Home Assistant webpage card or on
  a wall screen, and picks up new images on its own. Build the page once with `npm run build:dashboard`.
- **Reference sheets (`lemuse sheet`):** a printable page of images with credits (Print → Save as PDF). The pick
  changes daily and stays the same all day.
- **Mini player v2:**
  - smaller (360 × 225) and the image fills it;
  - tap the image to show or hide the bottom bar;
  - ☰ at the top left switches between All, topics and playlists;
  - drag it by the bottom bar.
- **Whole channels now:** `lemuse sync --full` reads every channel to its end; a just-added channel reads up to
  10,000 items at once.
- **Plans:** a hosted web app on a domain, in stages (ADR-0020), and a daily mailer plus ways to add pins to
  channels automatically (ADR-0021). Q19 and Q20 recorded as no.

## Why

The owner's session-11 request: start the dashboard; a daily reference sheet; can it become a web app on a
friend's domain while the desktop app stays; pin automation; whole channels; a smaller, cleaner mini player.

## How

- **Core:**
  - `serve` module: std-only HTTP/1.1, GET and HEAD only, a token and Host check, static files from an
    allow-list;
  - `serve::preview_data` is shared with the CLI;
  - `export::{to_sheet_html, pick, esc, today_utc}`;
  - `ADD_CHANNEL_PAGES` 100.
- **CLI:** `serve`, `sheet`, `sync --full`; the scope helper is shared with `export-links`.
- **UI:**
  - the preview backend reads live data with the token from the page address and polls for changes;
  - it starts playlists from the catalog;
  - `vite --mode dashboard` (no snapshot data);
  - mini v2 in `SlideshowView`;
  - 2 new snapshot states.
- **Dependency:** `getrandom` 0.2.17, already in `Cargo.lock`.

## Checklist

- [x] Secret scan clean
- [x] 94 tests (9 new) · fmt · clippy `-D warnings` (core, CLI, app) · typecheck
- [x] W3C 47 files, 0 errors · layout 225 renders passed
- [x] `cargo audit`: 0 vulnerabilities
- [x] Live checks: API, the page in headless Edge, a W3C-valid sheet
- [x] Admin and developer passes: [review 0014](../reviews/0014-dashboard-sheets-mini.md)
- [x] Design artifact republished (same link) · app rebuilt and launched for review
- [ ] Owner: try the mini player (M, tap, ☰), `lemuse serve`, and `lemuse sheet`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
