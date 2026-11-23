# feat: zoom, LeMuse in the tray, a grid that scrolls on; 1.1.0 (work item 26)

**Branch:** `feat/0026-zoom-presence` → `main` · **Merge:** Squash and merge (needs the `guardrails-reviewed`
label: it changes `.github/workflows/*`, `app/src-tauri/tauri.conf.json` and `app/scripts/layout-test.mjs`)

**PR title:** `feat(ui): zoom, LeMuse in the tray, a grid that scrolls on; 1.1.0`

## What

- **Zoom:** wheel or pinch toward the pointer, drag to look around, double-click 2.5× and back; `=`/`+`, `-`,
  `Z`. A level badge with **Fit**. Grid lines and mirror zoom with the image; the sharpest stored size loads
  while you look closer. Each new image starts whole.
- **LeMuse in the tray:** click to show or hide; right-click for next, play or pause, mini player, refresh, quit.
  **Start with Windows** (off by default) starts it in the tray and follows a moved portable folder. **Keep
  running in the tray when closed** (off by default). Settings → Windows.
- **The grid scrolls on** past 500 images, opens at the image you were on, has Small / Medium / Large, and arrow
  keys and Enter.
- **Internal repair:** version 1.1.0 everywhere (a test keeps it so); the build shows in Settings → About and the
  portable README; CHANGELOG split at 1.0.0; PLAN holds only open work; stale findings closed; CI actions off
  Node 20 (A-50).
- **Research:** two reports in `reports/` (post-launch gap audit; new sources, a value-study web app, competitor
  and open-source features). **ADR-0034** plans the web app; nothing is built or hosted.

## Why

You said: "Repair the internal state, run full analysis and or audit using /deep-research. Find more imagery
inputs, web app presence … 1. Add zoom 2. start presence 3. scrollable grid view. During research look into any
cool features competitors/other open source projects have introduced."

## How

- `app/src/zoom.ts` (pure maths, unit-tested) · `SlideshowView.tsx` (wheel, pointer, pinch, badge, grid paging and
  keys) · `App.tsx` (zoom state, sharper image, grid pages, tray events, Windows settings) · `keys.ts` (zoom keys)
  · `settings.ts` (`gridSize`, `closeToTray`) · `styles.css` (`--turn` + zoom transform, grid tools, square cells).
- `app/src-tauri/src/presence.rs` (tray, HKCU Run value, close-to-tray) · `lib.rs` (commands, window event,
  hidden start) · `Cargo.toml` (`tray-icon` feature, `winreg` already in the tree).
- `crates/lemuse-cli/tests/version_sync.rs`; `scripts/portable.mjs` (build in README); `vite.config.ts` (build id).
- ADR-0033, ADR-0034 · [review 0026](../reviews/0026-zoom-presence.md).

## Where to look

| Risk | Change (file:line) | If it's wrong | Caught by |
|---|---|---|---|
| high | `app/src-tauri/tauri.conf.json:22` + `app/src-tauri/src/lib.rs:1006` hidden start | No window appears | Shown unless `--tray` and a working tray; second launch shows it; test build |
| high | `app/src-tauri/src/presence.rs:183`, `:244`, `:267` | Wrong or machine-wide start-up entry; another copy's entry overwritten | HKCU only; quoted path; existing other copy left alone; unit tests; test build |
| med | `app/src-tauri/src/lib.rs:987` close-to-tray | Closing never quits | Off by default; Quit in the tray |
| med | `app/src/SlideshowView.tsx:457`, `:484`, `:699` | Drags toggle the bar, taps stop working, pinch zooms the page | Drag threshold, one swallowed click, `touch-action` scoped |
| med | `app/src/App.tsx:474` sharper image | A failing original blanks the image | Swapped only after `decode()`; fallbacks keep the usual size |
| low | `app/scripts/layout-test.mjs:106` (guardrail) | The gate gets weaker | Zoomed states only: the frame must clip and stay off the bar |
| low | `.github/workflows/*` (guardrail) | CI breaks | Oldest Node 24 majors, SHA-pinned, ≥ 14 days old |

- Guardrail files touched: `.github/workflows/ci.yml`, `guardrails.yml`, `pr-title.yml`, `release.yml` (action pins only);
  `app/src-tauri/tauri.conf.json` (version, `"visible": false`); `app/scripts/layout-test.mjs` (zoomed frames).
  None loosens a gate: the layout test swaps "image inside its frame" for "frame clips it and stays off the bar"
  only when an image is zoomed.
- Checked only locally: everything below. The tray, start with Windows and close-to-tray need a try on the test
  installer.

## Checklist

- [x] Secret scan clean (`main...HEAD`)
- [x] fmt · clippy (core, cli, app) · 126 + 4 Rust tests · typecheck · 26 UI unit tests · W3C 118 states · layout
      118 states × 7 sizes · cargo audit · npm audit gate
- [ ] Owner: try zoom, the tray, start with Windows and a moved portable folder on the test installer
- [ ] Owner: read the guardrail files and add the `guardrails-reviewed` label
- [ ] Owner: Q21, Q30, Q31 (ADR-0034) when ready

🤖 Generated with [Claude Code](https://claude.com/claude-code)
