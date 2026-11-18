# feat: design tokens, Settings panel, fullscreen, hideable controls (#6)

**Branch:** `feat/0006-design-tokens-settings` → `main` · **Stacked on:** #5 · **Merge:** squash
([0006-design-tokens-settings.merge.txt](0006-design-tokens-settings.merge.txt))

## What

- **Settings** (gear button or `,`):
  - 5 themes (Studio, Gallery, Blueprint, Paper, Millennium) and light/dark;
  - 5 layouts (Studio, Topics on the right, Controls on top, Cinema, Minimal);
  - 4 typeface sets and an accent colour;
  - sliders for interface size, rounding, topic list width, space around the image, shadow and seconds per image;
  - toggles for the timer, specs, creator and auto-hide.

  Changes apply live and are saved to `ui.json` in your library.
- **Fullscreen** (F or button). **Hide the control bar** (H or chevron), with a small "show controls" button.
  **Topics drawer** (T) in Cinema, Minimal and fullscreen.
- **The image never runs under the bar.** A layout test proves it across 18 states × 5 window sizes.
- Every visual value is a token (`app/src/theme/tokens.css`); the inventory is in `docs/design/tokens.md`.
- Source links open in your browser (https only).

## Why

Your design list (ADR-0012), plus Q12: you liked the layout, so it stays the default "Studio".

## How

- `settings.ts`: schema, `sanitize` (whitelist and clamp; saved values are untrusted) and `rootAttributes` → `data-*`
  attributes plus CSS variables on `<html>`.
- `SettingsPanel.tsx`: a native `<dialog>`. The core's `ui_settings` writes atomically with a 16 KiB cap.
- Two narrow new permissions: `core:window:allow-set-fullscreen`, and `opener:allow-open-url` for `https://*`
  (`tauri-plugin-opener =2.7.2`).
- `scripts/layout-test.mjs`: headless Edge, inline CSS and SVG placeholders, no network and no screenshots; DOM
  measurements only. Runs in pre-commit (3 s) and CI.
- Includes the hook fix from review 0005 (D-28/D-29): `scripts/hooks/review-snapshot.mjs`.

## Checklist

- [x] Secret scan clean · npm audit 0 · new permissions justified in ADR-0012
- [x] W3C: 20 files, 0 errors (incl. CSS) · layout test: 90 renders passed (it caught 2 real bugs, both fixed)
- [x] fmt, clippy (core, CLI, app) clean · tests 47 (3 new for `ui_settings`)
- [x] Design artifact updated: https://claude.ai/artifact/T6ucPPa6HwhkWqvLEiSHfY (try Settings)
- [x] Test build: `target/release/bundle/nsis/LeMuse_0.1.0_x64-setup.exe` (built at the top of the stack)
- [ ] Not done: in-app "peek" browser and channel import (thoughts in ADR-0012 § Later)

## Risk and rollback

- Risk: medium. It's the largest UI change so far. Two permissions were added, both narrowly scoped.
- Rollback: revert the squash commit. `ui.json` is ignored by older builds.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
