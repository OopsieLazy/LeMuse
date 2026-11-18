# Review NNNN: <change title>

- **Branch:** `type/NNNN-slug`
- **PR:** #NNNN
- **ADRs touched:** ADR-…
- **Round:** 1  <!-- add a new "Round N" section below if the owner sends it back -->

## 1. Proposal (author: Claude)

**What and why** (3–6 bullets):

-

**Decisions made** (each links an ADR or states the reasoning in one line):

| # | Decision | Why | ADR |
|---|---|---|---|
| 1 | | | |

## 2. Admin / architect pass

Checklist:

- [ ] Fits existing ADRs. Any conflict is resolved by a new or superseding ADR
- [ ] Source terms and licensing respected (ADR-0004): gather list only, throttled, attribution stored
- [ ] Security: no secrets in code, config or logs; least-privilege Tauri capabilities; no new network surface
- [ ] Data integrity: migrations append-only; no data loss on crash or interrupt
- [ ] Scope: nothing beyond the spec; deferred work has a home in `docs/PLAN.md`
- [ ] Owner-only decisions identified and raised as questions

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-1 | high / med / low | | fixed in `<commit>` / deferred → PLAN Mx / won't fix (why) |

## 3. Developer pass

Checklist:

- [ ] Builds: `cargo build`, `cargo build -p servensurf-app`, `npm run typecheck`
- [ ] `cargo fmt --all -- --check` and `cargo clippy --all-targets -- -D warnings` are clean
- [ ] `cargo test` passes; new logic has tests; no network in tests (fixtures only)
- [ ] Edge cases: empty, huge, unicode and Windows-hostile names; offline; 429/5xx; partial failure
- [ ] Windows specifics: paths, file locks, line endings, long paths
- [ ] Errors are actionable; nothing panics on user or remote data

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-1 | | | |

**Verification evidence** (paste real command output summaries, not claims):

```
cargo test → N passed, 0 failed
```

## 4. Owner gate

**Summary for owner** (≤ 5 lines):

**Open questions for owner:**

1.

**Owner decision:** ☐ approve and merge · ☐ changes requested (→ Round 2) · ☐ reject
