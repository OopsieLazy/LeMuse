---
status: proposed
date: 2026-11-18
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0016: Beyond the desktop: mini player, iPhone, kept links, automation, and who it's for

## Context

The owner's session-9 goals:

1. **An iPhone app.**
2. **A mini player:** the app made small and portable, for other monitors and dashboards.
3. **Keep image links**, so images still show if they're removed from a channel, or just in general.
4. **Pipelines and automation:** ways to plug LeMuse into other tools.
5. **Applications:** who this is for (architects, product designers, artists, creators), especially once it
   reaches beyond Are.na.

These facts constrain the design (checked on 2026-11-18):

- **iPhone, native:** Tauri 2 builds iOS apps only on macOS with full Xcode. From Windows, the way is a macOS
  runner on GitHub Actions. A real iPhone needs signing. A free Apple ID signs apps for about **7 days**
  (3 apps at a time), so you re-sign weekly. The Apple Developer Program costs **$99/year** and allows
  TestFlight and the App Store.
- **iPhone, web app:** since iOS 26, every site added to the Home Screen opens as a web app. Safari has no install
  prompt; you use Share → Add to Home Screen. Storage of installed web apps survives; sites that aren't installed
  can be evicted.
- **CORS is open:** `api.are.na` answers browser requests with `Access-Control-Allow-Origin: *`, even with a
  Safari user agent (probe: 200). The Cleveland API does the same. So a web app on the phone can stream from the
  same sources directly.
- **Links are already kept:** the catalog stores every block's image URLs (several sizes), its Are.na page and
  its original source URL. Refreshes never delete blocks (ADR-0013), so an image removed from a channel stays in
  LeMuse and keeps streaming while the CDN still serves it.
- The desktop app already has a CLI with JSON output (`slides`, `related`, `preview-channel`, `preview-data`), and
  refresh is shared by every trigger (ADR-0005).

## Decision

1. **Mini player (next PR, #12).** One key (M) or button turns the main window into a small, borderless,
   always-on-top player: just the image, with controls that appear on hover. Drag it anywhere, onto any monitor,
   and resize it. LeMuse remembers its size and place. Press M again (or the expand button) and it returns to
   the full window exactly where it was.
   - It needs window permissions: always-on-top, decorations, size, position, minimum size and dragging, all
     for the main window only. Each is justified in review 0012.
   - "Dashboards" in the wider sense (OBS, Home Assistant, a wall screen) are covered by item 4.
2. **Kept links (PR #12):**
   - **Fallbacks:** if an image's display URL fails, LeMuse tries the block's other stored sizes before skipping
     it. This covers a resizer outage or a dead variant.
   - **Copy link** on any image puts its source page and full-size image URL on the clipboard.
   - **`lemuse export-links`** writes every image link of a topic, playlist or All as CSV, JSON or plain text,
     for spreadsheets, scripts and backups.
   - Removed-from-channel images stay; an Archive view to see or hide them comes with the reconcile pass
     (A-6, M3).
   - Original source URLs (the site an Are.na block was saved from) are kept and shown as links, but not loaded
     as images. Loading them would mean allowing any image host in the CSP, which would let any site see the
     user's IP and break the source-host allow-list. A Rust-side fetch-and-check proxy is the option if wanted
     later.
3. **iPhone: a web app first, native later.**
   - **Recommended:** a **LeMuse web app** that runs in Safari and is added to the Home Screen.
     - It's the same React UI (`SlideshowView`) with a browser backend that calls Are.na and the museums directly
       (CORS is open).
     - Topics and playlists move from the desktop as a small library file (export/import, or a QR code holding a
       link). Images stream; nothing is stored but metadata in IndexedDB.
     - It's hosted free on GitHub Pages from this repo. That **publishes** a page under the owner's account, so
       it's the owner's call (Q18).
     - No Mac, no fee, no weekly re-signing.
   - **Later, if wanted:** a native Tauri iOS build on a GitHub macOS runner, signed through the $99/year
     program (owner's money, Q19). Most of the code would carry over. Native adds widgets, the Share sheet, and
     Files.
4. **Automation and pipelines, in this order:**
   1. CLI first. Everything the app knows is already, or will be, available as JSON (`slides`, `related`,
      `preview-channel`, `export-links`), so PowerShell, Task Scheduler, n8n or Make can drive it.
   2. A **read-only local dashboard page** (`lemuse serve`, bound to `127.0.0.1` with a random token): a
      slideshow URL for OBS browser sources, Home Assistant or Grafana panels, Stream Deck, or a wall screen.
   3. **Webhook on refresh** ("12 new images in Wood") for Discord, Slack or Home Assistant.
   4. A GitHub Action that builds a static "reference wall" page from a topic. Images stay hotlinked, with
      attribution.

   Each one gets its own ADR entry and security review when it's built: a local server, outbound webhooks.
5. **Sources and audiences beyond Are.na** (see § Applications) go through the connector pattern (ADR-0003).
   - Each source keeps its licence and attribution (ADR-0004).
   - The most useful next sources: **local folders** (your own reference library), Wikimedia Commons, The Met,
     Smithsonian Open Access (including 3D), and Poly Haven (free material textures).
   - Pinterest and Instagram have no API that allows this kind of use, so they're out.

## Options considered: iPhone

| Option | Cost | Needs | Pros | Cons |
|---|---|---|---|---|
| **A. Web app (Home Screen)** | Free | GitHub Pages (publishing) | Works now; shares the UI; no re-signing | No App Store listing; no widgets; Safari storage rules |
| B. Native Tauri iOS, free Apple ID | Free | macOS runner, weekly re-sign via AltStore/SideStore | Real app | Expires every 7 days; fiddly |
| C. Native Tauri iOS, Developer Program | $99/year | macOS runner, Apple account | TestFlight and App Store; widgets later | Money, review process, Apple's rules |
| D. Phone opens the desktop app over Wi-Fi | Free | PC on, local server | No sync | Only works at home with the PC on |

**A first**, with C as an upgrade path. B is a stopgap at best.

## Applications: who it's for

| Audience | What they'd use | Sources that matter |
|---|---|---|
| **Architects, interior designers** | Precedent and material boards; facades, stairs, joinery; the mini player on a second screen while drafting | Are.na, museums (architecture, furniture), local folders, Wikimedia |
| **Product and industrial designers** | CMF and form studies; categories like plastic, rubber, metal; "exploded view" searches; CAD attachments (STEP, DXF) | Are.na, Smithsonian 3D, Poly Haven materials, local CAD folders |
| **Artists and illustrators** | Timed gesture sessions, value and mirror views, daily sets; CC0 museum art for master studies | Museums (CC0), Are.na, local folders |
| **Creators, streamers, studios** | Mood slideshows as an OBS source; a shared wall screen; mini player during calls | Are.na, local folders, the dashboard page |
| **Teachers, schools** | Classroom slideshows of CC0 museum objects by topic; attribution shown by default | Museums, Wikimedia |
| **Game, film, 3D artists** | Concept and material reference; texture sources | Poly Haven, Are.na, museums |

What sets it apart: it **streams instead of hoarding**, so it's light, respects creators, and attribution is
always shown. It turns scattered channels into topics, its own categories work across sources, and it fits
practice (timed sessions, study aids).

## Consequences

- Easier: using LeMuse beside other work (mini player); reaching the phone without a Mac; feeding other tools.
- Harder: a second backend (browser) to keep in step with the core. Shared logic should move to one place, or be
  tested against the same fixtures.
- Owner decisions: Q18 (publish the web app on GitHub Pages?), Q19 (Apple Developer Program, later?).
