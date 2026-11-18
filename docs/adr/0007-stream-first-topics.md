---
status: accepted
date: 2026-11-16
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0007: Stream topic slideshows from the source CDN; save files only on request

Amends ADR-0002 (storage), ADR-0003 (sync), ADR-0004 (Are.na compliance) and ADR-0005 (launch gathering).

## Context

At the PR #1 owner gate, the owner redefined the goal: **"just have a stream or slideshow of reference images
on a specific topic."** They also asked (Q2) whether channels can be displayed without mass downloading.

Facts (from `research_notes/…/arena_api.md`):

- Are.na's API is "intended for building applications that integrate with Are.na". The prohibited behaviour is
  "automated crawling, systematic downloading of content, or any form of structured data harvesting".
- The docs' "Paginate, don't enumerate" guidance is written for display apps.
- Every v3 image block carries resized versions: `small` 400 px, `medium` 1200 px, `large` 1800 px. They're
  served by `images.are.na`, and the original by CloudFront, with no signature or expiry and a 1-year cache.
- Image requests go to the CDNs, not `api.are.na`. They probably don't count against the API rate limit, but
  that isn't documented.
- Search is Premium-only, and the owner is on the **free** tier (Q6). So a "topic" can't be a keyword search on
  Are.na; it has to be a set of channels.

## Decision

1. **Topics.** A topic is a named slideshow fed by sources the user picks: Are.na channels now, museum keyword
   queries in M5. It's configured as `[[topic]]` / `[[topic.source]]` in `lemuse.toml`.
2. **Stream by default** (`sync.files = "stream"`):
   - Refresh stores only metadata and media URLs in the catalog.
   - The slideshow displays `large` (falling back to `medium`, then `original`) directly from the CDN.
   - Image caching is left to WebView2's normal HTTP cache. There's no app-managed image cache.
   - The UI preloads at most the next 2 slides.
3. **Paginate, don't enumerate.** A refresh fetches at most `sync.pages_per_refresh` pages (default 2, i.e. 200
   items) per channel. Older pages load lazily, only when the slideshow is about to run out.
4. **Save on request.** A Save button downloads the *original* into the content-addressed store and hardlinks
   it into `views/<topic>/` (ADR-0002). This is user-initiated, one item at a time.
5. **Download mode stays available** (`sync.files = "download"`) for an offline library. It's opt-in, and
   ADR-0004's throttling and gather-list rules still apply.
6. **Attribution is always on screen:** the creator, plus a link to the block on Are.na.

## Options considered

### Option A: Stream-first + save on request (chosen)

**Pros:**
- Matches the stated goal.
- It's the API's intended use (display), which answers Q2.
- About 2 API calls per channel per refresh.
- Zero disk use by default.
- Simpler (no download queue in the common path).

**Cons:**
- Offline, the slideshow can only show images the WebView has cached.
- It depends on the Are.na CDNs being up.

### Option B: Download everything (original PR #1 design)

**Cons:** contradicts "just a stream". Disk use grows with every channel. It's the closest behaviour to
"systematic downloading". Kept only as opt-in download mode.

### Option C: App-managed image cache (thumbnails, LRU on disk)

Deferred. The WebView cache is enough until offline use is a stated need.

### Option D: Keyword topics via Are.na search

Requires Premium, which costs money. It's the owner's call (Q8).

### Option E: Keyword topics via open museum APIs (The Met, AIC, Cleveland; free, CC0)

Planned for M5. It could be pulled earlier if keyword topics matter more than Are.na curation (Q8).

## Consequences

- **Q2 answered:** displaying channels you choose is normal API use. For personal use no authorization email
  is needed. Before *public distribution*, registering an OAuth app and a courtesy note to help@are.na are still
  recommended.
- Easier: M1 is smaller. The slideshow, refresh and Save are the vertical slice; there's no bulk download path to
  harden first.
- Harder: lazy paging needs a `load_more(topic)` path alongside refresh (M1). Removals still need the M3 reconcile.
- Revisit when: the owner wants offline slideshows (Option C), keyword topics (D or E), or the CDN starts
  rate-limiting image loads.

## Action items

1. [x] Config topics, `FileMode`, `pages_per_refresh`; `MediaRef` + migration 0002; `Catalog::slides`; engine
   stream mode, page budget, per-channel dedup across topics. 30 tests.
2. [x] Tauri `topics` / `slides` commands; CSP allows `images.are.na` and the Are.na CloudFront origin.
3. [ ] M1: production HTTP client, launch refresh thread, lazy `load_more`, slideshow view, Save button.

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-16 | Claude | drafted | Triggered by owner feedback on PR #1 |
| Admin pass | 2026-11-16 | Claude (architect role) | approved with notes | A-7, A-8 |
| Developer pass | 2026-11-16 | Claude (developer role) | approved with fixes | D-9 fixed, D-10 |
| Owner gate | | Owner | pending | Q8 |
