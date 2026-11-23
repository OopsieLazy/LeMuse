# Competitive landscape 2026: reference-image and drawing-practice apps, and LeMuse's feature gaps

Research date: 2026-11-21, with a capped budget of about 17 web calls. This builds on `research_notes/LeMuse design and art review/reference_apps.md` and `practice_tools.md` (2026-11-19) and does not repeat them. Where a matrix cell relies on those notes it is marked *(prior)*, and the source is cited there.

**About the sources:**
- Many comparison pages (refern, Ktlyst, Kosmik, Soleil Clusters, DrawGestures) are **published by competitors**. They are flagged as vendor sources.
- Reddit could not be retrieved directly. A Reddit-targeted search returned nothing relevant, so user demand comes from tool forums, Play Store and itch.io comments, GitHub issues and changelogs.
- CG Channel (ArtDeck) and Ktlyst returned 403/503 errors, so those items come from search snippets only.
- No personal data about the LeMuse owner was used in any query.

## 1. What the leading tools offer: feature matrix, table stakes and differentiators

### Takeaway
By late 2026 the timer tools have converged on one baseline. Line of Action's March 2025 rebuild added auto-pause while images load, warning sounds, a larger resizable timer, post-session review and drawing from your own playlists. LeMuse already matches or exceeds that baseline.

The gaps that remain are on the **board/library side**:
- zoom/pan;
- local folders as a pool;
- colour sampling;
- notes;
- drag-out.

The only new 2025–2026 entrants found are board or library tools (ArtDeck, refern, Ktlyst, DrawGestures Pro), not timers. Eagle V5 is still in development and explicitly avoids subscriptions.

### Cited Findings

**New or changed since the prior notes**
- **Line of Action rebuilt its tools on 2025-03-29**. The new tools have:
  - auto-pause while images download and display;
  - a choice of a specific model;
  - a pose-count limit without class mode;
  - custom intervals in seconds or minutes;
  - optional low-timer warning sounds;
  - "better image review after a session";
  - drawing only from your own playlists or purchased bundles;
  - a larger, resizable timer;
  - a class-mode pop-up when the pose length changes;
  - remembered settings for logged-in users;
  - rotating official challenge playlists;
  - an orientation filter.

  — [LoA: A new version of the tools is now online (2025-03-29)](https://line-of-action.com/article/a-new-version-of-the-tools-is-now-online)
- LoA subscriptions start at $1.49/month, and the Master tier is $4.99/month. Basic features stay free, and newer features go to subscribers — [LoA Subscriptions](https://line-of-action.com/membership). Ads for non-subscribers were introduced in the 2018 relaunch, along with goals, progress tracking, achievements, a study store and sketch critique uploads — [LoA: next evolution (2018-09-07, older)](https://line-of-action.com/article/welcome-to-the-next-evolution-of-line-of-action)
- **Eagle V5** is "in active development" and the post is "not a release announcement".
  - Planned foundations: library separated from the UI (multiple windows on one library), accounts and permissions, multi-user and multi-device access (browser, iPad), an audit log, custom fields, and AI agent access with traceability.
  - V5 is "not being designed around a subscription service", and libraries can stay on the user's own storage.
  - AI Search ships as a V4 plugin.
  - The post is undated; related posts are from March 2026.

  — [Eagle V5 development update](https://eagle.cool/blog/post/eagle-v5-development-update); [Eagle 4.0 Build 21](https://eagle.cool/blog/post/eagle4-build21)
- **PureRef**:
  - Current version 2.1.3 (2026-06-03).
  - Personal licence: custom amount, with $0 allowed for personal, hobby or educational use.
  - Small Business: $49 one-time. Business: $10/seat/month ($8 billed annually).

  — [refern: best free PureRef alternatives (vendor, updated Oct 2026)](https://www.refern.app/blog/best-free-pureref-alternatives-2026). The handbook confirms Always on top, Always on top of a single application, Transparent to mouse and application opacity — [PureRef handbook: features](https://www.pureref.com/handbook/features/)
- **BeeRef** has had no release since **0.3.3 (2024-05-05)**, which added a colour sampler (copies hex), scroll-wheel panning and configurable mouse controls. Earlier releases:
  - 0.3.2 (2024-01): greyscale, opacity, editable shortcuts;
  - 0.3.0 (2023-11): crop;
  - 0.2.0 (2021): text notes.

  40 issues are open — [BeeRef releases](https://github.com/rbreu/beeref/releases)
- **refern** (vendor):
  - desktop board for Windows, macOS and Linux;
  - $35 one-time after a 30-day trial (was $30 before 2026-08-08);
  - indexes files in place;
  - full-text, operator and hierarchical-tag search;
  - colour search, visual-similarity search and duplicate detection;
  - version 1.11.

  — [refern (vendor)](https://www.refern.app/blog/best-free-pureref-alternatives-2026); [search snippet](https://www.ktlyst.art/blog/pureref-vs-beeref-vs-refern)
- **ArtDeck** (new, August 2026) is a $6 iPad/macOS reference-board app by Alexandre Alves. It supports animated media and video, unlike PureRef. *(Search snippet only; the article returned 403.)* — [CG Channel, Aug 2026](https://www.cgchannel.com/2026/08/artdeck-is-a-new-alternative-to-pureref-that-supports-video/)
- **Ktlyst** is a browser-based, cloud-synced board with iPad support. Its vendor page notes that PureRef has no official iPad app *(snippet)* — [Ktlyst vs PureRef (vendor)](https://www.ktlyst.art/blog/why-ktlyst-stands-out-among-pureref-and-other-competitors)
- **DrawGestures** (vendor; iOS, Android, web):
  - free core with "No ads. No email. No usage caps.";
  - **local folders that work offline**;
  - 30 s to 10 min timers with auto-advance and shuffle;
  - Pro from $4.99/month adds Pinterest, Google Drive and Dropbox imports.

  It describes LoA and QuickPoses as "browser-only" with their own libraries — [DrawGestures guide (updated 2026-11-11, vendor)](https://drawgestures.com/guides/free-gesture-drawing-app-and-website)
- **GestureFlow** (Windows desktop, Cubebrush; vendor copy, undated):
  - four modes including Quick Sketch;
  - a **Proportion Tool** (mark a base unit such as a head and measure against it);
  - a reference library with custom presets of any number of **folders**;
  - **zoom and pan**, a custom grid and a mirror;
  - tracking of practice time, sessions, references drawn and a **streak**.

  — [Cubebrush: GestureFlow](https://cubebrush.co/alwayshungry/products/ae75sq/gestureflow-gesture-drawing-reference-study)
- Small Windows timers show the same pattern:
  - itch.io "Gesture App" v2 added **zoom & pan on image** and loads images from a folder — [itch.io Gesture App](https://bmswift.itch.io/gesture-app);
  - QuickSketch (Windows/Linux) loads "any folder with 2-level subfolder support" — [itch.io QuickSketch](https://devaibou.itch.io/quicksketch);
  - "Timed Sketches" is another Windows/Linux itch.io tool — [itch.io Timed Sketches](https://heavyliftingindustries.itch.io/timed-sketches)
- **Memory-drawing** apps:
  - "Peek & Check" (iPad) uses opacity, then an instant hide of the reference, to test accuracy *(snippet)* — [App Store listing](https://apps.apple.com/us/app/id6753733986);
  - "refs" (iPad) imports your own images to draw with a timer *(snippet)* — [App Store: refs](https://apps.apple.com/ca/app/refs/id6758319961);
  - Proko teaches a "Visual Memory Games" project: study, hide the reference, draw from memory — [Proko: Visual Memory Games](https://www.proko.com/course-lesson/project-visual-memory-games)

**Feature matrix**

Key: ✓ = documented, ✗ = documented absent, ? = not verified, *(p)* = from prior notes.

| Feature | PureRef 2.1 | BeeRef 0.3.3 | Eagle 4 | refern | LoA (2025) | Art in Context | GestureFlow | DrawGestures | Posemaniacs | **LeMuse** |
|---|---|---|---|---|---|---|---|---|---|---|
| Timed class mode | ✗ (slideshow interval only) *(p)* | ✗ | ✗ | ? | ✓ | ✓ *(p)* | ✓ | ✓ (timers) | ✓ *(p)* | ✓ |
| Timer starts on load / auto-pause | n/a | n/a | n/a | n/a | ✓ | ✓ *(p)* | ? | ? | ? | ✓ |
| Warning sounds | n/a | n/a | n/a | n/a | ✓ | ✓ *(p)* | ? | ? | ? | ? (not listed in brief) |
| Zoom / pan to detail | ✓ (canvas) *(p)* | ✓ (pan) | ✓ (viewer) | ✓ (scale) | ? | ? | ✓ | ? | n/a (3D) | **✗** |
| Local folders as pool | ✓ (load files) | ✓ | ✓ | ✓ (in place) | own playlists/bundles only | ✗ | ✓ | ✓ (offline) | ✗ | **✗** |
| Colour picker / palette | ✓ picker *(p)* | ✓ sampler | colour filter *(p)* | colour search | ? | ✗ | ? | ? | ✗ | **✗** |
| Notes | ✓ rich text *(p)* | ✓ text | ✓ (annotation, *(p)* metadata) | canvas text | ✗ | ✗ | ? | ? | ✗ | **✗** |
| Board / canvas | ✓ | ✓ | ✗ *(p)* | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | **✗** |
| Always on top | ✓ + on top of one app | ✓ | ? | ✓ | browser | browser | ? | n/a | browser | ✓ (mini player) |
| Click-through / opacity | ✓ | opacity ✓ | ✗ | ? | ✗ | ✗ | ? | ✗ | ✗ | ? |
| Proportion / measure tool | pixel coords *(p)* | ✗ | ✗ | ? | ✗ | ✗ | ✓ | ✗ | bounding box *(p)* | grids only |
| Post-session review | n/a | n/a | n/a | n/a | ✓ | ✓ *(p)* | ? | ? | 100-pose history *(p)* | ✓ |
| Streaks / tracking | ✗ | ✗ | ✗ | ✗ | goals/achievements | ✗ | ✓ streak | ? | ✗ | log, no streaks (deliberate) |
| 3D poses | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Search / tags | ✗ | ✗ | ✓ | ✓ | filters | filters | presets | ? | filters | search ✓ |
| Price | $0–49 / $8–10 seat | free GPL | $34.95 *(p)* | $35 | free + $1.49–4.99/mo | free | paid (Cubebrush) | free + $4.99/mo | free | free MIT |

Sources for cells are the findings above and the prior notes. Drag-out and multi-monitor are "not covered" for PureRef, BeeRef, Kuadro and refern in [refern's comparison](https://www.refern.app/blog/best-free-pureref-alternatives-2026), and the PureRef handbook search found no drag-out entry.

### Inferences
- **Table stakes in 2026, for timers:**
  - class mode;
  - custom intervals;
  - pause, skip and back;
  - flip and greyscale;
  - grid;
  - auto-pause on load;
  - warning sound;
  - post-session review;
  - remembered settings.

  LeMuse has all of these except possibly the warning sound; check against the app.
- **Table stakes for boards and viewers:** zoom/pan, local files, always on top, greyscale, a colour sampler and notes. LeMuse sits between the two categories and misses the board-side table stakes, above all zoom/pan.
- **Differentiators in the field:**
  - "on top of one app" and click-through (PureRef);
  - proportion tool (GestureFlow);
  - visual-similarity and duplicate search (refern, Eagle);
  - video references (ArtDeck);
  - 3D poses (Posemaniacs, Magic Poser);
  - curated, attributed CC0 museum streams (LeMuse, which no competitor does).
- Desktop timers that let you draw from a local folder (QuickPoses desktop, GestureFlow, itch.io apps, DrawGestures) are a crowded niche. A local-folder pool in LeMuse would close a gap but would not differentiate it.

### Gaps
- No primary pages were retrieved for Kuadro (status unverified), Allusion (last update April 2024 per prior notes), Milanote, Cosmos or Are.na apps, Proko's 2026 timer, SenshiStock, Figurosity, Croquis Café, Magic Poser, JustSketchMe or the Clip Studio 3D models. A targeted search returned nothing on Figurosity or SenshiStock.
- I did not confirm whether PureRef 2.1 supports dragging an image out to another app. It was requested on Polycount (undated) — [Polycount](https://polycount.com/discussion/comment/2062538) — and the handbook says nothing about it.

## 2. What users ask for and complain about

### Takeaway
The requests that recur are:
- **search** in boards (PureRef);
- **zoom** (Draw Gestures on Android);
- **local, cloud-folder and own-image pools**;
- **multi-model or multi-filter selection** (LoA);
- **paywall creep**.

Reddit threads could not be retrieved, so this evidence is forum-, store- and changelog-level.

### Cited Findings
- PureRef forum, August 2025: "So Pleeeaaaaz have a search function". refern calls search a "recurring request" but cites only this one post — [refern (vendor)](https://www.refern.app/blog/best-free-pureref-alternatives-2026)
- Draw Gestures (Android) reviewers asked for zoom, and the developer replied "We are working on the zoom feature". Reviewers reported Google Drive folder sync problems (slow loading, duplicates, incorrect sync). One reviewer complained the features are "all locked behind paywalls now" *(search summary of Play listing)* — [Google Play: Draw Gestures](https://play.google.com/store/apps/details?id=com.darkmat13r.gesturedrawing&hl=en)
- LoA 2025 comments:
  - requests to pick 2–3 models at once (the admin may make it a subscriber perk);
  - a playlist drop-down, which was added for full supporters;
  - complaints about extra clicks between pages;
  - a request for a clear exit to the homepage;
  - praise for the bigger timer, warning sounds, clean UI and load times.

  — [LoA 2025-03-29 post and comments](https://line-of-action.com/article/a-new-version-of-the-tools-is-now-online)
- A user of the itch.io Gesture App reported that some PNG/JPG files in a folder would not load — [itch.io Gesture App](https://bmswift.itch.io/gesture-app)
- A zoom feature request also appears on DrawPen, a screen-annotation app (adjacent category) — [DrawPen issue #109](https://github.com/DmytroVasin/DrawPen/issues/109)
- Earlier requests (LoA 2024, Proko) are in the prior notes: bigger timer, warning sound, saved preferences, photographer filter, new categories, total session length shown up front, greyscale and upside-down.

### Inferences
- "Zoom on the reference" and "use my own images" are the two concrete asks that show up across unrelated tools.
- Users notice when free features move behind a paywall: the Draw Gestures review, and LoA's subscriber-only perks. LeMuse's free MIT status is a positioning asset.

### Gaps
- No verbatim Reddit quotes from r/learnart, r/ArtFundamentals or r/conceptart, and no Proko community posts newer than those in the prior notes. A manual Reddit pass is needed for quotable demand.

## 3. Which missing LeMuse features have the strongest evidence of demand (ranked)

### Takeaway
Ranked by evidence found, weighted for LeMuse's audiences:
1. **Zoom/pan to a detail.** It is standard in every board tool and is being added to timer apps.
2. **Local folders as a source.** QuickPoses desktop, GestureFlow, DrawGestures, LoA's own-playlist drawing, and Proko users sampling bought packs *(p)* all support it or ask for it.
3. **Colour sampler or palette.** PureRef and BeeRef ship a sampler; refern and Eagle offer colour search.
4. **Notes on an image.** PureRef and BeeRef have them.
5. **A "memory" (show-then-hide) mode.** Proko teaches it, it is niche in apps, and no major timer has it, so it is a differentiator.
6. **Drag-out / on-top-of-one-app.** PureRef has on-top-of-one-app; drag-out was requested on Polycount.
7. **Board/canvas.** This is a large build and a separate product category; pair LeMuse with PureRef or BeeRef instead.
8. **Avoid repeats, daily set and 3D.** I found little direct evidence for these.

### Cited Findings
- Zoom/pan:
  - shipped in GestureFlow — [Cubebrush](https://cubebrush.co/alwayshungry/products/ae75sq/gestureflow-gesture-drawing-reference-study);
  - added in itch.io Gesture App v2 — [itch.io](https://bmswift.itch.io/gesture-app);
  - requested in Draw Gestures, where the developer is "working on" it — [Google Play](https://play.google.com/store/apps/details?id=com.darkmat13r.gesturedrawing&hl=en);
  - BeeRef added scroll-wheel panning — [BeeRef releases](https://github.com/rbreu/beeref/releases)
- Local folders:
  - DrawGestures offers offline local folders free, and charges for cloud imports — [DrawGestures (vendor)](https://drawgestures.com/guides/free-gesture-drawing-app-and-website);
  - QuickSketch handles folders with subfolders — [itch.io](https://devaibou.itch.io/quicksketch);
  - LoA added drawing only from your own playlists or bundles — [LoA 2025](https://line-of-action.com/article/a-new-version-of-the-tools-is-now-online)
- Colour: BeeRef 0.3.3 added a colour sampler — [BeeRef releases](https://github.com/rbreu/beeref/releases); refern has colour search — [refern](https://www.refern.app/blog/best-free-pureref-alternatives-2026)
- Memory drawing: Proko's Visual Memory Games — [Proko](https://www.proko.com/course-lesson/project-visual-memory-games); Peek & Check's hide-to-test approach *(snippet)* — [App Store](https://apps.apple.com/us/app/id6753733986)
- Proportion measurement (not on LeMuse's list) is GestureFlow's "signature" tool — [Cubebrush](https://cubebrush.co/alwayshungry/products/ae75sq/gestureflow-gesture-drawing-reference-study). This is relevant to architects and CAD users.
- Drag-out: requested for PureRef on Polycount (undated) — [Polycount](https://polycount.com/discussion/comment/2062538). Drag-out is "not covered" for any board in refern's table — [refern](https://www.refern.app/blog/best-free-pureref-alternatives-2026)
- Warning sound (check whether LeMuse has it): LoA shipped it in 2025 after 2024 requests — [LoA 2025](https://line-of-action.com/article/a-new-version-of-the-tools-is-now-online)

### Inferences
- **Recommended order for LeMuse:**
  1. zoom/pan, which is cheap, table stakes and helps CAD/ID users inspect detail;
  2. local folder source, which removes the main reason to keep a second timer app;
  3. a colour sampler or 5-swatch palette, which fits the existing study-aid toolbar;
  4. a memory mode: study N seconds, hide, draw, then reveal to compare. It is cheap given the existing timer, and **no leading timer has it**;
  5. per-image notes.

  Drag-out (OS drag of the saved original) is cheap in Tauri and makes PureRef the board partner instead of building a board.
- **Not on LeMuse's list, and coming up:**
  - a proportion/measure tool (GestureFlow);
  - multi-select filters (LoA's multi-model request);
  - cloud-folder import (DrawGestures Pro);
  - video or animated references (ArtDeck).
- Avoid repeats and a daily set: LoA's "rotating official challenge playlists" ([LoA 2025](https://line-of-action.com/article/a-new-version-of-the-tools-is-now-online)) is the closest evidence for a shared daily or weekly set. I found no direct requests for avoiding repeats.

### Gaps
- There is no quantitative demand data (vote counts, survey) for any feature. The ranking is a judgement from how often each feature appears across tools and requests.
- 3D pose tools (Magic Poser, JustSketchMe, Clip Studio) were not researched this pass.

## 4. Onboarding, memory drawing, always-on-top and multi-monitor

### Takeaway
- **Always-on-top:** PureRef leads with "on top of a single application" plus click-through and opacity. Browser timers can't do this.
- **Memory drawing:** no major tool has a mode for it. It is taught (Proko) and served only by small iPad apps.
- **Multi-monitor:** no source documents specific support in any tool.
- **Onboarding:** I found no documented guided onboarding. LoA's 2025 answer is remembered settings plus a visible bigger timer.

### Cited Findings
- PureRef has Always on top, Always on top of a single application ("click a window of the application to attach PureRef to"), Transparent to mouse and app opacity. The handbook suggests combining them to trace onto a painting program — [PureRef handbook](https://www.pureref.com/handbook/features/)
- Multi-monitor is "not covered" for PureRef, BeeRef, Kuadro and refern — [refern (vendor)](https://www.refern.app/blog/best-free-pureref-alternatives-2026)
- LoA remembers settings for logged-in users and moved to a larger, resizable timer — [LoA 2025](https://line-of-action.com/article/a-new-version-of-the-tools-is-now-online)
- Memory drawing appears in Proko's teaching — [Proko](https://www.proko.com/course-lesson/project-visual-memory-games) — and in Peek & Check (iPad, snippet) — [App Store](https://apps.apple.com/us/app/id6753733986)

### Inferences
- LeMuse's mini player matches plain always-on-top. "Pin over one app" plus click-through and opacity would match PureRef. Remembering the mini player's monitor and position across launches is a cheap win, since nobody documents multi-monitor behaviour.

### Gaps
- No onboarding teardown (first-run screens, sample sessions) was found for any tool.

## 5. Where the market is moving (2025–2026)

### Takeaway
The market is moving in three directions:
- **Away from subscriptions and toward one-time or free licences:** Eagle V5 states it is not subscription-led; PureRef allows $0 for personal use; refern and ArtDeck sell one-time licences.
- **Toward AI search inside libraries, not AI-generated references:** Eagle AI Search, refern visual similarity.
- **Toward multi-device access:** Eagle V5, Ktlyst, ArtDeck on iPad.

The backlash against AI-generated images (Pinterest) is covered in the prior notes.

### Cited Findings
- Eagle V5 is "not being designed around a subscription service", with a local library and multi-device access — [Eagle V5 update](https://eagle.cool/blog/post/eagle-v5-development-update)
- PureRef has a $0 personal tier, with business seats at $8–10/month — [refern (vendor)](https://www.refern.app/blog/best-free-pureref-alternatives-2026)
- DrawGestures markets "No ads. No email. No usage caps." alongside a $4.99/month Pro — [DrawGestures (vendor)](https://drawgestures.com/guides/free-gesture-drawing-app-and-website)
- A Play reviewer complained that Draw Gestures features are now "locked behind paywalls" *(search summary)* — [Google Play](https://play.google.com/store/apps/details?id=com.darkmat13r.gesturedrawing&hl=en)
- Eagle 4 Builds 20–22 add AI search by image, semantic search and an AI Action plugin — [Eagle Build 20](https://eagle.cool/blog/post/eagle4-build20); [Build 21](https://eagle.cool/blog/post/eagle4-build21); [Build 22](https://ru.eagle.cool/blog/post/eagle4-build22)
- ArtDeck launched on iPad/macOS at $6, with video support *(snippet)* — [CG Channel](https://www.cgchannel.com/2026/08/artdeck-is-a-new-alternative-to-pureref-that-supports-video/)

### Inferences
- "Free, no account, no ads, no AI-generated images, attributed CC0 sources" is a strong 2026 position for LeMuse. Its Windows-only status is the main gap against an iPad trend that LeMuse is not built to follow.

### Gaps
- There is no market-size or user-count data for any tool. I found no 2026 Creative Bloq or Parka Blogs reviews of timer tools.
