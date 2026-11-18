# feat: playlists, All, Add channel; security upkeep (#8)

**Branch:** `feat/0008-playlists-import` → `main` · **Stacked on:** #7 · **Merge:** squash
([0008-playlists-import.merge.txt](0008-playlists-import.merge.txt))

## What

- **Playlists:** your own lists of images, kept in the app. The new playlist button under any image (or P) adds
  the current image to one or more playlists, or creates a new playlist on the spot. Playlists appear in the
  topic list; rename and delete them in the Channels and playlists dialog (A). They hold links only, never image
  files, and a refresh never touches them.
- **All:** one slideshow with every image from every topic, at the top of the list. It is the default view.
- **Add channel:** paste any Are.na channel link (or just its slug) into the + dialog and pick a topic, or name a
  new one. LeMuse checks the channel with Are.na once, adds it, and loads only that channel straight away.
  Channels can also be removed there. The CLI equivalent is `lemuse add-channel <link> --topic …`.
- **Security upkeep:**
  - SQLite updated (two 2026 advisories);
  - stricter HTTP (https only, no credentials across redirects);
  - CI installs npm packages with install scripts off (2026 npm worms);
  - an npm audit gate with reviewed, expiring exceptions.

## Why

The owner's session-6 request:

1. playlists plus an All channel;
2. Q14, confirmed: add the remaining channels with the add feature;
3. "can injection be made within the add feature, what happens if someone changes fetch from", and staying
   current on security;
4. run the app for review before committing.

## How

- **Core:**
  - `arena::parse_channel_ref`: exact hosts only, a strict slug charset, and the pasted URL is never fetched;
  - `arena::lookup_channel`: one GET through `HttpClient`;
  - `config_edit` (`toml_edit`): validated, atomic edits;
  - `import::add_channel`;
  - `sync::refresh_channel`;
  - `Catalog`: playlists, `playlist_slides`, `count_slides`;
  - migrations 0003–0004.
- **Config validation:** a hand-edited `lemuse.toml` can't steer requests (slugs, queries, contact, names, limits).
- **App:**
  - new IPC commands, all validated in Rust;
  - Add channel allows at most 24 lookups a minute, waits while a refresh runs, and backs off on a 429;
  - config edits are locked across app and CLI, and never overwrite a concurrent edit;
  - no new plugins, capabilities or CSP hosts.
- **UI:**
  - `SlideshowView` gains the rail sections (All, Topics, Playlists) and the playlist menu;
  - new `LibraryPanel` dialog;
  - 12 new snapshot states, all checked by W3C and the layout test.
- The security analysis table is in ADR-0014.

## Checklist

- [x] Secret scan clean (branch, uncommitted, untracked)
- [x] 66 tests (15 new) · fmt · clippy `-D warnings` (core, CLI, app) · typecheck
- [x] W3C: 32 files, 0 errors · layout: 30 states × 5 sizes = 150 renders passed
- [x] `cargo audit`: 0 vulnerabilities (was 1) · npm audit gate passes; 1 dev-only exception expiring 2026-12-15
- [x] ADR-0004: one user-initiated lookup per added channel; no search, no crawling
- [x] No new Tauri plugin, capability or CSP host
- [x] Admin pass (agent, read-only) and developer pass: [review 0008](../reviews/0008-playlists-import.md)
- [x] Design artifact republished (same link) · test installer rebuilt · app launched for owner review
- [ ] Owner: try Add channel with the 6 channels from Q14

## Risk and rollback

- Risk: medium-low. A new migration adds two tables (additive only), and the app now writes `lemuse.toml`:
  structurally, re-validated, atomically, and never over a broken hand edit.
- Rollback: revert the squash commit. Migration 0003 only adds tables, and older builds ignore them.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
