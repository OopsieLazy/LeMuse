# Open-source reference-image, viewer and drawing-practice projects: features LeMuse could learn from

Research date: 23 November 2026. Many GitHub pages fetched in this session did not show release dates (the Releases panel came back empty in the captured page), so maintenance status is often "unconfirmed" below. Where a claim comes from general knowledge rather than a source fetched in this session, it sits under Inferences or Gaps and is labelled as such.

## Reference boards, viewers and gesture-drawing timers: what do they do that LeMuse doesn't?

### Takeaway
The closest OSS relative is **SpeedSketch** (MIT, SvelteKit + Tauri), which is almost LeMuse's feature set for local folders: timed "Endless" and "Class" sessions with breaks, scroll-zoom and drag-pan, flip, greyscale/high-contrast/blur filters, an adjustable proportion grid, and pin-on-top. **BeeRef** (GPL-3.0) and **Allusion** (GPL-3.0) are boards or library managers. Their ideas can be borrowed, but their code cannot be reused in an MIT app.

### Cited Findings
- **SpeedSketch** (AvaLovelace1/speed-sketch): timed sessions from local image *or video* references. Videos loop at an adjustable playback speed. Order is alphabetical or shuffled. **Endless Mode** gives a fixed time per reference; **Class Mode** runs a custom schedule with breaks of any length. — [GitHub](https://github.com/AvaLovelace1/speed-sketch)
- SpeedSketch viewer: scroll to zoom, click-drag to pan, horizontal/vertical flip, **Greyscale, High Contrast and Blur filters**, a **modifiable grid overlay** for checking proportions, and light/dark themes. On desktop it can **pin the window on top** and open the reference's folder in the file manager. — [GitHub](https://github.com/AvaLovelace1/speed-sketch)
- SpeedSketch stack and licence: SvelteKit + Tauri (Tailwind, DaisyUI, Bits UI, Lucide), MIT. It ships as a web app and a desktop app. "Pre-built binaries are currently not available." About 500 commits and 20 stars. — [GitHub](https://github.com/AvaLovelace1/speed-sketch)
- Other OSS gesture timers: **ART** (cojuer/ART) loads a folder of JPEG/PNG files with a per-image timer, sort by name or shuffle, and pause/skip/back. **timeshow** (ccorbell) is a Python randomized timed slideshow that reads images from a directory (including subfolders) or from a text file of paths *or URLs*. **Poscure** (lonemagma) is MIT, Python + PySide6 + SQLite, for Windows and Linux. **timedsketches** (davidbragg) is a randomized folder timer with keyboard controls. — [ART](https://github.com/cojuer/ART), [Poscure site](https://poscure.vercel.app/), [Proko thread](https://www.proko.com/community/topics/free-open-source-tool-for-timed-drawing-on-your-computer) (via search summary; licences of ART, timeshow and timedsketches not verified)
- **BeeRef** (rbreu/beeref): GPL-3.0. A canvas board with move, scale, rotate, **flip** and **crop**; **always-on-top mode**; and the option to **turn off the title bar** (frameless). The `.bee` file is a **SQLite database with images embedded as PNG/JPG in an `sqlar` table**, so they can be extracted with the sqlite3 CLI. 375 commits, 40 open issues. — [GitHub](https://github.com/rbreu/beeref)
- BeeRef maintenance: Flathub lists 0.3.3 as current. One directory says the main repo is "pretty much abandoned" and points to a fork (mini-ninja-64/beeref). That claim is undated. I found no 2026 release. — [Flathub](https://flathub.org/apps/org.beeref.BeeRef), [AlternativeTo](https://alternativeto.net/software/beeref/about), [Krita-Artists 0.3.3 thread](https://krita-artists.org/t/beeref-open-source-reference-image-viewer-version-0-3-3/26080)
- **Allusion** (allusion-app/Allusion): GPL-3.0, Electron + TypeScript, described as "a free and open source desktop application for managing your visual library" for artists. It has about 1,940 commits, 907 stars, 83 open issues and auto-update. The README fetched in this session did not list tags, layouts or slide mode. — [GitHub](https://github.com/allusion-app/Allusion)
- **Krita**'s old Reference Images *Docker* was removed in Krita 4.0 and replaced in 4.1 by the Reference Images *Tool*. The docker let you browse an external folder and **sample colours from the reference**. — [Krita docs](https://docs.krita.org/en/reference_manual/dockers/reference_images_docker.html)

### Inferences
- **Highest-value borrowings for LeMuse**, all clean-room, no code reuse:
  1. **Class Mode schedules with breaks** (for example 10×30 s, 5×1 min, a break, 2×5 min). LeMuse already has timed sessions, and a schedule is the step gesture-drawing users expect.
  2. **High-contrast and blur filters**, which LeMuse can add alongside greyscale. Blur shows the big value shapes, and high contrast shows the light/shadow split. Both can be pure CSS `filter:` on the `<img>`, so no pixel reads are needed and the no-canvas/CORS constraint holds.
  3. **Pin-on-top**, which is Tauri `setAlwaysOnTop` and may already be covered by the mini player.
  4. **Frameless or "zen" mode**, as in BeeRef.
- A **colour sampler** (Krita, Oculante) would need pixel reads. That conflicts with LeMuse's "no pixel reads on CORS-less hosts" rule, so drop it, or allow it only for images the user has Saved locally.
- BeeRef's single-SQLite-file board is a neat portable format. LeMuse's equivalent would be exporting a playlist as links only (no image bytes), which already matches the stream-first rule.
- Video references (SpeedSketch) are out of scope for LeMuse's current sources, though Are.na does host video blocks. Note this as a possible future feature, not a recommendation.

### Gaps
- I did not verify PureRef-alikes such as "refboard" or Kuadro (Kuadro is believed to be closed-source freeware), Hydrus Network, TagStudio, or Eagle alternatives in this session. Treat any statements about them as unverified.
- I could not confirm the Krita 5.x Reference Images Tool feature list (opacity, saturation, embed vs link, .krf), because the fetched page covered only the deprecated docker. The same goes for Blender's reference/empty-image features.
- No release dates could be confirmed for SpeedSketch, BeeRef or Allusion from the fetched pages.

## Zoom and pan (feature being built now): libraries, licences and UX conventions

### Takeaway
PhotoSwipe documents a clear three-level model: **initial = fit, secondary (click or double-tap) ≈ 2.5× fit, max = 4× fit**, with plain-wheel zoom off by default. Oculante adds **number keys for 1×–5×** and a **"V" to reset**. `react-zoom-pan-pinch` is MIT and widely used, but its maintenance signals conflict. A hand-rolled CSS-transform zoom is small and avoids a dependency.

### Cited Findings
- **PhotoSwipe zoom model.**
  - Levels: `initialZoomLevel` is the zoom on open; `secondaryZoomLevel` is used when the user clicks the zoom button, double-taps or clicks the image; `maxZoomLevel` is the most pinch, ctrl-wheel or trackpad can reach.
  - Values: a number (`1` = original pixels), `'fit'`, `'fill'` (like `background-size: cover`), `'vFill'`, or a function that receives the element size and pan-area size.
  - Defaults: **initial `fit`; secondary 2.5× of fit, capped at 3000 px wide; max 4× of fit**. `fit` and `fill` never exceed the original size.
  - Source: [PhotoSwipe: Adjusting zoom level](https://photoswipe.com/adjusting-zoom-level/)
- **PhotoSwipe input conventions.**
  - Wheel: `wheelToZoom` is off by default, so zoom needs **Ctrl + wheel** and the plain wheel is left free.
  - `padding` reserves slide-area space, and `paddingFn` can make it dynamic.
  - `closeOnVerticalDrag` defaults to true.
  - Source: [PhotoSwipe options](https://photoswipe.com/options/)
- **Oculante** (Rust, MIT apart from GPL LUTs in `res/LUT`).
  - Zoom keys: wheel zoom; **Minus/Equals** zoom out/in; **1 = actual size, 2–5 = 2×–5×**; **V resets the view**; plus "fit image to view".
  - Other keys: Left/Right for prev/next, Home/End for first/last, **Z for zen mode**, I for an info panel with pixel colour and a histogram.
  - Compare mode switches images **while keeping zoom level and position**.
  - It is in maintenance mode while a rewrite (`oculante-next`) is under way.
  - Source: [GitHub](https://github.com/woelper/oculante)
- **react-zoom-pan-pinch** (BetterTyped). Licence and activity: MIT, about 2k stars, about 540 commits, 1 open issue; the README shows `initialScale`, `zoomIn`, `zoomOut` and `resetTransform` via `useControls`. — [GitHub](https://github.com/BetterTyped/react-zoom-pan-pinch)
- **react-zoom-pan-pinch** maintenance. Snyk once rated it "inactive" (health 74/100) with about 930k weekly downloads, while an earlier Snyk snapshot rated it "Sustainable" (82/100). The snapshots conflict. — [Snyk advisor](https://dev.snyk.io/advisor/npm-package/react-zoom-pan-pinch), [npm-compare](https://npm-compare.com/panzoom,react-zoom-pan-pinch)
- **panzoom** (unscoped, anvaka) 9.4.3 was last published "3 years ago" per Snyk. It is MIT. — [Snyk](https://snyk.io/advisor/npm-package/panzoom)
- **SpeedSketch** uses scroll-to-zoom and click-drag-to-pan in a Tauri app, with the grid overlay as a separate feature. — [GitHub](https://github.com/AvaLovelace1/speed-sketch)

### Inferences
These implementation notes for LeMuse are my synthesis, not verified against a single source.
- **Zoom levels:** adopt PhotoSwipe's model. Fit is the default; **double-click toggles fit ↔ 1:1** (or 2.5× fit when the original is smaller than the screen); max is about 4× fit or 8× original, whichever is larger, so line work can be inspected.
- **Wheel:**
  - In the main slideshow the wheel is free, so Ctrl+wheel or a plain wheel can zoom. LeMuse has no vertical scroll in single-image view, so plain-wheel zoom is acceptable there.
  - In the grid, require Ctrl.
  - Always **zoom toward the cursor**: keep the image point under the pointer fixed. The maths is `t' = p − (p − t)·(s'/s)`.
- **Keyboard:** `+`/`=` and `−`, `0` = fit (Photoshop and browser convention), `1` = 100% (Oculante convention). Use arrows to pan when zoomed in, and keep arrows for prev/next when zoomed out. Esc resets.
- **Pixel-peeping:** above 100%, switch to `image-rendering: pixelated`, or leave smoothing on by default for photos with an opt-out. Below 100%, keep smoothing.
- **Reset on next image:** reset zoom and pan per image, as PhotoSwipe does. Pause the session timer while zoomed? Optional; most timers don't. Oculante's compare mode is the exception that *keeps* zoom.
- **Overlays:** the proportion grid and any rule-of-thirds or crop overlay should sit **inside the transformed element**, so they zoom and pan with the image. Fixed HUD elements (timer, attribution) should not. Put attribution outside the transform so it is always visible (ADR-0004 attribution).
- **Clamp panning** so the image cannot leave the viewport entirely (`limitToBounds` behaviour). Add momentum only if cheap; it matters for touchpads and touch, less for a mouse.
- **Zoom source resolution:** when zoom passes the displayed variant's native width, Are.na `large`/`medium` variants will look soft. Consider swapping the `src` to `original` once zoom > 1 relative to the variant. This streams on demand and writes no cache, so it stays within ADR-0007, but count it against the "preload ≤ 2" rule (it is a fetch, not a preload).
- **Library choice:** `react-zoom-pan-pinch` is MIT and would pass the licence check, but its mixed maintenance signals, plus LeMuse's 14-day cooldown and audit gate, favour a **small hand-written hook**: pointer events, wheel and a `transform: translate() scale()` on one element, roughly 150 lines with no dependency. It adds no supply-chain surface, and CSS filters and the grid overlay compose naturally.
- **Minimap:** when zoom is above about 2×, show a small thumbnail with a viewport rectangle (the navigator used by nomacs, Photoshop and OpenSeadragon). This is optional, because it needs a second `<img>` of the same CDN URL, which the browser's in-memory cache serves.

### Gaps
- I did not fetch the react-zoom-pan-pinch prop docs (doubleClick modes, MiniMap, KeepScale) or its npm page (it returned 403), so the latest version, date and React 19 peer support are unconfirmed.
- I did not verify @panzoom/panzoom (timmywil), OpenSeadragon (BSD-3, deep zoom/IIIF), Viewer.js, ImageGlass, qView, nomacs, JPEGView or vimiv in this session.
  - OpenSeadragon matters only if a museum source exposes IIIF tiles. Cleveland's Open Access API exposes IIIF image URLs (to check), so deep zoom of museum masters is a possible future feature.

## Virtualised and justified grids (feature being built now)

### Takeaway
Flickr's **justified-layout** (MIT) is a pure function from aspect ratios to `{top, left, width, height}` boxes, which pairs naturally with a row-level virtualiser such as **TanStack Virtual** (headless, React adapter). Google Photos' 2018 write-up is the canonical reference for keeping huge justified grids fast.

### Cited Findings
- **flickr/justified-layout**: MIT. Input is an array of aspect ratios (`[0.5, 1.5, 1, 1.8, …]`) plus an optional config; output is `{containerHeight, widowCount, boxes:[{aspectRatio, top, left, width, height}]}`. Supports `fullWidthBreakoutRowCadence` (a periodic full-width hero row, as on Flickr album pages). 1.6k stars, 65 commits, 5 open issues; CI still points at legacy travis-ci.org (a low-activity sign). — [GitHub](https://github.com/flickr/justified-layout)
- **Google Photos web grid** (Antin Harasymiv, 2018): accepts varying row heights in a justified layout. The old Google+ Photos became sluggish after 1,000–2,000 photos. — [Medium (Google Design)](https://medium.com/google-design/45b714dfbed1) (403 on direct fetch; summarised via [search results](https://timkadlec.com/saved/2018/07/building-the-google-photos-web-ui-google-design-medium)); 2016 reverse-engineering: [Dan Schlosser](https://medium.com/@danrschlosser/building-the-image-grid-from-google-photos-6a09e193c74a); CSS-only aspect-ratio variant: [CodePen blog](https://blog.codepen.io/?p=21010)
- **TanStack Virtual**: a headless virtualiser with adapters for React, Vue, Svelte, Solid, Lit and Angular. Vertical by default, horizontal optional, and both axes combined give grid virtualisation. API: `useVirtualizer({count, getScrollElement, estimateSize})`, `getVirtualItems()`, `getTotalSize()`. — [TanStack Virtual docs](https://tanstack.com/virtual/latest/docs/introduction)
- **Allusion** (an Electron library manager for artists) is the closest OSS artist-library comparator, though its README did not confirm its layout modes. — [GitHub](https://github.com/allusion-app/Allusion)

### Inferences
These are implementation notes for LeMuse, synthesised from the sources above and my general knowledge of the Google Photos article.
- **Layout pipeline:**
  - LeMuse needs each slide's aspect ratio *before* the image loads, or rows reflow. Are.na v3 image blocks and Cleveland records usually carry width and height, so store them in `block_media` (a migration, if not already present) and fall back to 1:1 or 4:3 until known.
  - Run justified-layout (or a roughly 60-line clean-room equivalent) over the ratios at the container width.
  - Group the boxes into **rows** and virtualise **rows**, not items. Each row's height is known exactly from the layout, so TanStack's `estimateSize` can be exact and no dynamic measuring is needed.
- **Sections:** Google Photos splits the grid into sections, estimates heights for unloaded sections, then corrects them. LeMuse's analogue is per-source or per-channel sections inside a topic, or "page N" blocks from lazily loaded API pages. Lazy pages map naturally to section placeholders.
- **Thumbnail size slider:** change `targetRowHeight` (for example 120–360 px) and re-run the layout. Keep the *first visible item* anchored when the slider moves (compute the item's new `top` and set `scrollTop`). This also gives **scroll-position restore**: persist `{topic, firstVisibleIndex}` in localStorage or state, not a pixel offset, because pixel offsets break when the width changes.
- **Image variant:** in the grid, use the smallest CDN variant (Are.na `thumb` or `medium`; Cleveland `web`). Set `loading="lazy"`, `decoding="async"` and explicit `width`/`height`. The virtualiser already bounds the DOM, so the browser memory cache stays bounded, which fits the no-disk-cache InPrivate WebView.
- **Placeholders:** draw a neutral box (theme token) while loading. Google Photos uses dominant colours, which LeMuse cannot compute without pixel reads, unless the source API provides a colour (Are.na and Cleveland don't, as far as I know).
- **Keyboard navigation:** with a justified layout, arrow up/down must pick the box in the adjacent row whose horizontal centre is nearest. Use roving `tabindex`, Enter opens the slide at that index, and Esc returns to the grid at the same item.
- **Alternative to a JS virtualiser:** CSS `content-visibility: auto` with `contain-intrinsic-size` on each row is a near-zero-code option for a few thousand items. It is supported in Chromium/WebView2. A real virtualiser is safer for topics with tens of thousands of items.
- **Licence:** justified-layout is MIT, so it is reusable. TanStack Virtual is (I believe) MIT; to confirm.

### Gaps
- I could not fetch the Google Photos article text (403), so its specifics (section height estimation, the scroll "scrubber", segment recycling) are from memory and not cited here.
- I did not verify react-virtuoso, PhotoPrism or Immich grid implementations, the TanStack Virtual licence or version, or the justified-layout last release date. The flickr.github.io docs page with the full option list (`targetRowHeight`, `boxSpacing`, `containerPadding`, `maxNumRows`, `showWidows`) was not fetched.

## Tray icon and autostart (feature being built now)

### Takeaway
The official `tauri-plugin-autostart` writes the **current exe path at the moment `enable()` is called** to the Windows `Run` key, via the `auto-launch` crate. There are three practical traps for LeMuse:
1. The plugin docs now list **Rust ≥ 1.90**, while LeMuse's CLAUDE.md says 1.89+.
2. `auto-launch` 0.6 by default **tries HKLM first** and falls back to HKCU.
3. A moved or portable exe leaves a stale `Run` entry unless the app re-registers on launch.

### Cited Findings
- **Plugin API.** JS has `enable()`, `disable()` and `isEnabled()` from `@tauri-apps/plugin-autostart`; Rust has `app.autolaunch()`.
  - Permissions: `autostart:allow-enable`, `allow-disable` and `allow-is-enabled`; the default set grants all three, and commands are blocked unless a capability file grants them.
  - `init` accepts **extra launch args** (such as `--minimized`).
  - The docs say **Rust 1.90 or later** and say to initialise only under `#[cfg(desktop)]`.
  - Source: [Tauri autostart docs](https://v2.tauri.app/plugin/autostart)
- **Path written.** The plugin source on Windows calls `builder.set_app_path(&current_exe.display().to_string())`. The app name comes from config or the package name, args are passed through, and there is **no `set_windows_enable_mode` call**. `disable()` treats a registry "not found" as success. On Linux it prefers the AppImage path. — [plugins-workspace autostart/src/lib.rs](https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/autostart/src/lib.rs)
- **auto-launch crate** (0.6.0, MIT): on Windows it writes to `HKLM\…\CurrentVersion\Run` (system-wide, needs admin) or `HKCU\…\CurrentVersion\Run`. **By default it tries the system-wide key first and falls back to current-user** if it lacks permission. `WindowsEnableMode` changes this. — [docs.rs auto-launch](https://docs.rs/auto-launch/latest/auto_launch/)
- **LocalSend** bug report: its "Autostart: Start hidden" didn't work on Windows, because the Run entry **lost its argument when the install path contained spaces**. Quoting the path fixed it. — [LocalSend issue #1293](https://github.com/localsend/localsend/issues/1293) (seen via a mirror in search results; fix status unconfirmed)
- **Trilium Notes** conventions, a good documented reference:
  - Tray icon on by default.
  - **Left-click toggles hide/show** of the last window.
  - **Right-click menu** offers show/hide windows, new window, quick actions, recent items and **Quit**.
  - **Close to tray is off by default**; when on, closing the last window hides it.
  - **"Start minimized to tray" only works when "Launch on startup" is on, and manual launches are unaffected.**
  - Source: [Trilium docs](https://docs.triliumnotes.org/user-guide/setup/desktop/tray-icon-and-startup)
- **PictoPy** PR (a Tauri 2 app) combines the pieces: it intercepts `CloseRequested` to hide, configures autostart with `--minimized`, hides the main window on a minimised start, and builds a tray with Show/Quit and left-click to show. It was tested on Windows. — [PictoPy PR #1301](https://github.com/AOSSIE-Org/PictoPy/pull/1301) (via search summary)
- **Windows issue:** Tauri issue #9504 (April 2024) reports the close handler failing after minimise/maximise on Windows. Its current status is unverified. — [tauri#9504](https://www.github.com/tauri-apps/tauri/issues/9504)

### Inferences
These are implementation notes for LeMuse.
- **Toolchain:** check the plugin version that passes the 14-day cooldown against LeMuse's Rust floor (1.89). Bump the floor (and the CLAUDE.md line, a guardrail file) or pin an older plugin.
- **Registry scope:** HKLM-first behaviour would be wrong for a per-user NSIS install. Confirm in `Cargo.lock` which `auto-launch` version the plugin pulls and whether its default mode is HKLM-first. If it is, either wrap `auto-launch` directly with `WindowsEnableMode::CurrentUser`, or write `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` yourself (a small `winreg` call, avoiding the plugin and its capability). An unprivileged process falls back to HKCU anyway, but an elevated first run could write HKLM.
- **Stale path and portable builds:** on every launch, if the autostart setting is on, read the `Run` value. If its exe path ≠ `current_exe()`, rewrite it (call `disable` + `enable`, or write directly). Also **quote the path** in the value (`"C:\…\LeMuse.exe" --minimized`), per the LocalSend bug. Add a unit test on the value string.
- **Task Manager toggle (unverified, general knowledge):** when a user disables the startup entry in Task Manager, Windows records it under `HKCU\…\Explorer\StartupApproved\Run` and leaves the `Run` value in place. So `isEnabled()` can report true while Windows will not launch the app. Either read StartupApproved to show "disabled in Windows settings", or document the limitation.
- **Tray and close conventions (Trilium, PictoPy):**
  - Make **close-to-tray opt-in**, or show a one-time notice ("LeMuse is still running in the tray; change this in Settings") on the first close-to-tray.
  - Left-click the tray icon to toggle show/hide; right-click for a menu: Show, Next image / Pause, Mini player, Refresh, Settings, **Quit**.
  - Apply `--minimized` only when the app is launched by autostart; manual launches always show the window.
- **Least privilege:**
  - Tray creation can live entirely in Rust, which needs no JS `tray:` capability.
  - Expose only `autostart:allow-enable/disable/is-enabled` (or a custom Rust command instead of the plugin), and note it in the ADR.
  - A tray menu "Refresh" must call the shared `SyncEngine::run` path (CLAUDE.md architecture rule).
- **Single instance:** pair autostart with `tauri-plugin-single-instance`, so a manual launch while hidden in the tray focuses the existing window instead of starting a second process. This matters especially for the SQLite catalog lock.

### Gaps
- I did not verify Flameshot, ShareX, Syncthing tray, Spacedrive or Clash Verge tray conventions directly. The LocalSend fix status is unknown.
- I did not confirm the exact `auto-launch` version pinned by the current `tauri-plugin-autostart` release, or whether it quotes paths containing spaces.

## Photo-manager features that could work locally and privately (ranked adoption list)

### Takeaway
Immich's CLIP "smart search" is the standout transferable idea ("more like this" or text-to-image search over the catalog). For LeMuse, though, it would mean downloading every image's bytes in Rust to embed them, plus a model of 40 MB–1 GB. Licence matters: **Apple MobileCLIP weights are under a research-only licence (apple-amlr)**. OpenAI CLIP ViT-B/32 (MIT) or the OpenCLIP/LAION variants are the MIT-compatible choices.

### Cited Findings
- **Immich smart search:**
  - Uses CLIP-style embeddings in Postgres via the **VectorChord** extension, for freeform search without metadata keywords.
  - The model can be switched in admin settings: English-only CLIP models, multilingual `nllb` (query in a set language), and `xlm`/`siglip2` (any language). A switch requires re-running the Smart Search job.
  - Other filters: OCR text, tags, star ratings, favourites, albums and path.
  - Source: [Immich smart search docs](https://docs.immich.app/features/smart-search)
- **Immich model costs:** in the docs' benchmark tables, ViT-B-32__openai uses about **1,004 MiB** of memory at about 2.26 ms, with 59.37% recall (older table). The multilingual XLM-Roberta-Base-ViT-B-32 uses about **3,030 MiB**. Recall figures differ between doc versions. A third-party guide says the default is ViT-B-32__openai (not confirmed in official docs). — [Immich searching docs](https://docs.immich.app/features/searching), [immich-app HF CLIP collection](https://huggingface.co/collections/immich-app/clip), [ViT-B-32__openai card](https://huggingface.co/immich-app/ViT-B-32__openai/blob/main/README.md)
- **MobileCLIP:**
  - Apple's model card lists the licence as **apple-amlr**. A third-party page describes it as research-purposes-only, excluding "use in any commercial product or service". One community ONNX repo mislabels it MIT. The sources conflict, so read Apple's text before use.
  - Sizes: MobileCLIP-S0 is about 11.4M image + 42.4M text parameters. ONNX vision models are about 43–45.5 MB in FP32 and down to about 11.8 MB quantised. Embeddings are 512-d.
  - Sources: [apple/mobileclip_s0_timm](https://huggingface.co/apple/mobileclip_s0_timm/blob/main/README.md), [apple/ml-mobileclip](https://github.com/apple/ml-mobileclip), [Mixpeek](https://mixpeek.com/models/mobileclip), [Ahmed107 ONNX](https://huggingface.co/Ahmed107/apple_MobileCLIP-S0/tree/main/onnx), [felixhrdyn MobileCLIP2-S0 ONNX](https://huggingface.co/felixhrdyn/mobileclip2-s0-onnx), [plhery MobileCLIP2 ONNX](https://huggingface.co/plhery/mobileclip2-onnx)
- **Oculante** keeps an in-memory image cache and has a "flipbook" stepping mode; zen mode hides the UI. — [GitHub](https://github.com/woelper/oculante)

### Inferences
The ranked list below weighs value for drawing and reference practice against fit with LeMuse's constraints.

1. **Class-mode session schedules with breaks** (SpeedSketch). High value, low cost, no new deps or permissions. Clean-room; SpeedSketch is MIT anyway.
2. **More study filters via CSS: high-contrast, blur and posterise-like contrast** (SpeedSketch). High value, tiny cost, and no pixel reads because they are CSS `filter`.
3. **Double-click fit↔1:1, number-key zoom levels, zoom-to-cursor, overlays that zoom with the image, src upgrade to `original` past 100%** (PhotoSwipe, Oculante). This belongs in the current zoom work.
4. **Thumbnail-size slider + anchored scroll restore + justified rows** (Flickr, Google Photos). This belongs in the current grid work. justified-layout is MIT if reused.
5. **Zen/frameless mode and pin-on-top** (BeeRef, Oculante, SpeedSketch). Low cost.
6. **Quoted, self-healing Run entry + `--minimized` + opt-in close-to-tray with a one-time notice** (Trilium, LocalSend, PictoPy). This belongs in the current tray work.
7. **Compare mode that keeps zoom/pan across two images** (Oculante), useful for comparing a reference with the user's own drawing. A "load my drawing" feature would only *read* a local file the user picks, never write one. Medium cost.
8. **Star ratings or colour labels on slides** (Immich ratings; digiKam colour labels, unverified). Local state, like playlists, so no remote writes. Medium cost.
9. **Local "more like this" with CLIP.** High value but high cost and in tension with constraints:
   - It needs image bytes, fetched in Rust through `HttpClient`, embedded in memory and discarded (no file written), so the "no image caches" rule can still hold.
   - Embedding a whole topic is a bulk download, which risks Are.na's "paginate, don't enumerate" and rate-budget rules (ADR-0004). Limit it to on-demand embedding of the current page, or to museum sources.
   - Choose MIT/Apache weights (OpenAI CLIP ViT-B/32 or OpenCLIP), not MobileCLIP (apple-amlr).
   - Runtime via `ort` (ONNX Runtime) adds a native dependency plus 100–350 MB of model.
   - Defer until the owner decides scope; this is owner-gated.
10. **Deep zoom of museum masters via IIIF/OpenSeadragon.** Niche; only if Cleveland exposes IIIF tiles (unverified). It would need a new CSP host.
- **Not recommended:**
  - Colour picking, dominant-colour placeholders and duplicate detection all need pixel reads or full downloads, which break the CORS and no-cache constraints.
  - Embedded-image boards (BeeRef `.bee`) would store image bytes.
- **Licence summary:** clean-room is fine for everything. Code reuse is possible only from MIT/BSD/Apache projects: SpeedSketch (MIT), justified-layout (MIT), react-zoom-pan-pinch (MIT), panzoom (MIT), auto-launch (MIT), Oculante (MIT apart from GPL LUTs). **Do not copy code from BeeRef, Allusion or Krita (GPL).**

### Gaps
- I did not verify digiKam (Haar similarity, colour labels), darktable lighttable culling, PhotoPrism, Spacedrive, Hydrus or TagStudio feature lists in this session.
- I did not confirm Immich's current default model name in official docs.
- I did not check OpenAI CLIP or OpenCLIP weight licences or ONNX sizes in this session (believed MIT for OpenAI CLIP code and weights; to verify).
- I found no source on whether Are.na v3 or the Cleveland API return image width/height or dominant colour. The grid's aspect-ratio-before-load plan depends on it, so check against the connector fixtures in `crates/lemuse-core/tests/fixtures/`.
