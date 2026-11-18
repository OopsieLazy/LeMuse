# Review 0002: Keyword topics with the owner's starter list

- **Branch:** `feat/0002-keyword-topics` (stacked on `feat/0001-architecture-skeleton`)
- **PR:** #2 (local; see `docs/pr/0002-keyword-topics.md`)
- **ADRs touched:** ADR-0008 (new)
- **Round:** 1

## 1. Proposal (author: Claude)

- The owner answered Q8 with subjects, not a mechanism. So topics become keyword-based.
- Keywords feed free museum keyword search (Cleveland now; AIC built but held back). Modern subjects get Are.na
  channels found by web search and verified through the public API.
- `init` writes the owner's 15 topics, so the first launch already has them.
- Museums refresh weekly at 1 page per keyword; Are.na refreshes every launch.

| # | Decision | Why | ADR |
|---|---|---|---|
| 1 | Topic = keywords + sources; one search per keyword | Matches the owner's subject list; works on the free plan | 0008 |
| 2 | Cleveland in the starter topics; AIC held back | Cleveland images verified 200; AIC's image host serves a Cloudflare challenge | 0008 |
| 3 | Weekly museum refresh, 1 page per keyword | Results barely change; about 41 requests a week instead of per launch | 0008 |
| 4 | Premium search left to the owner | It costs money | 0008 (Q10) |

## 2. Admin / architect pass

- [x] Fits ADR-0004 tiers: museums are in the "background OK" tier; nothing scraped; Are.na channel-only
- [x] Licensing: museum feeds filtered to public-domain/CC0; `CC0-1.0` + museum attribution on every block
- [x] Security: CSP `img-src` widened only to `www.artic.edu` and `openaccess-cdn.clevelandart.org`
- [x] Politeness: descriptive User-Agent; AIC's requested `AIC-User-Agent` header sent; budgets under published limits
- [x] Owner-only decision raised: Q10 (Premium)

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-10 | med | AIC's image host answered with a Cloudflare challenge (`Cf-Mitigated: challenge`) to our probe. Working around bot protection is off-limits | AIC left out of the starter topics; verify in WebView2 in M1 (D-18). No evasion |
| A-11 | med | The 13 starter Are.na channels are curated by other users and can change or vanish | Verified 2026-11-16 (all public); config comments say so; owner can replace them |
| A-12 | low | *Contemporary*, *Molds* and *Tech* are thin on free public-domain sources | Called out in config comments, ADR-0008 and to the owner; Q10 |
| A-13 | low | First launch makes about 41 museum searches in the background (about 1.4 min) | Accepted; weekly afterwards |

## 3. Developer pass

- [x] Builds: `cargo build`, `cargo clippy -p servensurf-app -D warnings`, `npm run build`
- [x] `cargo fmt --check`, `cargo clippy --all-targets -D warnings` clean
- [x] `cargo test`: **40 passed** (10 new)
- [x] CLI smoke: `init` writes 15 topics; `topics` lists channels and keyword sources

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-13 | **med** | The engine built a fresh `Throttle` per target, so back-to-back targets on the same API (many keywords on one museum) weren't paced against each other, risking a 429 burst | **Fixed:** one throttle per source for the whole run |
| D-14 | low | `resolve_collection` hit Are.na once per channel on every refresh just to read the title | **Fixed:** known collections skip the lookup (13 requests saved per launch); test updated |
| D-15 | low | `slides()` orders by `remote_updated_at`, but formats differ across sources (`Z`, `-06:00`, space-separated), so cross-source "newest first" is loose | Deferred → M2 (normalize to UTC on ingest). Topics shuffle by default |
| D-16 | low | Cleveland `print` images are 1–5 MB | No change needed: only used by Save; display uses the ~1000 px `web` image |
| D-17 | low | Clippy flagged a negated boolean in source validation | **Fixed** (named `fed_by_keywords`) |
| D-18 | med | AIC IIIF images unverified in-app (403 challenge to curl) | Deferred → M1: load one in WebView2; enable `aic` in the starter topics only if it works |

**Verification evidence:**

```
cargo test                       → servensurf-core: 40 passed, 0 failed
cargo clippy (all + app)         → clean
npm run build                    → built
servensurf init → topics         → 15 topics in the owner's order
Probes 2026-11-16: Cleveland search 200 + image 200; AIC search 200 (x-ratelimit-limit 60), AIC IIIF 403 challenge;
                   13 Are.na channels 200 via guest API; The Met object + image 200, search response empty
```

## 4. Owner gate

**Summary for owner:**
- Your 15 topics are built in as the starter config.
- Historic subjects come from Cleveland museum search (free, CC0).
- Modern subjects come from 13 verified Are.na channels.
- Three topics are thin until you add channels or choose Premium.

**Open questions:** Q10 (Are.na Premium for keyword search?), Q11 (channels you already follow for thin topics?).

**Owner decision:** ☐ approve and merge · ☐ changes requested (→ Round 2) · ☐ reject
