# feat: ServeNSurf architecture skeleton with stream-first topics (#1)

**Branch:** `feat/0001-architecture-skeleton` → `main`
**Merge method:** squash (message: [0001-architecture-skeleton.merge.txt](0001-architecture-skeleton.merge.txt))
**Review round:** 2 (round 1 → owner requested changes: stream/slideshow goal, name, licence)

## Summary

- Researched the problem: the Are.na v3 API and terms, 22 alternative sources, stack and storage, and
  enterprise process. Report: `reports/Arena reference gatherer architecture.md`.
- Recorded 7 ADRs. **ADR-0001 (Tauri 2 + Rust core) is accepted by the owner.** ADR-0007 pivots to the owner's
  goal: a **stream or slideshow of reference images on a topic**, streamed from Are.na's CDN, with Save on request.
- Built a compiling, tested skeleton:
  - `servensurf-core`: topics, catalog + `slides()`, Are.na mapping, refresh engine; 30 tests;
  - the `servensurf` CLI;
  - a Tauri 2 + React shell that lists topics.
- Project operating system: CLAUDE.md (staged review loop), templates, PLAN, ARCHITECTURE, PROGRESS, PR and
  issue templates, CI.
- Named **ServeNSurf** and licensed under **MIT**.

Closes: n/a (first PR; no issue tracker yet)

## Type of change

- [x] feat: new capability
- [x] docs / chore / ci / test
- [ ] ⚠️ Breaking change (nothing released yet)

## Decisions and review loop

- ADRs: 0001 (accepted), 0002–0006 (proposed; 0002–0005 amended by 0007), 0007 (proposed)
- Review log: [docs/reviews/0001-architecture-skeleton.md](../reviews/0001-architecture-skeleton.md), rounds 1–2
- [x] Admin / architect pass:
  - round 1: A-1…A-6 (A-3 fixed);
  - round 2: A-7…A-9 (A-9 fixed).
- [x] Developer pass:
  - round 1: D-1…D-8 (D-7 and D-8 fixed);
  - round 2: D-9…D-12 (**D-9 fixed: a refresh could unlink saved files**).

## Testing

- [x] `cargo fmt --all -- --check`: clean
- [x] `cargo clippy --all-targets -- -D warnings`: clean (also `-p servensurf-app`)
- [x] `cargo test`: **30 passed, 0 failed** (fixture-based; no network)
- [x] `cd app && npm run build` (includes `tsc`): passes
- [x] Manual: `servensurf init` → add a topic → `topics` → `slides` returns `[]` (no network yet); an unknown
      topic exits 1 with a clear error; schema v2
- [ ] Not done: the Tauri window wasn't launched interactively; CI hasn't run (no remote yet)

## Risk and rollback

- Risk: **low**. It's a new repo with no users and no data.
- Data or schema impact: migrations `0001_init.sql` and `0002_stream_media.sql` (schema v2).
- Rollback: revert the squash commit.
- Commit note: some intermediate commits aren't individually buildable. The squash merge makes `main` a single
  buildable commit.

## Compliance (ADR-0004, ADR-0007)

- [x] Channels come only from user-defined topics. No crawling or bulk download; stream by default; at most 2
      pages per channel per refresh
- [x] Creator and source stored for every block; attribution is required on screen (M1 UI)
- [x] No secrets in code, config or logs
- [x] CSP opened only to `images.are.na` and the Are.na CloudFront origin

## Owner gate

| # | Question | Status |
|---|---|---|
| Q1–Q7 | Stack, Q2 streaming, repo, name, licence, tier, location | ✅ Answered 2026-11-16 (see PLAN) |
| Q8 | How should a "topic" be defined? (a) channels you pick (default); (b) Are.na Premium keyword search; (c) museum keyword search sooner | Open |
| Q9 | Accept ADR-0002…0007? | Accepted on merge unless you object |

- [x] `docs/PROGRESS.md` entry added
- [x] `CHANGELOG.md` `Unreleased` updated
