# Plan

**Product:** LeMuse. A Windows app that plays a **stream or slideshow of reference images on a topic**. A
topic is fed by Are.na channels you choose (later by open museum and 3D sources). Images stream from the
source; anything you like, you can save locally with one click. Topics refresh automatically on launch.

**Current milestone:** PRs #1–#3 in owner review. Batch #4–#7 planned below (2026-11-17).

## Now: batch planned 2026-11-17 (owner's session-5 request)

Planned before executing. Each row is one PR, stacked in this order. ✅ = built.

| PR | Branch | Scope | ADR |
|---|---|---|---|
| ✅ #4 | `refactor/0004-rename-lemuse` | Rename ServeNSurf → **LeMuse** everywhere (crates, binary `lemuse`, config `lemuse.toml`, `Pictures\LeMuse`, `LEMUSE_LIBRARY`, app id). GitHub remote + CODEOWNERS. Record Q4/Q8/Q10–Q13 | 0010 |
| ✅ #5 | `ci/0005-security-gates` | Security first: secret scan (pre-commit + CI), dependency audit (cargo, npm), a Claude Code **admin-review hook** before the agent finishes, a security checklist in CLAUDE.md. PR template: What / Why / How + checklist. Command format rule | 0011 |
| ✅ #6 | `feat/0006-design-tokens-settings` | Token pass (everything visual in one tokens file; an inventory of what is and isn't tokenized, and why). Image never runs under the control bar; bar hideable (H). Fullscreen (F). **Settings** panel: themes, layout presets, sliders, toggles; saved via the core (InPrivate has no lasting storage). Links open in the system browser. Layout test in headless Edge (DOM measurements, no screenshots) | 0012 |
| ✅ #7 | `feat/0007-followed-channels-archive` | Q11 channels verified via the API and added to topics. Archive policy: a refresh never deletes posts or blanks known links/attribution; only Save keeps pixels. Source plan for "other sources" | 0013 |

**Next (after this batch is merged):** finish M1 on `feat/0008-save-and-import`: Save, paste-a-link channel
import, an Are.na token in Credential Manager (unlocks private channels and 120 reads/min), and `load_more`. Then
the next sources (ADR-0013): The Met, then Wikimedia Commons.

**Thoughts recorded, not built yet** (ADR-0012 § Later):

- **Import / find channels:** paste a link (no search API on the free plan), and import the channels you follow.
- **In-app browser:** a zero-permission InPrivate "peek" window. It costs no install size because WebView2 is
  already on Windows. The default stays the system browser.

## Milestones

Each milestone is one or more PRs. Each PR goes through the review loop ([CLAUDE.md](../CLAUDE.md)).

### M0: Architecture skeleton ✅ built, awaiting owner gate (round 2)

- [x] Deep research report (`reports/Arena reference gatherer architecture.md`)
- [x] ADR-0001…0007. ADR-0001 is accepted; ADR-0007 is the stream-first pivot
- [x] Cargo workspace: `lemuse-core`, `lemuse-cli`, `app/src-tauri`. React UI shell listing topics
- [x] Core:
  - topics config;
  - catalog (SQLite + FTS5, migrations v1–v2, `slides()`);
  - CAS blob store and hardlink views (for saves);
  - Are.na v3 mapping with media URLs;
  - refresh engine (stream/download modes, page budget, watermark, lock, throttle, retry).
  - 30 tests, all on fixtures.
- [x] CLI: `init`, `topics`, `slides`, `status`, `search`, plus a `sync` stub
- [x] Process: CLAUDE.md, templates, PR and issue templates, CI, progress log. Name LeMuse; MIT licence

### PR #2: Keyword topics ✅ built, awaiting owner gate

- [x] The owner's 15 topics written by `lemuse init` (ADR-0008)
- [x] Cleveland Museum of Art keyword search (CC0; weekly refresh). AIC connector built, held back (D-18)
- [x] 13 Are.na channels verified for Wood objects, Y2K tech, Product design, Vintage tech
- [x] Shared per-source throttle (D-13); known channels skip lookups (D-14). 40 tests

### PR #3: Live preview ✅ built, awaiting owner gate (ADR-0009)

- [x] Slideshow UI (`SlideshowView`), shared by the app, previews and the W3C snapshot
- [x] Production HTTP client, `refresh_library()`, CLI `sync`, launch refresh + Refresh button
- [x] Test build (CI job + local installer), browser preview, design artifact
- [x] W3C gate: pre-commit hook + CI. InPrivate WebView (no image disk cache)

### M1: First slideshow (the vertical slice)

**Outcome:** you add a topic with one Are.na channel to `lemuse.toml`, launch the app, pick the topic, and
images play full-window. Save puts the original in `views/<topic>/`.

- [x] Production `HttpClient` (PR #3): blocking `ureq` on a worker thread; `LeMuse/<ver> (+contact)` UA
- [ ] Production `HttpClient`, remaining:
  - optional bearer token (Credential Manager);
  - retries on 5xx and network errors (D-2);
  - streaming file download with hash-on-write (D-1, for Save).
- [x] Launch refresh thread (`Trigger::Launch`) + `refresh_now`, with `refresh://status` events (PR #3)
- [ ] Tauri single-instance plugin
- [ ] Lazy `load_more(topic)`: fetch the next page of a channel when fewer than ~20 slides remain (ADR-0007 #3)
- [x] **Slideshow view** (PR #3; F for fullscreen still to do):
  - full-window image, auto-advance every `slide_seconds`;
  - keys: ← → to move, space to pause, F for fullscreen;
  - shuffle;
  - preload the next 2;
  - attribution overlay (creator + Are.na link).
- [ ] **Save button**: download the original → CAS → `views/<topic>/`. Show the "saved" state
- [x] User-Agent contact falls back to the public repo URL (A-8, PR #4)
- [ ] `lemuse auth set|clear` (optional token; free tier = 120 reads/min vs 30 as guest)
- [ ] Remote + CI live once the owner creates the repo: ruleset on `main`, release-please,
      `.claude/settings.json` deny rules (A-4)

### M2: Topic management and browsing

- [ ] Add, remove and rename topics and channels in the UI (paste an Are.na channel URL → slug)
- [ ] Grid view of a topic (virtualized), click to open the slideshow at that image
- [ ] Saved-items view; local search (FTS)
- [ ] `lemuse rebuild-views` and stale view cleanup (D-5). Runtime asset scope (A-5)

### M3: Robustness

- [ ] Full reconcile for items removed from channels (A-6)
- [ ] Object garbage collection (D-3); `lemuse verify`
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
| Q3 | GitHub repo | ✅ **https://github.com/OopsieLazy/LeMuse** (public, empty at first push). CODEOWNERS `@OopsieLazy`; add a ruleset after the first push |
| Q4 | Name | ✅ **LeMuse** (2026-11-17; was ServeNSurf). Ranked vs TheMuse, TheMuses, Muses, Muse: least conflict with existing apps (ADR-0010) |
| Q5 | Licence | ✅ **MIT** ("basic, free"; reconfirmed 2026-11-17) |
| Q6 | Are.na tier | ✅ **Free.** 120 reads/min with a token, 30 as guest; no search API |
| Q7 | Library location | ✅ **Default:** `%USERPROFILE%\Pictures\LeMuse` |
| Q8 | How should a "topic" be defined? | ✅ **By subject.** Owner's list: molds, wood objects (chairs, tables, doors), wrought iron, castle, y2k tech, tech, form, product design, art, candles, chess, vintage, vintage tech, renaissance, contemporary. Built as keyword topics (ADR-0008, PR #2). 2026-11-17: **A (Are.na channels) + C (museum keyword search) + other free sources** |
| Q9 | **Open:** accept ADR-0002…0008 (proposed)? | Accepted on merge of PRs #1/#2 unless you object |
| Q10 | Are.na Premium? | ✅ **No** (2026-11-17). Free sources only |
| Q11 | Channels the owner follows? | ✅ The owner listed 16 by name (2026-11-17, "best guesses"). The 10 public matches are in the starter topics; the names aren't repeated in public notes (A-28) |
| Q12 | Layout of PR #3 | ✅ **Liked** (2026-11-17): rail left, stage, caption strip. Keep as the default "Studio" layout |
| Q14 | **Open:** (a) are the generic-name matches right: Resonance, Metal, sitting, Woodworking? (b) Paste links for the 6 that weren't added (4 private, 2 not found). (c) Is it OK that the repo is public, so these channels are visible in the config? | Keep; no labels saying they're yours |
| Q15 | **Open:** allow read-only git (`diff/status/log/show`) for the admin-review agent hook? | No; it reads the snapshot file |
| Q13 | How should handoff commands look? | ✅ Comment on its own line **above** each command, never trailing, so a whole line copies cleanly. PRs describe What / Why / How + checklist |

## Deferred findings register

| ID | From | Finding | Planned in |
|---|---|---|---|
| D-1 | Review 0001 r1 | Downloads buffered fully in memory; large CAD files need streaming | M1 |
| D-2 | Review 0001 r1 | Retry covers 429 only; add 5xx and network errors | M1 |
| D-3 | Review 0001 r1 | A partially failed block leaves orphan objects | M3 |
| D-5 | Review 0001 r1 | Renamed titles leave stale view files | M2 |
| D-10 | Review 0001 r2 | Image CDN rate limits are undocumented; the UI must cap preloading | ✅ PR #3 (preload ≤ 2) |
| D-12 | Review 0001 r2 | The CSP pins one CloudFront hostname for originals | M1 (load errors now skip the slide, PR #3; surface them in the UI) |
| A-4 | Review 0001 r1 | Review gates are procedural until the ruleset, bot account and deny rules exist | M1 |
| A-5 | Review 0001 r1 | Asset scope hardcoded to `$PICTURE/LeMuse/**` | M2 |
| A-6 | Review 0001 r1 | Removed remote items are invisible to the watermark walk | M3 |
| A-7 | Review 0001 r2 | A watermark held by the page budget means big channels re-fetch pages 1–2 each launch (cheap, bounded) | Accepted; revisit in M3 |
| A-8 | Review 0001 r2 | Owner has no contact URL for the User-Agent yet | ✅ PR #4: defaults to the public repo URL |
| D-15 | Review 0002 | `slides()` "newest first" is loose across sources (mixed timestamp formats) | M2 (normalize to UTC) |
| D-18 | Review 0002 | AIC images sit behind a Cloudflare challenge for non-browser clients; unverified in WebView2 | M1 (verify; enable `aic` only if it works) |
| A-17 | Review 0003 | InPrivate WebView loses `localStorage`; UI prefs must persist via the core | M2 |
| D-19 | Review 0003 | Topic slide counts use a full `slides()` query | M2 (`COUNT(*)`) |
| D-23 | Review 0003 | A refresh reloads the active topic from slide 1 | M1 (`load_more` appends) |
| A-19 | Review 0004 | Trademark check of "LeMuse" | Before a public release |
| D-30 | Review 0005 | The review snapshot refreshes asynchronously after edits, so it can lag by one tool call | Mitigated: run `review-snapshot.mjs` before commits; the agent blocks on a stale snapshot |
| D-33 | Review 0006 | Auto-hide in docked layouts re-fits the image when the bar hides (the bar never overlays, by owner rule) | Accepted |
| A-11 | Review 0002 | Starter Are.na channels are third-party curated and may change | Owner review; M2 topic editor |
