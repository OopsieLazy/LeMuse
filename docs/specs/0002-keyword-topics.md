# Spec 0002: Keyword topics with the owner's starter list

- **Milestone:** M1 prerequisite (pulls M5 museum sources forward per Q8)
- **Branch:** `feat/0002-keyword-topics` (stacked on `feat/0001-architecture-skeleton`)
- **Status:** built

## Problem

The owner wants slideshows on subjects: molds, wood objects (chairs, tables, doors), wrought iron, castle, y2k
tech, tech, form, product design, art, candles, chess, vintage, vintage tech, renaissance, contemporary. With
a free Are.na plan, there's no way to get images *by keyword* from Are.na.

## Outcome

`servensurf init` creates a library whose config already contains those 15 topics. Each topic resolves to
concrete sources (museum keyword searches and/or verified Are.na channels) that the refresh engine can fetch
politely.

## Scope

**In:**

- Topic `keywords`; keyword expansion.
- Cleveland and AIC connectors.
- Per-source page cap and refresh interval.
- The owner's starter topics with verified channels.
- Shared per-source throttle.
- Validation.

**Out (explicitly):**

- The production HTTP client, the slideshow UI and Save (M1).
- The Met.
- Are.na Premium search.
- Topic editor UI (M2).

## Design sketch

- `config::Topic { keywords }` + `resolved_sources()`.
- `connectors::{aic, cleveland}` + `PageOrdering` and `SourcePolicy { max_pages, min_refresh_hours }`.
- `Catalog::{find_collection, synced_within, touch_synced}`.
- `assets/starter_topics.toml` embedded with `include_str!`.

## Acceptance criteria

- [x] `init` writes 15 topics in the owner's order; every topic has ≥ 1 resolved source (test)
- [x] Keyword expansion: one search per keyword per keyword source (test)
- [x] Unknown sources and keyword-only Are.na sources are rejected with clear messages (test)
- [x] Museum results map to CC0 blocks with streamable media from real fixtures (tests)
- [x] A museum keyword refreshes once, then is skipped for a week with no requests (test)
- [x] Tests: unit + fixture-based; no network
- [x] Docs: ADR-0008, review 0002, PROGRESS, CHANGELOG

## Risks and open questions

| # | Question / risk | Owner decision needed? |
|---|---|---|
| 1 | AIC images are behind a Cloudflare challenge for non-browser clients | No: verify in-app in M1 |
| 2 | Thin topics (contemporary, molds, tech) | Yes: add channels, or Q10 Premium |
| 3 | Starter channels are third-party curated and may change | No (documented) |
