---
status: proposed
date: 2026-11-18
decision-makers: owner
consulted: admin pass
informed: —
---

# ADR-0020: A hosted LeMuse web app on a domain ("SaaS-ifiable?"), with the desktop app first

## Context

The owner (session 11): a friend has cloud space and can provide a DNS name or domain. Could LeMuse become a web
application other people use, while the standalone desktop app stays? ("that is the programming my favourite
things are made from.")

These facts constrain the design:
- **Are.na and Cleveland answer browser requests directly** (CORS `*`, probed 2026-11-18). A browser can read them
  with **its own** rate limit and IP.
- A server that reads Are.na for many people would share one guest limit (30/min per IP). It would need
  **each person's own Are.na login** (OAuth with PKCE, which Are.na supports).
- Are.na's API is "for building applications that integrate with Are.na, not for scraping or bulk data
  collection". A public or paid service built on it is a business question for Are.na too.
- Images are hotlinked, so hosting costs are tiny: the server never stores or serves image bytes.
- `lemuse serve` (ADR-0019) is a **local** tool: no TLS, one token, read-only. It must not be exposed to the
  internet.

## Decision: three stages; the desktop app stays the main product

| Stage | What | Server | Holds user data? | Owner questions |
|---|---|---|---|---|
| **1. LeMuse Web** (recommended first) | The same React UI as a static site on the domain. The visitor's browser talks to Are.na and the museums itself; topics and playlists live in the browser (IndexedDB), with import/export of a library file (or a QR code from the desktop). It is also the iPhone app (Home Screen, ADR-0016) | Static files only: Caddy with automatic HTTPS, on the friend's server or any static host | **No** | Q21 |
| 2. Accounts and sync | "Sign in with Are.na" (OAuth PKCE). Settings, topics and playlists sync between desktop, web and phone. A small Rust service reusing `lemuse-core`, with one SQLite catalog per user | A container + backups | Yes: email-free if login is Are.na-only; playlists and settings | Q21, Q23 |
| 3. Hosted features (the SaaS part) | Scheduled refresh for the account, the daily mailer (ADR-0021), shared walls for teams and classes; maybe a paid tier | Workers, a mail provider, payments | Yes | Q22, Q23, money, legal |

- **Shared code.** The core stays in Rust for the desktop and the stage-2 server. The browser gets a TypeScript
  backend for the same `Backend` interface, tested against the **same fixtures** as the Rust connectors (D-63).
  Compiling connector parsing to WebAssembly is an option later.
- **Same UI everywhere:** `SlideshowView` already runs in the app, the browser preview, the design artifact and
  the dashboard; LeMuse Web is one more build of it.
- **Desktop first:** features land in the desktop app; the web app follows where it can (no Save to disk, no
  mini window, no Task Scheduler).

### What the friend's server needs (stage 1)

- A Linux VM or container host with ports 80 and 443 open, plus DNS records for, say, `lemuse.<domain>`.
- Caddy (automatic Let's Encrypt certificates) serving the built files, with a strict CSP (`connect-src` to
  `api.are.na` and the museum APIs, `img-src` to the image hosts) and security headers.
- A CI job that builds the web bundle on each release tag and uploads it over SSH, using a deploy key held in
  GitHub secrets, scoped to one folder. Pushing to their server is publishing (Q21).
- Who has root on the server can see access logs; stage 1 holds no user data, so that is the whole exposure.

### Is it SaaS-ifiable?

Yes, in stages.
- **What people get:** topics that mix channels, museums and (soon) their own sources; LeMuse's own categories;
  practice tools; a slideshow anywhere.
- **Running costs:** low, because nothing is hosted but code and small metadata.
- **The real risks:**
  1. dependence on Are.na's terms and limits;
  2. privacy duties once accounts exist (policy, deletion, backups);
  3. the content belongs to its creators, so attribution and links always stay, and nothing is re-hosted.

  Talk to Are.na before stage 2 is public or anything is charged (Q23).

## Options considered

| Option | Verdict |
|---|---|
| **Staged: static local-first web app, then accounts, then hosted features (chosen)** | Useful at once, almost no risk or cost; each stage can stop there |
| Full SaaS from day one (accounts, server-side refresh) | Months of work; the server needs every user's Are.na token; legal and privacy load before anyone uses it |
| Expose the desktop `lemuse serve` through a tunnel or port forward | Rejected: no TLS, a single shared token, and the owner's PC on the internet |

## Consequences

- Stage 1 supersedes Q18: the iPhone web app can live on the friend's domain instead of GitHub Pages.
- A second frontend backend to keep in step (fixture-tested).
- Owner decisions:
  - **Q21:** host LeMuse Web on the friend's domain; which name; who administers the server.
  - **Q22:** which email account sends the mailer.
  - **Q23:** contact Are.na before a public stage 2 or any paid tier.
