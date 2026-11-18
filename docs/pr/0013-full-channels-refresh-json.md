# feat: whole channels, auto refresh and JSON for automation (work item 13)

**Branch:** `feat/0013-full-channels-refresh-json` → `main` · **Stacked on:** #12 (open this PR against
`feat/0012-mini-player-links` so the diff shows only this work; GitHub retargets it to `main` when #12 merges)
· **Merge:** Squash and merge on GitHub, last

## What

- **No more 200 cap:** big channels now load in full.
  - Each refresh resumes where the last one stopped, after first checking for new items.
  - A just-added channel reads up to 5,000 items at once.
- **Auto refresh** every 60 minutes while the app runs (`sync.interval_minutes`; 0 turns it off). For the hours
  the app is closed, docs/automation.md has the Task Scheduler command.
- **JSON for automation:** `--json` on every CLI command gives one envelope
  `{"lemuse":1,"command":…,"ok":…,"data"|"error":…}`. `status` lists channels still loading in full.
- **Plans, no code yet:**
  - sources beyond Are.na, including Pinterest (ADR-0018);
  - the dashboard server (ADR-0019);
  - `docs/product/audiences.md`, which tracks who LeMuse is for;
  - a table of what is cached and where (ARCHITECTURE).

## Why

The owner's session-10 request: "maxes out at 200 even if the channel is 1.2k … use the entire folder"; "the app
should auto refresh"; "make the JSON outputs for automation and plan the architecture for the dashboard"; "is
there a way to use Pinterest"; "keep track of who it's for".

## How

- **Engine:**
  - `walk()` pages from a start cursor to a stop timestamp or a budget;
  - `refresh_source` runs the head walk, then a backfill from the saved cursor (always at least one page);
  - the watermark is set only when the pass completes cleanly.
- **Catalog:** `resume_state`, `set_resume`, `clear_resume`, `unfinished`; migration 0006.
- **Config:**
  - `pages_per_refresh` default 5 (max 100); `interval_minutes` default 60 (0 or 15–1440);
  - `ADD_CHANNEL_PAGES` 50;
  - `config_edit::upgrade_page_default` runs once.
- **App:** `spawn_auto_refresh` (checks once a minute, skips while a refresh runs).
- **CLI:** rewritten around one `Output { data, text }` per command.

## Proof on real data

On a copy of the owner's library, one refresh took **4,489 → 6,450 images in 2 min 13 s**, with 0 errors, 65
sources, and the rate limits respected. Channels previously stuck at about 200 now hold up to 499 and continue
from page 6 on the next refresh. The second refresh resumed: **6,450 → 8,108 in 1 min 40 s**, 0 errors. The
big channels moved on to page 10, and Furniture completed at 649.

## Checklist

- [x] Secret scan clean
- [x] 85 tests (3 new) · fmt · clippy `-D warnings` (core, CLI, app)
- [x] No new dependency, capability or CSP host
- [x] Admin and developer passes: [review 0013](../reviews/0013-full-channels-refresh-json.md)
- [ ] Owner: watch a big channel fill in (Refresh, or wait for the hourly refresh); try `lemuse status --json`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
