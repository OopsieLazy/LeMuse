# feat: mini player, whole channels, dashboard and reference sheets (GitHub PR #2)

**Branch:** `feat/0014-dashboard-sheets-mini` → `main` · **Merge:** Squash and merge, after the CI fix and the
roadmap PR (#1). This PR holds four work items, because their branches were stacked:
[12](0012-mini-player-links.md), [13](0013-full-channels-refresh-json.md), 14 (below) and
[15](0015-public-repo-hygiene.md).

**PR title (must start with a type):** `feat: mini player, whole channels, dashboard and reference sheets`

## What

- **Mini player** (M):
  - a small, borderless window that stays on top, on any monitor, and remembers where it was;
  - v2: the image fills it, tap the image for the bottom bar, ☰ at the top left to switch topics and
    playlists.
- **Kept links:** Copy link (L); a broken image tries its other stored sizes before it's skipped;
  `lemuse export-links` (CSV, JSON, text).
- **Whole channels:**
  - no more 200 cap: each refresh resumes where the last one stopped;
  - a just-added channel reads up to 10,000 items at once;
  - `lemuse sync --full` reads every channel to its end now.
- **Auto refresh** every 60 minutes while the app runs; **`--json`** on every CLI command (docs/automation.md).
- **Dashboard (`lemuse serve`):** a read-only page and JSON API on `http://127.0.0.1:47555`, protected by a
  token. It runs in a browser, an OBS browser source, a Home Assistant webpage card or on a wall screen.
- **Reference sheets (`lemuse sheet`):** a printable page of images with credits (Print → PDF), a new pick each
  day.
- **Public-repo hygiene:** `.gitignore` and the secret scanner keep LeMuse outputs and tokens out of git, and
  CLAUDE.md has a standing rule for it.
- **Plans (ADRs):**
  - ADR-0016: beyond the desktop;
  - ADR-0017: whole channels;
  - ADR-0018: sources and Pinterest;
  - ADR-0019: dashboard;
  - ADR-0020: a hosted web app in stages;
  - ADR-0021: mailer and pin automation.

  Plus the audiences tracker and the caching table in ARCHITECTURE.

## Why

The owner's requests in sessions 9–12: a portable mini player, keeping image links, whole channels instead of
200, auto refresh, JSON for automation, a dashboard, daily reference sheets, a path to a web app, and keeping
the public repo clean.

## How

The per-item details are in the linked PR docs and in reviews
[0012](../reviews/0012-mini-player-links.md), [0013](../reviews/0013-full-channels-refresh-json.md),
[0014](../reviews/0014-dashboard-sheets-mini.md) and [0015](../reviews/0015-public-repo-hygiene.md).
Migrations 0005–0006 are additive. The only new dependency is `getrandom` 0.2.17, which was already in
`Cargo.lock`.

## Checklist

- [x] Secret scan clean (the scanner's new rules caught their test cases)
- [x] 94 tests · fmt · clippy `-D warnings` (core, CLI, app) · typecheck
- [x] W3C 47 files, 0 errors · layout 45 states × 5 sizes = 225 renders passed
- [x] `cargo audit`: 0 vulnerabilities
- [x] Real data: whole channels (4,489 → 8,108 images over two refreshes); live dashboard checks; a W3C-valid
  sheet
- [x] Admin and developer passes for each item (reviews 0012–0015)
- [x] Design artifact republished · app rebuilt and launched for review
- [ ] Owner: try the mini player (M, tap, ☰), `lemuse serve` and `lemuse sheet`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
