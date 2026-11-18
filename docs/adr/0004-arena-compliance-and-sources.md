---
status: proposed          # amended by ADR-0007 (stream-first)
date: 2026-11-16
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0004: Respect Are.na's terms and pick sources by licence, not by availability

## Context

Are.na's API docs prohibit "automated crawling, systematic downloading of content, or any form of structured data
harvesting". The Terms (effective 2023-11-08) prohibit "mass downloading or automated retrieval of content …
without prior authorization". Are.na decides what's excessive. Content belongs to its creators, and Are.na grants
other users no reuse rights. Other sources range from CC0 with bulk downloads encouraged (Poly Haven, The Met)
to outright bans on caching (GrabCAD, McMaster-Carr).

Research: `reports/Arena reference gatherer architecture.md` §Are.na terms and §Other sources.

## Decision

**Are.na gathering rules (enforced in code where possible):**

1. Gather **only** channels the user explicitly lists as topic sources. No discovery crawling, no following
   connections to other channels, no "gather everything by user X". (ADR-0007 makes the default *stream*,
   not download, and caps pages per refresh.)
2. Incremental only (ADR-0003), throttled to 80% of the tier's read limit, at least 500 ms apart, honouring
   `retry_after`.
3. Send a descriptive User-Agent: `ServeNSurf/<version> (+<contact>)`.
4. Store the creator and source with every block. Show attribution in the UI. The library is labelled
   *personal reference*: no export or sharing features in v1.
5. **Before any public distribution**, register an OAuth app and send a courtesy note to help@are.na
   describing the app. Not needed for personal use: streaming chosen channels is the API's intended use
   (ADR-0007; Q2 answered 2026-11-16).

**Source tiers for future connectors:**

| Tier | Sources | Mode |
|---|---|---|
| v1–v2, background OK | Are.na (user channels), The Met, Cleveland MoA, Art Institute of Chicago, Smithsonian Open Access (incl. 3D), Poly Haven, NASA Images, Wikimedia Commons (store per-file licence) | Automated gather |
| Save-on-request only | Unsplash, Pexels, Sketchfab, Flickr, Thingiverse | `background_sync_allowed = false`; the user clicks save; keep attribution and tracking |
| Manual import only | GrabCAD, Printables, Onshape, McMaster-Carr, ArtStation, Behance, Pinterest, DeviantArt, TraceParts | No connector. The user downloads in a browser and imports the file with its source URL |

## Options considered

- **A (chosen):** user-curated gather list, policy-as-data, licence tiers.
- **B:** "gather everything relevant" (search-driven discovery across Are.na). Rejected because it's the
  structured harvesting the terms prohibit.
- **C:** scrape sites without APIs. Rejected because of terms bans and Cloudflare blocks, and it's fragile.

## Consequences

- Easier: low legal and ban risk. Licence metadata is available for every file.
- Harder: the user has to curate channels. "Auto-gather" means *auto-refresh of what you chose*, not *auto-discover*.
- Revisit when: Are.na replies to the authorization email, or its terms change.

## Action items

1. [x] `SourcePolicy.background_sync_allowed` and `attribution_required`; `LicenseInfo` on every block.
2. [ ] Owner: email help@are.na before the first public release.
3. [ ] M1: put the contact string in the UA from config; block sync until it's set.

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-16 | Claude | drafted | |
| Admin pass | 2026-11-16 | Claude (architect role) | approved with owner actions | A-2 (ToS risk → owner email) |
| Developer pass | 2026-11-16 | Claude (developer role) | approved | |
| Owner gate | | Owner | pending | Q2 in PR |
