# Plan

**Product:** LeMuse. A Windows app that plays a **stream or slideshow of reference images on a topic** for
drawing, design and CAD practice. Topics are fed by Are.na channels you choose and free museum collections.
Images stream from the source; only Save writes files.

**Where we are:** **v1.0.0** is tagged (2026-11-20). Since then `main` has the calmer bar (#5) and your own
themes with Pine & coral (#6). Work item 26 (this branch) adds zoom, a tray presence and a scrolling grid, and
makes the next release **1.1.0**. Finished work lives in [PROGRESS.md](PROGRESS.md), the reviews and the
CHANGELOG; this file holds only open work, decisions and the findings register.

**How work reaches `main`:** Claude commits on one branch per work item; the owner pushes it, opens the PR from
the compare link, reviews (Files changed, CI, the test installer) and clicks **Squash and merge**. `main` is
locked by a ruleset. One branch at a time: the next starts after the merge.

## Now: work item 26, zoom, presence, a scrolling grid (`feat/0026-zoom-presence`)

Owner (2026-11-23): "Repair the internal state, run full analysis and/or audit using /deep-research. Find more
imagery inputs, web app presence (a friend is interested in hosting; plan a simple greyscale/inverter drawing
helper web app, more accomplished and better at sellability). 1. Add zoom 2. start presence 3. scrollable grid
view. During research look into cool features competitors and other open-source projects have introduced."

| # | Work | Status |
|---|---|---|
| 1 | **Repair the internal state:** CHANGELOG split at 1.0.0; this PLAN trimmed to open work; stale findings closed (D-42, DA-6/11/12/13/14/17, A-17, A-19); PROGRESS fixed; version **1.1.0** everywhere, checked by a test; the build's commit in Settings → About and the portable README (the stale-portable miss) | ✅ |
| 2 | **Zoom** (ADR-0033): wheel or pinch toward the pointer, drag to pan, double-click 2.5× / fit, `=` `-` `Z`; grid lines zoom with the image; the sharpest stored size loads while zoomed | ✅ |
| 3 | **Presence** (ADR-0033): tray icon (click shows LeMuse; menu: show, next, play/pause, mini player, refresh, quit); **start with Windows** (opt-in, starts in the tray, per-user key, self-heals a moved portable folder); **keep running in the tray when closed** (opt-in) | ✅ |
| 4 | **Scrolling grid:** scrolls through the whole view, not just one page of 500; opens at the current image; three thumbnail sizes; arrow keys and Enter | ✅ |
| 5 | A-50: CI actions off the deprecated Node 20 releases | ✅ |
| 6 | Research (5 tracks): new image inputs, a value-study web app (market, build, hosting, selling), competitor and open-source features → report, then the 1.2+ plan below | ✅ |
| 7 | ADR-0033, review 0026, PR doc, user guide, audiences | ✅ |

Acceptance (owner to approve; each is a unit test, a layout-test state or a manual check in the PR):
- Zoom: wheel up over a hand in a museum image → it grows toward the pointer and the hand stays under it; drag
  pans but never past the image's edge; `Z` or double-click returns to fit; the next image opens at fit.
- Zoom with Mirror and a 4 × 4 grid on: the grid lines stay on the same features of the image while zooming.
- Tray: closing LeMuse with "Keep running in the tray" off quits as before; with it on, the window hides and the
  slideshow keeps going; a click on the tray icon brings it back; Quit in the tray menu quits.
- Start with Windows on → `HKCU\…\Run\LeMuse` = `"<this LeMuse.exe>" --tray`; off → the value is gone; with the
  portable folder moved, the next launch points the entry at the new place.
- Grid on a topic of 1,200 images: scroll to the bottom and images 501–1,200 follow without a page menu; click
  image 900 → it plays from there; reopen the grid → it opens at image 900.
- Settings → About shows `1.1.0 · build <commit>`; a test fails if `Cargo.toml`, `package.json` and
  `tauri.conf.json` disagree on the version.

## Next: 1.2 "your own references" (recommended order; owner picks)

From the gap audit ([report](../reports/LeMuse%20post%20launch%20gap%20audit.md)) and this round's research
([report](../reports/LeMuse%20web%20app%20sources%20and%20features.md)). One PR each.

1. **Memory mode** in sessions: look, hide, draw, compare (no major timer has it).
2. **Local folders** read in place (one chosen folder at a time; skip OneDrive cloud-only files) and **hide a
   whole channel** (DA-15).
3. **Save provenance:** credit and licence next to each saved file (XMP in JPEGs, a sidecar for all); drag an
   image out to Krita or PureRef; "Show in folder". Needs the owner's "an export counts as a Save" rule.
4. **`lemuse backup` / restore** (`VACUUM INTO` + `lemuse.toml` + `ui.json`), and a redacted "Copy diagnostics".
5. **Themes that move:** Auto picks your light and dark theme; share or import a theme as a short string;
   Windows contrast themes (`forced-colors`); a "why the stage stays grey" note.
6. **What's new** after an update, from text bundled with the release.

## Later: 1.3 and beyond

- **Sources, one per PR (ADR-0018):** SMK (no key, IIIF, PD filter), The Met (its v1.1 search; v1 retired on
  1 Oct 2026), Wikimedia Commons (standard thumbnail widths only), Smithsonian (free key), Poly Haven, and the new
  candidates in this round's report. Check each image host in a normal browser first (the AIC lesson).
- **Practice:** measuring overlays (plumb, angle, proportion ruler), an EyeDropper colour sampler with value
  readout (check WebView2 first), a perspective finder, "draw it again" revisits, design prompt cards, class
  schedules with breaks.
- **Desktop:** the Tauri auto-updater (after backup; never for the portable build), winget, set saved images as
  the wallpaper slideshow.
- **Web:** the value-study web app plan (ADR-0034, proposed); hosting and selling are owner decisions (Q21, Q30,
  Q31).
- Search across channel names; drag to reorder playlists; smart playlists; compare two to four images; a daily
  set; avoid repeats; webhooks; start the dashboard from Settings; load more lazily (D-23).
- Guarded engineering, next steps (ADR-0030): mutation testing, an independent reviewer with only the diff, a
  bot account for AI commits (A-4); an automated check for H in compact and mini windows (D-153).

## Not planned (decided, with reasons in the reports)

A PureRef-style board; colours sampled from the image for the app's chrome; automatic palette extraction (no
CORS on Cleveland's CDN); camera capture; streaks; Harvard, Science Museum Group (NC-SA), Library of Congress
(CAPTCHA) and multi-host aggregators as sources; Widgets, lock screen and the Store while unsigned; Pinterest
(Q20); a native iPhone app (Q19).

## Owner decisions

| # | Question | Answer |
|---|---|---|
| Q1 | Tauri 2 + Rust core instead of C++/Qt? | ✅ **Approved.** ADR-0001 accepted |
| Q2 | Can channel images be displayed without mass downloading? | ✅ **Yes.** Streaming chosen channels is the API's intended use (ADR-0007). Before public distribution: register an OAuth app + courtesy note to help@are.na |
| Q3 | GitHub repo | ✅ **https://github.com/OopsieLazy/LeMuse** (public) |
| Q4 | Name | ✅ **LeMuse** (2026-11-17; was ServeNSurf) (ADR-0010) |
| Q5 | Licence | ✅ **MIT** |
| Q6 | Are.na tier | ✅ **Free.** 120 reads/min with a token, 30 as guest; no search API |
| Q7 | Library location | ✅ `%USERPROFILE%\Pictures\LeMuse` |
| Q8 | How is a "topic" defined? | ✅ **By subject**, fed by Are.na channels + museum keyword search + other free sources (ADR-0008) |
| Q9 | Accept the proposed ADRs? | ✅ Accepted on merge |
| Q10 | Are.na Premium? | ✅ **No.** Free sources only |
| Q11 | Channels the owner follows? | ✅ Listed; names not repeated in public notes (A-28) |
| Q12 | Layout of PR #3 | ✅ Liked; the default "Studio" layout |
| Q13 | How should handoff commands look? | ✅ Comment on its own line **above** each command. PRs: What / Why / How + checklist |
| Q14 | Generic-name channel matches | ✅ Right; the owner adds the rest with Add channel |
| Q15 | Read-only git for the admin-review hook? | ✅ **No**; it reads the snapshot file |
| Q16 | Copy playlists to Are.na channels? | ✅ Not needed for now |
| Q17 | How does work reach `main`? | ✅ PRs on github.com, squash-merged by the owner; `main` locked. Since session 19 the owner pushes (ADR-0030) |
| Q18 | Publish the iPhone web app on GitHub Pages? | **Open** (ADR-0016). Research 2026-11-23: GitHub Pages bans running a business, so not for a paid app; superseded by Q21 if that is yes |
| Q19 | Native iPhone app? | ✅ **No.** The iPhone gets the web app |
| Q20 | A Pinterest developer app? | ✅ **No.** Clip pins into Are.na |
| Q21 | Host a LeMuse web app on the friend's domain? Which name, who runs the server? | **Open.** Recommendation (ADR-0034): a subdomain CNAME to a host account **the owner** holds (Cloudflare), a short written agreement with the friend |
| Q22 | Which email account sends the daily mailer? | **Open, parked** (ADR-0021) |
| Q23 | Contact Are.na before a public stage 2 or any paid tier? | **Open**, recommended yes. Not needed for the value-study web app (it uses only your own images) |
| Q24 | Signing identity | ✅ **Unsigned** with SHA256SUMS + attestation (2026-11-19) |
| Q25 | Auto-update? | ✅ Update check built; the updater after the first published release (ADR-0028 §2) |
| Q26 | "LeMuse" trademark search | ✅ Desk search clean; a formal search only before paid distribution |
| Q27 | Nudity default | ✅ Hidden by default, text sensor + your marks |
| Q28 | Keep a practice history? | ✅ A local log, weeks not streaks |
| Q29 | Conduct reports | ✅ GitHub's private reporting form |
| Q30 | The value-study web app: its name, and is it MIT like LeMuse or a separate licence for its new code? | **Open** (ADR-0034). Code already published stays MIT either way |
| Q31 | Sell it how? Free with optional support (recommended), pay-what-you-want, or a paid unlock; which payment provider | **Open** (ADR-0034). Lemon Squeezy closes new sign-ups (Nov 2026); see the report |

## Deferred findings register

| ID | From | Finding | Planned in |
|---|---|---|---|
| D-1 | Review 0001 r1 | Downloads buffered fully in memory; large CAD files need streaming | 1.2 (Save provenance) |
| D-3 | Review 0001 r1 | A partially failed block leaves orphan objects | Later (`lemuse verify`) |
| D-5 | Review 0001 r1 | Renamed titles leave stale view files | Later |
| D-12 | Review 0001 r2 | The CSP pins one CloudFront hostname for originals | Load errors skip the slide; surface them in the UI |
| A-4 | Review 0001 r1 | Review gates are procedural until a bot account exists (ruleset and deny rules exist) | Guarded engineering, next steps |
| A-5 | Review 0001 r1 | Asset scope hardcoded to `$PICTURE/LeMuse/**` | 1.2 (local folders) |
| A-6 | Review 0001 r1 | Removed remote items are invisible to the watermark walk | Later |
| D-15 | Review 0002 | `slides()` "newest first" is loose across sources (mixed timestamp formats) | Later (normalize to UTC) |
| D-18 | Review 0002 | AIC images sit behind a Cloudflare challenge for non-browser clients | Held back; enable only if it works without workarounds |
| D-23 | Review 0003 | A refresh reloads the active topic from slide 1 | Later (`load_more` appends) |
| D-30 | Review 0005 | The review snapshot can lag one tool call | Mitigated: the agent blocks on a stale snapshot |
| D-33 | Review 0006 | Auto-hide in docked layouts re-fits the image when the bar hides | Accepted |
| A-11 | Review 0002 | Starter Are.na channels are third-party curated and may change | Owner review |
| D-53 | Review 0009 | Shuffle mixes the current page only | Later: random order in SQL |
| D-54 | Review 0009 | Word-based categories mislabel some images | Later: manual corrections |
| D-75 | Review 0013 | The installer doesn't ship `lemuse.exe` (needed for Task Scheduler) | With the updater (sidecar) |
| D-78 | Review 0014 | The dashboard page loads the newest 300 per topic | Page through `/api/v1/slides` |
| D-80 | Review 0014 | The app doesn't start the dashboard; the token isn't kept between runs | Later |
| D-94 | Review 0017 | Save Are.na attachments (STEP, DXF, PDF) | With a file-type allow-list |
| A-39 | Review 0009 | In-app Are.na search needs Premium | Only if the owner buys Premium (Q10 = no) |
| A-108 | Review 0020 | Favourites is found by its name | A `role` column if renames bite |
| DA-15 | Review 0020 | Hide a whole channel | 1.2 |
| A-121 | Review 0021 | Image-model nudity sensor | Only if it fits the installer budget and needs no stored images |
| ADR-0028 §2 | Review 0021 | Tauri auto-updater | 1.3; key in Actions secrets |
| ADR-0026 | Review 0021 | Diagonal strokes, stroke size; exact L* / auto-threshold (no CORS on Cleveland) | Later |
| D-153 | Review 0023 | No automated check for the bar key (H) in compact and mini windows | Guarded engineering, next steps |
