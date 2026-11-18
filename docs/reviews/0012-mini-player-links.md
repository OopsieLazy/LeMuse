# Review 0012: Mini player and kept links

- **Branch:** `feat/0012-mini-player-links` · **ADR:** 0016
- **Passes:** Claude ran both passes on 2026-11-18. The commit hook's admin agent reviews each commit too.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-58 | med | Eight new window permissions on the main window: `set-always-on-top`, `set-decorations`, `set-size`, `set-min-size`, `set-position`, `start-dragging`, `maximize`, `unmaximize` | Needed for the mini player and nothing else. All are main-window only. No new window creation, navigation, file or shell access. Worst case from a compromised page: the window moves, resizes or stays on top (a nuisance, not a breach) |
| A-59 | low | Clipboard | Write only, on a click or the L key (WebView2 requires a user gesture). No clipboard-read permission |
| A-60 | med | `export-links` writes remote titles into CSV, which spreadsheets may run as formulas | Cells are RFC 4180 escaped; cells starting with `=`, `+`, `-`, `@`, tab or CR get a `'` prefix. Test `csv_escapes_and_defuses_formulas`. Output goes to stdout only; the app writes no files |
| A-61 | info | Image fallbacks | Only the block's stored sizes, all on CSP-listed hosts. Original-source URLs aren't loaded as images (ADR-0016 § 2) |
| A-62 | info | Dependencies | None added; `@tauri-apps/api/window` was already in use |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-64 | low | Saved mini bounds can point at a monitor that's no longer connected | They're used only if their centre lies on a connected screen; otherwise the default 480 × 300 |
| D-65 | low | Closing the app while it's mini | Mini mode isn't saved; the next launch opens the normal window from `tauri.conf.json` |
| D-66 | low | Entering mini from fullscreen or a maximized window | Leaves fullscreen first; restores maximized on the way back |
| D-67 | low | The minimum size has to come back after mini | Restored to 720 × 480, mirroring `tauri.conf.json` |
| D-68 | info | Real window behaviour (borderless, dragging, other monitors) can't be checked headless | The snapshot covers the layout (4 new states); the owner checks the real window in the running app |
| D-69 | info | A failed image used to be skipped at once | It now tries each stored size first; the counter resets when the view changes |

- [x] 82 core tests (3 new): fallbacks and original URL on slides, link export (scopes, playlist by name), CSV
  escaping and formula guard, text export.
- [x] `lemuse export-links` on a copy of the owner's library: 4,489 images.
- [x] W3C 45 files, 0 errors · layout 43 states × 5 sizes = 215 renders passed · the Tauri build accepts the new
  permission identifiers.
