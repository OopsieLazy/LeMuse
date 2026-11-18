# Plan

**Product:** ServeNSurf. A Windows app that plays a **stream or slideshow of reference images on a topic**. A
topic is fed by Are.na channels you choose (later by open museum and 3D sources). Images stream from the
source; anything you like, you can save locally with one click. Topics refresh automatically on launch.

**Current milestone:** M0 (skeleton) in owner review as PR #1 (round 2), plus PR #2 keyword topics (stacked on #1).

## Milestones

Each milestone is one or more PRs. Each PR goes through the review loop ([CLAUDE.md](../CLAUDE.md)).

### M0: Architecture skeleton ✅ built, awaiting owner gate (round 2)

- [x] Deep research report (`reports/Arena reference gatherer architecture.md`)
- [x] ADR-0001…0007. ADR-0001 is accepted; ADR-0007 is the stream-first pivot
- [x] Cargo workspace: `servensurf-core`, `servensurf-cli`, `app/src-tauri`. React UI shell listing topics
- [x] Core:
  - topics config;
  - catalog (SQLite + FTS5, migrations v1–v2, `slides()`);
  - CAS blob store and hardlink views (for saves);
  - Are.na v3 mapping with media URLs;
  - refresh engine (stream/download modes, page budget, watermark, lock, throttle, retry).
  - 30 tests, all on fixtures.
- [x] CLI: `init`, `topics`, `slides`, `status`, `search`, plus a `sync` stub
- [x] Process: CLAUDE.md, templates, PR and issue templates, CI, progress log. Name ServeNSurf; MIT licence

### PR #2: Keyword topics ✅ built, awaiting owner gate

- [x] The owner's 15 topics written by `servensurf init` (ADR-0008)
- [x] Cleveland Museum of Art keyword search (CC0; weekly refresh). AIC connector built, held back (D-18)
- [x] 13 Are.na channels verified for Wood objects, Y2K tech, Product design, Vintage tech
- [x] Shared per-source throttle (D-13); known channels skip lookups (D-14). 40 tests

### M1: First slideshow (the vertical slice)

**Outcome:** you add a topic with one Are.na channel to `servensurf.toml`, launch the app, pick the topic, and
images play full-window. Save puts the original in `views/<topic>/`.

- [ ] Production `HttpClient`:
  - blocking client on a worker thread;
  - `ServeNSurf/<ver> (+contact)` User-Agent;
  - optional bearer token (Credential Manager);
  - retries on 5xx and network errors (D-2);
  - streaming file download with hash-on-write (D-1, for Save).
- [ ] Launch refresh thread (`Trigger::Launch`) + `refresh_now`, with `refresh://progress` events. Tauri
      single-instance plugin
- [ ] Lazy `load_more(topic)`: fetch the next page of a channel when fewer than ~20 slides remain (ADR-0007 #3)
- [ ] **Slideshow view**:
  - full-window image, auto-advance every `slide_seconds`;
  - keys: ← → to move, space to pause, F for fullscreen;
  - shuffle;
  - preload the next 2;
  - attribution overlay (creator + Are.na link).
- [ ] **Save button**: download the original → CAS → `views/<topic>/`. Show the "saved" state
- [ ] Block refresh until `sync.contact` is set, or fall back to a generic contact URL (A-8)
- [ ] `servensurf auth set|clear` (optional token; free tier = 120 reads/min vs 30 as guest)
- [ ] Remote + CI live once the owner creates the repo: ruleset on `main`, release-please,
      `.claude/settings.json` deny rules (A-4)

### M2: Topic management and browsing

- [ ] Add, remove and rename topics and channels in the UI (paste an Are.na channel URL → slug)
- [ ] Grid view of a topic (virtualized), click to open the slideshow at that image
- [ ] Saved-items view; local search (FTS)
- [ ] `servensurf rebuild-views` and stale view cleanup (D-5). Runtime asset scope (A-5)

### M3: Robustness

- [ ] Full reconcile for items removed from channels (A-6)
- [ ] Object garbage collection (D-3); `servensurf verify`
- [ ] Optional offline cache for the last N slides per topic (ADR-0007 Option C), if wanted

### M4: Ambient mode

- [ ] Tray + autostart (`--minimized`), `interval_minutes` refresh
- [ ] "Ambient" slideshow window (always-on-top or second monitor); screensaver-style idle start
- [ ] Installer signing; updater keys

### M5: More topic sources

- [x] ~~Cleveland MoA keyword search~~ (pulled into PR #2). AIC built; enable after D-18
- [ ] The Met (investigate the empty search response; bounded N+1 object fetch)
- [ ] Poly Haven, Smithsonian Open Access (3D), Wikimedia Commons (per-file licence)
- [ ] Save-on-request sources (Unsplash, Pexels, Sketchfab)

## Owner decisions

| # | Question | Answer (2026-11-16) |
|---|---|---|
| Q1 | Tauri 2 + Rust core instead of C++/Qt? | ✅ **Approved.** ADR-0001 accepted |
| Q2 | Can channel images be displayed without mass downloading? | ✅ **Yes** (owner confirmed: view channel content as reference images).  Streaming chosen channels is the API's intended use (ADR-0007). No email needed for personal use. Before public distribution: register an OAuth app + courtesy note to help@are.na |
| Q3 | GitHub repo | ✅ **Owner will set it up.** Then: replace the CODEOWNERS placeholder, push, add a ruleset |
| Q4 | Name | ✅ **ServeNSurf** |
| Q5 | Licence | ✅ **MIT** ("basic, free") |
| Q6 | Are.na tier | ✅ **Free.** 120 reads/min with a token, 30 as guest; no search API |
| Q7 | Library location | ✅ **Default:** `%USERPROFILE%\Pictures\ServeNSurf` |
| Q8 | How should a "topic" be defined? | ✅ **By subject.** Owner's list: molds, wood objects (chairs, tables, doors), wrought iron, castle, y2k tech, tech, form, product design, art, candles, chess, vintage, vintage tech, renaissance, contemporary. Built as keyword topics (ADR-0008, PR #2) |
| Q9 | **Open:** accept ADR-0002…0008 (proposed)? | Accepted on merge of PRs #1/#2 unless you object |
| Q10 | **Open:** upgrade to Are.na Premium (paid) for real keyword search across Are.na? Best fit for y2k tech, product design, form, molds, contemporary | No; free sources only |
| Q11 | **Open:** any Are.na channels you already follow for the thin topics (Contemporary, Molds, Tech)? | Starter channels only |

## Deferred findings register

| ID | From | Finding | Planned in |
|---|---|---|---|
| D-1 | Review 0001 r1 | Downloads buffered fully in memory; large CAD files need streaming | M1 |
| D-2 | Review 0001 r1 | Retry covers 429 only; add 5xx and network errors | M1 |
| D-3 | Review 0001 r1 | A partially failed block leaves orphan objects | M3 |
| D-5 | Review 0001 r1 | Renamed titles leave stale view files | M2 |
| D-10 | Review 0001 r2 | Image CDN rate limits are undocumented; the UI must cap preloading | M1 (preload ≤ 2) |
| D-12 | Review 0001 r2 | The CSP pins one CloudFront hostname for originals | M1 (surface image load errors) |
| A-4 | Review 0001 r1 | Review gates are procedural until the ruleset, bot account and deny rules exist | M1 |
| A-5 | Review 0001 r1 | Asset scope hardcoded to `$PICTURE/ServeNSurf/**` | M2 |
| A-6 | Review 0001 r1 | Removed remote items are invisible to the watermark walk | M3 |
| A-7 | Review 0001 r2 | A watermark held by the page budget means big channels re-fetch pages 1–2 each launch (cheap, bounded) | Accepted; revisit in M3 |
| A-8 | Review 0001 r2 | Owner has no contact URL for the User-Agent yet | M1 |
| D-15 | Review 0002 | `slides()` "newest first" is loose across sources (mixed timestamp formats) | M2 (normalize to UTC) |
| D-18 | Review 0002 | AIC images sit behind a Cloudflare challenge for non-browser clients; unverified in WebView2 | M1 (verify; enable `aic` only if it works) |
| A-11 | Review 0002 | Starter Are.na channels are third-party curated and may change | Owner review; M2 topic editor |
