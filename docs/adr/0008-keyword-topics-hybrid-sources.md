---
status: proposed
date: 2026-11-16
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0008: Keyword topics fed by free museum search plus curated Are.na channels

## Context

Q8 asked how a "topic" should be defined. The owner answered with the subjects themselves: *molds, wood objects
(chairs, tables, doors), wrought iron, castle, y2k tech, tech, form, product design, art, candles, chess,
vintage, vintage tech, renaissance, contemporary, etc.* So topics are **subjects**, and the owner expects images
about them without hand-picking every channel.

Constraints:

- The owner's Are.na plan is free, so there's no Are.na search API (Premium-only). Are.na can only contribute
  channels someone has picked.
- Two free, keyless museum APIs search by keyword and can filter to public-domain/CC0 works. Both were probed
  on 2026-11-16:
  - **Cleveland Museum of Art Open Access:** search and images both work (`openaccess-cdn.clevelandart.org` → 200).
  - **Art Institute of Chicago:** search works and reports 60 requests/min. Its IIIF image host
    `www.artic.edu` answered with a **Cloudflare challenge (403, `Cf-Mitigated: challenge`)** to non-browser
    clients. Whether WebView2 passes it is unverified, and we will not try to evade it.
- Museums are strong for art, renaissance, chess, candlesticks, wrought iron, castles and furniture. They're weak
  for y2k tech, product design, form studies and molds, and thin for *contemporary*, because most contemporary
  work is still under copyright and the feeds are public-domain only.

## Decision

1. **A topic = keywords + sources.** `[[topic]] keywords = [...]`. A keyword-capable source (`cleveland`, `aic`)
   with no explicit `query` runs **one search per keyword**. Are.na sources still name a `channel`.
2. **Starter topics = the owner's list.** `lemuse init` writes all 15. Each is fed by Cleveland keyword
   search and/or Are.na channels found by web search and verified through the public API on 2026-11-16 (13
   channels, all public).
3. **Museum refresh is weekly, 1 page (100 results) per keyword** (`SourcePolicy.min_refresh_hours = 168`,
   `max_pages = 1`). Search results barely change, so per-launch refresh would waste requests. Are.na channels
   still refresh every launch.
4. **AIC is built but not in the starter topics** until M1 confirms its images load inside the app window
   (review 0002 D-18). The owner can add `source = "aic"` to any topic to try it.
5. **Licence:** museum results are filtered to public-domain/CC0. Each block stores `license_id = CC0-1.0` and
   an attribution line naming the museum.
6. **Are.na Premium** would add true keyword search across Are.na, the best fit for the modern aesthetics.
   That's a money decision, so it's left to the owner (Q10).

## Options considered

| Option | Verdict |
|---|---|
| A. Keywords → free museum search + curated Are.na channels (**chosen**) | Free; covers historic subjects well; modern subjects depend on channel curation |
| B. Are.na Premium keyword search | Best coverage for y2k/product/form/molds; costs money → owner (Q10) |
| C. Curated Are.na channels only | Free, but someone must find channels for every topic, and museum-strong topics would be thin |
| D. The Met as a third keyword source | Images verified reachable (200), but search returned an unexpected empty response and objects need 1 request each (N+1) → investigate in a follow-up |
| E. Scrape sites without APIs (Pinterest etc.) | Rejected: terms and Cloudflare, and ADR-0004 tiers forbid it |

## Consequences

- **Request volume:**
  - First launch: about 41 Cleveland searches (about 1.4 min in the background at 30/min) plus 13 Are.na channels
    (13 lookups + up to 26 pages).
  - Later launches: Are.na only (about 13–26 requests). That takes about 1 min as a guest, or about 16 s with a
    free-account token.
  - Museums re-run weekly.
- **Coverage gaps (honest):** *Contemporary*, *Molds* and *Tech* are thin until the owner adds Are.na channels,
  enables AIC (if it works in-app), or chooses Premium.
- The starter channels are curated by other Are.na users. They can change or disappear, and the config comments
  say so.

## Action items

1. [x] `aic` + `cleveland` connectors with real-response fixtures; `PageOrdering`; `max_pages`; `min_refresh_hours`.
2. [x] Topic `keywords` + expansion; source validation; `starter_toml()` with the owner's 15 topics.
3. [ ] M1: load an AIC image inside WebView2. If it works, add `aic` to the starter topics.
4. [ ] Follow-up: The Met connector (investigate the search response; bounded N+1 object fetch).
5. [ ] Owner: Q10 (Premium?), and add channels for thin topics.

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-16 | Claude | drafted | From owner's Q8 answer |
| Admin pass | 2026-11-16 | Claude (architect role) | approved with notes | A-10…A-13 |
| Developer pass | 2026-11-16 | Claude (developer role) | approved with fixes | D-13, D-14 fixed; D-15…D-18 |
| Owner gate | | Owner | pending | Q10 |
