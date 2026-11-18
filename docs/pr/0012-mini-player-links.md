# feat: mini player and kept image links (work item 12)

**Branch:** `feat/0012-mini-player-links` → `main` · **Merge:** Squash and merge on GitHub, after #11 and #10
(press **Update branch** first)

## What

- **Mini player (M or the new button):** the window becomes a small, borderless, always-on-top player showing
  just the image.
  - Hover for previous, play, next and back-to-full.
  - Drag it by its top bar onto any monitor and resize it; LeMuse remembers where it was.
  - M again returns the full window exactly as it was.
- **Kept links:**
  - **Copy link (L or the new button)** puts the title, source page and full-size image link on the clipboard.
  - **Fallbacks:** a broken image tries its other stored sizes before it's skipped.
  - **`lemuse export-links`** prints every link of a topic, a playlist or All as CSV, JSON or text, for
    spreadsheets, scripts and backups.
- Images removed from a channel already stay in LeMuse with their links (ADR-0013).

## Why

The owner's session-9 goals: a small portable player for other monitors and dashboards, and saving image links so
images survive removal from channels (ADR-0016).

## How

- **Core:** `Slide.original_url` and `Slide.fallback_urls`; `Catalog::links(scope)`; `Catalog::playlist_id`;
  `export` module (CSV with formula guard, text).
- **CLI:** `export-links [--topic NAME | --playlist NAME] [--format csv|json|txt]`.
- **App:**
  - window permissions for mini mode, main window only (review 0012 A-58);
  - `Backend.setMini` and `copyText`;
  - `miniBounds` in settings (sanitized);
  - `data-mini` layout;
  - 4 new snapshot states.

## Checklist

- [x] Secret scan clean (`main...HEAD`)
- [x] 82 tests (3 new) · fmt · clippy `-D warnings` (core, CLI, app) · typecheck
- [x] W3C 45 files, 0 errors · layout 215 renders passed
- [x] No new dependency; 8 window permissions justified (review 0012)
- [ ] Owner: try the mini player on a second monitor, then M to come back; try Copy link

🤖 Generated with [Claude Code](https://claude.com/claude-code)
