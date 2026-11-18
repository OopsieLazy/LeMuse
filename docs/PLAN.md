# Plan

**Product:** LeMuse. A Windows app that plays a **stream or slideshow of reference images on a topic** for
drawing, design and CAD practice. Topics are fed by Are.na channels you choose and free museum collections.
Images stream from the source; only Save writes files.

**Where we are:** **v0.6.0** is released (2026-11-17): PRs #1–#9 are on `main`. The next PR is the roadmap's
**v0.7**.

**How work reaches `main` (from session 8):**
- Claude works on a branch, commits small, and pushes the branch to GitHub. That is the off-machine backup, and
  CI runs on it.
- The owner opens the pull request from the link in the handoff, reviews it on GitHub (Files changed, CI, the
  test installer) and clicks **Squash and merge**.
- `main` is locked, so changes reach it only through a reviewed PR.

## Now (session 11, owner's request of 2026-11-18)

Merge order: **#11 → #10 → #12 → #13 → #14** (press "Update branch" on each after the one before merges).

| # | Work | Branch | Status |
|---|---|---|---|
| 1 | Earlier work: CI fix, roadmap, mini player + links, whole channels + auto refresh + JSON | #11, #10, #12, #13 | ✅ pushed, awaiting review |
| 2 | **Mini player v2:** smaller; image fills the window; tap the image for the bottom bar; ☰ menu on the left to switch All / topics / playlists | `feat/0014-dashboard-sheets-mini` | ⏳ |
| 3 | **Dashboard, first build** (ADR-0019): `lemuse serve`, read-only, 127.0.0.1 + token, JSON API + the LeMuse page for OBS, Home Assistant, a wall screen | same | ⏳ |
| 4 | **Reference sheet:** `lemuse sheet`, a printable page of N images with attribution (Print → PDF); a daily pick by date | same | ⏳ |
| 5 | **Whole channel now:** `lemuse sync --full`; a just-added channel reads up to 10,000 items | same | ⏳ |
| 6 | Plans: hosted web app on a domain (ADR-0020), daily mailer and pin automation (ADR-0021); Q19 = no, Q20 = no recorded | same + this branch | ⏳ |
| 7 | Owner: Dependency graph; lock `main`; Q18 and the new Q21–Q23 | — | ⏳ owner |

## Roadmap

Each release is one or two PRs and goes through the review loop ([CLAUDE.md](../CLAUDE.md)). The order is
Claude's recommendation; the owner can reorder.

### v0.7: Mini player and kept links (PR #12, ADR-0016)

- [ ] Mini player: borderless, always-on-top, any monitor, remembered size and place
- [ ] Image link fallbacks; Copy link; `lemuse export-links`

### v0.7.1: Whole channels, auto refresh, JSON (PR #13, ADR-0017)

- [x] Channels load in full across refreshes; a just-added channel reads up to 5,000 items at once
- [x] Auto refresh while the app runs (60 min); `--json` on every CLI command (docs/automation.md)

### v0.8: Save and sign in (finishes M1)

- [ ] **Save** the original of the current image: download → content store → `views/<topic>/`, with a "saved"
      mark. Includes streaming download with hash-on-write (D-1) and a download host allow-list per source
      (A-37)
- [ ] **Are.na token** in Windows Credential Manager (Settings field + `lemuse auth set|clear`):
      private channels, and 120 reads/min instead of 30
- [ ] **Import the channels you follow** (needs the token)
- [ ] **Load more:** fetch a channel's next pages when a slideshow runs low (ADR-0007 #3, D-23)
- [ ] Retries on 5xx and network errors (D-2); single-instance app (a second launch focuses the first window)

### v0.9: Browse and organize (M2)

- [ ] **Grid view** of any view or playlist (virtualized contact sheet); click an image to play from there
- [ ] **Search box** over titles and descriptions (the FTS index already exists)
- [ ] **Saved view:** everything you've saved, across topics
- [ ] Rename and remove topics in the UI; reorder playlists by drag
- [ ] **Smart playlists:** a saved filter (topic + categories), kept up to date automatically
- [ ] Fix a wrong category by hand (D-54); shuffle across all pages (D-53); consistent "newest first" (D-15)

### v0.10: Practice tools (drawing-focused)

- [ ] **Timed sessions:** for example 10 × 30 s, then 5 × 2 min, then 1 × 10 min, with a session summary.
      Pauses, skips and a final count
- [ ] **Study aids on the image:** mirror, greyscale, value view (posterize to 3–5 tones), grid overlay
      (thirds, 4×4, custom), zoom and pan to a detail
- [ ] **Compare:** two to four images side by side
- [ ] **Seen and favorite:** remember what you've seen to avoid repeats; a ♥ that feeds a Favorites playlist
- [ ] **Daily set:** a fresh 20 from your topics each day

### v0.11: iPhone and automation (ADR-0016)

- [ ] **iPhone web app** (Home Screen, Safari; same UI, direct Are.na and museum calls; library file or QR
      code from the desktop). Hosting on GitHub Pages needs the owner's OK (Q18)
- [ ] **Local dashboard page** `lemuse serve` (127.0.0.1 + token, read-only) for OBS, Home Assistant, a wall
      screen
- [ ] **Webhook on refresh** (Discord, Slack, Home Assistant); JSON from every CLI command
- [ ] **New sources, one per PR (ADR-0018):** local folders, Wikimedia Commons, The Met, Smithsonian Open
      Access, Poly Haven (Pinterest: Q20 = no; clip pins into Are.na)

### v1.0: Ambient and release (M4)

- [ ] Tray icon and start with Windows; scheduled refresh via Task Scheduler (ADR-0005)
- [ ] **Ambient window:** always-on-top or second-monitor slideshow; screensaver-style start when idle
- [ ] Signed installer and auto-updater; "LeMuse" trademark check (A-19); accessibility review; short user
      guide
- [ ] **Library backup:** `lemuse backup` / restore for `lemuse.toml`, playlists and settings. The catalog
      itself is rebuildable

### Alongside: robustness (M3) and more sources (M5)

- [ ] Reconcile items removed from channels (A-6); clean up unused files (D-3); `lemuse verify`
- [ ] The Met (empty-search issue); Wikimedia Commons (licence per file); Smithsonian Open Access (incl. 3D);
      **Poly Haven** (free textures and materials: rubber, wood, metal, good for material studies); AIC once
      D-18 is solved
- [ ] Optional offline cache of the last N images per topic (ADR-0007 option C)

## Feature ideas (not scheduled; pick any to move into the roadmap)

- **Practice:** a study notes field per image; a "draw this next" queue; session history with simple stats;
  silhouette view (one-colour shape); colour palette strip (needs a CORS check on image hosts).
- **Discover:** search-word suggestions from what you browse ("you like wood + furniture → try joinery, bentwood");
  Related channels for a whole playlist; in-app Are.na search if Premium is ever bought (A-39).
- **Make:** export a playlist as a reference sheet (contact sheet image or PDF, written only on request, like
  Save); open a saved image in another app (Krita, Photoshop, Blender); drag an image out of LeMuse into other
  apps.
- **CAD:** list Are.na attachments (STEP, DXF, PDF) on a block and save them; preview 3D models (glTF) from
  Smithsonian and Poly Haven.
- **Categories:** a local image-recognition model for untitled images (ADR-0015 option B, about 150–350 MB);
  editable vocabulary in Settings.
- **App:** a keyboard-shortcut overlay (?); first-run guide; several windows; translations; an in-app
  InPrivate "peek" window for Are.na pages (no install cost; the system browser stays the default).

## Owner decisions

| # | Question | Answer (2026-11-16) |
|---|---|---|
| Q1 | Tauri 2 + Rust core instead of C++/Qt? | ✅ **Approved.** ADR-0001 accepted |
| Q2 | Can channel images be displayed without mass downloading? | ✅ **Yes** (owner confirmed: view channel content as reference images).  Streaming chosen channels is the API's intended use (ADR-0007). No email needed for personal use. Before public distribution: register an OAuth app + courtesy note to help@are.na |
| Q3 | GitHub repo | ✅ **https://github.com/OopsieLazy/LeMuse** (public, empty at first push). CODEOWNERS `@OopsieLazy`; add a ruleset after the first push |
| Q4 | Name | ✅ **LeMuse** (2026-11-17; was ServeNSurf). Ranked vs TheMuse, TheMuses, Muses, Muse: least conflict with existing apps (ADR-0010) |
| Q5 | Licence | ✅ **MIT** ("basic, free"; reconfirmed 2026-11-17) |
| Q6 | Are.na tier | ✅ **Free.** 120 reads/min with a token, 30 as guest; no search API |
| Q7 | Library location | ✅ **Default:** `%USERPROFILE%\Pictures\LeMuse` |
| Q8 | How should a "topic" be defined? | ✅ **By subject.** Owner's list: molds, wood objects (chairs, tables, doors), wrought iron, castle, y2k tech, tech, form, product design, art, candles, chess, vintage, vintage tech, renaissance, contemporary. Built as keyword topics (ADR-0008, PR #2). 2026-11-17: **A (Are.na channels) + C (museum keyword search) + other free sources** |
| Q9 | Accept the proposed ADRs? | ✅ **Accepted on merge** (v0.6.0, 2026-11-17): ADR-0002…0015 marked accepted |
| Q10 | Are.na Premium? | ✅ **No** (2026-11-17). Free sources only |
| Q11 | Channels the owner follows? | ✅ The owner listed 16 by name (2026-11-17, "best guesses"). The 10 public matches are in the starter topics; the names aren't repeated in public notes (A-28) |
| Q12 | Layout of PR #3 | ✅ **Liked** (2026-11-17): rail left, stage, caption strip. Keep as the default "Studio" layout |
| Q14 | Are the generic-name channel matches right; links for the 6 not added; OK to have them in the public config? | ✅ **Right** (2026-11-17). The owner adds the rest with the Add-channel feature (PR #8) |
| Q15 | Allow read-only git for the admin-review agent hook? | ✅ **No** (2026-11-17); it reads the snapshot file |
| Q16 | Copy playlists to Are.na channels? | ✅ **Not needed for now** (2026-11-17) |
| Q17 | How should work reach `main`? | ✅ (2026-11-17) Claude pushes branches (never `main`); the owner opens and reviews PRs on github.com (no `gh`) and squash-merges there; `main` locked by a ruleset |
| Q18 | Publish the iPhone web app on GitHub Pages (a public page under your account)? | **Open** (ADR-0016) |
| Q19 | Native iPhone app later (Apple Developer Program, $99/year)? | ✅ **No** (2026-11-18). The iPhone gets the web app |
| Q20 | Register a Pinterest developer app (free; uses your Pinterest account) for an official Pinterest source? | ✅ **No** (2026-11-18). Pinterest finds go through Are.na (clip with the Are.na extension) |
| Q13 | How should handoff commands look? | ✅ Comment on its own line **above** each command, never trailing, so a whole line copies cleanly. PRs describe What / Why / How + checklist |

## Deferred findings register

| ID | From | Finding | Planned in |
|---|---|---|---|
| D-1 | Review 0001 r1 | Downloads buffered fully in memory; large CAD files need streaming | M1 |
| D-2 | Review 0001 r1 | Retry covers 429 only; add 5xx and network errors | M1 |
| D-3 | Review 0001 r1 | A partially failed block leaves orphan objects | M3 |
| D-5 | Review 0001 r1 | Renamed titles leave stale view files | M2 |
| D-12 | Review 0001 r2 | The CSP pins one CloudFront hostname for originals | M1 (load errors now skip the slide, PR #3; surface them in the UI) |
| A-4 | Review 0001 r1 | Review gates are procedural until the ruleset, bot account and deny rules exist | M1 |
| A-5 | Review 0001 r1 | Asset scope hardcoded to `$PICTURE/LeMuse/**` | M2 |
| A-6 | Review 0001 r1 | Removed remote items are invisible to the watermark walk | M3 |
| D-15 | Review 0002 | `slides()` "newest first" is loose across sources (mixed timestamp formats) | M2 (normalize to UTC) |
| D-18 | Review 0002 | AIC images sit behind a Cloudflare challenge for non-browser clients; unverified in WebView2 | M1 (verify; enable `aic` only if it works) |
| A-17 | Review 0003 | InPrivate WebView loses `localStorage`; UI prefs must persist via the core | M2 |
| D-23 | Review 0003 | A refresh reloads the active topic from slide 1 | M1 (`load_more` appends) |
| A-19 | Review 0004 | Trademark check of "LeMuse" | Before a public release |
| D-30 | Review 0005 | The review snapshot refreshes asynchronously after edits, so it can lag by one tool call | Mitigated: run `review-snapshot.mjs` before commits; the agent blocks on a stale snapshot |
| D-33 | Review 0006 | Auto-hide in docked layouts re-fits the image when the bar hides (the bar never overlays, by owner rule) | Accepted |
| A-11 | Review 0002 | Starter Are.na channels are third-party curated and may change | Owner review; M2 topic editor |
| A-37 | Review 0008 | Download mode (and Save) fetch image URLs from any https host the API names | Save PR: allow-list download hosts per connector, matching the CSP |
| D-42 | Review 0008 | npm audit exception for picomatch GHSA-fc5q-39xc-vjpf (dev-only, no fixed release) | Re-check by 2026-12-15; the gate fails on expiry |
| D-53 | Review 0009 | Shuffle mixes the current page only | M2: shuffle across pages (random order in SQL) |
| D-54 | Review 0009 | Word-based categories mislabel some images; untitled images rely on channel names | M2: manual corrections; later maybe a local image model (ADR-0015 option B) |
| D-74 | Review 0013 | Add channel and Find channels are refused during a long refresh | v0.8: queue them |
| D-75 | Review 0013 | The installer doesn't ship `lemuse.exe` (needed for Task Scheduler) | v0.8: bundle the CLI as a sidecar |
| A-50 | Review 0010 | CI actions pinned to Node 20 releases (deprecated); ubuntu-latest moving to Ubuntu 26 | Next CI touch: bump pinned SHAs (14-day cooldown) |
| A-39 | Review 0009 | In-app Are.na search needs Premium | Only if the owner buys Premium (Q10 = no) |
