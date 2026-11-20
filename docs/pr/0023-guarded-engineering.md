# chore: guarded engineering with an AI, third-party notices, version 1.0.0 (work item 23)

**Branch:** `chore/0023-guarded-engineering` → `main` · **Merge:** Squash and merge (needs the
`guardrails-reviewed` label: this PR changes guardrail files)

**PR title:** `chore: guarded engineering with an AI, third-party notices, 1.0.0`

## What

- **Claude can't push any more:** a deny rule plus a hook that blocks `git push` anywhere in a command. You push
  with your own account.
- **Guardrail gate:** a PR that changes CI, hooks, scanner rules, ignore lists, app permissions, the CSP or
  CLAUDE.md fails the new `guardrails` check until you read those files and add the `guardrails-reviewed` label.
- **"Where to look"** in the PR template: the riskiest changes, what breaks if wrong, which test catches it.
- **Process rules** in CLAUDE.md:
  - acceptance examples first;
  - one branch per PR;
  - CI is the source of truth;
  - every miss becomes a check.
- **Backup before every schema upgrade:** `catalog-v<N>-backup.db` in the library folder, the newest two kept.
- **Third-party licences:**
  - every crate and npm package LeMuse ships, with its licence text;
  - in the installer, in Settings → About → Third-party licences, and attached to each release.
- **Version 1.0.0:** the 1.0 list in PLAN is complete.
- **Before the merge (ADR-0031):**
  - **Save as** (button, right-click or Q). The Windows Save dialog picks the folder and name, starting where
    the last save went. A note at the top names the folder until you press its ×.
  - **Changeable shortcuts** in the ? sheet (Change, then press a key; None; Reset all), linked from
    Settings → Keyboard.
  - **H brings the bar back** in compact windows and the mini player too.
  - **Saving keeps the image on screen.** The slide order no longer reshuffles when the image is marked
    saved.
  - **Channels made of channels** ("Translucent electronics" holds 8 channels and no images). The preview
    lists the channels inside, with Add and Add all; each becomes its own topic.

## Why

You said: "Remove ability to push as git account… continue as per plan."

The vibe-coding discussion showed the gaps:
- every review was written by the AI that wrote the code;
- the AI could loosen a guardrail on its own;
- CI caught what local checks missed.

Third-party notices were the last 1.0 item.

Before merging, you asked: "create a hotkeys list (changeable)… bringing back the bar… Saving an image should not
remove it… Some channels not loaded (Translucent electronics)… save to folder on local (user choose EI save as)
and state which folder saved to, with pop up an x".

## How

- `scripts/hooks/no-push.mjs`, `.claude/settings.json`;
- `scripts/guardrail-check.mjs`, `.github/workflows/guardrails.yml`;
- `Catalog::migrate_list` with `VACUUM INTO`;
- `scripts/notices.mjs`, `build.rs` placeholder, Tauri `resources`;
- `NoticesPanel`.
- `keys.ts` (one list for the handler, the sheet and the editor), `order.ts` (stable shuffle),
  `save.rs` `copy_to`, `save_image_as` with `tauri-plugin-dialog` =2.8.4 (Rust side only).
- ADR-0030, ADR-0031 · [review 0023](../reviews/0023-guarded-engineering.md).

## Where to look

| Risk | Change (file:line) | If it's wrong | Caught by |
|---|---|---|---|
| high | `.claude/settings.json`, `scripts/hooks/no-push.mjs` | Claude pushes again, or normal commands are blocked | Pipe test (5 blocked, 5 allowed); a real push attempt was denied |
| high | `.github/workflows/guardrails.yml`, `scripts/guardrail-check.mjs` | Guardrail changes merge unread, or every PR fails | Local: no label → fail, label → pass, none touched → pass |
| med | `crates/lemuse-core/src/store/catalog.rs` (`migrate_list`, `backup_before_migration`) | An upgrade with no way back | Backup test (old schema inside; newest two kept) |
| med | `app/src-tauri/build.rs`, `tauri.conf.json` | Builds break, or the installer lacks notices | `cargo check` passes without notices; a real installer build bundled them |
| high | `app/src-tauri/src/lib.rs` `save_image_as`, `.plugin(tauri_plugin_dialog::init())` | The page could choose paths or open dialogs | No `dialog:` permission in `capabilities/`; the command takes no path |
| med | `crates/lemuse-core/src/save.rs` `copy_to` | A half-written or misnamed file in your folder | Rust test (type fix, replace, no `.part` left, bad paths refused) |
| med | `app/src/App.tsx` `slides` memo, `app/src/order.ts`, `app/src/keys.ts` | Shuffle stops or jumps; two actions on one key | UI unit tests |

- Guardrail files touched: `.claude/settings.json`, `scripts/hooks/no-push.mjs`,
  `.github/workflows/guardrails.yml`, `.github/workflows/release.yml`, `scripts/guardrail-check.mjs`,
  `scripts/secret-rules.mjs`, `.gitignore`, `app/src-tauri/tauri.conf.json`,
  `CLAUDE.md`, `SECURITY.md`, `app/scripts/layout-test.mjs`.
- `layout-test.mjs` got stricter: it adds mini sizes and checks that pop-ups stay inside the window. One
  relaxation: a control inside a scrolling list that fits the window counts as reachable (the mini menu).
- Acceptance examples: the owner's words. No push is possible; guardrail changes need a label; an upgrade leaves
  a backup; About lists the licences. Before the merge: the 5 examples in review 0023's addendum.

## Checklist

- [x] Secret scan clean
- [x] 125 Rust tests · fmt · clippy `-D warnings` (core, CLI, app) · typecheck · 21 UI unit tests · W3C 107 ·
  layout 105 states × 6 sizes, + 2 mini sizes · `cargo audit` 0 vulnerabilities
- [x] Installer build with the full notices (279 packages)
- [ ] Owner: read the guardrail files, add the `guardrails-reviewed` label, and make `guardrails` a required check
  in the ruleset

🤖 Generated with [Claude Code](https://claude.com/claude-code)
