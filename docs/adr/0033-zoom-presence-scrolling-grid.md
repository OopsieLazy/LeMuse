---
status: proposed
date: 2026-11-23
decision-makers: owner
consulted: admin pass, developer pass, research (reports/LeMuse post launch gap audit.md, reports/LeMuse web app sources and features.md)
informed: —
---

# ADR-0033: Zoom and pan, LeMuse in the tray, and a grid that scrolls on

## Context

The owner asked (2026-11-23): "1. Add zoom 2. start presence 3. scrollable grid view". The gap audit found
zoom to be the most-requested missing feature across reference tools (GestureFlow, the itch.io Gesture App, Draw
Gestures, BeeRef). LeMuse already streams Cleveland's 3,400 px prints on big windows but can't look into them.
It is built to run in the background (mini player, auto refresh), yet closing the window ends it and it can't
start with Windows. The grid view (ADR-0029) shows one page of 500; a topic of 3,000 needs the page menu.

Constraints: stream-first, no image caches, only Save writes image bytes (ADR-0007, ADR-0009); least-privilege
capabilities (ADR-0011); dependencies ≥ 14 days old; a portable build that can be moved (ADR-0031 §8).

## Decision

1. **Zoom is a CSS transform on the image and its study grid**, driven by pure maths in `app/src/zoom.ts`:
   `translate(pan) scale(s)` first, then any mirror or turn (`--turn`), so the grid lines stay on the same
   features and the point under the pointer stays under it. Wheel (non-passive listener, so a touchpad pinch
   doesn't zoom the page), two-finger pinch and drag use pointer events in `SlideshowView`, batched to one
   update per frame. Double-click toggles 2.5× and fit; `=`/`+`, `-` and `Z` are changeable shortcuts. Scale
   is 1–8×; pan stops where the image's edge meets the frame's edge. Each new image, the grid, the mini
   player, a new fit and a resize start at fit. A badge shows the level with a **Fit** button.
2. **The view passes zoom through a `style` attribute** (`--zoom`, `--pan-x`, `--pan-y`) on the frame. This is
   the one kind of inline style the pure view uses besides the context menu's position: numbers only, computed
   here, never remote text.
3. **Sharper while zoomed:** past 1.2× the stored `original` size of that one image is decoded in memory
   (`new Image().decode()`, like a preload) and swapped in once ready, with the usual size first in its
   fallbacks. Nothing is written; the WebView stays InPrivate. It's one image, only on the user's zoom, so the
   "preload ≤ 2" budget holds.
4. **Presence lives in Rust** (`app/src-tauri/src/presence.rs`), with no new page permissions:
   - the tray icon (Tauri's built-in `tray-icon` feature): left click shows or hides LeMuse; the menu has
     Show, Next image, Play or pause, Mini player, Refresh now, Quit. Page actions arrive as `tray://action`
     events (`core:default` already allows listening);
   - **start with Windows**, off by default: one per-user value,
     `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\LeMuse = "<exe>" --tray` (quoted, so folders with
     spaces work; never the machine-wide key). Task Manager's "Disabled" (`StartupApproved\Run`, odd first
     byte) counts as off, and turning it on here clears that mark. At launch, a value whose exe no longer
     exists (a moved portable folder) is re-pointed at this exe; a value for another copy that still exists
     is left alone and Settings says so;
   - **keep running in the tray when closed**, off by default (Trilium's convention): `CloseRequested` is
     prevented and the window hidden. The choice lives in `ui.json` (`closeToTray`), read by Rust at launch
     and mirrored by a command on every change;
   - the window is created hidden (`"visible": false`) and shown in `setup`, unless Windows started LeMuse
     with `--tray` and the tray icon exists. The single-instance hand-off shows it too.
   - Three commands: `presence_status`, `set_autostart`, `set_close_to_tray`.
5. **The grid scrolls on:** near its end it loads the next page (500) through the same `slides` call, one
   page at a time, and appends it; any change of view, page, filter or refresh starts over. Picking an image
   on a later page sets that page and shows the image through the "remember where you were" path. The grid
   opens at the current image with keyboard focus there; arrow keys move, Enter picks; three thumbnail sizes
   (`gridSize` in `ui.json`). Cells are square (`aspect-ratio: 1`) so a skipped `content-visibility` cell is
   exactly as tall as a drawn one.

## Options considered

### Zoom: own transform maths (chosen) vs a library

| Dimension | Own maths (`zoom.ts`) | react-zoom-pan-pinch / @panzoom/panzoom |
|---|---|---|
| Complexity | Med (≈150 lines, unit-tested) | Low to wire, but its transform would fight the mirror and grid transforms |
| Cost | None | A new dependency (cooldown, audit); health reports conflict for react-zoom-pan-pinch |
| Fit | Composes with `--turn`, study filters, cover fit | Wraps the element; mirror/turn need rework |

### Autostart: direct per-user Run value (chosen) vs `tauri-plugin-autostart`

| Dimension | Direct (`winreg`, already in the tree) | Plugin 2.5.1 |
|---|---|---|
| Permissions | None for the page | Adds `autostart:*` JS permissions |
| Scope | Always per-user (HKCU) | Its `auto-launch` crate tries HKLM first on an elevated run |
| Moved exe | Healed at launch | Stores the path at enable time |
| Toolchain | Rust 1.89 is fine | Needs Rust 1.90 |

### Grid: append pages (chosen) vs virtualise the whole view

A virtualised justified layout (TanStack Virtual + Flickr's justified-layout) needs every image's aspect
ratio up front and two dependencies. Appending pages of 500 with `content-visibility` keeps the existing data
path and stays light; revisit if a view of tens of thousands feels slow.

## Trade-off analysis

All three features reuse paths that already exist (the transform the study aids use, the `slides` call and the
restore path, the single-instance hand-off). The tray and autostart add Rust code but no page permissions, which
is the cheaper review. Defaults stay as they were: closing still quits and nothing starts with Windows until the
user says so.

## Consequences

- Easier: looking into museum prints; LeMuse as an ambient app (start in the tray, keep playing when closed);
  browsing a whole topic in one scroll.
- Harder: the window starts hidden (a setup failure before `show` would leave no window; the tray-less case is
  always shown). A zoomed image is larger than its frame, so the layout test checks the frame's clipping
  instead (a guardrail file, listed for the owner).
- Revisit when: pinch on touch screens needs momentum; a view is so large the appended grid slows down; the
  portable build and an installed build both want to start with Windows.

## Action items

1. [x] `zoom.ts` + unit tests; view handlers; keys; badge; sharper size in memory
2. [x] `presence.rs`: tray, autostart (HKCU), close-to-tray, hidden start; Settings → Windows
3. [x] Grid paging, sizes, keys, focus; square cells
4. [x] Snapshot states: zoomed, zoomed-cover, grid sizes, Settings → Windows (W3C + layout test)
5. [ ] Owner: try the tray, start with Windows and a moved portable folder on the test build

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-23 | Claude | drafted | |
| Admin pass | 2026-11-23 | Claude (architect role) | see review 0026 | A-… |
| Developer pass | 2026-11-23 | Claude (developer role) | see review 0026 | D-… |
| Owner gate | | Owner | pending | |
