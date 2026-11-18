# Architecture

This explains the big picture and *why* each piece is shaped the way it is. The decisions themselves are in
[docs/adr/](adr/). The evidence is in [reports/Arena reference gatherer architecture.md](../reports/Arena%20reference%20gatherer%20architecture.md).

**Goal:** a stream or slideshow of reference images on a topic (ADR-0007).

## System view

```
            ┌──────────────── Windows desktop ─────────────────────────────┐
            │                                                               │
 launch ───▶│  app/ (Tauri 2)                      crates/lemuse-cli    │◀── Task Scheduler
 Refresh ──▶│   React UI ◀─IPC─▶ src-tauri          `lemuse sync`       │    (optional, M4)
            │   slideshow │ topics/slides/refresh          │                │
            │      │      └──────────┬───────────────────────┘               │
            │      │                 ▼                                       │
            │      │      crates/lemuse-core                             │
            │      │  config [[topic]] ─▶ sync::SyncEngine ─▶ connectors::arena
            │      │          lock · throttle · retry · page budget · watermark
            │      │                 ▼                        │ HttpClient    │
            │      │  store::catalog (blocks + block_media URLs)              │
            │      │  store::blobs/views  (only for saved images)            │
            └──────│─────────────────────────────── network ─────────────────┘
                   │ <img src=…> streamed           │
                   ├─ images.are.na (large/medium)  ├─ api.are.na/v3  (JSON metadata, ≤2 pages/channel/refresh)
                   └─ CloudFront (originals)        └─ originals/attachments on Save only

<library root>  (default %USERPROFILE%\Pictures\LeMuse)
  lemuse.toml            topics + sources
  catalog.db                 SQLite WAL + FTS5: blocks, block_media, collections, saves
  objects/ab/cd/<sha256>.<ext>   saved originals (content-addressed)
  views/<topic>/<title> [id].<ext>   hardlinks to saved originals, for Explorer/PureRef/CAD
```

## The choices and why

| Choice | Why (short) | ADR |
|---|---|---|
| **Stream images from the CDN; save on request** | The goal is a slideshow, not an archive. Display is the API's intended use, while bulk downloading is what the terms prohibit. Zero disk use by default | 0007 |
| **Topics = subjects: keywords + sources** | The owner listed subjects (Q8). Free museum keyword search (Cleveland, CC0) covers historic subjects; curated Are.na channels cover modern ones, because Are.na search is Premium-only | 0008 |
| **Museums refresh weekly, 1 page per keyword; one throttle per source per run** | Search results barely change; pacing must hold across many keywords on one API | 0008 |
| **AIC built but held back** | Its image host serves a Cloudflare challenge to non-browser clients; verify in-app before enabling. No evasion | 0008 |
| **"Paginate, don't enumerate": ≤ 2 pages per channel per refresh; load more lazily** | Are.na's own guidance for display apps; a refresh costs ~2 calls per channel | 0007 |
| **Display `large` (1800 px) → `medium` → `original`** | Sharp on a 1080p–1440p screen, a fraction of the original's size. Originals are only fetched on Save | 0007 |
| **Tauri 2 desktop app (approved)** | ~8.6 MiB installer vs ~244 MiB Electron; native Rust core; fast web UI iteration; no Qt licence or tooling cost | 0001 ✅ |
| **All logic in `lemuse-core`; GUI and CLI are thin** | Launch refresh, scheduled refresh and the Refresh button behave identically | 0001, 0005 |
| **SQLite + FTS5 catalog** | One file, transactional, fast search; slideshows start instantly from cached metadata | 0002 |
| **Content-addressed `objects/` + hardlinked `views/` for saves** | Dedup, integrity, atomic writes; saved images are browsable outside the app with no admin rights | 0002 |
| **`block_media` = remote state, `block_files` = local state** | A refresh replaces media URLs but can never unlink a file the user saved | 0007 (D-9) |
| **Connector trait + `SourcePolicy` as data** | New sources are one file; rate limits and unattended-allowed are enforced centrally | 0003, 0004 |
| **Watermark refresh; advance only after a complete, error-free pass** | Cheap re-runs; nothing is silently skipped after a failure or a page-budget cut | 0003, 0007 |
| **HTTP behind `HttpClient`; fixture tests** | Deterministic tests, no network in CI, easy 429 injection | 0003 |
| **Blocking I/O on a worker thread** | The rate limit is the bottleneck; async adds complexity without throughput | 0003 |
| **Attribution always on screen** | Are.na content belongs to its creators | 0004, 0007 |
| **One pure view (`SlideshowView`) rendered by the app, the browser preview, the design artifact and the W3C snapshot** | The owner sees the real design every PR; nothing drifts between what's reviewed and what ships | 0009 |
| **W3C Nu HTML Checker, local, on commits + CI** | Conformance checked on the real rendered markup; no markup sent to a web service | 0009 |
| **WebView2 InPrivate** | Streamed images live only in memory; nothing lands in a disk cache | 0009 |
| **GitHub Flow + Conventional Commits + squash + staged review loop** | Auditable and revertible; the owner keeps the final gate | 0006 |

## What is cached, and where

LeMuse keeps **metadata**, not images. Nothing below holds image bytes unless you press Save (or turn on
download mode).

| What | Where | Lifetime | Holds images? |
|---|---|---|---|
| Catalog: titles, creators, page and image **links**, categories, playlists, sync state | `<library>/catalog.db` (SQLite) | Kept; refreshes update it and never delete blocks (ADR-0013) | No, links only |
| Your settings and topics | `<library>/lemuse.toml`, `<library>/ui.json` | Kept | No |
| Images on screen and the next 2 | WebView2 **memory** (InPrivate) | Until the window closes or they scroll away | In memory only, never on disk (ADR-0009) |
| Find-channels previews | WebView2 memory | Until the dialog closes | In memory only |
| Saved originals | `<library>/objects/ab/cd/<sha256>.<ext>`, hard-linked into `views/<topic>/` | Kept until you delete them | Yes: only what you saved |
| Browser preview and design artifact | `app/preview/preview-data.json`, the artifact page | Rebuilt on demand | No; the artifact draws placeholders |

`<library>` is `%USERPROFILE%\Pictures\LeMuse` by default. `thumbs/` and `views/` are rebuildable; `objects/` is
the source of truth for saved files. Back up `lemuse.toml`, `ui.json` and `catalog.db` (playlists live there) to
keep your setup.

## Code map

| Path | Responsibility |
|---|---|
| `crates/lemuse-core/src/model.rs` | `Block`, `MediaRef`, `SourceRef`, `LicenseInfo`, `StoredFile`, `Collection` |
| `crates/lemuse-core/src/config.rs` | `lemuse.toml`: `[library]`, `[sync]` (files mode, page budget), `[[topic]]` + `[[topic.source]]` |
| `crates/lemuse-core/src/store/catalog.rs` | SQLite, migrations, FTS, `slides()` |
| `crates/lemuse-core/src/store/{blobs,views}.rs` | CAS for saved files; Windows-safe hardlinked views |
| `crates/lemuse-core/migrations/` | Append-only SQL migrations (`PRAGMA user_version`); v2 = `block_media` |
| `crates/lemuse-core/src/connectors/` | `mod.rs` trait, policy, ordering, registry; `http.rs` client trait + `FixtureClient`; `arena.rs`, `cleveland.rs`, `aic.rs` |
| `crates/lemuse-core/assets/starter_topics.toml` | The owner's 15 topics, written by `lemuse init` |
| `crates/lemuse-core/src/sync/` | `engine.rs` refresh loop, `throttle.rs` pacing + backoff, `lock.rs` single-run lock |
| `crates/lemuse-core/tests/fixtures/` | Recorded or hand-built API responses |
| `crates/lemuse-cli/` | `lemuse`: `init`, `topics`, `slides`, `sync` (stub), `status`, `search` |
| `app/src-tauri/` | Tauri shell: `library_status`, `topics`, `slides`, `search`, `refresh_now` (stub) |
| `app/src/` | React UI: `SlideshowView.tsx` (pure view), `App.tsx` (state, timer, keys), `api.ts` (Tauri or preview backend) |
| `app/scripts/` | `snapshot.tsx` (UI states for W3C), `validate-w3c.mjs`, `make-artifact.mjs` |
| `.githooks/pre-commit` | W3C gate for UI commits |

## Refresh run, step by step

1. Acquire `.sync.lock` (fails fast if another run holds it). Insert a `sync_runs` row.
2. For each source of each topic (each channel once, even if two topics share it): find its connector. Skip it if
   the trigger is background and the policy disallows background sync.
3. `resolve_collection`, then read the collection's watermark.
4. Fetch up to `pages_per_refresh` pages (newest-updated first), throttled to the policy:
   - an item strictly older than the watermark → stop;
   - an item whose stored `remote_updated_at` is unchanged → skip;
   - otherwise upsert the block with its media URLs and link it to the collection. In `download` mode, also
     store the files and hardlink originals into `views/<topic>/`.
5. If the pass was complete (watermark or last page reached) and had no errors, advance the watermark.
6. Write the run summary JSON to `sync_runs` and release the lock.

## Slideshow (M1)

`slides(topic, limit, offset)` → full-window `<img src=display_url>`, auto-advancing every `slide_seconds`.
Shuffle happens client-side. The UI preloads the next 2 images and calls `load_more` when fewer than ~20 remain.
Save fetches the `original` media URL into the CAS.

## What's real vs stubbed in M0

| Area | M0 state |
|---|---|
| Model, topics config, catalog + `slides()`, blobs, views, lock, throttle, refresh engine (stream/download, page budget), Are.na mapping | **Implemented and tested** (30 fixture tests) |
| Production HTTP, token storage, CLI `sync`, Tauri `refresh_now`, launch thread, `load_more`, Save | **Stubbed** or not yet written (M1) |
| Slideshow view, topic editor, grid | Topic list only (M1–M2) |
