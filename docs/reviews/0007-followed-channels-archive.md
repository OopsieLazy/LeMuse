# Review 0007: Followed channels and archive policy

- **Branch:** `feat/0007-followed-channels-archive` (stacked on #6) · **ADR:** 0013
- **Admin pass:** an admin-review agent read the diff read-only on 2026-11-17, then Claude checked its findings.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-27 | med | The channel-finding method wasn't recorded; a search endpoint would break ADR-0004 | **Recorded:** each name was tried as a direct `GET https://api.are.na/v3/channels/<slug>` (the obvious slug: lowercase, hyphenated), one request per name, 2.5 s apart, as a guest. **No search endpoint and no site scraping.** 18 requests in total: 10 × 200, 4 × 401 (private), 4 × 404 |
| A-28 | low | Generic slugs may be someone else's channel, and labelling the owner's follows in a public repo publishes them | **Fixed:** "followed" labels removed from the config and PLAN; owner asked to confirm matches and public visibility (Q14) |
| A-29 | med | ADR-0013's "forever" claim was too strong: `upsert_block` overwrote creator/link with NULL and dropped media on every update | **Fixed:** `COALESCE` keeps last-known values; media are kept when an update has none; new test `update_without_media_or_creator_keeps_last_known_values`; ADR wording updated |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-35 | med | Name matching can pick someone else's channel with the same name (generic names: Resonance, Metal, sitting, Woodworking) | Listed in the config with curator and size (no "followed" label, A-28); owner to confirm (Q14) |
| D-36 | low | 4 followed channels are private (401 as guest) | Need an Are.na token (Credential Manager, M1 `feat/0008`) |

- [x] 18 lookups, one per name, 2.5 s apart, as a guest; no search or crawling (ADR-0004)
- [x] Real refresh with them: 742 new posts, 0 errors, 0 files
- [x] New test proves refreshes never delete catalogued posts; starter-topic test updated (16 topics)
