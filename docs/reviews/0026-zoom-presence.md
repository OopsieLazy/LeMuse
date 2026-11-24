# Review 0026: Zoom, LeMuse in the tray, a grid that scrolls on; internal repair; research

- **Branch:** `feat/0026-zoom-presence` (from `main` after #6) · **ADRs:** 0033 (built), 0034 (plan only)
- **Passes:** Claude ran both passes on 2026-11-23. It touches guardrail files (`.github/workflows/*`,
  `app/src-tauri/tauri.conf.json`, `app/scripts/layout-test.mjs`), so it needs the owner's `guardrails-reviewed`
  label.

## Acceptance examples (PLAN § Now)

| Done when | Check |
|---|---|
| Wheel over a detail zooms toward the pointer and keeps it under it; drag never passes the edge; Z or double-click fits; the next image opens at fit | Unit tests "zoom: toward the pointer…", "zoom: wheel steps…"; reset effect in `App.tsx`; manual on the test build |
| Mirror and a 4 × 4 grid on: grid lines stay on the image's features while zoomed | One transform for image and grid (`styles.css` `--turn`); snapshot `zoomed` (mirror + thirds); layout test |
| Tray: close quits as before when off; hides when on; tray click brings it back; Quit quits | Manual on the test build (owner); `on_window_event` in `lib.rs` |
| Start with Windows writes `"<exe>" --tray` under HKCU Run; off removes it; a moved portable folder is followed | Unit tests in `presence.rs` (quoting, parsing, Task Manager flag); manual on the test build (owner) |
| Grid of 1,200: scroll past 500 without a page menu; pick image 900 and it plays; reopening opens at it | Snapshot `grid-view-more-small`; `pickFromGrid` uses the remember-where-you-were path; manual |
| About shows `1.1.0 · build <commit>`; a test fails if version files disagree | `crates/lemuse-cli/tests/version_sync.rs`; snapshot `settings-open` |

## Where to look

| Risk | Change (file:line) | If it's wrong | Caught by |
|---|---|---|---|
| high | `app/src-tauri/tauri.conf.json:22` `"visible": false` + `app/src-tauri/src/lib.rs:1006` | The window never appears (a launch with no tray and `--tray`, or setup failing early) | Shown unless both `--tray` and a working tray; the single-instance hand-off shows it; manual on the test build |
| high | `app/src-tauri/src/presence.rs:183` `reg::set`, `:244`, `:267` `heal_autostart` | A wrong or machine-wide start-up entry; another copy's entry overwritten | Per-user key only; quoted path; a value for a copy that still exists is left alone; unit tests for quoting and parsing; manual |
| med | `app/src-tauri/src/lib.rs:987` close-to-tray | Closing never quits | Off by default; Quit in the tray menu; mirrored from `ui.json` |
| med | `app/src/SlideshowView.tsx:457` wheel, `:484` pointer, `:699` click capture | A drag toggles the bar; a tap stops working in compact windows; pinch zooms the page | Capture only after a 4 px drag; the click after a drag is swallowed once; `touch-action: none` only while an image is shown |
| med | `app/src/App.tsx:474` sharper image | A failing original loops or blanks the image | Shown only after `decode()`; the usual size first in fallbacks; skipped once a fallback was tried |
| med | `app/src/App.tsx:549` `loadGridMore`, `:568` `pickFromGrid` | Wrong image plays, or stale pages append after a view change | A generation counter; picks go through `pendingBlock` |
| low | `app/src/styles.css:2519` square grid cells | Rows overlap at the large size | Layout test (it caught this: `grid-view-large-end`) |
| low | `app/scripts/layout-test.mjs:106` (guardrail) | The gate gets weaker | Only zoomed states change: the frame must clip (overflow hidden) and stay off the bar |
| low | `.github/workflows/*` (guardrail) | CI breaks on a new action major | Oldest Node 24 majors, SHA-pinned, ≥ 14 days old; release notes list runtime changes only |

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-1 | med | Starting hidden could leave a user with no window | Fixed: shown in `setup` unless started with `--tray` **and** the tray built; second launch shows it |
| A-2 | med | Autostart could be written machine-wide (the plugin's `auto-launch` crate tries HKLM first) | Fixed by design: our own `winreg` code writes HKCU only; no plugin, no page permission |
| A-3 | low | New capabilities? | None. Three app commands; the tray is Rust-only; events already allowed by `core:default` |
| A-4 | low | Loading the original while zoomed: stream-first and the "≤ 2 preload" rule | One image, only on the user's zoom, in memory; InPrivate WebView; CSP still limits hosts |
| A-5 | low | Inline `style` in the pure view | Numbers only (`--zoom`, `--pan-x`, `--pan-y`), never remote text; ADR-0033 §2 |
| A-6 | low | Public research notes and reports | Secret scan clean; the friend's domain appears only as a placeholder; no personal data |
| A-7 | low | Guardrail files changed | Listed above and in the PR for the owner's label |
| A-8 | low | The value-study web app (ADR-0034) | Plan only; Q21, Q30, Q31 are the owner's; nothing hosted or published |
| A-9 | med | CI `cargo audit` failed on two advisories published after the local run: RUSTSEC-2026-0592 (`url` 2.5.8, stack overflow in `Url::origin()`) and -0594 (`cookie` 0.18.2, private-cookie nonces after `fork()`). The fixes are 0–3 days old, under the 14-day rule | Owner chose (2026-11-23): ignore both in `.cargo/audit.toml` (now a guardrail file) with reasons. Not reachable: no `Url::origin()` call in LeMuse, Tauri, wry or tao; `cookie` is built without `private`; Windows doesn't fork. Deferred: bump on/after 2026-12-07 (PLAN register) |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-1 | med | Large grid thumbnails overlapped: skipped `content-visibility` cells used a 240 px placeholder while drawn cells were taller | Fixed: square cells (`aspect-ratio: 1`), `contain-intrinsic-size: auto …`; new snapshot states keep it checked |
| D-2 | med | The zoomed states failed "image leaves its frame" (by design) | Layout test: zoomed frames must clip and stay off the bar instead |
| D-3 | low | The click that ends a drag would toggle the bar in compact windows | Swallowed once, reset on the next pointer down |
| D-4 | low | Keyboard zoom before the image has a size | `measureBox` returns null; nothing happens |
| D-5 | low | A wheel event batched in the same frame as a new image could zoom the new one | Accepted: needs a wheel turn within ~16 ms of a slide change; `Z` fits |
| D-6 | low | Later grid pages appear in catalog order even with shuffle on | Accepted: the page you pick shuffles as usual when it plays |
| D-7 | low | The version-sync test wasn't rustfmt-clean when first committed (CI would have failed) | Fixed in `style(cli)`; noted: the pre-commit hook doesn't run rustfmt (CI does) |
| D-8 | low | Tray, registry and close-to-tray can't be exercised headless | Helpers unit-tested; the owner checks them on the test build (ADR-0033 action 5) |
| D-9 | low | An Are.na original can be large (tens of MB) when zoomed | Accepted: only on zoom past 1.2×, one image, in memory |

**Verification evidence** (2026-11-23, local; CI is the source of truth):

```
cargo fmt --check → ok · cargo clippy -D warnings (core, cli, app) → clean
cargo test → 126 passed (core + cli, incl. version_sync) · lemuse-app → 4 passed (presence)
npm run typecheck → ok · npm run test:unit → 26 passed
npm run validate:w3c → 118 states, 120 files, no errors (1 old warning in welcome)
npm run test:layout → 118 states × 7 sizes, 21,334 checks passed
cargo audit → 6 allowed warnings (Linux-only crates); 2 new advisories ignored (A-9) · npm-audit-gate → passed
node scripts/scan-secrets.mjs → clean
```

Every miss became a check: the stale portable copy → the build in About and the README plus the version-sync
test; the grid overlap → `grid-view-large-end` and `grid-view-more-small` states.

## Owner gate

**Summary:** Zoom (wheel, pinch, drag, double-click, keys), LeMuse in the tray with opt-in start with Windows and
keep-running-when-closed, and a grid that scrolls through the whole view in three sizes. The plan, changelog and
version are repaired (1.1.0). Two research rounds are in `reports/`; the web app is a plan (ADR-0034).

**Open questions for the owner:** Q21 (host the value-study app on the friend's domain), Q30 (its name and
licence), Q31 (how to take support), Q23 (contact Are.na; not needed for the value app). Try the tray, start with
Windows and a moved portable folder on the test build.
