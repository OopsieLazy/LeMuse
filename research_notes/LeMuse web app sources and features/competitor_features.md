# Competitor features 2024–2026 that LeMuse could adopt

Research date: 2026-11-23, with about 35 web calls. This builds on `research_notes/LeMuse post launch gap audit/competitive_landscape.md` (2026-11-21) and does not repeat it. Items already planned for LeMuse are left out as new findings: memory mode, local folders, measuring overlays, EyeDropper, perspective finder, drag-out, provenance on Save, backup, auto-updater, and SMK/Met sources. No personal data about the LeMuse owner was used in any query.

**About the sources:**
- refern pages are **vendor** sources. Its changelog is the most detailed primary source found, but only characters 0–100,000 of the 130,000-character page were read.
- Search returned **nothing usable** for Quickposes, Figurosity, JustSketchMe, SenshiStock, AdorkaStock, Kuadro, Ktlyst, DrawGestures (new since 2026-11-21) or Product Hunt and YouTube reactions. See the Gaps sections.
- Eagle's Build 21 post redirected (302 to en.eagle.cool) and was not re-fetched. Eagle facts come from the prior notes.

**LeMuse constraints applied in each "fit" note:**
- stream-first;
- no image cache except Save;
- no pixel reads on CORS-less hosts;
- no bot-protection workarounds;
- privacy-first, no telemetry;
- Are.na free tier (no search API, used only on channels the user lists).

---

## 1. Distinctive features in reference-board and library tools (PureRef, Eagle, refern, Milanote, Cosmos, Are.na, Pinterest, Same Energy)

### Takeaway
The new features cluster in four places:
- **keyboard-first chrome:** PureRef's command palette, refern's Shift+F presentation mode and its I-for-info key;
- **similarity and colour search:** refern, Cosmos, Pinterest, Same Energy;
- **ambient display:** Are.na Frame, Cosmos Canvas;
- **practice bookkeeping:** refern Timed Study calendar, recap and attach-your-work.

Most of the keyboard and ambient features fit LeMuse cheaply. Colour search mostly does not, because it needs pixel reads.

### Cited Findings

**PureRef**
- **PureRef 2.0** (blog post dated 2024-03-05; older than this pass):
  - a **command palette** that searches and runs commands;
  - **settings export/import** "to share a setup";
  - a settings search bar;
  - **"Always on top of"** a chosen application, so PureRef moves and minimises with it;
  - an optional title bar shown always, on mouseover, on cursor move or never;
  - GIF playback with scrubbing and frame stepping;
  - freehand drawing and annotation;
  - grouping, a hierarchy window and rich-text notes;
  - image comments "that don't need to stay visible";
  - Windows Explorer board thumbnails.

  — [PureRef blog: PureRef 2.0](https://pureref.com/blog/pureref2/)
- **PureRef 2.1** (stable release 2026-01-30):
  - drawn shapes (ellipses, rectangles, lines);
  - a background line or dot grid with snap;
  - a **recent-files overview with thumbnails and pinned favourites**;
  - six new UI languages;
  - non-destructive downscale, format change and trim ("Manage images and optimize");
  - rich-text comments;
  - **"Arrange randomly"**;
  - an experimental "Use screen color profile" setting.

  — [PureRef blog: PureRef 2.1](https://pureref.com/blog/pureref21/); release coverage [CG Channel, 2026-02-08](https://www.cgchannel.com/2026/02/pureref-2-1-is-out/), [Digital Production, 2026-02-11](https://digitalproduction.com/2026/02/11/pureref-2-1-adds-grids-lines-notes-and-control/)
- PureRef 2.1 mentions no focus mode, drag-out, colour picking, slideshow or eyedropper — [PureRef 2.1](https://pureref.com/blog/pureref21/)

**refern** (vendor, desktop for Windows, macOS and Linux, $35 one-time)

All items are from the [refern changelog](https://www.refern.app/changelog) unless marked.

- **Presentation mode:**
  - v1.10.1 (2026-10-18): Shift+F shows one file full screen on black, and the arrow keys move between files;
  - v1.10.2: open it from the right-click menu;
  - v1.12.0 (2026-11-22): video autoplay and clickable arrows.
- **Timed Study:**
  - v1.5.0 (2026-08-02): sessions run in a chosen order (name, date added, size, random);
  - v1.6.0 (2026-08-23): **session history, a calendar, statistics, "timezone-aware streaks" and a recap dashboard**, and Quick Study **remembers duration and image count per workspace**;
  - v1.8.0 (2026-09-06): **attach work to a calendar day** without completing a session;
  - v1.11.1 (2026-11-05): **press I during a timed study to show the image's tags and details**.
- **Similarity:**
  - "Find similar" with a Folder/All toggle (v1.3.1, 2026-07-06);
  - canvas "Find similar" combines visual and meaning matches (v1.9.2, 2026-09-28);
  - duplicate review with a "How alike" slider (v1.12.0).
- **Colour:**
  - pull a palette from a video frame and search by it (v1.4.0, 2026-07-19);
  - colour-match ranking (v1.10.1);
  - a colour search control in the grid toolbar (v1.12.0);
  - a colour picker with an eyedropper for colour search (v1.12.1, 2026-11-22).
- **Other:**
  - import of public Pinterest boards, including sections (v1.9.1–v1.12.0, 2026-09 to 2026-11);
  - 7-day share links (v1.9.0);
  - a read-only online library (v1.12.0);
  - tabs and undo across most actions (v1.12.0).
- refern's homepage also lists: on-device Auto Tagger models; a Clipper extension (Alt+right-click to save) that keeps the web source link; review mode to tag one file at a time by keyboard; always-on-top with click-through on Windows and macOS; the desktop app works without an account — [refern.app](https://www.refern.app/)

**Cosmos** (iOS and web; Apple Editors' Choice, 4.7/5 from 5.9K ratings, v2.66.0)
- Search by **colour, keyword or image**, including **hex codes**.
- Shared collections.
- **"Canvas"**: a full-screen, scrolling image cascade opened from Home.
- **An option to hide AI-generated content**.
- 2.45.0 (Jul 29, year not shown, probably 2026): a new search method. 2.57.0 (Sep 16): a Shop tab.
- Reviews: "the Canvas feature is genuinely so useful", "Used for 10 minutes, already so so much better than Pinterest", and praise for no ads. One reviewer asked for notes on saved items.

— [App Store: Cosmos](https://apps.apple.com/app/id1577975475). A Wix blog (undated) describes a palette tool that filters results by matching hues and suggests palettes — [Wix Studio blog](https://www.wix.com/studio/blog/cosmos-app)

**Pinterest**
- **2025-05-05:** visual search with VLM-generated descriptive labels (aesthetic, colour palette); an animated glow to select objects; a **refinement bar by colour, style or fabric**; **long-press any Pin for "Search image"**; and image-plus-text search. Limited to women's fashion in the US, Canada and UK at launch — [Pinterest Newsroom, 2025-05-05](https://newsroom.pinterest.com/news/introducing-new-visual-search-features/)
- **2024-09-24 (older):** collages made of cutouts, with remixing and video export. Collages grew 418% since the start of 2024 — [Pinterest Newsroom](https://newsroom.pinterest.com/news/introducing-new-ways-to-create-and-share-collages). Gen Z are 72% of daily collage users *(TechCrunch snippet, undated)* — [TechCrunch](https://techcrunch.com/?p=2884143)

**Are.na (2025–2026)**

Newsletter issues — [Are.na newsletter archive](https://buttondown.com/aredotna/archive/):
- 2025-12-18: new search, plus iOS and Android apps;
- 2026-04-17: search improvements;
- 2026-05-15: Are.na Frame and API updates;
- 2026-09-03: revamped homepage and Channel Walkthroughs;
- 2026-11-02: multi-select and custom URLs.

Feature details:
- **Are.na Frame** (2026-05-15) is an **open-source e-ink display that cycles through a channel** using the API. A hand-assembled batch "sold out within hours", and build instructions were published.
- The same issue (2026-05-15) also added:
  - **custom key/value metadata** on blocks, channels and connections;
  - a TypeScript SDK;
  - open-source example apps (a swimlane view built from channels);
  - **channel invite links** for collaboration.

  — [Are.na newsletter 2026-05-15](https://buttondown.com/aredotna/archive/arena-frame-api-updates-event-with-triple-canopy/)
- 2026-04-17:
  - new search for everyone;
  - an Are.na CLI;
  - iOS gains an adding flow with drafts, explore filters, **index view** on profiles, **reader mode** and collaborator editing;
  - an importer (Supporter tier first);
  - a WYSIWYG text toolbar.

  There is no visual or colour search — [Are.na newsletter 2026-04-17](https://buttondown.com/aredotna/archive/search-improvements-api-meetup-new-sticker-pack/)

**Milanote (2025)**
- 2025-07: **inline colour swatches** (a colour written in a note renders as a swatch).
- 2025-08: comments on images.
- 2025-11: inline comments, extended zoom-out, and Ctrl/Cmd+K to connect elements.

— [Milanote release notes](https://milanote.com/releases) (via search summary of the releases pages)

**Same Energy** (2021, older)
- A free, no-account visual search engine that returns images by style, mood and composition. It indexes about 19 million images from Reddit, Instagram and Pinterest.
- Image plus text refines results (gargoyles + "lion").
- An art blogger testing a Monet found more varied results than Google or Bing, but artist-name text search was weak.

— [Lines and Colors](https://linesandcolors.com/?p=15924); [PetaPixel, 2021-02-10](https://petapixel.com/2021/02/10/same-energy-is-a-visual-search-engine-that-finds-similar-photos-in-a-snap/); [Tildes](https://tildes.net/~tech/va7/same_energy_a_visual_search_engine)

**Eagle**
- V5 is still "not a release announcement", with no launch date — [Eagle V5 update](https://eagle.cool/blog/post/eagle-v5-development-update).
- A Russian-language eagle.cool page dated 2025-08-13 claims "Eagle 5.0 … AI Search, AI Action, and Eagle MCP". It **conflicts** with the official post, so treat it as unverified *(search snippet)*.

### Inferences (fit with LeMuse)
- **Presentation/focus mode** (refern) needs no new data and no network. It fits stream-first, because it only re-lays-out the current `<img>`. Effort is tiny if LeMuse's slideshow does not already offer chrome-free full screen on black.
- **"I" for info during a session** (refern) maps directly onto LeMuse's attribution data (creator, source, date, museum link). It turns mandatory attribution into a delight instead of clutter. Effort is tiny.
- **Command palette** (PureRef 2.0) suits LeMuse's growing list of study aids (values 2–9, squint, grids, hatching). It is keyboard-first and needs no network. Effort is small to medium.
- **"More like this"** without pixel reads:
  - Pixel embeddings (refern, Same Energy, Pinterest) would need image bytes, which breaks "no pixel reads on CORS-less hosts" and "no cache".
  - **Metadata similarity** fits instead: the same artist, department, date range, medium or type from Cleveland's JSON.
  - For Are.na, the API's "connections" (other channels a block appears in) is a candidate, but only one page and only on a click, per ADR-0015's on-click rule. Check whether that counts as following links to discover channels (ADR-0004). It could be a policy problem.
- **Colour search/refine** (Cosmos hex, Pinterest refine bar, refern) is the most-copied feature, but in LeMuse it needs pixels. Possible exception: museum APIs that publish colour metadata (not verified here). Rank it low.
- **Ambient mode** (Are.na Frame sold out in hours; Cosmos Canvas praised in reviews) shows demand for a reference stream as **décor/idle display**. LeMuse already streams and has a tray icon in progress. An idle or "ambient" mode (slow cross-fade, no timer, optionally on a second monitor) is a cheap step. A Windows screensaver (.scr) is a bigger one.
- **Share your setup** (PureRef settings export/import) maps onto LeMuse custom themes and topics. Export them as a file the user chooses to share. It must strip paths and the Windows user name (CLAUDE.md rules), so design the schema to hold only theme tokens and topic keywords and channel URLs.
- **Recent/pinned overview** (PureRef 2.1) suggests pinned topics with a text-only card on a start screen (previews carry metadata only).
- **Hide AI-generated content** (Cosmos) is positioning more than code: LeMuse's museum sources are pre-AI by construction. Are.na blocks can't be reliably classified, so I don't recommend a filter. Messaging such as "museum sources contain no AI images" is cheap.
- **Index view / reader mode** (Are.na 2026) is a text list of titles, creators and dates as an alternative to the grid. It is cheap, helps accessibility, and needs no images.

### Gaps
- No primary page was read for Eagle Build 21's Image Combine tool or AI search (redirect not followed).
- Cosmos's 2025 release years are not shown on the App Store page; only month and day are listed.
- I did not verify whether Cleveland's Open Access API exposes colour fields, which would decide whether metadata colour search is possible.
- Milanote items come from a search summary of the release pages, not a direct fetch.

## 2. Distinctive features in drawing-practice and pose tools (Line of Action, Proko, Croquis Café, PoseMy.Art, Magic Poser, Clip Studio, Procreate, Krita)

### Takeaway
The practice-tool side has shipped fewer novel features in 2025–2026 than the board side. The verifiable new items are:
- Clip Studio 4.0's draw-on-3D (2025-03-12);
- Procreate 5.4's eyedropper in Reference Companion (2025-09);
- refern's Timed Study bookkeeping (2026).

Line of Action's 360° turnarounds (2021) and rotating challenge playlists (2025) are the closest to "challenges" and "multi-angle" features. Croquis Café ended production in early 2026 and moved behind a $36/year membership.

### Cited Findings
- **Line of Action 360° pose viewers** (2021-11-25, older):
  - untimed turnaround viewers, about 20 poses from 3 models at launch;
  - users step through angles with forward/back buttons or arrow keys;
  - swipe on touch devices.

  In April 2025 a user could not find how to rotate (discoverability issue), and the admin linked a forum thread asking whether the viewer should record practice time — [LoA: 360° pose viewers](https://line-of-action.com/article/360-pose-viewers)
- LoA's 2025 rebuild items (rotating official challenge playlists, warning sounds and others) are in the prior notes — [LoA 2025-03-29](https://line-of-action.com/article/a-new-version-of-the-tools-is-now-online). No 2026 challenge or prompt feature was found. An LoA page says "this is shaping up to be a busy year for Line of Action releases" without details *(snippet)* — [LoA social page](https://www.line-of-action.com/article/follow-loa-on-social-media)
- **Proko:** the roadmap (undated) lists a Timer Tool that builds timed sessions from bought packs or uploaded images, along with challenges, livestreams and a mobile app — [Proko roadmap](https://www.proko.com/roadmap). A community request asked for a Class Mode that lengthens the timer after a few images and for more than 25 images (older thread) — [Proko community](https://www.proko.com/community/topics/timer-tool-improvements). **No dated 2025–2026 release was found.**
- **Croquis Café:** the official site sells a $36/year Artist Membership or a $250 Teacher Membership. It says the library of more than 600 **videos** was produced "from 2012 to early 2026" — [croquis.cafe](https://croquis.cafe/). The free Vimeo videos went private because of bandwidth — [Penny Arcade forum](https://forums.penny-arcade.com/discussion/comment/43359793/)
- **Clip Studio Paint 4.0** (2025-03-12):
  - paint directly on 3D objects, including guidelines and patterns on reference objects;
  - brush tools draw on 3D figures and primitives;
  - 3D shadows cast between objects;
  - STL, BVH and VRM import;
  - Puppet Warp for posing 2D characters.

  — [CG Channel, 2025-03-15](https://www.cgchannel.com/2025/03/celsys-unveils-clip-studio-paint-4); [cgworld.jp](https://cgworld.jp/flashnews/202503-CLIP-STUDIO-4.html). Version 5.0 was announced for March 2026 but **not verified** — [Clip Studio news 2026-01](https://www.clipstudio.net/en/news/202601/28_01/)
- **Procreate:**
  - Reference Companion dates from 5X (2020): a floating window showing the canvas, an imported image, or the artwork on the user's face — [Procreate Help](https://help.procreate.com/articles/ZWopfZ-reference);
  - 5.4 (September 2025): **pick colours from the Reference Companion with the Eyedropper** — [What's new in 5.4](https://help.procreate.com/articles/Ls9oMu-procreate-5-4-update-at-a-glance);
  - 5.4.5 (October 2025): redesign for iPadOS 26 — [Procreate insight](https://procreate.com/insight/2025/iPadOS-26).

  This supports LeMuse's already-planned EyeDropper.
- **Krita:** the Reference Images tool dates from 4.1, and 5.3 headlines don't include reference changes — [Krita 5.3 released](https://krita.org/en/posts/2026/krita-5.3.0-released/). A WIP merge request covers reference pinning, cropping and syncing *(not confirmed shipped)* — [KDE MR 901](https://invent.kde.org/graphics/krita/-/merge_requests/901)
- **PoseMy.Art:** the toolkit guide (updated 2025-10-21) documents a light intensity slider and a Lock for lights — [PoseMy.Art toolkit](https://posemy.art/blog/ultimate-posemyart-toolkit/)
- **Magic Poser:** manual lighting with three light types and up to 8 lights. No photo-based AI pose feature was confirmed. A different app, "MagicPose" (October 2025), is an AI image generator and is unrelated *(search summary)* — [magicposer.com](https://magicposer.com)

### Inferences (fit with LeMuse)
- **3D pose rotation and lighting** (Clip Studio, PoseMy.Art, Magic Poser) are a separate product category. They are out of scope for a stream-first photo and museum app.
- **Turnarounds:** a lightweight equivalent is grouping multi-view museum records. Some Cleveland objects have several images, so a "step through views of this object" arrow could work (not verified here).
- **Video references** (Croquis Café paywalled since early 2026, refern native video since 2026-07) are a gap with no CC0 supply in LeMuse's sources. Skip.
- **Challenges:** LoA's rotating official playlists suggest a **seeded weekly pack**: a deterministic pick from the user's topics, keyed by ISO week. It needs no server and no telemetry. It is cheap, and gives "everyone with the same topics sees the same set" without accounts.
- **Practice bookkeeping:** refern shipped a calendar, recap and attach-your-work in 2026. LeMuse has a practice log and deliberately has no streaks. A calendar view plus **"attach a photo of my drawing to this session"** (a user-initiated local file, like Save) adds the payoff without streak pressure. Keep it local and out of git.
- **Per-topic remembered session settings** (refern v1.6.0, LoA 2025) are cheap, and users praised them at LoA.

### Gaps
- No primary 2025–2026 pages were found for Quickposes, Figurosity, JustSketchMe, SenshiStock, AdorkaStock or Kuadro. Searches returned unrelated products.
- Proko's 2025–2026 gesture tool status could not be dated.
- I found no evidence of haptics, deliberate sound design (beyond LoA warning sounds), onboarding teardowns, or well-designed achievements in any practice tool this pass.

## 3. Social, class, streaming and export features (shared sessions, teacher/projector mode, OBS overlays, printing)

### Takeaway
- **Teacher mode:** apart from LoA class mode and Croquis Café's $250 Teacher Membership, there is no documented projector mode.
- **Streaming:** no ready-made gesture-timer OBS overlay was found. Streamers combine generic OBS timer scripts with always-on-top apps.
- **Sharing:** collaboration features are moving to invite links (Are.na) and expiring share links (refern).

### Cited Findings
- **Streaming:** search found no gesture-drawing OBS overlay, only generic OBS countdown and Pomodoro scripts *(search summary)* — [OBS Pomodoro timer with sound alerts (2025)](https://obsproject.com/forum/resources/pomodoro-timer-with-sound-alerts-2025.2178/); [OBS countdown timer](https://obsproject.com/forum/resources/free-obs-countdown-timer.1510/). The search summary pointed at a paid desktop "Drawing Gestures" app with always-on-top as the closest pairing *(snippet)* — [itch.io drawing-gestures](https://nikkisora.itch.io/drawing-gestures)
- **Teacher pricing:** Croquis Café sells a $250 Teacher Membership — [croquis.cafe](https://croquis.cafe/). LoA's class-mode pop-up on pose change is in the prior notes.
- **Collaboration:** Are.na channel invite links (2026-05-15) — [Are.na newsletter](https://buttondown.com/aredotna/archive/arena-frame-api-updates-event-with-triple-canopy/). refern 7-day share links (2026-09-18), and public links that stopped expiring (2026-11-05) — [refern changelog](https://www.refern.app/changelog)
- **Remixable layouts:** Pinterest collages with remix and video export (2024-09-24) — [Pinterest Newsroom](https://newsroom.pinterest.com/news/introducing-new-ways-to-create-and-share-collages)

### Inferences (fit with LeMuse)
- **Stream overlay.** The OBS overlay is an **open niche**. LeMuse already has a `lemuse serve` web preview path. A localhost-only page bound to 127.0.0.1 could be added as an OBS Browser Source showing:
  - the current image, streamed from the CDN;
  - a big timer;
  - mandatory attribution (creator and source), which is good for CC0 and Are.na etiquette on stream.

  Security review needed: localhost binding, no CORS wildcard, read-only. Effort is medium.
- **Projector/teacher mode:** a second-window "presenter view" with a big timer and next-pose countdown on one screen and the clean image on the projector. It reuses the mini-player window plumbing. Effort is medium.
- **Shared sessions without accounts:** export a "session recipe" (topic keywords and channel URLs, durations, seed) as a small text or file. Anyone with LeMuse gets the same sequence. There is no server, telemetry or personal data, as long as paths and the user name are excluded.

### Gaps
- No Product Hunt, YouTube or Reddit reaction data on streaming or class features was retrieved.
- No print/export-layout features (contact sheets) were found in competitors this pass. LeMuse's existing reference sheets may already lead here.

## 4. Top-10 "steal this" list for LeMuse, ranked by delight per effort

### Takeaway
The best ratio comes from keyboard-first chrome and reusing data LeMuse already holds:
1. presentation mode;
2. an info key;
3. a command palette;
4. a seeded weekly pack;
5. metadata "more like this".

Larger delights are an ambient mode, a stream overlay and a practice calendar with attach-your-drawing. Colour search and 3D are poor fits under LeMuse's constraints.

### Cited Findings
The evidence for each item is cited in sections 1–3. Ranking (1 = best ratio):

| # | Steal this | Who has it, since when | Evidence users like it | Fit with LeMuse's constraints | Effort |
|---|---|---|---|---|---|
| 1 | **Presentation / focus mode**: Shift+F, full screen on black, arrows only | refern v1.10.1, 2026-10-18 ([changelog](https://www.refern.app/changelog)) | Iterated twice within 5 weeks (v1.10.2, v1.12.0) | Pure layout; no network or cache | XS |
| 2 | **Info-on-keypress (I)**: creator, title, date, source link over the image | refern v1.11.1, 2026-11-05 ([changelog](https://www.refern.app/changelog)) | (vendor shipped; no user data) | Reuses attribution LeMuse must store anyway; render as text | XS |
| 3 | **Command palette (Ctrl+K)** for study aids, topics and sessions | PureRef 2.0, 2024-03 ([blog](https://pureref.com/blog/pureref2/)); Milanote Ctrl/Cmd+K, 2025-11 | Kept in 2.1; settings search added alongside | Local only | S |
| 4 | **Seeded weekly / daily pack** from your topics, the same for everyone with the same topics | LoA rotating official challenge playlists, 2025-03-29 ([LoA](https://line-of-action.com/article/a-new-version-of-the-tools-is-now-online)) | LoA comments praised the 2025 tools *(prior notes)* | Deterministic seed; no server or telemetry | S |
| 5 | **"More like this"** from metadata (same artist, department, period, medium; for Are.na, one page of the block's connections on click only, *pending ADR-0004 check*) | refern Find similar (2026-07); Cosmos image search; Pinterest long-press (2025-05-05); Same Energy (2021) | Cosmos review: "so much better than Pinterest"; Same Energy press coverage | **Metadata-only**, which respects no pixel reads and no cache | M |
| 6 | **Ambient mode**: slow cross-fade, no timer, from the tray, optionally on a second monitor (later a .scr screensaver) | Are.na Frame, 2026-05-15 ([newsletter](https://buttondown.com/aredotna/archive/arena-frame-api-updates-event-with-triple-canopy/)); Cosmos Canvas ([App Store](https://apps.apple.com/app/id1577975475)) | Frame batch "sold out within hours"; "the Canvas feature is genuinely so useful" | Streams like the slideshow; respect preload ≤ 2 | S–M |
| 7 | **Practice calendar + attach your drawing to a day** (no streaks) | refern v1.6.0 / v1.8.0, 2026-08/09 ([changelog](https://www.refern.app/changelog)) | Vendor added recap and attach-work within 2 weeks of each other | User-initiated local file, like Save; keep it out of git | M |
| 8 | **Stream overlay**: OBS Browser Source on 127.0.0.1 with image, big timer and attribution | **Nobody found** ([OBS forum](https://obsproject.com/forum/resources/pomodoro-timer-with-sound-alerts-2025.2178/)) | Gap: streamers improvise with generic timers | Localhost-only, read-only; needs a security review | M |
| 9 | **Share your setup / session recipe**: export themes, topics and session settings as a file | PureRef settings export, 2024-03 ([blog](https://pureref.com/blog/pureref2/)); Are.na invite links, 2026-05 | (no user data) | Schema must exclude paths and the user name | S |
| 10 | **Projector / presenter view**: big timer and next-pose on one screen, clean image on the other | LoA class mode *(prior)*; Croquis Café Teacher tier ([site](https://croquis.cafe/)) | Teacher tier is priced separately ($250), which implies demand | Reuses the mini-player window; no network change | M |

**Honourable mentions:**
- per-topic remembered session settings and session order (refern v1.5/1.6);
- a text **index view** (Are.na 2026);
- a pinned-topics start screen with metadata cards (PureRef 2.1 recent-files overview);
- "No AI images in museum sources" messaging (Cosmos's hide-AI toggle shows demand).

**Poor fits:**
- pixel-based colour or hex search, and visual-embedding similarity: they need image bytes from CORS-less CDNs or a cache;
- 3D posing and lighting (Clip Studio 4.0, PoseMy.Art, Magic Poser);
- video references (Croquis Café, refern video);
- collages and boards (Pinterest, PureRef).

### Inferences
- The ranking is my judgement of delight per effort from feature evidence, not from usage data. Only items 5 and 6 have direct user-praise quotes (Cosmos reviews, the Frame sell-out).
- Items 1–3 together would make LeMuse feel "pro tool" keyboard-first at almost no risk. Items 6 and 8 are the most distinctive, because no competitor found combines an attributed CC0 stream with ambient or streaming output.

### Gaps
- No quantitative demand data (votes, installs) exists for any of these features.
- The ADR-0004 compatibility of reading an Are.na block's connections for "more like this" needs an architect check before item 5 includes Are.na.
- I did not check whether LeMuse already has full-screen-on-black, an info overlay or per-topic remembered settings. Verify against the app before filing.
