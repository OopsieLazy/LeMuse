# feat: keyword topics with the owner's starter list (#2)

**Branch:** `feat/0002-keyword-topics` → `main`. **Stacked on #1.** Merge #1 first, then rebase this branch onto
`main` (commands in the handoff).
**Merge method:** squash (message: [0002-keyword-topics.merge.txt](0002-keyword-topics.merge.txt))

## Summary

- The owner answered Q8 with subjects. Topics are now **keywords + sources** (ADR-0008).
- `servensurf init` writes the owner's **15 topics**:
  Molds · Wood objects · Wrought iron · Castle · Y2K tech · Tech · Form · Product design · Art · Candles ·
  Chess · Vintage · Vintage tech · Renaissance · Contemporary.
- **Cleveland Museum of Art** keyword search (free, CC0, verified working) feeds historic subjects. It refreshes
  weekly at 1 page per keyword.
- **13 Are.na channels**, found by web search and verified via the public API, feed Wood objects, Y2K tech,
  Product design and Vintage tech.
- **Art Institute of Chicago** connector built and tested, but held back from the starter topics: its image host
  serves a Cloudflare challenge to non-browser clients (D-18).

Spec: [docs/specs/0002-keyword-topics.md](../specs/0002-keyword-topics.md)

## Type of change

- [x] feat: new capability
- [x] docs / test
- [ ] ⚠️ Breaking change

## Decisions and review loop

- ADRs: ADR-0008 (new, proposed)
- Review log: [docs/reviews/0002-keyword-topics.md](../reviews/0002-keyword-topics.md)
- [x] Admin pass: A-10…A-13 (AIC held back; channels third-party; thin topics; first-launch volume)
- [x] Developer pass: D-13…D-18. **D-13 fixed** (throttle was per target, not per source). D-14 and D-17 fixed;
      D-15 and D-18 deferred

## Testing

- [x] `cargo fmt --all -- --check`: clean
- [x] `cargo clippy --all-targets -- -D warnings`: clean (also `-p servensurf-app`)
- [x] `cargo test`: **40 passed, 0 failed** (10 new; fixtures are trimmed real responses)
- [x] `cd app && npm run build`: passes
- [x] Manual: `servensurf init` → `topics` lists all 15 with channels and keyword sources
- [x] Live probes (2026-11-16):
  - Cleveland: search 200, image 200.
  - AIC: search 200 (60/min), images 403 (Cloudflare challenge).
  - Are.na: 13 channels 200 (guest API).
- [ ] Not done: no in-app image load (M1); no CI (no remote)

## Risk and rollback

- Risk: **low**. Config and connectors only; no network code runs yet (the HTTP client is M1).
- Data or schema impact: none (no new migration).
- Rollback: revert the squash commit.

## Compliance (ADR-0004, ADR-0008)

- [x] Museum feeds filtered to public-domain/CC0; `CC0-1.0` + museum attribution on every block
- [x] Are.na: channels only (no search on the free plan); no crawling
- [x] Budgets under published limits (AIC 48 of 60/min; Cleveland 30/min); descriptive UA + `AIC-User-Agent`
- [x] No bot-protection workaround (AIC held back instead)
- [x] CSP widened only to `www.artic.edu` and `openaccess-cdn.clevelandart.org`

## Owner gate

| # | Question | Default |
|---|---|---|
| Q10 | Upgrade to **Are.na Premium** (paid) for real keyword search? Best for y2k tech, product design, form, molds, contemporary | No (free only) |
| Q11 | Any Are.na channels you follow for **Contemporary, Molds, Tech**? | Starter set only |

- [x] `docs/PROGRESS.md` entry added
- [x] `CHANGELOG.md` `Unreleased` updated
