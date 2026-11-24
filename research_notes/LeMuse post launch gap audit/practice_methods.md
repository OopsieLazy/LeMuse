# Drawing and design practice methods beyond timed gesture sessions, and which ones LeMuse should add

Research date: 2026-11-21. This pass builds on `research_notes/LeMuse design and art review/practice_tools.md` (2026-11-19) and doesn't repeat it. That file already covers gesture timers, class-mode presets, mirror, greyscale, notan, grids, end-of-session summaries, streaks and nudity filtering. Older sources are dated inline. No personal data was used in any search.

**Method limits.** About 20 tool calls were made.
- Drawabox, docs.krita.org (moved page) and Goldsmiths' eprint host could not be fetched (403, 404 and DNS failure).
- Some findings therefore rest on search-result summaries, and are marked "(search summary)".
- One finding comes from a direct test run in this session: a `curl` of the image CDNs that LeMuse's CSP allows. It is marked "(local test, 2026-11-21)".

---

## 1. Memory drawing ("look, then hide"): how tools do it, and the evidence

### Takeaway
Memory drawing is a well-documented 19th-century teaching method: study the subject hard, hide it, draw it, then compare with the original. Modern cognitive science uses drawing from memory as a precise probe of what was actually encoded. **No reference app found in this pass ships an automatic "show for N s, then hide" timer.** The closest is a manual hide (DrawRef). That makes it a clear gap LeMuse can fill cheaply.

### Cited Findings
- **Horace Lecoq de Boisbaudran (1802–1897)**, a Paris teacher, trained the "pictorial memory".
  - His students included Rodin, Fantin-Latour and Legros.
  - Main text: *Éducation de la mémoire pittoresque* (1848; expanded 1862). The English translation is *The Training of the Memory in Art* (1911 per Wikipedia; some sources say 1914).

  — [Wikipedia: Horace Lecoq de Boisbaudran](https://en.wikipedia.org/wiki/Horace_Lecoq_de_Boisbaudran)
- **How the method was taught** (search summary of secondary sources):
  - Students studied the model thoroughly first, then drew it from memory.
  - It supplemented observational training and didn't replace it. Students were told not to start memory training until they could draw reasonably well from casts and engravings.
  - An advanced stage had students memorise pure colour tints as fixed reference points, after they had mastered memory drawing in black and white.

  — [Wikipedia](https://en.wikipedia.org/wiki/Horace_Lecoq_de_Boisbaudran); [Lecoq, *The Training of the Memory in Art* (text excerpt)](https://fulltable.com/VTS/i/iip/bcb.htm); [Memory Drawing (Scribd)](https://www.scribd.com/document/451536304/Memory-Drawing)
- **Present-day teaching research still uses Lecoq.** A UAL "Drawing laboratory" workshop series explored teaching drawing through memory, based on his booklet and his idea of memory as "stored observation" — [Spark journal (UAL): 'Drawing laboratory'](https://sparkjournal.arts.ac.uk/index.php/spark/article/download/99/175?inline=1)
- **Francis Galton's *Inquiries into Human Faculty* (1883) has pages on Lecoq's memory training.** The search results surfaced them, but they were not read in this pass — [galton.org: Human Faculty p.95](https://galton.org/books/human-faculty/text/html/galton-1883-human-faculty95.html)
- **Drawing as a memory measure.**
  - Participants studied 30 scenes, did an 11-minute distractor task, then drew as many scenes as they could from memory.
  - The drawings held detailed object and spatial information that recognition tests miss. Raters could match drawings to the right image.

  — [Bainbridge et al., Nature Communications (2019), DOI 10.1038/s41467-018-07830-6](https://link.springer.com/10.1038/s41467-018-07830-6); [PMC6315028](https://pmc.ncbi.nlm.nih.gov/articles/6315028)
- **Memory drawings carry errors.** A drawing is "subject to perceptual distortions as well as memory decay and biases from semantic knowledge" (from a figure summary). In other words, memory drawings show where the artist drew what they *know* rather than what they *saw* — [Fan, Bainbridge, Chamberlain & Wammes, Nature Reviews Psychology (2023), DOI 10.1038/s44159-023-00212-w](https://doi.org/10.1038/s44159-023-00212-w)
- **Drawings drift from the viewing pattern as the delay grows.** Eye movements while drawing became less similar to eye movements while viewing after a longer delay than after a shorter one (search summary) — [CogSci paper (cdlib)](https://repositories.cdlib.org/content/qt8f06k1dd/qt8f06k1dd.pdf?t=op9xg7)
- **Tool support:**
  - **DrawRef (iPad)** lets you move and scale the reference and temporarily hide it by swiping it off-screen. This is a manual hide with no timer — [App Store: DrawRef](https://apps.apple.com/us/app/drawref/id1446586198)
  - A search for a dedicated "show-then-hide" memory-drawing timer found none. The results were generic `setTimeout` hide tricks for survey tools — [Alchemer/SurveyGizmo help](https://help.surveygizmo.com/help/make-an-image-disappear-after-a-certain-amount-of-time)

### Inferences
- **A memory mode fits LeMuse's existing session engine.** It is a session step with three phases:
  1. **Look**: N seconds, image shown, with the usual study aids available.
  2. **Draw**: M minutes, image hidden. Show a neutral panel with the attribution only and the timer still running.
  3. **Compare**: image shown again, untimed or short.

  This needs no pixel access and no storage. The image stays in memory, as the existing ≤ 2 preload already does.
- **Sensible defaults, following Lecoq's progression:**
  - simple, high-contrast subjects first;
  - a short look (30–60 s) with a longer draw;
  - a "value-only memory" variant, using the existing values filter during Look;
  - an optional "peek" button that briefly re-shows the image and counts the peeks. The count is only shown to the user and never scored.
- Lecoq's own advice was to start memory work only after some observational skill. So memory mode should be offered as a separate preset or step type, not the default.

### Gaps
- **Nicolaides (*The Natural Way to Draw*, 1941) memory exercises:** no primary or secondary source retrieved. His memory schedules are uncited here.
- **No controlled study** was found that tests memory-drawing *training* as a way to improve observational drawing accuracy. The cognitive studies above use drawing to *measure* memory and don't train it.
- **Modern instructors** who teach memory drawing (e.g. Proko, Watts Atelier, NMA) weren't retrieved in this pass.

---

## 2. Measuring and proportion tools

### Takeaway
Comparative measurement (sighting a unit and comparing lengths and angles), plumb lines and sight-size are core atelier methods. Software support for them on a *reference image* is thin: phone apps measure angles in the physical world, and reference boards offer shapes and lines. **Everything here can be built as a movable SVG overlay with no pixel access**, which makes it a strong fit for LeMuse.

### Cited Findings
- **Comparative measurement** means using one part of the subject as a unit and measuring other lengths and angles against it. Sight-size is a related method in which the drawing and subject are viewed at the same size from a fixed position, so easel and model must stay put between sessions (search summary) — [Wikipedia: Comparative measurement](https://en.wikipedia.org/wiki/Comparative_measurement)
- **Sighting and plumb lines:** a weighted string held in front of the subject shows which landmarks fall on a true vertical (search summary) — [Fiveable: Sighting techniques](https://fiveable.me/drawing-foundations/unit-9/sighting-techniques/study-guide/u8KoEtq7B0ItT1PL)
- **Apps for measuring the physical world**, aimed at plumb and angle checks outside drawing:
  - [SeeLevel](https://apps.apple.com/us/app/-/id333213338) shows the true vertical and the angle to the horizon;
  - [Protractor Smart](https://apps.apple.com/app/id1076530001) has a plumb-bob mode and camera-view angle measurement;
  - [Caliper](https://apps.apple.com/app/id6794116622) bundles a level, ruler, protractor and plumb tool.

  None is designed for reading proportions off a reference image.
- **Reference software with overlays:**
  - **Posemaniacs** offers a bounding box (beta), negative-space view and 4/9/16-cell grids — see the prior notes, [Posemaniacs](https://www.posemaniacs.com/thirtysecond).
  - **PureRef 2.1** (Feb 2026) added geometric shapes, lines and a background grid with snapping — [CGPress](https://cgpress.org/archives/pureref-2-1-adds-shapes-grids-and-language-support.html).
- **Grids as a measuring aid:** Proko has a lesson titled "Why You Need to be Drawing with Grids". The title was found but the content wasn't read — [Proko](https://www.proko.com/course-lesson/why-you-need-to-be-drawing-with-grids/notes)

### Inferences
These are ranked by value per effort. All are SVG over the image, in image-relative coordinates, so they survive resize and work at any CDN size. None needs pixels.

1. **Plumb and level lines.** One click drops a draggable vertical (and optionally horizontal) line across the image, to check alignment, e.g. "the ankle sits under the pit of the neck". There is room for 2–4 lines.
2. **Angle finder.** Drag two points and the app shows the line's angle from the vertical or horizontal (e.g. "62°"). It could optionally snap to the nearest 15° "clock" angle, the way teachers describe angles.
3. **Proportion ruler (comparative measure).** Drag a "unit" segment, such as head height, and tick marks repeat it across the image. Any second segment then reads "2.4 units". This is the core sight-size and comparative-measurement act, done on screen.
4. **Bounding box and envelope.** A drag-out rectangle reports its width:height ratio. A polygon "envelope" made of straight-line block-in points (the Bargue first stage) can be drawn and toggled on and off.
5. **Movable crosshair.** A cursor-following plumb-and-level cross, for quick checks during a timed pose.

- **Persisting overlays:** these annotations are user-made data, not images. They could be saved per image (e.g. normalised coordinates per block ID) in local state alongside favourites, without touching image bytes. They are optional and could equally be session-only.
- Sight-size proper, with the drawing beside the subject at the same scale, isn't fully reproducible on one screen. A **"set display size"** option is a reasonable approximation for people working on a monitor beside their paper: show the reference at an exact height in cm, using the monitor's DPI.

### Gaps
- **Bargue–Gérôme *Drawing Course*:** no primary source on its construction stages was retrieved. The "block-in with straight lines, then refine" description above is general knowledge and needs a citation.
- **PureRef's measuring and annotation support** (rulers, angle readout) wasn't confirmed beyond shapes and lines.
- **Krita's reference tool** page (docs.krita.org) returned 404, so its current feature list wasn't confirmed.
- **No study** was found measuring whether on-screen measuring tools improve freehand accuracy.

---

## 3. Colour study tools, and which need pixel access

### Takeaway
Colour picking with a value readout, palette extraction and limited-palette previews are standard asks. Their feasibility depends on how pixels are read:
- **Reading pixels from a canvas** is blocked on Cleveland's CDN, which sends no CORS header. Are.na's image hosts send `Access-Control-Allow-Origin: *`.
- **The EyeDropper API** gets around this. It is user-initiated and supported in Chromium, so it should be in WebView2. It samples *screen* pixels, so a picker with value and temperature readout can work on every source without canvas reads or storing anything.
- **Limited-palette and temperature previews** can be approximated with SVG filter matrices on screen, which don't need pixel readback.

### Cited Findings
- **Why canvas reads fail:** drawing a cross-origin image without CORS approval "taints" the canvas, and `getImageData()` then throws. The fix needs `img.crossOrigin = "anonymous"` set *before* loading **and** an `Access-Control-Allow-Origin` header from the server. A cached non-CORS response can keep the canvas tainted — [MDN: Use cross-origin images in a canvas](https://developer.mozilla.org/en-US/docs/CORS_Enabled_Image); [MDN: Pixel manipulation with canvas](https://developer.mozilla.org/En/HTML/Canvas/Pixel_manipulation_with_canvas); [DEV: Tainted canvas](https://dev.to/reynaldi/tainted-canvas-why-the-browser-blocks-your-canvas-and-how-to-unblock-it-57e7)
- **CORS headers on LeMuse's CSP image hosts** (local test, 2026-11-21: `curl` with an `Origin` header):

  | Host | Response tested | `Access-Control-Allow-Origin` |
  |---|---|---|
  | `openaccess-cdn.clevelandart.org` | **200 image/jpeg** | **none** |
  | `images.are.na` | 404 (test key) | `*` (plus `Allow-Credentials: true`) |
  | `d2w9rnfcy7mm78.cloudfront.net` | 403 (test key) | `*` |

  Conclusion: canvas readback would be blocked for Cleveland images. The Are.na headers were seen on error responses only, so they need re-checking on a real 200 image response.
- **EyeDropper API:**
  - lets a page start an eyedropper so the user can pick "a color from anywhere on the screen", including outside the browser window;
  - `open()` "can only be called in response to a user action", and "No pixel information can be retrieved without user intent";
  - the user can cancel with Esc;
  - secure contexts only, and not Baseline (absent in some major browsers).

  — [MDN: EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API). The Chromium/Edge version support and the `sRGBHex` return field weren't confirmed on that page; per MDN's `open()` reference they should be.
- **Existing tools:**
  - **PureRef 2.0** has colour picking from images and canvas-wide greyscale — [PureRef handbook 2.0](https://pureref.com/handbook/2.0/features/).
  - **Krita's** older reference docker let you click anywhere on the image to pick its merged colour, but couldn't rotate or mirror (old forum era, undated) — [Krita docs (ja source)](https://docs.krita.org/ja/_sources/reference_manual/dockers/reference_images_docker.rst.txt); [KDE Phabricator T1613](https://phabricator.kde.org/T1613)
- **Zorn palette as a teaching exercise.** The palette is yellow ochre, a red (cadmium or red ochre), ivory or vine black, and white. Sources disagree on the exact pigments.
  - It "forces you to emphasize value over color", which makes it good for learning value.
  - Black and white act as the "cool" side, and getting temperature right matters more than getting hue right.
  - Exercises include a Zorn mixing chart, and three value studies followed by a Zorn painting.

  — [Golden Artist Colors lesson plan (PDF)](https://images.goldenartistcolors.com/resources/lesson-plans/TUTORIAL_Lesson%20Plan_3_Working_with_a%20_limited_palette.pdf); [Jackson's: The Zorn Palette](https://www.jacksonsart.com/en-ca/techniques/the-zorn-palette); [Madrid Academy of Art](https://www.madridacademyofart.com/blog/zorns-palette); [Draw Paint Academy](https://drawpaintacademy.com/zorn-palette/). These are blogs and lesson plans, not studies.
- **Proko on value:** squinting shows overall value relationships (from the prior notes) — [Proko: How to See Values Correctly](https://proko.com/course-lesson/how-to-see-values-correctly/notes)

### Inferences
**Colour picker with value readout: feasible now on all sources, via EyeDropper.**
- The user clicks "Pick", then clicks the image. LeMuse gets a hex value and computes, in JS with no pixels involved:
  - CIE L* (0–100), shown as "value 7 of 10" on a Munsell-like scale;
  - hue and chroma;
  - a warm/cool label relative to the image's neutral.
- It can show the last 5 picks as swatches, a "mini palette" the user builds by hand.
- The swatches are user data (hex strings), not image bytes, so they're safe to keep.
- To verify: WebView2 supports `window.EyeDropper` in LeMuse's origin (`tauri.localhost` should count as a secure context).

**Automatic palette extraction (k-means of the whole image): needs pixel readback.** There are three possible routes:
- a) canvas plus CORS, which works only for Are.na if its 200s carry ACAO;
- b) a Rust-side fetch through `HttpClient`, decoded and quantised **in memory** and discarded, returning only hex colours. This would need an ADR, because it is a second fetch of the image outside the WebView. It is also borderline against "no images in caches", though nothing would be written;
- c) skipping it.

Recommendation: defer, and let the hand-built EyeDropper palette cover the need.

**Zorn / limited-palette preview: approximate on screen** with an SVG `feColorMatrix` plus `feComponentTransfer` chain, applied the same way LeMuse's existing values filters are. It maps hue toward an ochre–red–black–white gamut and desaturates blues to grey-black. This is a "what would this look like in Zorn" teaching aid, not a faithful pigment simulation. It should be labelled as an approximation.

**Temperature isolation: approximate on screen.** An SVG filter can push warm hues to orange and cool hues to blue/grey (a two-tone "temperature map"), the colour equivalent of the darks/lights isolation LeMuse already has. Exact hue thresholding isn't possible in a pure matrix filter. A `feComponentTransfer` per-channel table gives a coarse result.

### Gaps
- **Are.na CORS on a real image (200) response** hasn't been confirmed. The test used invalid keys.
- **WebView2 support for EyeDropper** in a Tauri origin wasn't tested.
- **No instructor source** was found that recommends software colour pickers for study; some teachers prefer training the eye. No academic evidence was found on limited-palette exercises.

---

## 4. Design, CAD and industrial-design practice

### Takeaway
Industrial-design and entertainment-design curricula (Scott Robertson's *How to Draw*, Drawabox, UCL's engineering "Drawing Gym") centre on perspective grids, boxes and ellipses in perspective, and repeated construction exercises. For a *reference* app, the natural hooks are:
- **perspective analysis overlays**: place vanishing points and a horizon line on a photo of an object or building;
- **silhouette and value-reduction studies**, which the existing values tools already cover;
- **prompt cards** ("redesign this object", "draw it from another view").

### Cited Findings
- **Scott Robertson and Thomas Bertling, *How to Draw*** (Design Studio Press, 2013). Its table of contents covers:
  - 1-, 2- and 3-point grid construction;
  - diagonal vanishing points and transferring scale;
  - the Brewer method for grids whose vanishing points fall off the page;
  - a section on when to use a computer-generated underlay;
  - the "paper plane" grid for aircraft.

  (Search summary of the ToC.) — [archive.org copy, authorisation unverified, cite the book itself](https://archive.org/download/Scott_Robertson_How_To_Draw/Scott_Robertson_How_To_Draw.pdf); [Concept Art Empire review](https://conceptartempire.com/how-to-draw-book-review/)
- **Robertson's Gnomon course "Basic Perspective Form Drawing"** treats boxes and grids as the foundation for vehicles and similar subjects. Its goals include freehand perspective grids and ellipses in perspective — [Gnomon Workshop](https://instructors.thegnomonworkshop.com/workshops/basic-perspective-form-drawing)
- **UCL's "Drawing Gym"** teaches engineers perspective drawing (page found, not read) — [UCL Drawing Gym](https://www.ucl.ac.uk/drawing-gym/video/perspective-drawing/)
- **Drawabox warm-ups and the 50% rule** (community posts, not official pages; drawabox.com returns 403 to fetches):
  - Warm-ups are the superimposed lines, ghosted lines and ghosted planes from earlier lessons, done for about 10–15 minutes per session.
  - The **50% rule** asks students to spend half their drawing time drawing whatever they want, without fear of a bad drawing.
  - Reference is allowed for 50% drawing, but direct copying counts as "study", not 50% time.

  — [Drawabox community: what counts as the 50% rule](https://drawabox.com/community/submission/NSTRCBK); [Drawabox community: warm-ups](https://drawabox.com/community/submission/VN91VZFY)
- **Perspective-grid sketching apps exist** (e.g. Concepts' tutorial on sketching with a perspective grid) but they are drawing canvases, not reference analysers (page found, not read) — [Concepts: How to sketch with a perspective grid](https://concepts.app/tutorials/how-sketch-perspective-grid/)

### Inferences
**Perspective finder overlay (SVG, no pixels).**
- The user drags 2 lines along converging edges in the photo, such as the top and bottom of a box, a window row or a car's beltline. LeMuse extends them to their intersection, which is the vanishing point.
- A second pair of lines gives the second VP. The **horizon line** is drawn through both VPs, and the app can show whether a third VP exists.
- This directly trains the core skill of Robertson and Drawabox perspective: reading where the eye level and VPs sit in real objects.
- VPs often fall off-image, so the overlay needs a zoomed-out "canvas margin" view.

**Perspective grid overlay.** After the VPs are found, an optional 2-point grid can be drawn in that perspective. This is a cheaper and more relevant version of the "computer-generated underlay" that Robertson discusses.

**Silhouette study.** The existing 2-tone values view with an adjustable threshold already produces a silhouette, so this needs only a named preset ("Silhouette: 2 tones, darks isolated, 1–2 min"). It is useful for industrial designers and character designers.

**Orthographic / "other view" prompt.** On a product or architecture image, a card reads "Draw this in front, side and top view" or "Draw it from 45° higher". This is a text prompt only and needs no tooling.

**CMF (colour, material, finish) study prompt.** A card reads "Render this material: chrome, matte plastic or wood" on an object image, paired with the EyeDropper palette. This is text plus the existing tools.

**"Redesign this" prompt.** A card reads "Keep the function, change the form language", with optional constraints ("make it for a child", "make it 1950s"). This is a text-only prompt bank tagged by topic.

**Drawabox's 50% rule supports a "free draw" slot** in a session plan: an untimed step with no image, or a "draw anything inspired by the last 5" step. It also suggests the weekly log should count study time and free-drawing time separately, without judging either.

### Gaps
- **Feng Zhong (FZD), Proko, Marshall Vandruff:** no primary source on their reference-practice recommendations (perspective, design sketching) was retrieved in this pass.
- **Drawabox's official lesson text** couldn't be fetched (403), so the 50% rule is cited only from community threads.
- **CMF-study or "redesign" exercises:** no industrial-design educator source documenting them as standard exercises was found. They are inferred from general ID-school practice and need a citation before being presented as established.
- **Architecture-specific practice** (urban sketching, analytical drawing of plans and sections) wasn't covered.

---

## 5. Structured curricula, spacing and "draw it again later"

### Takeaway
Peer-reviewed evidence shows that drawing training is associated with gains in representational drawing and visuospatial skills (a longitudinal study of art students). Accuracy depends on both bottom-up perception and top-down knowledge. No study was found that tests *spaced repetition of the same reference* in drawing. A "redraw this image later and compare" feature is plausible but its evidence is indirect.

### Cited Findings
- **Chamberlain, Kozbelt, Drake & Wagemans (2021), "Learning to see by learning to draw".** 42 art students in a foundation drawing course were tracked over several months. Representational drawing, mental rotation, disembedding figures and attentional switching all improved. Published in *Psychology of Aesthetics, Creativity, and the Arts* 15(1), 76–90 (search summary; the PDF host was unreachable) — [Goldsmiths Research Online](https://research.gold.ac.uk/id/eprint/25885)
- **Ostrofsky et al. (2012)**, DOI 10.1037/a0026384: both bottom-up perceptual factors and top-down knowledge factors are linked to drawing accuracy, and artists outperform non-artists (search summary) — [PDF (stockton.edu)](https://stockton.edu/social-behavioral-sciences/documents/ostrofsky2012.pdf)
- **Perdreau & Cavanagh (2014)**, *i-Perception*, DOI 10.1068/i0635: drawing accuracy is linked to faster encoding of object structure, not just veridical perception (search summary) — [PMC4249990](https://pmc.ncbi.nlm.nih.gov/articles/PMC4249990)
- **Devue & Grimshaw (2018)**, *Psychonomic Bulletin & Review*, DOI 10.3758/s13423-018-1435-8: face-processing skill predicted how faithful novices' portraits were (search summary) — [Psychonomic Society featured content](https://featuredcontent.psychonomic.org/talent-or-10000-hours-good-seeing-makes-for-good-drawing)
- **Ostrofsky (2020)**, an Oxford Handbook chapter on observational drawing research methods, covers how drawing accuracy is measured, DOI 10.1093/oxfordhb/9780198824350.013.17 (search summary) — [Ostrofsky chapter (PDF)](https://stockton.edu/social-behavioral-sciences/documents/OstrofskyChapter2.pdf)
- **Chamberlain (2017), "Expertise in the visual arts"**, reviews the expertise literature — [Goldsmiths eprint](https://eprints-gro.gold.ac.uk/21013/1/Chamberlain%20%282017%29%20Expertise%20in%20the%20Visual%20Arts.pdf). Its content wasn't read; the host was unreachable.
- **Practice alone may not fully explain expertise.** A review chapter argues this, but its evidence comes from piano sight-reading, not drawing (search summary) — [Taylor & Francis chapter](https://www.taylorfrancis.com/books/9781315113371/chapters/10.4324/9781315113371-7)
- **Themed daily prompts:** Croquis Cafe's "Figuary" (one session a day in February) is in the prior notes. Inktober's official prompt rules weren't retrieved in this pass.

### Inferences
- **"Draw it again" (repeat-later queue)** gives the user a visible before/after on the *same* reference, which is the most direct form of competence feedback (see section 7).
  - The user marks an image "Redraw in 1 week / 1 month".
  - LeMuse stores only the block ID and a due date (local state, like favourites). The image is streamed again from the CDN when the date comes round.
  - Saying "spaced repetition", or claiming retention benefits, would overstate the evidence. Call it "revisit".
- **Interleaving.** LeMuse's random shuffle across a topic already *interleaves* by default. A "shuffle across topics" session option is a cheap addition. See the gap below on the interleaving evidence.
- **Daily and weekly sets.** A "this week's set" feature fits LeMuse's forgiving weekly log better than daily prompts: a fixed 5–10 images per topic, chosen once a week and the same for the whole week, so repeated attempts are possible.
  - Prompts are text and can be shipped as a TOML asset, like the starter topics.
  - Avoid "day N of 31" framing, which recreates streak pressure.
- **Curriculum structure.** Because skill rests on both perception and knowledge (Ostrofsky 2012), a balanced plan would mix:
  - observational steps (timed, measuring aids);
  - memory steps (section 1);
  - free or invented steps (the Drawabox 50% rule).

  LeMuse's custom plan builder could ship presets for each.

### Gaps
- **Interleaving study, not verified.** Kornell & Bjork (2008), "Learning concepts and categories: Is spacing the 'enemy of induction'?" (*Psychological Science*) reportedly showed that interleaved study of different artists' paintings improved later style classification, even though learners preferred blocked study. This comes from background knowledge and was **not confirmed by search in this pass**. Verify the paper and its DOI before citing.
- **No drawing-specific study** of spaced repetition of references, or of redrawing the same reference later, was found.
- **No primary sources** were retrieved on Inktober's or Drawabox's 2026 challenge rules.
- **Effect sizes and control groups** in Chamberlain et al. (2021) weren't checked.

---

## 6. Self-review: comparing your drawing with the reference, and privacy

### Takeaway
Instructors and tools encourage reviewing your drawings against the reference (Posemaniacs: "review your drawings afterwards"). Flipping both the drawing and the reference is a standard way to catch errors. The most valuable LeMuse feature would be **side-by-side or overlay of a photo of the user's drawing** imported from a local file. But that brings in personal data, the user's own artwork, which LeMuse's "no images except on Save" rule doesn't currently contemplate. A camera is not needed: file import or drag-and-drop covers it.

### Cited Findings
- **Posemaniacs** tells users to review their drawings afterwards and keeps a 100-pose history for that purpose — [Posemaniacs](https://www.posemaniacs.com/thirtysecond) (from the prior notes)
- **Proko** recommends flipping the drawing, using a mirror, or leaning back and squinting to reset perception and catch errors — [Proko: How to See Values Correctly](https://proko.com/course-lesson/how-to-see-values-correctly/notes) (from the prior notes)
- **Krita's reference tool** sits reference images on the canvas, which allows side-by-side comparison inside a painting app. Its old docker allowed colour picking but not rotate or mirror (undated forum) — [KDE Phabricator T1613](https://phabricator.kde.org/T1613)
- **A privacy model for user-initiated screen access.** The EyeDropper API returns pixels only after an explicit user click and can be cancelled with Esc. That is a model of "user intent, no background access" — [MDN: EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API)

### Inferences
**"Check my drawing" (local file, in memory).**
- The user drops or opens a photo of their drawing. LeMuse shows it next to the reference, or over it at adjustable opacity ("onion skin").
- Both images get the same transforms: mirror, upside down, greyscale, values.
- Simple alignment: drag and scale the overlay, or click 2 matching points on each image, e.g. the top of the head and the feet.

**Privacy design:**
- Load the photo with a file picker into an in-memory object URL. Don't copy it into the library. Discard it when the session ends unless the user explicitly Saves a comparison.
- Don't add a network path. A Tauri file dialog with the narrowest file-read scope is needed, and the capability has to be justified in an ADR.
- Strip EXIF before any optional Save. Phone photos carry GPS location.

**No camera.**
- Camera access would add a permission, a capture flow, and the risk of capturing the user's room or face.
- Users can photograph drawings with their phone and import the file.
- If a camera is ever added, it should follow the EyeDropper model: explicit button, visible indicator, frames kept only in memory.

**Critique checklist (text only).** After a step, show 3–5 questions, chosen per step type:
- Gesture: "Does the line of action read in one stroke?" "Is the weight-bearing foot under the centre of gravity?"
- Values: "Do the big shapes read as 2–3 values from across the room?"
- Perspective: "Do the parallels converge to the same VP?"

Answers are optional ticks, stored only as counts if at all. No source-backed checklist was found, so the wording should be drafted from the instructor material cited above and labelled as LeMuse's own.

### Gaps
- **No tool was found** that offers drawing-photo-over-reference overlay as a feature, though PureRef and Krita allow it manually by placing images together. Clip Studio Paint's Sub View wasn't covered by the search.
- **No published critique checklists** from named instructors (Watts, NMA, Ctrl+Paint) were retrieved.
- **No research** was found on whether overlay comparison improves learning, compared with side-by-side comparison or none.

---

## 7. Motivation beyond streaks, and the risk of over-tooling

### Takeaway
Self-determination theory (autonomy, competence, relatedness) is the common frame. Studies of game elements (points, levels, leaderboards) find little effect on intrinsic motivation, and one fitness-app study found that gamification shifted users toward extrinsic motivation and raised stress. Instructors broadly accept aids such as grids as *temporary* scaffolding, but warn against permanent dependence. This argues for aids that are easy to turn off, and that LeMuse encourages users to turn off.

### Cited Findings
- **Mekler et al. (2017)**: points, levels and leaderboards produced no significant difference in measured intrinsic motivation, even though SDT-based reasoning predicted competence effects (search summary of a secondary review) — [Mekler et al. 2017 (PDF, Harvard Glassman Lab annotated copy)](https://glassmanlab.seas.harvard.edu/annotated_works/mekler17.pdf)
- **A fitness-app gamification study** found an "overemphasis on extrinsic motivation, potentially overshadowing intrinsic motivation" and higher stress. These effects were smaller in a self-exploration-based gamified group (search summary) — [TechTrends (Springer) 2024, s11528-024-00968-9](https://link.springer.com/article/10.1007/s11528-024-00968-9)
- **A 2023 meta-analysis** in *Educational Technology Research and Development* looked at gamification's effects on intrinsic motivation through competence, autonomy and relatedness. Its pooled findings weren't retrieved — [ETR&D, DOI 10.1007/s11423-023-10337-7](https://link.springer.com/article/10.1007/s11423-023-10337-7)
- **Gamification research applies SDT "mostly superficially"** (search summary) — [DiGRA paper](https://dl.digra.org/index.php/dl/article/download/2773/2757/2817)
- **Ctrl+Paint (Matt Kohr), "On cheating: rulers, grids and tracing" (13 Feb 2014):**
  - "Using a grid forces an artist to truly draw what they're looking at."
  - "Copying with a grid is not a good way to learn drawing technique."
  - "Any tool that allows you more control in your art is worth using."

  Grids are for beginners and should eventually be dropped. Rulers are fine because they add precision without replacing skill — [Ctrl+Paint](https://www.ctrlpaint.com/blog/on-cheating-rulers-grids-and-tracing)
- **The main risk of grids is dependence.** The suggested remedy is to make the grid squares bigger over time, so the artist bridges larger gaps with fewer cues (blog sources) — [Creative Flair: Understanding the Grid Method](https://blog.creativeflair.org/mastering-drawing-grids); [Art of Education: 5 misconceptions about grid drawing](https://minnow-seabass-fd9a.squarespace.com/blog/5-misconceptions-about-grid-drawing)
- **Streak burnout** (Loish and others) is in the prior notes and is backed by blogs only.

### Inferences
**Autonomy.**
- Users already pick topics, plans and aids.
- Keep every feature opt-in and off by default.
- Don't impose a curriculum. Presets are suggestions the user can edit.

**Competence.** This is the strongest lever LeMuse doesn't yet pull.
- Show *progress the user can see in their own work*: the "Draw it again" before/after (section 5) and self-review (section 6). These beat counters.
- The weekly log could add "minutes by practice type" (gesture, memory, values, perspective, free) as a neutral mirror, not a target.

**Relatedness.** Attribution to museums and Are.na curators already connects users to a community of makers. A social feed would be scope creep and isn't recommended.

**Anti-over-tooling features:**
- **"Aids fade" option.** In a long session or a repeat, the grid gets coarser (4×4 → 3×3 → thirds → off) or the value steps drop, implementing the "bigger squares over time" advice.
- **"Check, don't lean" for measuring tools.** Default to a short reveal (hold a key to show the plumb line or angle), so the user draws first and checks second. This matches the sight-then-check habit of comparative measurement.
- **"Clean eye" reminder.** An occasional, dismissable "try this one with no aids" tip, never a gate.

### Gaps
- **No study** was found isolating *streaks* specifically against autonomy and competence.
- **No research** was found on reference-app aids and dependence. The guidance comes from instructor blogs.
- **Mekler et al.** was read only via a summary. Its performance findings (points reportedly raised the *quantity* of output) weren't verified.

---

## 8. Ranked shortlist for LeMuse (within its constraints)

### Takeaway
The best candidates need **no pixel access, no image storage and no camera**:
1. memory mode;
2. measuring overlays (plumb, angle, proportion ruler);
3. an EyeDropper colour picker with value readout;
4. a perspective (VP) finder;
5. "draw it again" revisits;
6. self-review with a locally imported photo of the drawing.

Palette extraction and camera capture should be deferred.

### Cited Findings
- Memory drawing as a method — [Wikipedia: Lecoq de Boisbaudran](https://en.wikipedia.org/wiki/Horace_Lecoq_de_Boisbaudran); no timed implementation was found ([DrawRef: manual hide](https://apps.apple.com/us/app/drawref/id1446586198))
- Comparative measurement as an atelier method — [Wikipedia](https://en.wikipedia.org/wiki/Comparative_measurement); only shapes and lines exist in [PureRef 2.1](https://cgpress.org/archives/pureref-2-1-adds-shapes-grids-and-language-support.html)
- EyeDropper samples screen pixels after a user click, without canvas readback — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API); Cleveland's CDN sends no CORS header (local test, 2026-11-21)
- Perspective grids and VPs are central to ID drawing — [Robertson *How to Draw* review](https://conceptartempire.com/how-to-draw-book-review/); [Gnomon](https://instructors.thegnomonworkshop.com/workshops/basic-perspective-form-drawing)
- Drawing training links to perceptual and visuospatial gains — [Chamberlain et al. 2021](https://research.gold.ac.uk/id/eprint/25885)
- Grids are scaffolding to drop over time — [Ctrl+Paint 2014](https://www.ctrlpaint.com/blog/on-cheating-rulers-grids-and-tracing)

### Inferences
Ranked by value to LeMuse's audiences, weighed against cost and constraint risk:

| # | Feature | Audience | How it works within the constraints | Cost / risk |
|---|---|---|---|---|
| 1 | **Memory mode** (Look → Hide → Draw → Compare session step; optional counted peeks) | Everyone; atelier, illustration | New step type in the session engine; image kept in the existing in-memory preload; hide = CSS. | Low. No new capability. |
| 2 | **Measuring overlays**: plumb/level lines, angle finder, proportion ruler (unit ticks + "2.4 units"), bounding box ratio; hold-to-show default | Figure/portrait artists, architects, CAD | SVG in normalised image coordinates; optional per-block saved annotations (data only). | Low–medium. Pure UI. |
| 3 | **Colour picker with value and temperature readout** + hand-built 5-swatch palette | Painters, designers (CMF) | EyeDropper API (user-initiated, screen pixels); L*/hue/chroma computed from hex in JS; swatches stored as hex strings. | Low, once WebView2 support is verified. No CSP or capability change expected. |
| 4 | **Perspective finder**: two line pairs → VPs → horizon; optional 2-point grid overlay | Industrial designers, architects, environment artists | SVG with a zoom-out margin for off-image VPs. | Medium (geometry and UX). |
| 5 | **"Draw it again" revisit queue** (1 week / 1 month), plus "This week's set" fixed images per topic | Everyone; supports competence | Store block ID + due date in local state; re-stream from the CDN. Text prompts in a TOML asset. | Low. New table means a migration. Avoid streak framing. |
| 6 | **Self-review: open a photo of my drawing**: side-by-side / onion skin, transforms applied to both, 2-point align | Everyone | Tauri file dialog → in-memory object URL; never copied into the library; EXIF stripped on any Save. ADR for the file-read capability. | Medium; privacy review needed. No camera. |
| 7 | **Design prompt cards** ("other view", orthographic, CMF, "redesign this") + per-step critique checklist | ID/CAD, design students | Text-only prompt bank tagged by topic; optional ticks. | Low; needs instructor-sourced wording. |
| 8 | **Zorn / limited-palette preview** and **temperature map** | Painters | SVG `feColorMatrix` / `feComponentTransfer` on screen, labelled as approximate. | Low–medium; fidelity is limited. |
| 9 | **"Aids fade"** (grid coarsens or switches off across a session) | Learners | Session-plan option on existing aids. | Low. Directly answers the over-tooling critique. |
| — | **Defer: automatic palette extraction** | Painters | Needs canvas + CORS (fails on Cleveland) or a Rust in-memory fetch. Would need an ADR on the second fetch and the "no images in caches" rule. | Medium–high; low marginal value over #3. |
| — | **Defer / avoid: camera capture** | — | New permission, capture risk; phone photo + file import covers it. | High privacy cost. |

Cross-cutting design rules from the evidence:
- every aid is opt-in and quick to toggle;
- measuring is "draw first, then check";
- show progress through the user's own before/after, not counters;
- presets mix observation, memory and free drawing.

### Gaps
- **Owner input needed** on the #6 file-read capability and on whether per-image annotations (#2) and revisit dates (#5) should persist (local state) or stay session-only.
- **Feasibility checks before committing to #3:**
  - EyeDropper in WebView2 under `tauri.localhost`;
  - Are.na's ACAO on 200 image responses (only if canvas is ever wanted).
- **Unverified evidence:** Kornell & Bjork (2008) on interleaving.
- **Missing primary sources:** Nicolaides memory schedules, Bargue stages, and Feng Zhong, Vandruff and Proko design-practice advice. These should be cited before any in-app tips reference them.
