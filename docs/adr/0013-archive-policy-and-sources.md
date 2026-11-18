---
status: proposed
date: 2026-11-17
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0013: Keep posts in the catalog forever (metadata and links); pixels only on Save; free sources plan

## Context

The owner asked (2026-11-17): "Using a database can we cache the posts so that they aren't lost to time or is that
against rules (or at least cache links)." They also confirmed Q8 = A (Are.na channels) + C (museum keyword search)
+ other sources, and Q10 = no Premium.

What the rules say (research report § Terms, 2026-11-16):

- Are.na's API docs **prohibit** "systematic downloading of content, or any form of structured data harvesting".
  The Terms let Are.na act against "mass downloading or automated retrieval of content … without prior
  authorization".
- The same docs **encourage caching** of API responses, with a reasonable lifetime and revalidation.
- Users own what they post. Many images were saved from elsewhere, so the copyright often belongs to neither
  Are.na nor the person who saved them.
- Museum CC0 / public-domain images (Cleveland, AIC, The Met) may be copied freely, but our own rule says no
  bulk image downloads (ADR-0009).

## Decision

**Yes to caching posts; no to caching every image.**

| What | Kept? | Why |
|---|---|---|
| Post metadata: title, description, creator, source link, licence, tags, dates | ✅ **Forever** in `catalog.db` | This is caching API responses for display, which the API intends. It's small: about 1 KB a post |
| Links: the post's page URL, image URLs | ✅ **Forever** | Same. If the image host later drops a file, the record and attribution remain |
| Posts removed from a channel upstream | ✅ **Kept** (never deleted by a refresh) | Proven by `items_removed_remotely_stay_in_the_catalog`. Later: mark them `removed`, hide them from the slideshow by default, and list them in an Archive view |
| A post that comes back without an image, creator or link | ✅ **Last-known values kept** | `upsert_block` keeps existing values when the update is missing them (`COALESCE`), and keeps the media set when the new one is empty. Proven by `update_without_media_or_creator_keeps_last_known_values` (review 0007 A-29) |
| Image files | Only when **you press Save** (one image, your action) | Auto-downloading every image is the "systematic downloading" the terms prohibit, and breaks ADR-0009 |
| CC0 museum images in bulk | Not by default | Legal, but it fills the disk and goes against ADR-0009. An opt-in "keep CC0 images offline" could come later, as an owner decision |

So posts aren't lost to time: the record of every post you've seen stays, with credit and a link. What you
**Save** stays as a real file. The one thing you can lose is an image you never saved whose host deletes it. That
is the creator's or host's right, and respecting it is the line the terms draw.

**Optional, owner's choice:** to archive whole channels of your own, use Are.na's own "Download channel" export
(made for that), or email help@are.na for permission. That would be contacting a third party, so it's your
decision.

### Other free sources (Q8 "and other sources"), in order

| # | Source | Key? | Licence filter | Note |
|---|---|---|---|---|
| 1 | **The Met** Open Access | None | `isPublicDomain` | Images were verified to load. Search returned an empty response on the 2026-11-16 probe; investigate, then add |
| 2 | **Wikimedia Commons** | None (descriptive User-Agent required) | PD, CC0, CC BY (attribution shown) | Strong for objects, tech, castles and chess |
| 3 | **Smithsonian** Open Access | Free api.data.gov key → Credential Manager | CC0 | Needs the token-storage work first |
| 4 | **Art Institute of Chicago** | None | `is_public_domain` | Built. Its image host returns a Cloudflare challenge to non-browser clients; enable only if images load inside the app (no evasion) |

Each one is a new connector behind `HttpClient`, with a real fixture and an admin pass (ADR-0004).

## Consequences

- The catalog grows by about 1 KB per post. 10,000 posts is about 10 MB.
- The slideshow will need an Archive view and a "removed" state (with the reconcile pass, A-6 → M3).
- No change to network behaviour or the terms we work within.

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-17 | Claude | drafted | Owner's caching question; Q8 and Q10 answers |
| Admin pass | 2026-11-17 | admin-review agent + Claude | see review 0007 | |
| Developer pass | 2026-11-17 | Claude (developer role) | see review 0007 | |
| Owner gate | | Owner | pending | |
