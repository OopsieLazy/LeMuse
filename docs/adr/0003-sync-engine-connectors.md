---
status: proposed          # amended by ADR-0007 (stream-first)
date: 2026-11-16
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0003: Watermark-based incremental sync engine with pluggable connectors

## Context

The app gathers from Are.na first and from other sources later (museums, Poly Haven, …). Every source has
different rate limits, terms and data shapes. Gathering runs unattended on launch, so it must be idempotent,
resumable after failure, polite, and testable without the network.

## Decision

- A `Connector` trait maps one source's pages to source-agnostic `Block`s plus `DownloadRequest`s. It declares
  a `SourcePolicy` (rate budget, minimum interval, background-sync allowed, attribution required).
- The `SyncEngine` owns everything else:
  - the single-run lock;
  - per-source throttling;
  - retries that honour `retry_after`, with capped exponential backoff;
  - downloads into the blob store and idempotent upserts keyed on `(connector, remote_id)`;
  - the per-collection **watermark**.
- **Incremental:** pages come sorted by `updated_at` desc, and the engine stops at the first item strictly older
  than the watermark. Items at the watermark go through the cheap "unchanged" check. The watermark advances only
  after an error-free pass.
- **HTTP behind a trait** (`HttpClient`), so connectors are tested against recorded JSON fixtures.
- **Concurrency model (v1):** blocking I/O on a background worker thread, with no async runtime. Gathering is
  rate-limited to at most a few requests per second anyway, so async adds complexity without throughput. Revisit
  if parallel downloads across sources are needed.

## Options considered

### Option A: Watermark walk over `updated_at desc` (chosen)

**Pros:** works on the free tier with no search API. Cheap re-runs: the common "nothing changed" case costs 2
requests per channel.
**Cons:** removals are invisible, so a periodic full reconcile is needed (M3). It's unclear whether
position-only changes bump `updated_at` (unverified).

### Option B: Are.na search with `after=<timestamp>`

**Cons:** Premium-only, and capped at 10,000 results. Kept as an optional optimisation.

### Option C: Full re-fetch every run

**Cons:** wastes rate budget (304s still count against the limit). It also looks like the "systematic
downloading" the terms forbid. Rejected.

### Option D: async (tokio + reqwest)

Deferred. See the concurrency model above.

## Consequences

- Easier: adding a source means one file implementing `Connector` plus a fixture. Engine behaviour is uniform
  and enforced.
- Harder: deletions need the reconcile pass. Long first syncs of big channels need progress reporting (M1).
- Revisit when: the second connector lands. Check that the trait still fits search-style sources.

## Action items

1. [x] `Connector`, `SourcePolicy`, `HttpClient`, `FixtureClient`, `ArenaConnector` mapping, `SyncEngine`,
   `Throttle`, `SyncLock`, with tests.
2. [ ] M1: production `HttpClient` (blocking, descriptive UA, token header, streaming), retries on 5xx and
   network errors (D-2), progress events.
3. [ ] M3: full reconcile pass for removed connections; object GC.

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-16 | Claude | drafted | |
| Admin pass | 2026-11-16 | Claude (architect role) | approved with fixes | A-3 fixed (watermark `<=` → `<`) |
| Developer pass | 2026-11-16 | Claude (developer role) | approved with notes | D-2 deferred (5xx retry) |
| Owner gate | | Owner | pending | |
