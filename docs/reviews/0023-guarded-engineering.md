# Review 0023: Guarded engineering with an AI; third-party notices; 1.0

- **Branch:** `chore/0023-guarded-engineering` (from `main` after #3 / v0.11.0) · **ADR:** 0030
- **Passes:** Claude ran both passes on 2026-11-20. This PR touches guardrail files, so it is the first to need
  the owner's `guardrails-reviewed` label.

## Where to look

| Risk | Change (file:line) | If it's wrong | Caught by |
|---|---|---|---|
| high | `.claude/settings.json` (deny `git push*`, the no-push hook) and `scripts/hooks/no-push.mjs` | Claude could push again, or ordinary commands get blocked | Pipe test of 10 commands (5 blocked, 5 allowed) and a real `git push --dry-run` attempt, denied |
| high | `.github/workflows/guardrails.yml` and `scripts/guardrail-check.mjs` | Guardrail changes merge unread, or every PR fails | Local runs: no label → exit 1, label → 0, no guardrails → 0. Labels arrive via env, not inline |
| med | `crates/lemuse-core/src/store/catalog.rs` `migrate_list` / `backup_before_migration` | An upgrade without a way back, or a failed backup blocks opening | Test: backup holds the old schema, no backup for a new or current catalog, newest two kept |
| med | `app/src-tauri/build.rs`, `tauri.conf.json` (`resources`, `beforeBuildCommand`) | Builds break, or the installer ships without notices | `cargo check` with no notices passes (placeholder); a real installer build bundled the full 529 KB list |
| low | `CLAUDE.md` process rules, PR template | Rules drift from practice | Owner reads them (guardrail label) |

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-135 | high | The AI pushed under the owner's identity | Denied by settings and a hook in any position; credentials untouched; CLAUDE.md and memory updated |
| A-136 | high | The AI could loosen a guardrail to pass its own PR (it did, with `.gitleaksignore`, in #22) | Guardrail files fail CI until the owner labels the PR; listed in "Where to look" |
| A-137 | med | The workflow reads PR labels, which are user-controlled text | Passed as JSON through an environment variable and parsed in Node; never interpolated into the shell |
| A-138 | med | Notices quote third-party emails and copyright lines | Generated, git-ignored, refused by the scanner; shipped only in the installer and the release |
| A-139 | low | Backups live in the library folder | Same privacy as the catalog (local, not in git: `.db` is forbidden); two at most |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-142 | med | A missing Tauri resource breaks `cargo check` and CI clippy | `build.rs` writes a placeholder when the file is missing |
| D-143 | med | `VACUUM INTO` fails if a backup file is left from an interrupted upgrade | Removed first |
| D-144 | low | Rewriting `tauri.conf.json` through JSON churned its formatting | Restored; two textual edits only |
| D-145 | low | A test sample with `\n` escapes became real newlines (snapshot build broke) | Rebuilt as an array joined with `\n`; W3C and layout caught it (100 → 101 states) |

## Checks

- [x] 123 Rust tests · fmt · clippy `-D warnings` (core, CLI, app)
- [x] UI: typecheck · 18 unit tests · W3C 103 files · layout 101 states × 6 sizes (both themes) = 14,008 checks
- [x] Installer build with full notices (279 packages); secret scan clean

## Addendum (session 20): before the merge (ADR-0031)

The owner asked, before merging: changeable hotkeys, a key that always brings the bar back, keeping a saved image
on screen, a channel that wouldn't load ("Translucent electronics"), and Save as with a note and ×.

### Acceptance examples (the owner's words → tests)

| Done when | Test |
|---|---|
| Saving keeps the same image on screen | unit "saving or hiding an image never reshuffles the slides" |
| Press ?, Change, a key → that key does it; a taken key moves | unit "shortcuts: changeable, clash-free…"; snapshot `shortcuts-edit` |
| H brings the bar back in a compact window and the mini player | `toggleBar` in App.tsx (manual check; see D-153) |
| A channel of channels lists them to add | Rust `preview_lists_channels_inside_a_channel`; snapshot `discover-nested` |
| Save opens the Save dialog; the note names the folder until × | Rust `save_as_copies_the_original_where_the_user_chose`; snapshots `saved*` |

### Where to look

| Risk | Change (file:line) | If it's wrong | Caught by |
|---|---|---|---|
| high | `app/src-tauri/src/lib.rs` `save_image_as`, `.plugin(tauri_plugin_dialog::init())`; `app/src-tauri/Cargo.toml` | The page could pick paths or open dialogs; a file lands somewhere unchosen | No `dialog:` permission in `capabilities/` (checked); the command takes no path; core test for `copy_to` |
| med | `crates/lemuse-core/src/save.rs` `copy_to`, `with_real_ext` | A half-written or wrongly named file in the user's folder | Test: type kept or corrected, replace, no `.part` left, relative or missing folder refused |
| med | `app/src/App.tsx` `slides` memo + `app/src/order.ts` | The slideshow stops shuffling, or reshuffles under the viewer | Unit test for `stableOrder` |
| med | `app/src/keys.ts` `sanitizeKeys`, App `onKey` | Two actions on one key, or a hand-edited ui.json breaks keys | Unit test (clashes, bad keys, unknown ids) |
| low | `app/scripts/layout-test.mjs` (guardrail) | The gate gets weaker | It got stricter: mini sizes 360×225 and 200×125, pop-ups inside the window. The only relaxation: a control inside a scrolling list that fits the window counts as reachable |

### Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-140 | high | A new Tauri plugin (dialog) widens what the page could do | Registered for Rust use only; no `dialog:` permission; the page sends no path; `start_dir` is used only if it is an existing absolute folder |
| A-141 | med | New crates `tauri-plugin-dialog` 2.8.4, `rfd` 0.17.2, `tauri-plugin-fs` 2.7.1 | All older than 14 days (2026-10-28, 2026-01-12, 2026-10-14); pinned; MIT or Apache-2.0/MIT; `cargo audit`: 0 vulnerabilities, the same 6 allowed warnings as before; notices regenerate at build |
| A-142 | med | The save note and `lastSaveDir` hold a local path (Windows user name) | On screen and in local `ui.json` only; bug reports carry no settings; snapshots use placeholder paths |
| A-143 | med | Nested channels must not become crawling (ADR-0004) | Same single preview read; listed only; each added by the user's click |
| A-144 | low | Save now writes two files (library + chosen copy) | Documented in ADR-0031: the library copy keeps Saved and offline viewing working; Cancel writes nothing |

### Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-146 | med | The save note hid its × off the right edge of the smallest mini player; the mini menu was also 6 px too wide there (already in 0.11) | Note inset from both edges, folder only in mini; menu `box-sizing: border-box`. **New check:** the layout test renders mini states at 360×225 and 200×125 and fails pop-ups outside the window |
| D-147 | med | Shell heredocs mangled backslashes three times (a regex got raw control bytes, a test path lost its `\`, a template literal lost its `\`) | Fixed with file-based edits; a unit test now covers `lastSaveDir` cleaning; edits with backslashes go through the Edit tool |
| D-148 | med | Esc while waiting for a key would close the whole sheet | The dialog's `cancel` is prevented while capturing; Esc cancels only the change |
| D-149 | low | Two quick saves | The page ignores Save while one is running; the Rust save gate still spaces downloads |
| D-150 | low | A file open in another program can't be replaced | The rename fails, the `.part` file is removed, and the error is shown |
| D-151 | low | The Q key during a timed session | Ignored in sessions (like the grid), so a stray key can't open a dialog mid-pose |
| D-152 | low | A preview with no images said "first 0 shown" | Now "N channels inside" |
| D-153 | low | The bar key in compact and mini windows has no automated test (window size is decided by CSS media queries) | Deferred: PLAN "After 1.0"; checked by reading the code and the snapshot states |

### Checks (addendum)

- [x] 125 Rust tests · fmt · clippy `-D warnings` (core, CLI, app) · `cargo audit` (0 vulnerabilities)
- [x] UI: typecheck · 21 unit tests · W3C 107 files · layout 105 states × 6 sizes (+2 mini sizes), both themes
