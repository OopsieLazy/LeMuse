---
status: proposed
date: 2026-11-18
decision-makers: owner
consulted: admin pass
informed: —
---

# ADR-0018: Media sources beyond Are.na, including Pinterest

## Context

The owner: "Is there a way to use Pinterest? … Let's continue branching out to different media sources." Every
source plugs in through the connector pattern (ADR-0003) with its licence and attribution (ADR-0004), and only
after its images are proven to load without bot-protection workarounds (CLAUDE.md, review 0002 D-18).

**Pinterest, as of 2026-11-18:**
- The official API v5 has two tiers, Trial and Standard, and both allow reading boards and Pins. It needs a
  registered developer app and OAuth to the owner's Pinterest account.
- Developer forums report Trial requests pending since April 2026, and some Standard requests denied. Pinterest
  publishes no timeline.
- Board RSS feeds (`pinterest.com/<user>/<board>.rss`) still exist but are unofficial. Pinterest makes no
  commitment to keep them, and automated requests are reported to be blocked.
- Pinterest isn't a licence source: pins are other people's images.

## Decision

1. **Pinterest: three paths, in this order.**
   1. **Now, no code:** clip Pinterest finds into an Are.na channel with Are.na's own browser extension ("Add to
      Are.na"), then add that channel to a topic. That's Are.na's intended use, and attribution follows the
      block.
   2. **Official API (needs the owner):** register a Pinterest developer app and request Trial access (Q20). Once
      approved, a `pinterest` connector would read **the owner's own boards** with OAuth.
      - The token goes in Credential Manager, shared with the Are.na token work in v0.8.
      - Pins stream from `i.pinimg.com`; that host is added to the CSP only then.
   3. **Board RSS: only as an experiment, and only if it works plainly.** If a board's `.rss` answers normally
      from a home connection, a read-only connector could follow boards the owner names. If Pinterest blocks it,
      we stop: no workarounds. It's never enabled by default.
   - Scraping Pinterest pages is out, by their terms and by our rules.
2. **Next sources, by value to the audiences** ([docs/product/audiences.md](../product/audiences.md)):

   | # | Source | Why | Access | Licence | Notes |
   |---|---|---|---|---|---|
   | 1 | **Local folders** | Your own reference library, offline, any format | Disk | Yours | Shown via the asset protocol with a per-folder scope; no network |
   | 2 | **Wikimedia Commons** | Huge, free, every subject; diagrams, architecture, objects | MediaWiki API, no key, CORS open | Per file (CC BY, BY-SA, PD) | Attribution and licence per image are required; `upload.wikimedia.org` joins the CSP |
   | 3 | **The Met** | Hundreds of thousands of open-access objects; strong in design and craft | Open Access API, no key | CC0 for open-access objects | The earlier empty search needs a fix first |
   | 4 | **Smithsonian Open Access** | Millions of items, incl. 3D | api.data.gov key (free) | CC0 | The key is a credential: Credential Manager |
   | 5 | **Poly Haven** | Material textures and HDRIs (wood, rubber, metal) | Public API, no key | CC0 | Great for material studies |
   | 6 | **Art Institute of Chicago** | Built already | Public API | CC0 | Still held back: images sit behind a challenge (D-18) |
   | 7 | Unsplash, Pexels | Photo reference | API key, hotlinking rules | Their licences | Save-on-request only; later |

   One connector per PR, each with a trimmed real fixture, its CSP host, an image-load probe, and a row in the
   audiences tracker.
3. **Out:** Instagram (no API for this), Pinterest scraping, Google Images, Behance, Dribbble (no suitable public
   API, and their terms forbid it).

## Consequences

- Topics can mix sources freely. Categories (ADR-0015) already work across sources.
- Each new host widens the CSP by one entry; each keyed source adds a credential to Credential Manager.
- Owner decision Q20: register a Pinterest developer app (it uses your Pinterest account; free).
