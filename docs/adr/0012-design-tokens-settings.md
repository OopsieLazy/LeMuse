---
status: accepted
date: 2026-11-17
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0012: Design tokens, a Settings panel, fullscreen, and hideable controls

## Context

The owner liked the PR #3 layout (Q12) and asked for (2026-11-17):

1. Tokenize all layout, colour and font values for easy changes; do a pass to check what can and can't be
   tokenized.
2. Images go fullscreen.
3. Images must not run under the play/pause bar, and the bar must be hideable.
4. A Settings button: sliders for styling, movable parts or a few layouts for different aesthetics, themes
   ("highly customizable").
5. Thoughts on a button to import or search for channels, and on a built-in web browser. Keep the app slim.

## Decision

### Tokens (1)

One file, `app/src/theme/tokens.css`, holds every visual value as a semantic token (colour, type, space,
layout, shape, elevation, motion, layers). Components read only tokens. The inventory and the audit are in
[docs/design/tokens.md](../design/tokens.md). The only literals left are the 720 px breakpoint (custom properties
can't be used in media queries), 1 px hairlines, structural values, icon geometry, and the per-slide duration
(data).

### Settings panel (4)

A native `<dialog>`, opened with the gear button or `,`. All changes apply live.

| Group | Controls |
|---|---|
| Look | 5 themes: **Studio** (the liked default; follows light/dark), **Gallery**, **Blueprint**, **Paper**, **Millennium** (y2k chrome). Light/dark/system. 4 typeface sets (system fonts only). Accent colour picker. Interface size and corner rounding sliders |
| Layout | 5 arrangements: Studio, Topics on the right, Controls on top, **Cinema** (edge-to-edge image, topics in a drawer), **Minimal**. Topic list width slider. "Hide topics in fullscreen" |
| Image | Fit: whole image or fill the frame. Space-around and shadow sliders |
| Slideshow and controls | Seconds per image (or each topic's own). Toggles for timer, slide number/size and creator. Hide the bar; auto-hide when the mouse rests |

**Persistence:** `<library>/ui.json` via the core (`lemuse_core::ui_settings`, atomic write, 16 KiB cap). It
can't use browser storage, because the WebView runs InPrivate (ADR-0009, A-17). Saved values are untrusted:
`sanitize()` whitelists every option and clamps every number. Only validated numbers and `#rrggbb` colours
reach CSS.

### Fullscreen (2) and the control bar (3)

- **F** or the button toggles real window fullscreen (Tauri `setFullscreen`). Esc leaves it. In fullscreen the
  topic list becomes a drawer (**T**).
- **The image never runs under the bar.** The image sits in a single grid cell sized by the space the bar
  leaves. It shrinks to fit and can't overflow. The bar never overlays the image, even in Cinema, so hiding the
  bar gives the image the room back.
- **H** or the chevron hides the bar. A small "show controls" button stays in the corner. Auto-hide is optional.
- A **layout test** proves it: 18 UI states × 5 window sizes in headless Edge (no network, no screenshots,
  DOM measurements only). It fails if the image leaves its frame or touches the bar, if the page scrolls, or if
  a control or dialog falls off screen. It runs in pre-commit (3 s) and CI.

### Links

Source links open in the **system browser** through the official `tauri-plugin-opener` (pinned `=2.7.2`),
allowed for `https://*` only (narrowed to Are.na and the museum sites in ADR-0015). In the browser preview
they're plain `target=_blank` links.

### New permissions (admin review: least privilege)

| Permission | Why | Scope |
|---|---|---|
| `core:window:allow-set-fullscreen` | Fullscreen (2) | Main window only. `is-fullscreen` was already in `core:default` |
| `opener:allow-open-url` | Open source pages outside the app | `https://*` only; no file, `mailto:` or custom schemes |

No CSP change. No new hosts.

### Later (thoughts asked for; not built)

**Import or find channels (owner's item 4).** The free Are.na plan has **no search API** (Q10: no Premium). So:

1. **Paste a link** (recommended next): paste `are.na/<user>/<channel>` URLs. The app checks each one through
   the public API and adds it to a topic, using `toml_edit` so the config keeps its comments. Cheap, and within
   the rules.
2. **Import the channels you follow:** given your username, read your own following list once. It's your own
   list, so it's allowed (ADR-0004: user-chosen channels only).
3. Not this: scraping Are.na's website search or crawling users, which breaks the terms (ADR-0004).

**Built-in web browser (item 5).** WebView2 is already part of Windows, so a second window adds **~0 MB** to the
installer. Recommended shape, if wanted: a "peek" window that is InPrivate, has **zero permissions**, has no IPC
access, and only loads `https://` pages. It would be useful for skimming a channel before adding it. The default
stays the system browser (built now), which is safer and costs nothing. Revisit after the paste-a-link import.

**Slim:** the installer is 3.56 MiB, with a 10 MiB CI budget (ADR-0011). This PR adds one small plugin.

## Consequences

- Restyling is a token edit; a new theme is one CSS block plus two lines in `settings.ts`.
- Settings follow the library folder, so a moved library keeps its look.
- Two new narrow permissions to keep in mind in future admin passes.

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-17 | Claude | drafted | Owner's session-5 design list |
| Admin pass | 2026-11-17 | admin-review agent + Claude | see review 0006 | |
| Developer pass | 2026-11-17 | Claude (developer role) | see review 0006 | |
| Owner gate | | Owner | pending | |
