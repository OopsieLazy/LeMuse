# Progress log

Append-only. Newest entry at the top. One entry per working session, using Part A of
[templates/session-handoff.md](templates/session-handoff.md).

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
