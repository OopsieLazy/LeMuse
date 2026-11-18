# Review 0001: Architecture skeleton

- **Branch:** `feat/0001-architecture-skeleton`
- **PR:** #1 (local; see `docs/pr/0001-architecture-skeleton.md`)
- **ADRs touched:** ADR-0001 … ADR-0006 (all new)
- **Round:** 1

## 1. Proposal (author: Claude)

**What and why:**

- Turn the owner's brief into a researched plan and a compiling skeleton, so M1 can build the first real Are.na
  gather instead of re-deciding the architecture.
- The deep-research report covers the Are.na v3 API and terms, 22 alternative sources, stack, storage and sync
  design, and enterprise process.
- The six ADRs capture every architectural decision made from that research.
- The core holds the real, tested logic: model, config, catalog, CAS, views, connector mapping, sync loop.
- The network layer, token storage and UI gallery are deliberately stubbed.

**Decisions made:**

| # | Decision | Why | ADR |
|---|---|---|---|
| 1 | Tauri 2 + Rust core + CLI, not C++/Qt or a browser web app | Small native install, one core for GUI and scheduler, toolchains present | 0001 |
| 2 | SQLite/FTS5 catalog + SHA-256 CAS + hardlinked views | Dedup, integrity, search, Explorer-browsable | 0002 |
| 3 | Watermark sync over `updated_at desc`; connectors behind a trait with a policy | Cheap re-runs; uniform enforcement; testable | 0003 |
| 4 | Only user-listed channels; licence tiers for sources | Are.na terms prohibit systematic downloading | 0004 |
| 5 | Background gather on launch; tray and scheduler opt-in | UI never blocks; single code path | 0005 |
| 6 | GitHub Flow, Conventional Commits, squash, staged review loop | Owner's enterprise requirement | 0006 |

## 2. Admin / architect pass

- [x] Fits existing ADRs (all new, mutually consistent)
- [x] Source terms respected: gather list only, throttle at 80% of the tier limit, ≥500 ms between calls, attribution stored
- [x] Security: no secrets in repo; `.gitignore` excludes the library and `.env`; Tauri capability is `core:default` only
- [x] Data integrity: migrations append-only via `user_version`; temp-then-rename writes; lock file
- [x] Scope: stubs return `NotImplemented` instead of half-working network code
- [x] Owner-only decisions raised (Q1–Q7 in PLAN)

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-1 | med | The owner said "web app or C++". Tauri + Rust is neither literally | Rationale added to ADR-0001; raised as Q1 |
| A-2 | high | Are.na terms forbid "systematic downloading … without prior authorization". Even curated sync could be judged excessive | Mitigated by design (ADR-0004). Owner email to help@are.na before public release (Q2) |
| A-3 | med | Watermark stop used `<=`: a new block sharing the watermark's exact timestamp would be skipped | **Fixed:** strict `<`; at-watermark items go through the unchanged check. Covered by the existing incremental test |
| A-4 | med | Review gates are only procedural: no remote, ruleset, bot account or deny rules yet | Documented in ADR-0006 → M1 |
| A-5 | low | Tauri asset scope is hardcoded to `$PICTURE/refgather/**`; a custom library root won't render | Deferred → M2 (runtime scope) |
| A-6 | low | Items removed from a channel never appear in an `updated_at` walk | Deferred → M3 reconcile pass |

## 3. Developer pass

- [x] Builds: `cargo build` ✓, `cargo build -p refgather-app` ✓, `npm run build` / `typecheck` ✓
- [x] `cargo fmt --check` ✓; `cargo clippy --all-targets -D warnings` ✓ (core, CLI and app)
- [x] `cargo test`: 22 passed, all fixture-based, no network
- [x] Edge cases tested: Windows-reserved and forbidden names, odd extensions, 429 with `retry_after`, failed
      downloads, idempotent upsert, lock contention
- [x] CLI smoke: `init` → `status` works; `sync` exits 1 with a clear NotImplemented message

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-1 | med | `download_all` buffers whole files in memory; multi-GB CAD and video files would spike RAM | Deferred → M1 (stream to temp + hash on write) |
| D-2 | med | `with_retry` only retries 429; transient 5xx and network errors fail the item | Deferred → M1 |
| D-3 | low | If a block's 2nd file fails, its 1st file is already in `objects/` with no catalog row (orphan) | Deferred → M3 object GC |
| D-4 | low | `newest_seen` is taken from the first item even if that item's download fails | No change needed: the watermark only advances on an error-free pass |
| D-5 | low | A renamed block leaves its old view filename behind | Deferred → M2 `rebuild-views` |
| D-6 | low | Concurrent writers of the same hash would share a `.part` temp name | No change needed: `SyncLock` guarantees one writer |
| D-7 | med | `search` passed raw user text to FTS5 `MATCH`; input like `"` or `-` raised SQL errors | **Fixed:** `fts_query` quotes each word as a prefix term; new test `search_tolerates_fts_syntax_in_user_input` |
| D-8 | high | Tauri build failed: `assetProtocol` was enabled in config without the `protocol-asset` crate feature | **Fixed** in `app/src-tauri/Cargo.toml`; shell now compiles |

**Verification evidence:**

```
cargo test                         → refgather-core: 22 passed, 0 failed
cargo clippy --all-targets -D warnings → clean (default members); -p refgather-app → clean
cargo build -p refgather-app       → Finished (after D-8 fix)
npm run build                      → dist built (143 kB JS)
refgather init/status              → library created, schema v1, 0 blocks
```

Not verified: the Tauri window wasn't launched interactively (that needs `npm run tauri dev`), and CI hasn't
run (no remote).

## 4. Owner gate

**Summary for owner:** Research is done and six decisions are recorded. A compiling, tested skeleton is in place:
the core logic is real, and networking is stubbed for M1. Three findings were fixed during review; the other
nine are deferred with milestones or need no change.

**Open questions for owner:** Q1–Q7 in [docs/PLAN.md](../PLAN.md).

**Owner decision (2026-11-16):** ☐ approve and merge · ☑ **changes requested (→ Round 2)** · ☐ reject

> Owner: "Q1 is fine. Q2: is there a way to display channel [images] without mass downloading? Q3: I'll set up.
> Name: ServeNSurf. Basic code licence, free. [Tier] free, [location] default. The goal is to just have a stream
> or slideshow of reference images on a specific topic."

---

# Round 2

## 1. Proposal (author: Claude)

- Answer Q2 with evidence: Are.na's API is "intended for building applications that integrate with Are.na", and
  "Paginate, don't enumerate" is its guidance for display apps. Streaming is the intended use, so no mass
  download is needed.
- Pivot to stream-first topics (ADR-0007):
  - metadata + media URLs in the catalog;
  - images streamed from the CDN;
  - Save on request;
  - download mode opt-in;
  - at most 2 pages per channel per refresh.
- Apply the owner's answers: rename to ServeNSurf, MIT licence, free tier, default location. ADR-0001 accepted.

| # | Decision | Why | ADR |
|---|---|---|---|
| 7 | Stream images; save on request; topics = picked channels | Owner's goal; intended API use; free tier has no search | 0007 |
| 8 | Display `large` → `medium` → `original` | Sharp on screen, a fraction of the bandwidth | 0007 |
| 9 | Licence = MIT | "Basic, free": the most common permissive licence | — |

## 2. Admin / architect pass

- [x] Fits ADRs: 0002–0005 marked "amended by ADR-0007"; 0004 rule 5 updated (no email for personal use)
- [x] Terms: display-only by default; page budget; attribution required on screen
- [x] Security: CSP `img-src` widened only to `images.are.na` and the single Are.na CloudFront origin
- [x] Data integrity: schema change is a new migration (0002), not an edit to 0001
- [x] Owner-only decision raised: Q8 (keyword topics may cost money via Premium)

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-7 | low | When the page budget cuts a pass, the watermark is held, so channels over 200 items re-fetch pages 1–2 every launch | Accepted: bounded (2 calls/channel); revisit M3 |
| A-8 | med | Are.na requires a contact in the User-Agent; the owner hasn't given one | M1: prompt in the UI, block refresh until set |
| A-9 | low | MIT covers the *code* only; streamed or saved images remain their creators' | **Fixed:** README "Respecting sources" states it |

## 3. Developer pass

- [x] Builds: `cargo build` ✓, `cargo clippy -p servensurf-app -D warnings` ✓, `npm run build` ✓
- [x] `cargo fmt --check` ✓; `cargo clippy --all-targets -D warnings` ✓
- [x] `cargo test`: **30 passed** (8 new: topics config ×3, media mapping, slides, saved-file retention, stream
      mode, page budget, shared channel)
- [x] CLI smoke: `init` (starter has a commented topic) → `topics` → `slides` → `[]`; unknown topic exits 1 with a clear error; schema v2

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-9 | **high** | `upsert_block` deleted `block_files` on every update. A stream refresh (no files) would unlink images the user had saved | **Fixed:** files are add-only; test `stream_refresh_keeps_saved_files` |
| D-10 | med | Image CDN rate limits are undocumented | M1: preload ≤ 2; back off on image load errors |
| D-11 | low | `slides()` builds its `IN (VALUES …)` placeholder list dynamically | No change needed: only placeholders are generated; every value is bound |
| D-12 | low | The CSP pins one CloudFront hostname. If Are.na moves originals, slides that fall back to `original` break | Deferred → M1: surface image load errors; config can't change CSP at runtime |

**Verification evidence:**

```
cargo test                      → servensurf-core: 30 passed, 0 failed
cargo clippy (all + app)        → clean
npm run build                   → built
servensurf init/topics/slides   → OK; schema v2
```

## 4. Owner gate (round 2)

**Summary for owner:**
- Q2 answered: yes, streaming is the intended use.
- The app is now stream-first topics (ADR-0007).
- Renamed to ServeNSurf, licensed MIT.
- One serious bug was found and fixed during review (D-9). 30 tests pass.

**Open questions:** Q8 (how to define a topic), Q9 (accept ADR-0002…0007) — see [docs/PLAN.md](../PLAN.md).

**Owner decision:** ☐ approve and merge · ☐ changes requested (→ Round 3) · ☐ reject
