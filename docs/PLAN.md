# Plan

**Product:** LeMuse. A Windows app that plays a **stream or slideshow of reference images on a topic** for
drawing, design and CAD practice. Topics are fed by Are.na channels you choose and free museum collections.
Images stream from the source; only Save writes files.

**Where we are:** **v0.7.0** is released (2026-11-18). PRs #16–#21 (compact windows, Save, Are.na token,
polish, practice tools, road to 1.0; v0.10.0) await review. Next: the path to 1.0 below.

**How work reaches `main` (from session 8):**
- Claude works on a branch, commits small, and pushes the branch to GitHub. That is the off-machine backup, and
  CI runs on it.
- The owner opens the pull request from the link in the handoff, reviews it on GitHub (Files changed, CI, the
  test installer) and clicks **Squash and merge**.
- `main` is locked, so changes reach it only through a reviewed PR.

## Now (sessions 13–14, owner's requests of 2026-11-18)

v0.7.0 is on `main`. Merge order: **#16 `feat/0016-compact-layout`** (with the CI fix) → **#17
`feat/0017-save-originals`** → **#18 `feat/0018-arena-token`** (each stacked on the one before).

| # | Work | Status |
|---|---|---|
| 1 | Compact windows like the mini player; **smooth** bar slide and rail ease (#16) | ✅ pushed |
| 2 | CI fix carried in #16 | ✅ pushed |
| 3 | **Save originals** (v0.8 starts): host allow-list (A-37), magic bytes, retries (D-2), `lemuse save`; right-click menu; re-saves shown once; next page at a page's end (#17) | ✅ pushed |
| 4 | **Are.na token** in Credential Manager: Settings and `lemuse arena-token`; checked each refresh; private channels; 120 reads a minute (#18, ADR-0023) | ✅ pushed |
| 5 | Owner: Dependency graph; lock `main`; Q21–Q23 | ⏳ owner |
| 6 | First-refresh fill: images appear as they arrive (#18, D-103) | ✅ pushed |

### Session 15: polish for a complete app (work item 19, `feat/0019-polish`, stacked on #18)

Owner: "close to complete, will keep open source; error handling and error pages with proper codes,
responsiveness, polish; test the token".

| # | Work | Status |
|---|---|---|
| 1 | Token tested live (free tier; 21 followed channels); `lemuse arena-token check` and `following`; D-101 closed | ✅ pushed |
| 2 | **Responsiveness:** every command off the UI thread; UI reads wait their turn during a refresh (D-74), spaced by tier | ✅ pushed |
| 3 | **Error codes:** `Error::code()`; CLI `--json` `code` and exit codes 3–10; app `{ code, message }` (ADR-0024) | ✅ pushed |
| 4 | **Error pages:** dashboard HTML pages with `Allow`/`WWW-Authenticate`/`Retry-After`; crash page; offline and "can't load" states; Refresh details | ✅ pushed |
| 5 | **Channels you follow** in Find channels (one page per click) | ✅ pushed |
| 6 | Single instance (`tauri-plugin-single-instance` 2.5.5, cooldown passed) | ✅ pushed |
| 7 | **v0.8.0** everywhere; Settings → About | ✅ pushed |

### Session 16: practice tools (work item 20, `feat/0020-practice-tools`, stacked on #19)

Owner: "practice tools seems fun, goal is 1.0; hands-on from here with guardrails, maps, plans and instructions;
after the usual passes, a final Design Analyst and Art Specialist pass with full research." Also: what would a
major company worry about (e.g. the app opening its own GitHub)?

| # | Work | Status |
|---|---|---|
| 1 | **Study aids** on screen only (CSS/SVG, no pixels read or saved): mirror, upside down, greyscale, values (2–5 tones + balance), squint, grid (thirds, 4 × 4, squares, diagonals); a badge while on | ✅ pushed |
| 2 | **Timed sessions:** 6 plans + your own; clock waits for the image and pauses when hidden; ticks and tones; pause/skip/back/end; summary with ♥, Keep as a playlist, Resume | ✅ pushed |
| 3 | **♥ Favourites** (a playlist made on the first ♥) and a **?** shortcuts sheet | ✅ pushed |
| 4 | **Enterprise concerns:** answered (report); redacted Copy details, version-only report link, public-issue warning, AIC host removed, CODE_OF_CONDUCT, takedown + privacy in README | ✅ pushed |
| 5 | **Hands-on map:** `docs/guide/hands-on.md` (where things live, guardrails, first exercises) | ✅ pushed |
| 6 | Research (5 tracks) → report → **Design Analyst / Art Specialist pass**; quick wins fixed, the rest planned | ✅ pushed |
| 7 | ADR-0025, review 0020 (admin, developer, design/art), v0.9.0, PR #20; first UI unit tests (CI) | ✅ pushed |

### Session 17: road to 1.0 (work item 21, `feat/0021-road-to-1-0`, stacked on #20)

Owner: settle the fixes before 1.0; more value options (darks and their light counterparts); a drawing effect
("the effect of grass over the grass of the picture"); Q25 how hard are auto updates; Q26 yes; Q27 yes, a
nudity sensor; Q28 yes; Q29 good; check the newly followed channels import; testing first, hands-off.

| # | Work | Status |
|---|---|---|
| 1 | **Followed channels:** live check (27 followed, 7 in topics, refresh OK); show which topic each is in; **Add all new** with a suggested topic; `lemuse import-following`. Live: 20 added, 3,968 images, 0 errors | ✅ pushed |
| 2 | **Values:** 2–9 tones (Munsell-like 9), **darks only / lights only / darks + lights**, a value strip | ✅ pushed |
| 3 | **Drawing effects** (SVG filters, on screen only): lines, strokes ↕ ↔, cross-hatch; checked visually | ✅ pushed |
| 4 | **Content safety (Q27):** a nudity sensor from titles, descriptions, museum types and channel names (18 of 15,602 flagged); hidden by default; Hide this image; Mark as nudity; Settings → Content | ✅ pushed |
| 5 | **Practice log (Q28):** sessions kept locally; this week and 8 weeks, no streaks; can be hidden or cleared | ✅ pushed |
| 6 | **Updates (Q25):** check GitHub Releases on launch (setting), "update available" with a link; release workflow with `SHA256SUMS`, provenance and SBOM; full auto-update path documented | ✅ pushed |
| 7 | **Accessibility:** single-key shortcuts switch (WCAG 2.1.4); layout test checks 24 px targets and text contrast (84 fixed) | ✅ pushed |
| 8 | **Name check (Q26):** desk search for "LeMuse": no conflict found (docs/product/name-check.md) | ✅ pushed |
| 9 | Docs: ADR-0026/0027/0028, review 0021, privacy statement, user guide, release guide; v0.10.0; PR #21 | ✅ pushed |
| 10 | Owner: "one big Following folder defeats the purpose": **each followed channel is its own topic**, named after it, under a "Following on Are.na" heading; library restructured (36 topics, 20 under the heading, 0 errors); `remove-channel`, `remove-topic` | ✅ pushed |
| 11 | Owner: SignPath researched (332 projects; solo roles not addressed), then **declined** (Q24): ship unsigned with checksums and attestation | ✅ pushed |

### Session 19: guarded engineering with an AI; third-party notices (work item 23, `chore/0023-guarded-engineering`)

Owner (after merging 0.11 as one PR and tagging v0.11.0): "remove ability to push as git account. This was good
test, the line is moderately easy to walk. Continue as per plan." One branch, merged before the next starts.

| # | Work | Status |
|---|---|---|
| 1 | **Claude never pushes:** deny rule + `no-push.mjs` hook (any position in a command); CLAUDE.md and memory | ✅ |
| 2 | **Guardrail files gate:** CI fails when a PR touches workflows, hooks, scanner rules, `.gitleaksignore`, capabilities, CSP or CLAUDE.md, until the owner adds the `guardrails-reviewed` label | ✅ |
| 3 | **"Where to look"** in every PR: the riskiest changes (file:line), what breaks if wrong, which test catches it | ✅ |
| 4 | **Backup before every schema migration** (`catalog-v<N>-backup.db`, last 2 kept) | ✅ |
| 5 | **Third-party notices** (1.0 item): every Rust crate and npm package with its licence text, in the installer and Settings → About | ✅ |
| 6 | Process: acceptance examples first (owner approves), no stacked branches, CI is the source of truth | ✅ |
| 7 | **Version 1.0.0** (the 1.0 list is complete); tagging and publishing are the owner's | ✅ |
| 8 | Owner (before merging): **changeable hotkeys** in the ? sheet (linked from Settings → Keyboard); Save gets Q (ADR-0031) | ✅ |
| 9 | **H brings the bar back** in every window: large, compact and the mini player | ✅ |
| 10 | **Bug fixed:** saving reshuffled the slides; the order is now stable, so the image stays | ✅ |
| 11 | **Translucent electronics** holds 8 channels, no images: the preview now lists channels inside to add (ADR-0004 kept) | ✅ |
| 12 | **Save as:** Windows Save dialog (Rust side, no page permission); a note names the folder until its × | ✅ |
| 13 | **App icon** from the owner's drawing (vector, a bolder version for 16–32 px); `npm run icons` | ✅ |
| 14 | **Portable folder** (`npm run portable`): move it to Apps, then "Add shortcuts.cmd" (Desktop + Start menu) | ✅ |
| 15 | Owner: **the ⌃ arrow covered the grid**; in compact windows the tap layer covered grid images | ✅ |
| 16 | Owner: **the source disappears** as the window shrinks (credit line cut the source; Minimal hid it) | ✅ |
| 17 | Owner: **fewer bar buttons**, "art parts together": Practice menu (session, grid, aids); ⋯ for image actions | ✅ |

Acceptance (rows 15–17), each a layout-test check or snapshot state:
- Grid view with the bar hidden: no thumbnail sits under the ⌃ arrow; compact grid: tapping a thumbnail opens it.
- Any window size and layout with an image: the source ("Cleveland Museum of Art", "Are.na") is fully visible.
- No control is covered by another element at any tested size, 1040 px (just above compact) included.
- The bar has 13 buttons instead of 17; N, W, L, R and right-click still work; ⋯ opens the image menu above it.

### Work item 25: your own themes; Pine & coral (`feat/0025-custom-themes`)

| # | Work | Status |
|---|---|---|
| 18 | Owner: "a method that takes hex codes to create own custom theme (as many as you want)" | ✅ |
| 19 | Owner: "a theme with pine, cream and coral" (built in) | ✅ |

Acceptance (rows 18–19):
- Settings → Look → New theme: name "Night shift", background #101418, panel #182028, text #e8e8e8, accent
  #ffb000 → Save: the app recolours at once and "Night shift" sits with the built-in themes; a second theme can
  be added the same way.
- Hex can be typed (`#ffb000` or `ffb000`) or picked; anything else isn't accepted.
- Text that would be hard to read (under 4.5:1 on the background or panel) is named and Save waits; muted text
  and links are adjusted for you, and the area behind the image stays a neutral grey.
- Edit and Delete work; deleting the theme in use falls back to Studio. A hand-edited `ui.json` can't inject CSS.
- Theme "Pine & coral": pine background, cream text, coral accent; passes the layout test's contrast check.

### Session 18: finish 1.0 items 3, 4, 5 (work item 22, `feat/0022-finish-1-0`, stacked on #21)

Owner: "build 3, 4, 5. Then give full commands for merge." One PR, a commit series per item.

| # | Work | Status |
|---|---|---|
| 3a | **Remember where you were:** topic, page, image, study aids (restored at launch) | ✅ pushed |
| 3b | **Session clock:** large ring (or small, or hidden); a flash on each new pose for quiet rooms | ✅ pushed |
| 3c | **View comfort:** image fades in once loaded (no blank flash); **surround** picker (5 neutral greys); **Undo** on hide, mark and un-♥ | ✅ pushed |
| 3d | **First run:** "What are you drawing today?" with topic choices | ✅ pushed |
| 4a | **Museum label:** creator, date, medium, dimensions, credit line; **CC0** or "© creator" badge (schema 9; 1,986 of 1,992 labelled live) | ✅ pushed |
| 4b | **Sharper museum images:** Cleveland's 3,400 px print on large windows (900 px web otherwise) | ✅ pushed |
| 5a | **Grid view** of any view (click to play from there) | ✅ pushed |
| 5b | **Search** over titles, descriptions and creators; a **Saved** view | ✅ pushed |
| 5c | **Rename and remove topics** in the app | ✅ pushed |
| 6 | ADR-0029, review 0022, docs, v0.11.0, PR #22; full merge commands for #16–#22 | ✅ pushed |

### Path to 1.0 (owner, session 15: "close to complete; let's complete it")

Claude's recommended order, one PR each. Updated after the art review (session 16): craft before breadth.
1. ~~**Practice tools**~~ ✅ #20.
2. ~~Road to 1.0 essentials~~ ✅ #21 (values, effects, content, log, updates, release pipeline, a11y gates).
3. ~~**Session craft and view comfort:**~~ ✅ #22. large timer ring (hideable), visual flash cue, crossfade after
   `decode()`; surround picker (5 neutral steps); remember topic, position, plan and aids; Undo toasts; first run
   "What are you drawing today?" (DA-13, DA-6, DA-14). (The single-key switch shipped in #21.)
4. ~~**Museum label and sharpness:**~~ ✅ #22. tombstone label (creator, *title*, date, medium, dimensions, credit line),
   CC0 / "rights belong to the creator" badges; Cleveland print (3,400 px) on large windows (DA-11, DA-12).
5. ~~**Browse:**~~ ✅ #22 (still open: drag to reorder playlists, search across channel names). Grid view, a search box over the existing index, a Saved view, rename and remove topics.
6. **Local folders** as a source; hide a whole channel (DA-15).
7. **Desktop finish:** tray icon, start with Windows, `lemuse backup`; Save provenance sidecar (source, creator,
   licence).
8. ~~**1.0 release:**~~ third-party notices ✅ work item 23 (ADR-0030); version 1.0.0. Owner: tag v1.0.0 and publish the
   draft the release workflow makes (docs/release.md). Unsigned by decision (Q24). The Tauri auto-updater moves to
   1.1 (ADR-0028 §2).

### After 1.0 (1.1 candidates, owner picks)

- Local folders as a source; hide a whole channel (DA-15).
- Tray icon, start with Windows, `lemuse backup` (whole library); the Tauri auto-updater.
- Guarded engineering, next steps (ADR-0030): mutation testing (cargo-mutants, Stryker); an independent AI
  reviewer with only the diff; a separate bot account for AI commits (A-4).
- Search across channel names; drag to reorder playlists.
- An automated check for the bar key (H) in compact and mini windows (review 0023 D-153).

## Roadmap

Each release is one or two PRs and goes through the review loop ([CLAUDE.md](../CLAUDE.md)). The order is
Claude's recommendation; the owner can reorder.

### v0.7: Mini player and kept links (PR #12, ADR-0016)

- [ ] Mini player: borderless, always-on-top, any monitor, remembered size and place
- [ ] Image link fallbacks; Copy link; `lemuse export-links`

### v0.7.1: Whole channels, auto refresh, JSON (PR #13, ADR-0017)

- [x] Channels load in full across refreshes; a just-added channel reads up to 5,000 items at once
- [x] Auto refresh while the app runs (60 min); `--json` on every CLI command (docs/automation.md)

### v0.7.2: Dashboard, sheets, mini player v2 (PR #14, ADR-0019, ADR-0021)

- [x] `lemuse serve` (read-only page + JSON API, 127.0.0.1 + token); `lemuse sheet` (print to PDF); `sync --full`
- [x] Mini player v2: image fills it, tap for the bar, ☰ menu
- [ ] Next: start the dashboard from Settings; webhooks; live events; a Sheet button in the app

### v0.8: Save and sign in (finishes M1)

- [x] **Save** the original of the current image into `views/<topic>/`, with a "saved" mark; download host
      allow-list (A-37); retries (D-2) (#17, ADR-0022). Streaming download with hash-on-write (D-1) still open
- [ ] **Are.na token** in Windows Credential Manager (Settings field + `lemuse auth set|clear`):
      private channels, and 120 reads/min instead of 30
- [x] **Channels you follow** in Find channels (#19, ADR-0024)
- [ ] **Load more:** fetch a channel's next pages when a slideshow runs low (ADR-0007 #3, D-23)
- [x] Single-instance app (a second launch focuses the first window) (#19)
- [x] Error codes, error pages, a responsive window, About (#19, ADR-0024)

### v0.9: Browse and organize (M2)

- [ ] **Grid view** of any view or playlist (virtualized contact sheet); click an image to play from there
- [ ] **Search box** over titles and descriptions (the FTS index already exists)
- [ ] **Saved view:** everything you've saved, across topics
- [ ] Rename and remove topics in the UI; reorder playlists by drag
- [ ] **Smart playlists:** a saved filter (topic + categories), kept up to date automatically
- [ ] Fix a wrong category by hand (D-54); shuffle across all pages (D-53); consistent "newest first" (D-15)

### v0.10: Practice tools (drawing-focused)

- [x] **Timed sessions** with a summary; pauses, skips, back, Resume (#20, ADR-0025)
- [x] **Study aids on the image:** mirror, upside down, greyscale, values 2–5 + balance, squint, grids (#20).
      Still open: zoom and pan to a detail; exact L* / auto-threshold (needs a CORS check on image hosts)
- [ ] **Compare:** two to four images side by side
- [x] **♥ Favourites** playlist (#20) · [ ] remember what you've seen to avoid repeats
- [ ] **Practice log** (only if Q28 = yes): a forgiving weekly log, hideable, never a streak chain
- [ ] **Daily set:** a fresh 20 from your topics each day

### v0.11: iPhone and automation (ADR-0016)

- [ ] **iPhone web app** (Home Screen, Safari; same UI, direct Are.na and museum calls; library file or QR
      code from the desktop). Hosting on GitHub Pages needs the owner's OK (Q18)
- [ ] **Local dashboard page** `lemuse serve` (127.0.0.1 + token, read-only) for OBS, Home Assistant, a wall
      screen
- [ ] **Webhook on refresh** (Discord, Slack, Home Assistant); JSON from every CLI command
- [ ] **New sources, one per PR (ADR-0018):** local folders, Wikimedia Commons, The Met, Smithsonian Open
      Access, Poly Haven (Pinterest: Q20 = no; clip pins into Are.na)

### v0.12: Web and mail (ADR-0020, ADR-0021)

- [ ] **LeMuse Web, stage 1:** the static, local-first web app on the friend's domain (Q21); also the iPhone app
- [ ] **Daily mailer:** `lemuse mail` via your own mail provider (Q22); optional PDF attachment
- [ ] Later stages (accounts and sync, hosted features) only after talking to Are.na (Q23)

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
| Q21 | Host LeMuse Web (stage 1, static, no user data) on the friend's domain? Which name, and who runs the server? | **Open** (ADR-0020); supersedes Q18 if yes |
| Q22 | Which email account sends the daily mailer (app password in Credential Manager)? | **Open** (ADR-0021) |
| Q23 | Contact Are.na before a public stage 2 or any paid tier? | **Open**, recommended yes (ADR-0020) |
| Q24 | Signing identity for the installer: SignPath Foundation (free, SignPath named as publisher) or an OV certificate (~$150–300/yr, your name)? | ✅ **No SignPath** (2026-11-19). Ship unsigned: SHA256SUMS + build attestation, and the SmartScreen note in the release. An OV certificate can be added later in the workflow's Sign slot |
| Q25 | Auto-update (Tauri updater needs a permanent private key) or manual updates via GitHub Releases / winget? | ✅ (2026-11-19) "How hard? At least detect new versions." Update check built (#21); the updater is one PR after the first published release (ADR-0028 §2) |
| Q26 | Run the "LeMuse" trademark search (USPTO, EUIPO, UKIPO; classes 9 and 42) before 1.0 branding? | ✅ "Sure; likely will use regardless." Desk search clean (docs/product/name-check.md); formal search only before paid distribution |
| Q27 | Nudity default: hide by default with a per-topic opt-in, or show all with a hide action? | ✅ "Yes, needs a nudity sensor": hidden by default, text sensor + your marks (#21, ADR-0027) |
| Q28 | Keep any practice history (a local log) at all? | ✅ Yes: local log, weeks not streaks (#21) |
| Q29 | Conduct reports: GitHub's private reporting form (current), or another contact? | ✅ Good as is |
| Q13 | How should handoff commands look? | ✅ Comment on its own line **above** each command, never trailing, so a whole line copies cleanly. PRs describe What / Why / How + checklist |

## Deferred findings register

| ID | From | Finding | Planned in |
|---|---|---|---|
| D-1 | Review 0001 r1 | Downloads buffered fully in memory; large CAD files need streaming | M1 |
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
| D-42 | Review 0008 | npm audit exception for picomatch GHSA-fc5q-39xc-vjpf (dev-only, no fixed release) | Re-check by 2026-12-15; the gate fails on expiry |
| D-53 | Review 0009 | Shuffle mixes the current page only | M2: shuffle across pages (random order in SQL) |
| D-54 | Review 0009 | Word-based categories mislabel some images; untitled images rely on channel names | M2: manual corrections; later maybe a local image model (ADR-0015 option B) |
| D-75 | Review 0013 | The installer doesn't ship `lemuse.exe` (needed for Task Scheduler) | v0.8: bundle the CLI as a sidecar |
| D-78 | Review 0014 | The dashboard page loads the newest 300 per topic | Page through `/api/v1/slides` |
| D-80 | Review 0014 | The app doesn't start the dashboard; the token isn't kept between runs | Settings switch; token in Credential Manager (v0.8) |
| D-94 | Review 0017 | Save Are.na attachments (STEP, DXF, PDF) | With a file-type allow-list |
| A-50 | Review 0010 | CI actions pinned to Node 20 releases (deprecated); ubuntu-latest moving to Ubuntu 26 | Next CI touch: bump pinned SHAs (14-day cooldown) |
| A-39 | Review 0009 | In-app Are.na search needs Premium | Only if the owner buys Premium (Q10 = no) |
| A-108 | Review 0020 | Favourites is found by its name | Browse PR: a `role` column if renames bite |
| DA-6, DA-13, DA-14, DA-17 | Review 0020 | Surround picker; timer ring, flash cue, crossfade; first run, remember position; shortcut switch | Path to 1.0 #2 |
| DA-11, DA-12 | Review 0020 | Cleveland 900 px images; museum label | Path to 1.0 #3 |
| DA-15 | Review 0020 | Hide a whole channel | Path to 1.0 #6 (hide image and nudity done in #21) |
| A-121 | Review 0021 | Image-model nudity sensor | Only if it fits the installer budget and needs no stored images (ADR-0027) |
| ADR-0028 §2 | Review 0021 | Tauri auto-updater | After the first published release; key in Actions secrets |
| ADR-0026 | Review 0021 | Diagonal strokes, stroke size, exact L* / auto-threshold (CORS check) | Session craft PR |
