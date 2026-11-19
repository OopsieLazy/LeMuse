# Visual design principles for art and reference-image viewing (LeMuse art-director review)

Scope: chrome, colour, display, labels, motion, accessibility and study tools for a Windows (Tauri 2 / WebView2) full-window reference-image slideshow. Research date 2026-11-19. Sources marked "(not re-fetched)" are primary specs cited from known normative text and not opened in this session; verify the wording before quoting them.

## Neutral surround: grey UIs, simultaneous contrast, surround luminance, black vs dark grey

### Takeaway
What surrounds an image changes how light and how coloured it looks, so editing tools keep the area around the image neutral and adjustable (white through grey to black). The standards ask for a neutral, matte surround with no dominant colour that is dim compared with the display: about 10% of peak white, so roughly 5–10 cd/m². For LeMuse this suggests a neutral (zero-chroma) dark-to-mid grey default behind the image. Accent colour should stay out of the field around the image, and the surround should be user-selectable.

### Cited Findings
- **Simultaneous contrast.** Two identical mid-grey patches look different with context: the one on a dark surround looks lighter than the one on a light surround — [Gilchrist, "Lightness Perception and Lightness Illusions" (MIT)](https://persci.mit.edu/gaz/publications/gazzan.dir/gazzan.htm); [same text, TAU mirror](https://www.cs.tau.ac.il/~hezy/Vision%20Seminar/Lightness%20Perception%20and%20Lightness%20Illusions.htm)
- "Any given luminance value can be perceived as virtually any shade of grey, from black to white, depending on its context." On the anchoring account, the highest-luminance surface in a commonly lit group is perceived as white — [Gilchrist, MIT](https://persci.mit.edu/gaz/publications/gazzan.dir/gazzan.htm)
- **The effect is asymmetric.** A lighter surround has a large effect on how a dark region looks; a darker surround has much less effect on a light region. Most of the classic illusion comes from darkness induced from the light surround into the darker patch (Gilchrist 1988) — [Frontiers in Human Neuroscience 2014](https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2014.00640/full)
- **Practitioner guidance.** Working in a neutral grey environment improves colour-correction accuracy "even if your monitor isn't calibrated." Photoshop's interface can be set to 18% grey; Lightroom's panels can't be set that precisely, but its presets come close — [Envato Tuts+](https://photography.tutsplus.com/tutorials/want-better-color-use-neutral-gray-themes-in-adobe-photoshop-and-lightroom--cms-23342)
- **Lightroom Classic.** Preferences > Interface > Background > Fill Color offers White, Light Gray, Medium Gray, Dark Gray and Black behind the image in Loupe, Develop, Book, Print and Slideshow. Full Screen Preview keeps its own colour, changed by right-click. Lights Out has its own Screen Color and Dim Level. Adobe staff say the tool panels themselves can't be re-coloured — [Adobe Help, Lightroom Classic preferences](https://helpx.adobe.com/lightroom/help/setting-preferences-lightroom.html); [Have Camera Will Travel](https://havecamerawilltravel.com/lightroom/lightroom-classic-change-color-behind-image/); [Adobe Community](https://community.adobe.com/t5/lightroom-classic-discussions/how-to-return-the-program-s-light-gray-interface-to-18-gray/m-p/15552385)
- **ISO 12608 (related).** The decor in the field of view should give "a generally neutral matte impression, without dominant colours", and surround reflectance is limited to about 10% of monitor peak white — [ISO 12608:1996 sample (iTeh)](https://cdn.standards.iteh.ai/samples/1913/ff1979f9fabd411d8d87402d6b2d07b6/ISO-12608-1996.pdf)
- **ISO 3664:2009** ("Graphic technology and photography — Viewing conditions") includes surround and luminance recommendations for colour monitors when images are viewed without comparison to hardcopy — [iTeh catalogue, ISO 3664:2009](https://standards.iteh.ai/catalog/standards/iso/d156786b-b5d6-4d34-b577-e7465485f01c/iso-3664-2009)
- **ISO 12646** ("Displays for colour proofing — Characteristics and viewing conditions"). Secondary sources disagree on its numbers: one gives 75–100 cd/m² at D65 ([CreativePro](https://creativepro.com/the-darkroom-makes-a-comeback)), another, citing the draft, gives 80–120 cd/m² at D50 ([CreativePro, earlier article](https://creativepro.com/?p=118122)). The excerpt of Amendment 1 (2010) found covers display uniformity, not surround values — [ISO 12646:2008/Amd 1:2010 sample](https://cdn.standards.iteh.ai/samples/53464/97f83bba880a4985b9be5fea8914fa65/ISO-12646-2008-Amd-1-2010.pdf)
- **Broadcast reference viewing.** Surround 5 nits, D65-neutral; room illumination ≤ 5 nits; dark matte surfaces. Light Illusion finds 5 nits "too dim for SDR grading" and prefers the older "10% peak screen luminance, which is nominally 10 nits surround". It names SMPTE, EBU and ITU-R as broadly agreeing on room illumination, wall colours, back-lighting and viewing distance — [Light Illusion, viewing environment](https://lightillusion.com/viewing_environment.html); see also [SMPTE RP 166](https://pub.smpte.org/latest/rp166/rp0166-1995_stable2004.pdf) and [X-Rite, Standard Viewing Need-to-Know](https://www.XRitePhoto.com/documents/literature/en/StandardViewingNTK_EN.pdf)
- **Dark UI conventions.** Common dark-theme guidance uses dark grey (e.g. #121212) with off-white text (#E0E0E0) rather than pure black and white. GNOME's design team proposed that Image Viewer and Photos stay dark whatever the system theme. Apple's HIG suggests slightly darkening images so they don't "glow" in a Dark Mode context — [UX Design Institute](https://www.uxdesigninstitute.com/blog/dark-mode/); [GNOME design issue 53](https://gitlab.gnome.org/Teams/Design/os-mockups/-/issues/53); [Apple HIG, Dark Mode](https://developer-mdn.apple.com/design/human-interface-guidelines/foundations/dark-mode)

### Inferences
- Pure black (#000) makes the image the brightest thing in view, so by anchoring its whites read whiter and its midtones lighter. That inflates perceived contrast and lightness compared with a gallery wall or a print on paper. A dark neutral grey (roughly L* 10–20, about #1a1a1a–#303030) cuts that inflation and still looks "dark". An 18%-type mid grey (L* ≈ 50, about #777) suits judging values best but is brighter than most people want for a slideshow. Recommendation: default to dark neutral grey and offer a surround picker (black / dark / mid grey / light / white), as Lightroom does.
- Theme tokens: the surround token (`--surface-stage` or similar) should be **chroma-zero in every theme**. A theme can tint the chrome, but not the stage behind the image. A warm or cool tinted stage shifts perceived hue in the opposite direction (chromatic simultaneous contrast).
- Don't apply Apple's "darken images in dark mode" advice to an art viewer. Changing the reference image is unacceptable for artists who are judging value and colour.
- The control bar never overlapping the image is good surround practice. The bar should also be low-luminance and neutral so that it doesn't act as a bright, saturated anchor next to the image.

### Gaps
- I couldn't retrieve the exact ISO 12646:2015 and ISO 3664:2009 surround figures (paywalled). The ~10% of peak white figure comes from ISO 12608 and the broadcast practice summary.
- No primary Capture One or DaVinci Resolve documentation on their default UI grey was found. Bartleson–Breneman (surround-dependent contrast) wasn't found in an accessible primary source.

## Museum and gallery display: walls, lighting, labels, museum websites, deep zoom (IIIF)

### Takeaway
Physical galleries mostly use neutrals (white, grey, cream), with deliberate colour for some collections. The wall changes how a work reads: a dark wall makes a painting look lighter. Labels follow a "tombstone" order: artist (often with nationality and life dates), title, date, medium, dimensions, credit line. Museum APIs that LeMuse uses expose these as fields. Cleveland's API even provides a ready-made `tombstone` string. Deep zoom on museum sites is generally done with the IIIF Image API plus OpenSeadragon.

### Cited Findings
- **Tombstone elements** are artist's name, title, date, medium, dimensions and credit line. Some museums put nationality and birth and death dates on the artist line. The credit line "reveals how the object came into the museum's collection" (purchase, bequest, loan, donation) — [Akron Art Museum, What's in a Label?](https://akronartmuseum.org/media/whats-in-a-label/); [Mint Museum](https://www.mintmuseum.org/?p=55384)
- **Menil Collection publishing guidelines** give the order for modern and contemporary works as: artist; title, date; medium; edition if applicable; dimensions; credit line. With dimensions dropped, the same format is used for gallery labels. Antiquities add period and place — [Menil guidelines (PDF)](https://d27m4mjhi8p0i4.cloudfront.net/api/file/Gt0Lg4fXSR60YPZIGKFo)
- **Exhibition labelling guides** stress a consistent format and style across an exhibition, with uniform fonts and spacing — [Museums & Galleries NSW, Exhibition labelling (2026)](https://mgnsw.org.au/wp-content/uploads/2026/05/Exhibition-labelling.pdf)
- **MoMA's open metadata** gives dimensions as Height × Width × Depth (units) — [MoMA artworks schema](https://disquee.github.io/moma-docs/schema/artworks)
- **Cleveland Museum of Art Open Access API** label fields:
  - `tombstone`: "Aggregated information about the artwork", one line combining title, date, artist, medium, dimensions and credit;
  - `title`, `title_in_original_language`;
  - `creators`: a nested list with role, qualifier and biography;
  - `creation_date`: a string, e.g. "1690-1693";
  - `technique`, `measurements`, `creditline` (spelled that way), `culture`, `copyright`;
  - `share_license_status`: "CC0, Copyrighted, or Other";
  - `description`: "approved label text for gallery installations".
  
  Image sizes: web is 900 px on the long side (JPEG), print is 3400 px (JPEG), full is a TIFF of variable size. There is no alt-text field — [CMA Open Access API docs](https://openaccess-api.clevelandart.org/)
- **Wall colour practice.** Curators have moved away from the strict white cube. The Guggenheim's archive palette has 50 neutrals taken from its exhibition walls. Carnegie installers tested five greys for a gallery of small unframed works. Sherwin-Williams advises testing boards against the works under real light and notes "a dark wall will make a painting appear lighter" — [ArtsHub](https://www.artshub.com.au/news/opinions-analysis/how-wall-colour-manipulates-the-audience-258336-2363758/); [Retro Renovation (Guggenheim palette)](https://retrorenovation.com/2012/09/21/50-best-paint-colors-used-on-walls-guggenheim-museum/); [Carnegie Museums](https://carnegiemuseums.org/?p=6927); [Sherwin-Williams, Curating in Color](https://www.sherwin-williams.com/architects-specifiers-designers/inspiration/inspiration-project-profiles/project-profiles-commercial/sw-article-pro-curatingincolor); [MoMA Inside/Out on shifting wall colours](https://production-gcp.moma.org/explore/inside_out/2010/03/11/small-steps-lead-to-bigger-changes-moma-s-shifting-wall-colors/). Caveat: these are mostly practice and industry sources, not controlled studies.
- **IIIF / deep zoom.** The main use of the IIIF Image API is serving low-resolution tiles to deep-zoom viewers such as OpenSeadragon — [IIIF training, Uses of the Image API](https://training.iiif.io/iiif-online-workshop/day-two/uses.html)
  - Art Institute of Chicago shows 100,000+ artworks through IIIF with OpenSeadragon zoom (subject to copyright), and puts the IIIF manifest URL on collection pages — [Gallery Systems](https://www.gallerysystems.com/international-image-interoperability-framework-iiif/)
  - Rijksmuseum runs IIIF Image and Presentation APIs (Image API via Micrio by Q42), offers jpg, png and webp formats, and publishes tile descriptions for deep-zoom viewers — [Rijksmuseum IIIF tutorial](https://acc.data.rijksmuseum.nl/tutorials/iiif/); [Rijksmuseum IIIF Image API](https://acc.data.rijksmuseum.nl/docs/iiif/image)
  - Harvard Art Museums use OpenSeadragon, and their image service needs no key — [Harvard API docs, IIIF](https://github.com/harvardartmuseums/api-docs/blob/master/sections/iiif.md)
  - Getty's Quire publishing tool also supports IIIF zoom — [Getty Quire, Zooming Images](https://quire.getty.edu/docs-v0/zooming-images/)

### Inferences
- **LeMuse label layout.** Line 1 is the creator in a stronger weight, with dates and nationality in a lighter weight. Line 2 is the title in italics (the art-history convention for titles) followed by the date. Line 3 is medium and dimensions in a smaller, muted style. Line 4 is the credit line and source link (Cleveland / Are.na) plus the licence (CC0 badge from `share_license_status`). For Are.na blocks, show the same structure with creator, title and channel, and leave empty fields out rather than printing "Unknown".
- Prefer composing the label from structured fields over Cleveland's `tombstone` string. That gives typographic hierarchy and consistent formatting across sources. Keep `tombstone` as a fallback.
- Cleveland "web" images are only 900 px on the long side, which upscales visibly on a full-window 1440p/4K display. Streaming "print" (3400 px) when the window is large is a quality decision to weigh against bandwidth and preload ≤ 2 (ADR-0007).
- Deep zoom via IIIF would be a natural "study mode", but Cleveland's API doesn't document a IIIF endpoint (not verified here), and AIC is held back for Cloudflare reasons. Treat it as future work.
- **Generous spacing.** Galleries give each work wall space and put the label small and to one side, never on the work. That matches the "control bar never covers the image" rule.

### Gaps
- No primary style guide from the Met, Rijksmuseum or Google Arts & Culture describing their web image or metadata layout was retrieved. Their UI patterns would have to be observed directly.
- No controlled study on gallery wall luminance was found. Cleveland's IIIF availability wasn't checked.

## Colour management on Windows: WebView2/Chromium, ICC, sRGB vs wide gamut, ACM, resampling, HDR

### Takeaway
Since Chromium 62, Chromium's colour-correct rendering is always on, and images with embedded ICC profiles are colour-managed. On Windows the real result also depends on the OS. Under Windows 11 Auto Color Management (ACM) or Advanced Color, apps that aren't colour-aware are mapped into sRGB. Users report wide-gamut-tagged photos showing as sRGB, desaturation on secondary monitors, and fixes that need Chromium flags, which WebView2 can't easily set. LeMuse can't promise colour accuracy. It should tell artists what it can and can't guarantee.

### Cited Findings
- **Windows 11 ACM.** It is "hardware accelerated system level color management" with FP16 composition in the DWM. It needs Windows 11 22H2 (build 22621) or later, a WDDM 3.0 driver, and AMD RX 400 / Intel 12th Gen / NVIDIA GTX 10xx or newer GPUs. Wide-gamut, 10-bit panels are recommended. Apps that don't target wider gamut or HDR are "mapped consistently into sRGB". Previously most apps "simply assumed the industry standard sRGB color space and were never color managed by the OS." ICC-profile-based apps default to sRGB even on wide-gamut monitors unless a "Display ICC profile compatibility helper" is used — [Microsoft DirectX blog, Auto Color Management](https://devblogs.microsoft.com/directx/auto-color-management)
- When Advanced Color is active, Windows' ICC profile APIs return sRGB, so an ICC-aware app colour-manages to sRGB and the OS reproduces that — [Microsoft Learn, Advanced Color ICC profiles](https://learn.microsoft.com/en-us/windows/win32/wcs/advanced-color-icc-profiles)
- **Chromium history.** Colour-correct rendering became always-on in Chromium 62, and Electron later restored a switch to disable it — [Electron patch disable_color_correct_rendering](https://github-redirect.dependabot.com/electron/electron/blob/d8edf84cfc10e6ed4a6d610d72cb9a5aadd1c4c0/patches/chromium/disable_color_correct_rendering.patch). A 2016 Chromium thread said ICC-tagged images were handled on desktop and that untagged images were then treated as display space, not sRGB. That predates the change — [chromium-dev, Color management](https://groups.google.com/a/chromium.org/g/chromium-dev/c/qRLRdgQFcMg/m/WZcwVwDzDAAJ). Chromium's own overview of its colour pipeline is in the W3C colour workshop talk — [Erias, "The path towards richer colors in Chromium" (W3C workshop)](https://www.w3.org/Graphics/Color/Workshop/slides/talk/erias)
- **Field reports (anecdotal):**
  - Chromium browsers don't apply per-display ICC profiles on Windows 11 multi-monitor setups — [Vivaldi forum](https://forum.vivaldi.net/topic/67171/color-management-broken-in-windows-11-with-multiple-monitors)
  - With Advanced Color on, P3- or ProPhoto-tagged photos look sRGB unless the colour space is forced to scRGB — [Brave community](https://community.brave.app/t/broken-30-bit-color-when-acm-enabled-with-scrgb-color-space/641950/)
  - Chrome isn't compatible with Windows 11 Advanced Color out of the box; the `chrome://flags` "Force color profile: scRGB linear" setting fixes it — [Mozilla bug 1882239](https://bugzilla.mozilla.org/show_bug.cgi?id=1882239)
  - WebView2 can't set experimental flags — [LINQPad forum](https://forum.linqpad.net/discussion/comment/7618)
- **Firefox comparison.** Firefox made "treat untagged as sRGB" the default on Windows (bug 1799258) and colour-manages through DirectComposition filter effects. A separate Firefox bug shows Windows ACM affecting the gamma of alpha-blended (rgba) backgrounds — [Mozilla commit 1799258](https://source-hub.etos-pro.ru/mozilla/gecko-dev/commit/9e2d016bd4cf543f5473df8d3e5ca9aa4538e631); [Mozilla bug 1903641](https://bugzilla.mozilla.org/show_bug.cgi?id=1903641)
- **Resampling (`image-rendering`).**
  - `auto` is UA-dependent and the initial value.
  - `smooth` is meant for photos (bilinear-type).
  - `high-quality` is "not supported in any browsers".
  - `crisp-edges` and `pixelated` are nearest-neighbour types for pixel art and line drawings.
  
  Source: [MDN, image-rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering)

### Inferences
- **Practical guidance:**
  - Display images untouched: no CSS filters by default, no `opacity < 1` on the image, and no gradient or vignette overlays on it.
  - Keep `image-rendering: auto` for photos and artworks.
  - Offer `pixelated` only as an optional "inspect pixels" mode at high zoom.
  - Avoid scaling by non-integer device-pixel ratios through CSS transforms where possible.
  - Size the `<img>` with `object-fit: contain` inside the stage.
- **What to tell artists (help or about page).** LeMuse shows images as the web browser engine (Edge WebView2) renders them. Colour accuracy depends on the Windows colour settings and a calibrated monitor. Museum JPEGs are normally sRGB, so on an sRGB-calibrated display, which is the common case, they're shown as intended.
- **Test on a wide-gamut or ACM machine:** a P3-tagged test image, an untagged image, and a second monitor. Record the result in an ADR rather than assuming.
- **HDR.** Museum and Are.na sources are SDR JPEG/PNG/WebP. With Windows HDR on, SDR content is mapped through the SDR-content-brightness slider, so the surround and image brightness depend on that slider. LeMuse should not try to "HDR-ify" anything.
- Saved originals keep their embedded profiles. The Save path writes bytes untouched (ADR-0007), which keeps colour intact for use in Photoshop or Krita.

### Gaps
- I found no official WebView2 document on ICC, colour-space or HDR handling, or on whether WebView2 inherits Edge's colour behaviour. No current (2025–2026) primary Chromium documentation on Windows untagged-image handling was found either, so this needs testing on a real machine.
- I couldn't confirm whether Chromium's `image-rendering: auto` downscale uses mipmaps or Lanczos-quality filtering on Windows (no primary source found).

## Typography and chrome for art apps: restraint, typefaces, label hierarchy, icons, auto-hide, focus/zen, fullscreen

### Takeaway
I found little authoritative research specific to art apps. The established practice is in the sources above: editing tools keep the UI dark, neutral and non-customisable in colour (Lightroom), offer modes that dim or remove everything but the image (Lightroom Lights Out, Full Screen Preview), and museum labels use a strict, consistent hierarchy. For LeMuse that means restrained, neutral, low-contrast-but-legible chrome; a "Lights Out" or zen mode; and label typography that copies museum hierarchy.

### Cited Findings
- **Lightroom Lights Out and Full Screen.** Lights Out dims everything but the image (Screen Color and Dim Level in Preferences > Interface). Full Screen Preview has its own background — [Adobe Help, Lightroom Classic preferences](https://helpx.adobe.com/lightroom/help/setting-preferences-lightroom.html); [Have Camera Will Travel](https://havecamerawilltravel.com/lightroom/lightroom-classic-change-color-behind-image/)
- **Panel colours aren't user-changeable** in Lightroom Classic, so the dark UI is a deliberate product decision — [Adobe Community](https://community.adobe.com/t5/lightroom-classic-discussions/how-to-return-the-program-s-light-gray-interface-to-18-gray/m-p/15552385)
- **Label consistency.** Use consistent fonts, sizes and spacing throughout — [M&G NSW, Exhibition labelling](https://mgnsw.org.au/wp-content/uploads/2026/05/Exhibition-labelling.pdf)
- **Dark-UI text.** Use off-white (e.g. #E0E0E0) on dark grey rather than pure white on black, with muted accent colours — [UX Design Institute](https://www.uxdesigninstitute.com/blog/dark-mode/)
- **Photo-editing practitioners** argue a dark interface is needed for accurate colour perception and less eye strain — [Darkroom design guide (practitioner)](https://blakecrosley.com/guides/design/darkroom). This is a single practitioner source.

### Inferences
- **Typeface:** the Windows system UI face (Segoe UI Variable) for chrome. It needs no font download, which matters for CSP and offline use, and it has good hinting at small sizes. Use italics for titles. Use tabular figures for counters such as "12 / 240".
- **Hierarchy:** at most 3 sizes and 2 weights in the label. Use muted secondary text (about 60–70% luminance of the primary), but it must still meet 4.5:1 (see Accessibility).
- **Icons:** one outline icon family at a consistent stroke, monochrome, with no coloured fills. State goes in shape plus label, not colour alone.
- **Auto-hide.** Because the bar never covers the image, it can stay visible without harming the view. Offer an optional zen or fullscreen mode (F11 / `F`) that hides the bar after an idle period, about 2–3 s is common practice (uncited). Reveal it on mouse move or focus, and **never hide it while it holds keyboard focus** (WCAG 2.4.11 Focus Not Obscured).
- **Fullscreen:** use the Tauri window fullscreen API. Keep the attribution reachable in fullscreen, for example as a small persistent caption, because attribution must always be shown (ADR-0004).

### Gaps
- No NN/g article specific to image viewers or auto-hiding controls was found (the search returned none).
- No primary research on typeface choice for art apps. No timing standard for auto-hide; the 2–3 s figure is convention, not sourced.

## Transitions for image slideshows: cuts vs crossfades, timing, motion reduction

### Takeaway
For accessibility, crossfades (opacity-only) are not "motion animation" under WCAG. A slideshow that advances on its own falls under SC 2.2.2 (Pause, Stop, Hide) and needs a pause control. Movement transitions such as slides, Ken Burns pans and zooms are what `prefers-reduced-motion` should turn off. For study, a hard cut or a short crossfade is best: pans and zooms crop or move the reference, and long fades show two images blended.

### Cited Findings
- **SC 2.3.3 Animation from Interactions** (AAA): "Motion animation triggered by interaction can be disabled, unless the animation is essential." "Motion animation does not include changes of color, blurring, or opacity" that don't change perceived size, shape or position. A page-flip transition is given as a non-essential example that should respect `prefers-reduced-motion`. Techniques: C39 (CSS `prefers-reduced-motion`), SCR40 (the same in JS), and a user preference setting. Animation that starts automatically is covered by SC 2.2.2 instead — [W3C Understanding SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- **SC 2.2.2 Pause, Stop, Hide** (Level A): moving, blinking or scrolling content that starts automatically, lasts more than 5 seconds and is shown alongside other content needs a way to pause, stop or hide it — [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/#pause-stop-hide) (not re-fetched)

### Inferences
- **Default:** a crossfade of about 150–300 ms, or a cut. Under `prefers-reduced-motion: reduce`, use a cut, or keep the short opacity fade, which is allowed. Never add Ken Burns or zoom by default. If it's ever offered, it must be off under reduced motion.
- **Auto-advance.** Play/Pause must be keyboard-reachable (Space). The timer should pause while the user hovers or opens details, and while the window is hidden (Page Visibility API). Offer timed intervals for gesture drawing (30 s / 1 / 2 / 5 / 10 min). This is a core use for artists, and a visible countdown with a progress ring or bar helps.
- Crossfading two images in the stage briefly shows a blend. Keep it short so that no mixed image lingers that could be mistaken for the reference.
- The preload ≤ 2 rule (ADR-0007) means the next image is usually already decoded. `img.decode()` before swapping avoids a flash of the empty surround.

### Gaps
- No empirical source on optimal slideshow transition timing was found. The numbers above are design convention, not research.

## Accessibility for image-centric apps (WCAG 2.2)

### Takeaway
The WCAG 2.2 criteria that matter most here:

| Criterion | Level | Requirement |
|---|---|---|
| 1.4.3 Contrast (Minimum) | AA | 4.5:1 for label and control text |
| 1.4.11 Non-text Contrast | AA | 3:1 for icons, control boundaries and focus indicators against the dark chrome |
| 2.4.7 Focus Visible / 2.4.11 Focus Not Obscured (Minimum) | AA | Focus is visible and not hidden by auto-hiding UI |
| 2.5.8 Target Size (Minimum) | AA | 24×24 CSS px, or spacing equivalent |
| 2.2.2 Pause, Stop, Hide | A | Auto-advance can be paused |
| 2.3.3 Animation from Interactions | AAA | Movement transitions can be disabled |
| 1.1.1 Non-text Content | A | Images have alt text |

Remote images usually have no alt text (Cleveland has no alt field), so alt text has to be built from the label metadata.

### Cited Findings
- **SC 2.5.8 Target Size (Minimum)** (AA, new in 2.2): targets at least 24×24 CSS px. Smaller targets pass if a 24 px circle centred on each doesn't intersect another target or its circle. Exceptions: inline links, user-agent-controlled sizes, and essential or legally required presentation. The AAA criterion 2.5.5 asks for 44×44 — [W3C Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html); [Deque axe rule target-size](https://dequeuniversity.com/rules/axe/4.7/target-size). Note: some third-party pages wrongly label it WCAG 2.1 — [TabNav](https://tabnav.com/academy/wcag/success-criterion-2.5.8)
- **SC 2.3.3, 2.2.2:** see Transitions above — [W3C Understanding SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- **SC 1.4.3** (4.5:1 normal text, 3:1 large text), **SC 1.4.11** (3:1 for UI components and graphical objects), **SC 2.4.7** (focus visible) and **SC 2.4.11** (focus not entirely hidden by author content, AA, new in 2.2) — [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/) (not re-fetched)
- **Cleveland's API documents no alt-text field**, but it provides `title`, `creators`, `creation_date`, `technique` and `description` (approved label text) — [CMA Open Access API docs](https://openaccess-api.clevelandart.org/)

### Inferences
- **Alt text:** `alt="{title}, {creator}, {date}"`, built from metadata and rendered as text (CLAUDE.md: remote input is untrusted, never `innerHTML`). The visible label is the long description, and the image can carry `aria-describedby` pointing to it. For Are.na blocks with no title, use "Image from Are.na channel {channel}, by {user}". Never use the filename.
- **Colour-blind-safe states:** don't use red/green alone for states such as offline, error or saved. Pair colour with an icon or shape and a text label. Keep the stage neutral, which also helps colour-deficient users judge the image without UI hue interference.
- **Contrast check:** muted text tokens on the dark chrome (e.g. #8a8a8a on #1e1e1e ≈ 4.9:1) need checking per theme in `validate:w3c` or a token test. Icon buttons need a 3:1 boundary or icon contrast. Focus rings need 3:1 against both chrome and surround: a 2 px off-white ring plus a dark outer ring works on any surround from black to white.
- Keyboard map: ←/→ (prev/next), Space (play/pause), F (fullscreen), G (greyscale), M (mirror), Esc (exit modes). Show it in a help overlay. Single-key shortcuts need a way to turn them off or remap them (SC 2.1.4 Character Key Shortcuts, Level A; [WCAG 2.2](https://www.w3.org/TR/WCAG22/#character-key-shortcuts), not re-fetched).

### Gaps
- No source specific to accessibility in image-viewer apps was found. The inferences apply general WCAG text to this product.

## Image adjustments for study: greyscale, posterize/notan, grids, mirror, without saving image bytes

### Takeaway
All study adjustments can run as **display-only transforms**: CSS `filter`, SVG filters, CSS `transform` and overlay SVG. These never read pixels or write bytes, so they keep "only Save writes image bytes" intact and avoid canvas CORS tainting. CSS `grayscale()` uses Rec.709 luma weights on gamma-encoded sRGB. That's fast and usually close to perceived lightness, but it is not CIE L* and diverges for saturated colours. A perceptual L* greyscale or histogram-based notan thresholds need per-pixel maths (canvas), which needs CORS-approved images. Otherwise `getImageData` throws.

### Cited Findings
- **CSS `grayscale(amount)`** equals an `feColorMatrix` with rows: R′ = (0.2126 + 0.7874·[1−a]) R + (0.7152 − 0.7152·[1−a]) G + (0.0722 − 0.0722·[1−a]) B, and so on for G′ and B′. These are the Rec.709 coefficients 0.2126 / 0.7152 / 0.0722. `feColorMatrix type="saturate"` uses rounded 0.213 / 0.715 / 0.072 — [W3C Filter Effects Module Level 1](https://www.w3.org/TR/filter-effects-1/)
- **Colour space:** "Filter Functions must operate in the sRGB color space", and `color-interpolation-filters` has no effect on them. SVG filter primitives default to `color-interpolation-filters: linearRGB` — [W3C Filter Effects Level 1](https://www.w3.org/TR/filter-effects-1/)
- **Other filter definitions:** `invert()` is an `feComponentTransfer` table `[amount] (1 − amount)`, and `sepia()` uses the 0.393/0.769/0.189 matrix family — [W3C Filter Effects Level 1](https://www.w3.org/TR/filter-effects-1/)
- **Lightness vs luma:**
  - Luma from non-linear (gamma-encoded) RGB "is not luminance"; true luminance needs linear RGB of known chromaticity — [ColorSync-users list (quoting M. Stone)](https://lists.apple.com/archives/colorsync-users/2006/Nov/msg00037.html)
  - Luma variants are "quite similar" and "not so far from lightness", but diverge at high chroma — [Alec Jacobson, Lightness vs luma vs grayscale vs value](https://alecjacobson.com/weblog/3157.html)
  - In a user study, a CIELAB-based colour-to-greyscale conversion was preferred over a YCbCr luminance approach — [Moonlight review of psychological study on colour-to-grayscale](https://www.themoonlight.io/review/a-psychological-study-importance-of-contrast-and-luminance-in-color-to-grayscale-mapping)
  - CIELAB L* was designed to be linearly related to perceived lightness but may predict poorly at high spatial frequencies — [Kodak/Rochester paper on perceived lightness](https://www.hajim.rochester.edu/ece/sites/parker/assets/pdf/91%20-%20Perceived%20lightness%20difference%20with%20regard%20to%20spatial%20frequency%20and%20amplitude%20modulation.pdf)
  - Artists in traditional media often use other lightness scales, such as Munsell value — [TU Berlin colour text](https://color.li.tu-berlin.de/CEA1/CEA1L0NP.PDF)
- **Canvas taint:** drawing cross-origin image data without CORS approval taints the canvas. `getImageData()`, `toBlob()`, `toDataURL()` and `captureStream()` then throw `SecurityError`. Avoiding it needs `img.crossOrigin = "anonymous"` and an `Access-Control-Allow-Origin` header from the image server — [MDN, CORS-enabled image](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)

### Inferences
- **Greyscale (default, zero-risk):** `filter: grayscale(1)` on the `<img>`. It runs on the GPU and reads no pixels. Label it "Greyscale (luma)" or similar. For a closer match to perceived value on saturated works, an SVG `<filter>` with `color-interpolation-filters="linearRGB"` and an `feColorMatrix` using the 0.2126/0.7152/0.0722 weights computes relative luminance Y in linear light. That output is darker in the midtones than L*, so it needs an `feComponentTransfer` gamma step to look right. An exact L* conversion (L* = 116·f(Y) − 16) needs canvas or WebGL.
- **Posterize / notan (no pixel read):** chain `grayscale` → SVG `feComponentTransfer` with `type="discrete"` and `tableValues="0 1"` (2-value notan), `"0 0.5 1"` (3-value) or `"0 0.33 0.66 1"` (4-value). Add an adjustable threshold by inserting `feComponentTransfer type="linear"` (slope and intercept) before the discrete step, so a slider moves the cut point. All of it is declarative SVG referenced by `filter: url(#notan)`. The spec text for `discrete` wasn't retrieved in this session, but it is part of `feComponentTransfer` (listed as `SVG_FECOMPONENTTRANSFER_TYPE_DISCRETE` in [Filter Effects Level 1](https://www.w3.org/TR/filter-effects-1/)).
- **Auto-threshold (median or Otsu) and histograms** need pixels. Use `crossOrigin="anonymous"` only if each CDN sends ACAO. Cleveland's and Are.na's CDN CORS headers aren't verified here, and the Tauri CSP `img-src` would still apply. Even with pixels read into an in-memory canvas, never `toBlob` or persist them. That keeps "No images in caches" (ADR-0009). If CORS isn't available, fall back to manual thresholds.
- **Mirror:** `transform: scaleX(-1)` on the image only, not on the label. Show a clear "Mirrored" indicator, since artists use mirroring to spot drawing errors and forgetting it is on corrupts the reference.
- **Grid overlays:** draw an absolutely positioned inline SVG sized to the image's **rendered content box**, not the stage. With `object-fit: contain`, compute the letterboxed rectangle from `naturalWidth`/`naturalHeight` and the container size. Options: rule of thirds (lines at 1/3 and 2/3), n×n (2–8), diagonals (corner-to-corner, plus reciprocal diagonals for dynamic symmetry), and centre cross.
  - Use `vector-effect="non-scaling-stroke"` with a 1 px line.
  - Use a two-tone line (dark plus light, or `mix-blend-mode: difference`) so the grid shows on any image.
  - Make the opacity adjustable, and use `pointer-events: none`.
- **Order of operations:** filters on the `<img>`, grid SVG as a sibling overlay, mirror as a transform on a wrapper containing both. That way the grid mirrors with the image, which is correct for drawing comparison.
- **Reset:** one control clears all adjustments. Adjustments should be per-session, view state only, and never written into the catalog as image data.

### Gaps
- Published notan or value-study threshold conventions (e.g. 50% vs median vs Otsu) weren't found. The 2/3/4-value presets above are common art-teaching practice but uncited here.
- Whether the Cleveland CDN and Are.na CDN send `Access-Control-Allow-Origin` wasn't checked. Test with `curl -I` before relying on canvas features.
