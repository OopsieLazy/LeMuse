# Progress log

Append-only. Newest entry at the top. One entry per working session, using Part A of
[templates/session-handoff.md](templates/session-handoff.md).

---

## 2026-11-18 (session 10): whole channels, auto refresh, JSON; sources and dashboard plans

**Branch:** `feat/0013-full-channels-refresh-json` (pushed, stacked on #12) · **Status:** awaiting owner review

- **Fixed the 200 cap:** channels resume across refreshes (migration 0006). On a copy of the owner's library, one
  refresh took 4,489 → 6,450 images in 2 min 13 s with 0 errors; big channels continue each refresh.
- **Auto refresh** every 60 min while the app runs; **`--json`** envelope on every CLI command.
- **Plans:** ADR-0018 (sources; Pinterest only via the official API or clipping to Are.na), ADR-0019 (read-only
  dashboard server); `docs/product/audiences.md`; caching table in ARCHITECTURE.
- **Owner:** Q18–Q20 open; Dependency graph; lock `main`.

---

## 2026-11-18 (session 9): CI fix; ADR-0016; mini player and kept links

**Branches:** `ci/0011-fix-security-checks`, `docs/0010-roadmap-review-flow`, `feat/0012-mini-player-links`
(all pushed) · **Status:** awaiting owner review on GitHub (merge #11 → #10 → #12)

- **CI:** the failure on `main` was gitleaks-action scanning nothing (no leak). It now runs the pinned binary
  over the full history; the PR-title check re-runs on edit.
- **ADR-0016:** mini player; links kept and exported; iPhone as a Home Screen web app first (APIs allow CORS;
  native needs a Mac runner + $99/year); automation (CLI JSON, local dashboard page, webhooks); audiences.
- **Owner:** enable Dependency graph, lock `main`, answer Q18/Q19.

---

## 2026-11-17 (session 8): v0.6.0 released; roadmap; GitHub review flow (work item 10)

**Branch:** `docs/0010-roadmap-review-flow` (pushed) · **Status:** awaiting owner review on GitHub

- **Owner merged** #1–#9 and pushed `main` + `v0.6.0`. The first CI run failed in gitleaks (A-47, open).
- **Owner decisions (Q17):** Claude pushes branches, never `main`; the owner reviews and squash-merges on
  github.com (no `gh`); lock `main` with a ruleset.
- **Done:** roadmap v0.7–v1.0 + feature ideas (PLAN); CLAUDE.md and handoff template use the web flow;
  ADR-0002…0015 accepted.
- **Next:** resolve A-47; ruleset on `main`; then v0.7 (Save + Are.na token + load more).

---

## 2026-11-17 (session 7): Pages, categories, Find channels (PR #9)

**Branch:** `feat/0009-pages-categories-discover` (stacked on #8) · **Status:** awaiting owner review (app launched)

- **Done:** page menu for views over 500; LeMuse's own categories (Are.na has no tags) with an include/exclude
  filter; Find channels: search words → Are.na search in the browser, preview before adding, Related channels
  (ADR-0015). CLI `preview-channel`, `related`.
- **Security:** filter ids checked and bound; discovery reads only on a click, ≤ 24/min; opener scope narrowed
  to 5 hosts; no new dependency.
- **Checks:** 79 tests; W3C 41 files; layout 195 renders; secret scan clean.
- **Review 0009:** A-38…A-46, D-47…D-56; fixed or decided, D-53/D-54 deferred.
- **Owner decisions:** Q16 no copying to Are.na. In-app search needs Premium (Q10 = no), so it opens Are.na's site.
- **Next:** owner reviews and merges #1–#9; then Save + Are.na token + `load_more`.

---

## 2026-11-17 (session 6): Playlists, All, Add channel; security upkeep (PR #8)

**Branch:** `feat/0008-playlists-import` (stacked on #7) · **Status:** awaiting owner review (app launched)

- **Done:** local playlists (P), All view, paste-a-link Add channel with a security analysis of the import
  path (ADR-0014); CLI `add-channel`.
- **Security:**
  - rusqlite 0.41.1 (RUSTSEC-2026-0459, SQLite FTS5 CVEs);
  - https-only HTTP;
  - config can't steer requests;
  - npm `--ignore-scripts` (2026 worms);
  - npm audit gate with an expiring picomatch exception.
- **Checks:** 66 tests; W3C 32 files; layout 150 renders; cargo audit 0 vulnerabilities; secret scan clean.
- **Admin review** (agent): A-30…A-37. A-30…A-36 fixed; A-37 (download host allow-list) goes to the Save PR.
- **Owner decisions:** Q14 matches are right (add the rest via Add channel); Q15 no.
- **Next:** owner reviews the running app and merges #1–#8; then Save + Are.na token + `load_more`.

---

## 2026-11-17 (session 5): LeMuse; security gates; Settings and fullscreen; followed channels (PRs #4–#7)

**Branches:** `refactor/0004-rename-lemuse` → `ci/0005-security-gates` → `feat/0006-design-tokens-settings` →
`feat/0007-followed-channels-archive` (stacked on #3) · **Status:** awaiting owner review

- **Done:**
  - Renamed to LeMuse (ADR-0010); GitHub remote set.
  - Security gates: scan, admin agent hook, Stop gate, CI audits (ADR-0011).
  - Tokens, Settings, fullscreen, hideable bar, layout test (ADR-0012).
  - 10 followed channels; archive policy (ADR-0013).
- **Checks:** 49 tests; W3C 20 files; layout 90 renders; npm audit 0; secret scan clean.
- **Admin review** (agent, read-only): 10 findings (A-20…A-29), all fixed; none blocking (reviews 0005–0007).
- **Owner decisions:** Q4 LeMuse, Q5 MIT, Q8 A+C+others, Q10 no Premium, Q12 layout liked, Q13 command format.
  Open: Q14 (channel matches), Q15 (git for the review agent).
- **Next:** the owner pushes and merges #1–#7; then `feat/0008-save-and-import` (PLAN § Now).

---

## 2026-11-16 (session 4): See the real app every PR; W3C gate; no image cache (PR #3)

**Branch:** `feat/0003-live-preview` (stacked on `feat/0002-keyword-topics`) · **PR:** #3 (local) ·
**Status:** awaiting owner review

### Done

- The owner asked to see the product as it's built, plus a W3C check on commits, a test build or artifact, and
  no PNG downloads in cache. Wrote ADR-0009.
- **Real data:**
  - production HTTP client (`ureq`, rustls) and `refresh_library()`;
  - `servensurf sync` works;
  - first real refresh: 55 sources, **3,742 images catalogued, 0 errors, 0 files written**.
- **Real UI:**
  - `SlideshowView` with topic rail, full-window image, attribution, timer and controls;
  - keys ←/→/Space/S; shuffle; preload ≤ 2; broken images skipped.
  - The app refreshes on launch and from the Refresh button.
- **See it:**
  - Windows test installer (local build plus a CI `test-build` job per PR);
  - `npm run preview:web` (browser, real images);
  - design artifact (private): https://claude.ai/artifact/T6ucPPa6HwhkWqvLEiSHfY
- **W3C:** the Nu HTML Checker (local Java) validates the built page, CSS and 6 rendered UI states.
  - A pre-commit hook (`.githooks`, enabled in this clone) and CI enforce it.
  - Proven: a broken page fails with exit 1.
- **No image cache:** WebView2 runs InPrivate. Previews hold metadata only; the artifact draws placeholders.
- Review 0003: fixed D-25 (closing the app mid-refresh left a lock that blocked refreshes for 6 h; found by
  the release smoke test), D-21 (broken image stalls the slideshow) and D-22 (silent body truncation). A-14…A-18 and
  D-19/20/23/24 noted or deferred.

### Decisions

- ADR-0009: live preview, W3C gate, no image disk cache. Status: proposed.

### Deferred / known gaps

- Save (button shown disabled), lazy `load_more`, token storage, 5xx retry, F for fullscreen → M1.
- UI preferences must persist through the core (InPrivate has no lasting localStorage) → M2.
- AIC in-app check (D-18) is still open. CI has never run (no remote yet).

### Next session starts with

1. The owner reviews the artifact and the installer, then merges #1 → #2 → #3 (commands in the handoff).
2. `feat/0004-save-and-load-more` → finish M1: Save, `load_more`, fullscreen, AIC check.

---

## 2026-11-16 (session 3): Q8 answered → keyword topics (PR #2)

**Branch:** `feat/0002-keyword-topics` (stacked on `feat/0001-architecture-skeleton`) · **PR:** #2 (local) ·
**Status:** awaiting owner review

### Done

- Q2 confirmed by the owner (view channel content as reference images); recorded on PR #1's branch.
- Q8 answered with subjects. Built ADR-0008 keyword topics:
  - `keywords` + expansion;
  - Cleveland + AIC connectors (real fixtures);
  - weekly museum refresh;
  - the owner's 15 topics written by `init`.
- Found 13 Are.na channels by web search and verified each via the public API (2026-11-16).
- Probes: Cleveland images 200. **AIC image host returns a Cloudflare challenge**, so AIC is held back (D-18).
  The Met's images are 200, but its search returned an empty response, so it's a follow-up.
- Review 0002: fixed D-13 (throttle per target → per source), D-14 (skip known channel lookups) and D-17
  (clippy). Deferred D-15 and D-18; A-10…A-13 noted. 40 tests pass; clippy, fmt and UI build clean.

### Decisions

- ADR-0008 keyword topics, hybrid sources: proposed.

### Deferred / known gaps

- Thin topics: Contemporary, Molds, Tech (Q10 Premium? Q11 channels?).
- AIC in-app image check → M1. The Met → follow-up. Window still not launched; no CI yet.

### Next session starts with

1. The owner merges PR #1, rebases/merges PR #2 (commands in the handoff).
2. `feat/0003-first-slideshow` → M1.

---

## 2026-11-16 (session 2): Owner answers → stream-first pivot, ServeNSurf, MIT

**Branch:** `feat/0001-architecture-skeleton` · **PR:** #1, round 2 (local; owner is setting up GitHub) ·
**Status:** awaiting owner review

### Done

- Recorded the owner's answers to Q1–Q7 (docs/PLAN.md § Owner decisions). ADR-0001 accepted.
- Answered Q2: streaming chosen channels is the API's intended use, so no mass downloading is needed.
- The owner redefined the goal as "a stream or slideshow of reference images on a topic", which led to
  ADR-0007 (stream-first; save on request).
- Renamed the project refgather → **ServeNSurf** (crates, binary, config file, User-Agent, default folder).
- Licensed under **MIT**.
- Core:
  - `[[topic]]` config, `FileMode` (stream/download), `pages_per_refresh`;
  - `MediaRef` + migration 0002 `block_media`; `Catalog::slides()`;
  - engine: stream mode, page budget, per-channel dedup.
- CLI `topics` / `slides`; Tauri `topics` / `slides` commands; CSP allows the Are.na image hosts.
- Review round 2: fixed D-9 (a refresh could unlink saved files); logged A-7, A-8, D-10.
- Verification: 30 tests pass; clippy and fmt clean (core, CLI, app); UI builds; CLI smoke test passes.

### Decisions

- ADR-0007 stream-first topics: proposed. ADR-0001: **accepted**. ADR-0002…0005: amended by 0007.

### Deferred / known gaps

- Not verified: the window wasn't launched; no CI run yet (no remote).
- Q8 open: how to define a topic (channels / Are.na Premium search / museum keyword search).

### Next session starts with

1. The owner merges PR #1 (commands in the handoff) and creates the GitHub repo.
2. Branch `feat/0002-first-slideshow` → M1: production HttpClient, launch refresh, slideshow view, Save.

---

## 2026-11-16: Research, plan and architecture skeleton

**Branch:** `feat/0001-architecture-skeleton` · **PR:** #1 (local; no remote yet) · **Status:** awaiting owner review

### Done

- Ran deep research (4 parallel tracks: Are.na API, alternative sources, stack/storage, enterprise process).
  Report: `reports/Arena reference gatherer architecture.md`; notes in `research_notes/`.
- Initialized git (`main`) with repo hygiene files (`.gitattributes`, `.editorconfig`, `.gitignore`).
- Wrote ADR-0001…0006 and docs: PLAN, ARCHITECTURE, templates, CLAUDE.md.
- Scaffolded the Cargo workspace:
  - `refgather-core`: model, config, store, connectors, sync, with 22 passing tests;
  - `refgather-cli`: `init`, `status` and `search` work; `sync` is a stub;
  - Tauri 2 shell + React UI: compiles, clippy-clean, typecheck passes.
- Ran the review loop: admin pass (A-1…A-6) and developer pass (D-1…D-8). Fixed A-3 (watermark
  boundary), D-7 (FTS query escaping) and D-8 (Tauri `protocol-asset` feature); the rest are deferred to
  PLAN with IDs or need no change (`docs/reviews/0001-architecture-skeleton.md`).
- Added `.github/` templates (PR, issue forms, CODEOWNERS) and a CI workflow (Windows).

### Decisions

- ADR-0001 Tauri 2 + Rust core (instead of C++/Qt): proposed
- ADR-0002 SQLite + CAS + hardlink views: proposed
- ADR-0003 watermark sync engine + connectors: proposed
- ADR-0004 Are.na compliance + source tiers: proposed
- ADR-0005 launch/scheduled gathering: proposed
- ADR-0006 engineering process: proposed

### Deferred / known gaps

- D-1 streaming downloads, D-2 5xx retry, A-4 hard enforcement of gates → M1
- D-5 stale views, A-5 asset scope → M2 · A-6 removal reconcile → M3
- Not verified: the Tauri window was compiled but not launched (no dev server running); CI has never run
  (no GitHub remote).

### Next session starts with

1. Read the owner's answers to Q1–Q7 (docs/PLAN.md). Merge PR #1 if approved.
2. Branch `feat/0002-arena-http-client` → M1: production HttpClient + Credential Manager token + CLI `sync`.
