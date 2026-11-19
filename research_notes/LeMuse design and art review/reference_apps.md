# Reference-management and moodboard apps: what comparable tools offer, what users love or miss (for LeMuse design review, Nov 2026)

Scope note: research done 2026-11-19 with a capped budget (about 16 web calls). Most findings come from vendor pages, handbooks and comparison blogs. **Many comparison blogs (refern.app, storyflow.so, getartdeck.com, framekit.ai, soleilpictures "clusters") are written by competing products**; treat their judgements as biased. No Reddit thread was successfully retrieved directly; user sentiment is second-hand via journalism (404 Media, Aftermath, Creative Bloq, TechRadar) and review aggregators. Items marked *(older)* predate 2025.

## Feature sets and positioning of comparable tools

### Takeaway
The field splits into three jobs: (1) **boards/overlays** you keep on screen while drawing (PureRef, BeeRef, Kuadro), (2) **libraries** that store, tag and search a personal collection (Eagle, Allusion, Hydrus, Pixave, mymind, Raindrop), and (3) **discovery/curation networks** (Pinterest, Cosmos, Savee, Are.na), with canvas tools (Milanote, FigJam, Miro, Firefly Boards) for client-facing moodboards. Nobody combines "calm, attributed, topic-driven stream from open-access museum + curated sources" with an always-on-top drawing window; that's LeMuse's niche, but LeMuse currently lacks most of the board and library features users take for granted.

### Cited Findings

**PureRef (board, Win/Mac/Linux, closed source)**
- Current handbook is version 2.1. PureRef 2.0 added "Always on top of..." which attaches the board to a single application window and moves/minimises with it; plain Always on top is Ctrl+Shift+A — [PureRef 2 blog](https://pureref.com/blog/pureref2/); [PureRef handbook: features](https://www.pureref.com/handbook/features/)
- Window modes: Always on top, Always on top of..., Always on bottom (interactive wallpaper), Transparent to mouse (click-through), Lock window, Overlay mode (each image in its own floating window). Handbook tip: always-on-top + semi-transparent + click-through lets you trace onto a painting program — [PureRef handbook: features](https://www.pureref.com/handbook/features/)
- Canvas: groups with backgrounds, a hierarchy tree (tooltips show image **source** and size), **slideshow with adjustable interval and ordered/shuffled/random order**, GIF playback with frame scrubbing, grayscale per canvas or per image, rich-text notes with checklists and clickable links, drawing tools (pen, shapes), colour picker (RGB/HSV/HEX, works outside window), pixel coordinates readout — [PureRef handbook: features](https://www.pureref.com/handbook/features/)
- Pricing (as stated 2026-11-04): $49 one-time licence; Business $8/seat/mo annual; comparison blogs also mention a $0 personal non-commercial option — [Storyflow comparison 2026](https://storyflow.so/blog/moodboard-apps-features-and-pricing-compared-2026); [refern Eagle vs PureRef](https://www.refern.app/compare/eagle-vs-pureref)
- Gaps users cite: no browser extension, no search or tagging, which becomes a bottleneck past a few hundred images; unverified claim that interrupted saves can corrupt a file — [refern Eagle vs PureRef](https://www.refern.app/compare/eagle-vs-pureref) (competitor source)

**BeeRef (board, free/open source)**
- Free, open-source PureRef alternative: lay out reference images and keep them on screen with a minimal interface; Python/PyQt6; GPL-3.0; canonical repo github.com/rbreu/beeref; v0.3.3 discussed on Krita Artists. Reported issues: segfaults on some Linux systems, trouble opening files from network drives — [BeeRef GitHub](https://www.GitHub.com/rbreu/beeref); [Krita Artists thread](https://krita-artists.org/t/beeref-open-source-reference-image-viewer-version-0-3-3/26080); [Flathub](https://flathub.org/sv/apps/org.beeref.BeeRef); [Libre Arts intro (2021, older)](https://librearts.org/2021/07/introducing-beeref/)

**Kuadro (board, free, Windows) *(older)***
- Released "AS IS for free for any use including commercial"; portable (runs without install); Windows-only at launch (2015), later OS X mentioned; Softpedia lists 0.9.5 Beta — [Kuadro Gumroad](https://gumroad.com/l/kuadro_win); [CG Channel 2015](https://www.cgchannel.com/2015/01/kruel-games-releases-free-kuadro-reference-image-viewer/); [CG Tricks](https://cgtricks.com/kuadro-a-new-way-of-managing-your-reference-images/); [Softpedia](https://www.softpedia.com/get/Multimedia/Graphic/Graphic-Viewers/Kuadro.shtml)

**Eagle (library, Win/macOS, closed source)**
- Eagle 4.0 (Build 23 cited) at $34.95 one-time for two devices, 30-day trial; no Linux; no phone app mentioned. Earlier listings show $29.95 (pre-2024 price change) — [refern Eagle vs PureRef](https://www.refern.app/compare/eagle-vs-pureref); [Eagle pricing notice 2024](https://eagle.cool/blog/post/price-adjustment-notice-2024); [Storyflow comparison](https://storyflow.so/blog/moodboard-apps-features-and-pricing-compared-2026)
- Features: colour filter, keyword search, advanced filter, smart folders (incl. by colour/format), **duplicate identification**, video/audio/font management; AI search by image or meaning; browser extension with batch save and screenshots (called "best-in-class" clipper by a competitor) — [SoftwareSuggest](https://www.softwaresuggest.com/eagle-app/pricing); [Capterra](https://www.capterra.ie/software/184384/eagle); [Storyflow comparison](https://storyflow.so/blog/moodboard-apps-features-and-pricing-compared-2026); [refern Eagle vs PureRef](https://www.refern.app/compare/eagle-vs-pureref)
- Copies imported media into an Eagle-managed library rather than indexing in place; has no canvas — [refern Eagle vs PureRef](https://www.refern.app/compare/eagle-vs-pureref)
- No confirmation of an "Eagle 5" found.

**Allusion (library, free/open source)**
- Free, open-source desktop visual library manager, TypeScript, GPL-3.0, Win/macOS/Linux; watched folders (no copying), hierarchical tags, metadata filters, advanced search; auto-update; explicitly designed to complement PureRef (library vs per-project board). Repo last updated April 2024, so possibly unmaintained — [Allusion site](https://allusion-app.github.io/); [Allusion README](https://github.com/allusion-app/Allusion/blob/master/README.md); [LinuxLinks](https://www.linuxlinks.com/allusion-organize-visual-library/)

**Hydrus Network (library, free/open source, power-user)**
- Tracks files by SHA-256 so tags survive renames/moves; perceptual hashes (list per file) plus a pixel hash (SHA-256 of rendered pixels) for exact-pixel duplicates; duplicate groups have a "king" (best file); v466 added pixel-duplicate filtering; client API exists. Re-encoded/resized files count as new and need the duplicate system or external services (iqdb, SauceNAO) — [Hydrus API docs](https://hydrusnetwork.github.io/hydrus/developer_api.html); [Hydrus FAQ](https://hydrusnetwork.github.io/hydrus/faq.html); [Hydrus v466](https://www.tumblr.com/hydrus/670679947401101312/version-466); [Issue #267](https://github.com/hydrusnetwork/hydrus/issues/267)

**Are.na (curation network)**
- Official tiers: Guest free (200 blocks / "connections"), Premium $7/mo or $70/yr (unlimited blocks, advanced search filters, table view, **presentation mode**, priority support), Supporter $120/yr (higher API rate limits, bulk operations, custom profile URL). Reader mode for web and mobile. Older $5/mo figures on third-party sites are out of date — [Are.na About](https://www.are.na/about); [Are.na home](https://www.are.na/); [Common Sense Media (older price)](https://www.commonsensemedia.org/app-reviews/arena)
- Channels, not a canvas; browser extensions for Chrome, Safari, Firefox; collaborators on every plan; open/closed/private channels; rebuilt iOS app; Android app updated 2026-08-31 with user complaints about "major issues" and a fix to "share with Are.na" — [Storyflow comparison](https://storyflow.so/blog/moodboard-apps-features-and-pricing-compared-2026); [App Store](https://apps.apple.com/us/app/are-na/id1299153149); [Google Play](https://play.google.com/store/apps/details?id=na.are.aredotna)

**Pinterest (discovery network, free, ad-supported)**
- Grid of Pins plus collage composer; Save extension for Chrome/Firefox/Edge/Safari; group boards with 4 access settings; assistant in beta (US iPhone); Pinterest itself says saved pictures carry no rights clearance — [Storyflow comparison](https://storyflow.so/blog/moodboard-apps-features-and-pricing-compared-2026)

**Cosmos (discovery/curation, ad-free)**
- No ads, likes or engagement metrics (per its own llms.txt); does not generate AI content; detects likely AI images with show/blur/hide options; AI-powered attribution identifying artist/designer/photographer/source, though reviewers spot misattributions; premium about $8/month; drawbacks: small community, limited discovery tools, mobile bugs — [Cosmos llms.txt](https://www.cosmos.so/llms.txt); [Creative Bloq: what is Cosmos](https://www.creativebloq.com/design/social-media/what-is-cosmos-the-pinterest-alternative-for-creatives); [TechRadar](https://www.techradar.com/computing/websites-apps/this-app-is-like-pinterest-if-it-were-cooler-and-ad-free); [Creative Bloq: best Pinterest alternatives 2026](https://www.creativebloq.com/creative-inspiration/the-best-pinterest-alternatives-in-2026)

**Savee, mymind, Raindrop, Milanote (pricing figures conflict across review sites)**
- Savee: free saves are public-only; Starter ~$3.99/mo annual (400 saves, 5 boards), Premium ~$8.25/mo annual unlimited — second source says Pro ~$9 and couldn't verify — [refern best moodboard apps 2026](https://refern.app/blog/best-moodboard-apps-2026); [framekit 2026](https://framekit.ai/blog/best-mood-board-tools-for-creatives-2026)
- mymind: subscription-only (~$12/mo), automatic AI tagging and OCR, no collaboration — [storyflow inspiration apps 2026](https://storyflow.so/blog/best-inspiration-board-apps-2026)
- Raindrop: bookmark manager first; images handled "acceptably rather than beautifully"; free tier, paid from ~$3/mo — [storyflow inspiration apps 2026](https://storyflow.so/blog/best-inspiration-board-apps-2026)
- Milanote: free plan capped at 100 notes/images/links and 10 uploads; Pro $9.99/person/mo annual ($12.50 monthly); Team $49/mo for up to 10; free-placement boards; web clipper (clips land in an "Unsorted" column); PDF/PNG export; password-protectable read-only links; iPhone/Android/iPad/desktop — [Storyflow comparison](https://storyflow.so/blog/moodboard-apps-features-and-pricing-compared-2026); [bookbird Milanote pricing](https://bookbird.io/software/milanote/); [Software Advice](https://www.softwareadvice.com/idea-management/milanote-profile/)

**Canvas tools: FigJam, Miro, Adobe Firefly Boards**
- FigJam: Starter $0; whiteboard with stickies; AI sorts stickies into themes; 24-hour guest access without login; no browser extension named — [Storyflow comparison](https://storyflow.so/blog/moodboard-apps-features-and-pricing-compared-2026)
- Miro: Free with 3 editable boards; Starter $8/member/mo yearly; mood board template; AI credits — [Storyflow comparison](https://storyflow.so/blog/moodboard-apps-features-and-pricing-compared-2026)
- Adobe Firefly Boards: infinite canvas with many generative image/video models; Adobe Color extracts a palette from an image — [Storyflow comparison](https://storyflow.so/blog/moodboard-apps-features-and-pricing-compared-2026)

### Inferences
- **Slideshow with interval + shuffle exists in PureRef** (on a local board), so LeMuse's slideshow is not unique by itself; its differentiator is the *source* (open-access museum + curated Are.na, attributed, no ads, no AI slop) and the *topic stream*.
- The most common artist workflow is "library app + board app" with manual copying between them; tags don't carry over ([refern](https://www.refern.app/compare/eagle-vs-pureref)). A tool that streams, then lets you pin to an on-top board and save with metadata intact, removes one of those hops.
- Open-source competitors in LeMuse's space (BeeRef, Allusion, Hydrus) are small, single-maintainer-style projects; Allusion looks dormant since 2024. LeMuse (MIT) would be one of the few actively maintained open-source options on Windows.
- Are.na's own Premium "presentation mode" overlaps with LeMuse's slideshow, but only for the account holder's channels and only on a paid tier; LeMuse offers a slideshow over any public channel on the free tier.

### Gaps
- **Pixave**: no search result confirmed its current status (Mac-only image manager; possibly unmaintained). Not verified.
- **Eagle** official features page returned 404; Eagle 5 not confirmed. Sync details (Eagle libraries on Dropbox/OneDrive) not verified in this pass.
- **Figma (not FigJam) moodboard plugins**, Savee's and mymind's browser extensions and privacy policies: not fetched.
- Offline behaviour of Cosmos/Savee/Are.na apps: not stated by any source found.

## What users praise and complain about

### Takeaway
The loudest 2025–2026 complaint is **Pinterest's AI-image pollution and mislabelling**, which is turning artists away from feed-based discovery toward calm, curated, ad-free sources (Cosmos's whole pitch). Board users love PureRef's overlay controls but miss search/tagging; library users love Eagle's clipper and filters but miss a canvas.

### Cited Findings
- A painter returning to Pinterest in January 2026 found it "overrun with AI slop" and doesn't want to paint from AI references; hand-drawn work was repeatedly auto-tagged "AI modified", with appeals undone on new Pins (404 Media, Feb 2026) — [404 Media](https://www.404media.co/pinterest-is-drowning-in-a-sea-of-ai-slop-and-auto-moderation/); [Slashdot discussion](https://tech.slashdot.org/story/26/02/20/2243230/pinterest-is-drowning-in-a-sea-of-ai-slop-and-auto-moderation)
- r/Pinterest is described as "awash" in AI complaints — [New Leaf Journal](https://thenewleafjournal.com/on-complaining-about-ai-in-pinterest-on-reddit/)
- Reviews describe Pinterest as a reference library users now have to sort by hand; Pinterest's AI labels and "see less AI" filter reduce but don't remove AI pins (aggregator of 63 reviews; perception, not measurement) — [unstar.app](https://unstar.app/blog/pinterest-ai-filter-not-working-see-less-ai-reviews-2026); [getfeedcleaner](https://www.getfeedcleaner.com/blog/pinterest-ai-slop)
- "Pinterest has become unusable" (Aftermath; date shown inconsistently as May 2026 / Nov 2026 repost) — [Aftermath](https://aftermath.site/pinterest-sucks-now-ai/)
- Artists removing work over AI-training concerns; Pinterest reportedly building its own generator "Canvas" trained on uploads (secondary source) — [savedelete](https://savedelete.com/article/pinterest-is-drowning-in-ai-slop-while-its-own-ai-mods-ban-real-artists/)
- Essay: "The mood board has stopped telling the truth" — on loss of trust in feed-based moodboards — [projectpage21 Substack](https://projectpage21.substack.com/p/the-mood-board-has-stopped-telling)
- Cosmos praised as "much more curated" and ad-free; criticised for small community, limited discovery and mobile bugs; its AI attribution sometimes misattributes — [Creative Bloq](https://www.creativebloq.com/design/social-media/what-is-cosmos-the-pinterest-alternative-for-creatives); [TechRadar](https://www.techradar.com/computing/websites-apps/this-app-is-like-pinterest-if-it-were-cooler-and-ad-free); [Creative Bloq alternatives 2026](https://www.creativebloq.com/creative-inspiration/the-best-pinterest-alternatives-in-2026)
- PureRef praised for a mature board and overlay controls; criticised for no search/tagging/extension at scale — [refern](https://www.refern.app/compare/eagle-vs-pureref) (competitor)
- Running two tools (library + board) is a named pain point; images pulled into PureRef aren't indexed in Eagle/Allusion — [refern: stop running two apps](https://www.refern.app/blog/stop-running-two-apps-pureref-plus-organizer); [getartdeck comparison](https://getartdeck.com/compare/reference-board-apps-for-artists/)
- Are.na Android users report "major issues" (Play Store review, 2026) — [Google Play](https://play.google.com/store/apps/details?id=na.are.aredotna)
- BeeRef users report Linux segfaults and network-drive problems — [Krita Artists thread](https://krita-artists.org/t/beeref-open-source-reference-image-viewer-version-0-3-3/26080)
- Savee's free tier makes every save public, a problem for confidential work — [refern best moodboard apps](https://refern.app/blog/best-moodboard-apps-2026)

### Inferences
- "No AI images, no ads, no algorithm" is now a *selling point*, not a neutral fact. Museum open-access collections (pre-AI, catalogued, attributed) are a strong answer; LeMuse should say so in its UI and README. Are.na channels can contain AI images, so an "exclude AI" signal is worth considering for that source (Cosmos does show/blur/hide).
- Privacy matters to users (Savee's public-by-default saves, Pinterest training). LeMuse being local-first with no account and no telemetry is a positive to state explicitly.

### Gaps
- No primary Reddit threads from r/illustration, r/IndustrialDesign or r/learnart were retrieved; sentiment above is via journalism and blogs. A follow-up pass reading actual threads would strengthen this.
- No quantitative data on the share of AI images in Pinterest results.

## Table stakes vs delighters for a reference tool in 2026 (Kano-style)

### Takeaway
No source publishes a formal Kano study; the classification below is an inference from which features appear in nearly every competitor (table stakes) versus a few (delighters).

### Cited Findings
- Present in almost every board tool: arrange/zoom/pan, always on top, grayscale, flip, notes — [PureRef handbook](https://www.pureref.com/handbook/features/); [BeeRef](https://www.GitHub.com/rbreu/beeref)
- Present in almost every library/network: browser extension/clipper (Eagle, Pinterest, Are.na, Milanote, Storyflow), tags/search, collections/boards — [Storyflow comparison](https://storyflow.so/blog/moodboard-apps-features-and-pricing-compared-2026)
- Less common (differentiators): click-through + transparency for tracing, "on top of one app", colour picker (PureRef); colour filter, duplicate detection, AI semantic search (Eagle); perceptual duplicate detection (Hydrus); AI-image hide/blur and AI attribution (Cosmos); automatic AI tagging + OCR (mymind); presentation mode (Are.na Premium) — sources as cited in section 1.

### Inferences
- **Table stakes (missing = complaint):** always-on-top window; zoom/pan on a single image; grayscale toggle; horizontal flip; keyboard navigation; save original with source; collections/playlists; search within saved; works offline for saved items; no ads; clear attribution and source link.
- **Performance (more is better):** volume and quality of sources; speed to first image; tag/filter depth; slideshow timing controls (interval, shuffle, pause on hover).
- **Delighters:** timed gesture-drawing sessions (30s/1m/5m with a countdown, a common learn-art practice); click-through + opacity for tracing/overlaying; "on top of one app" (e.g. pin over Krita/Blender/Fusion); colour-palette extraction and colour search; side-by-side compare; value/notan (posterise) view; AI-image filter; duplicate detection across sources; "related works" from the same museum record.
- **Indifferent/reverse for this audience:** social likes/followers, algorithmic feed, generative AI boards (reverse for many artists, given the Pinterest backlash).
- LeMuse today covers: topic stream, slideshow, save, playlists, attribution. Biggest table-stakes gaps likely: always-on-top/compact mode, grayscale/flip, zoom, offline viewing of saved items (verify against the current app).

### Gaps
- No user survey or Kano study found for reference tools. Gesture-drawing timers (e.g. Line of Action, Quickposes) were not researched in this pass; claim that they're common practice is background knowledge, unverified here.

## What CAD and industrial designers need from reference

### Takeaway
Sources found cover **CMF (colour, material, finish)** references well, mostly via physical or paid libraries; no sources were found on orthographic/exploded-view reference tooling. This audience is underserved by image-feed tools.

### Cited Findings
- Professional material libraries cited in CMF research: Material ConneXion and MaterialDistrict — [ResearchGate CMF review](https://www.researchgate.net/publication/404039894_A_review_on_Colour_Material_and_Finish_Design_meaning_state_of_the_art_and_research_perspective)
- Physical CMF libraries you can touch are "few and far between" and expensive; informal.cc runs a CMF database where you browse products and view their CMF specs — [informal.cc](https://www.informal.cc/blog/the-complexities-of-color-material-finish-cmf/)
- Design consultancies keep in-house CMF sample libraries — [PDR CMF Library](https://www.pdr-consultancy.com/news/introducing-the-pdr-cmf-library)
- Pantone Reference Library listed as a standard ID colour resource; Georgia Tech's ID guide has an "image sources" page — [Georgia Tech ID libguide](https://libguides.library.gatech.edu/ID/image)
- Online CMF sourcebook: Color Material Design — [colormaterialdesign.com](https://www.colormaterialdesign.com/)
- Definition and scope of CMF design — [Wikipedia: CMF design](https://en.wikipedia.org/wiki/CMF_design); [DRS paper](https://dl.designresearchsociety.org/cgi/viewcontent.cgi?article=1181&context=drs-conference-papers)

### Inferences
- For CAD/ID users, the high-value reference types are: orthographic views (front/side/top) to set up blueprints in CAD, exploded/assembly views, cutaways, material and finish close-ups, and measured drawings with scale. Museum design/decorative-arts collections (Cleveland has industrial design, furniture, metalwork) often include multiple views per object; LeMuse could surface **all images of one object together** (a "views" strip) rather than one hero image.
- **Side-by-side compare** (two or more images pinned, synced zoom) and a **measurement/scale cue** (object dimensions from museum metadata, shown as text) would serve this audience in a way no moodboard app does. Cleveland's API exposes dimensions/measurements fields (verify).
- An "always on top of [CAD app]" mode (PureRef's feature) is directly relevant for blueprint tracing in Fusion/Blender/SolidWorks.

### Gaps
- No sources found on how ID/CAD designers source orthographic or exploded-view references, or on any reference app designed for them. Reddit r/IndustrialDesign threads were not retrieved.
- Not verified which Cleveland object records have multiple views or dimension fields.

## How tools handle attribution and source links

### Takeaway
Attribution is weak across the field: board tools at best keep a filename/source in a tooltip, libraries keep the source URL of a clipped page, and Pinterest disclaims rights entirely. Cosmos is the only one marketing attribution as a feature, and its AI attribution is imperfect. LeMuse's per-block creator + source link is ahead of most.

### Cited Findings
- PureRef shows image **source** and size in hierarchy tooltips and the coordinates/info readout — [PureRef handbook](https://www.pureref.com/handbook/features/)
- Pinterest states saved pictures carry no rights clearance — [Storyflow comparison](https://storyflow.so/blog/moodboard-apps-features-and-pricing-compared-2026)
- Milanote clipper drops clips into an "Unsorted" column; Storyflow clipper keeps a link back on clipped text and link cards record the page — [Storyflow comparison](https://storyflow.so/blog/moodboard-apps-features-and-pricing-compared-2026)
- Cosmos uses AI attribution to identify artist/designer/photographer/source, but misattributions occur — [Creative Bloq](https://www.creativebloq.com/design/social-media/what-is-cosmos-the-pinterest-alternative-for-creatives); [Creative Bloq: how to use Cosmos](https://www.creativebloq.com/design/social-media/how-to-use-cosmos-a-beginners-guide-to-the-social-media-platform-made-for-creatives)
- Hydrus tracks files by hash, so metadata survives renames; re-encoded copies lose the link unless reverse-searched (iqdb/SauceNAO) — [Hydrus FAQ](https://hydrusnetwork.github.io/hydrus/faq.html)
- Board files lose library tags when images are copied across apps — [refern](https://www.refern.app/compare/eagle-vs-pureref)

### Inferences
- LeMuse should keep attribution **attached to the saved file** (sidecar JSON or embedded XMP/IPTC Creator/Source fields), so it survives drag-out into PureRef, Krita or a CAD app. That's a concrete differentiator, since no competitor found does this reliably.
- Museum open-access images (CC0 for Cleveland) let LeMuse show licence status per image ("CC0 — free to use") — a clarity signal no feed app provides. Are.na blocks don't carry licences, so the UI should distinguish "public domain" from "found on Are.na, rights unknown".

### Gaps
- Eagle's and Are.na's exact source-URL retention behaviour wasn't verified from primary docs in this pass.
- No source checked whether any tool writes XMP/IPTC attribution into saved files.
