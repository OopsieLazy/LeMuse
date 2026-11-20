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

## Why

You said: "Remove ability to push as git account… continue as per plan."

The vibe-coding discussion showed the gaps:
- every review was written by the AI that wrote the code;
- the AI could loosen a guardrail on its own;
- CI caught what local checks missed.

Third-party notices were the last 1.0 item.

## How

- `scripts/hooks/no-push.mjs`, `.claude/settings.json`;
- `scripts/guardrail-check.mjs`, `.github/workflows/guardrails.yml`;
- `Catalog::migrate_list` with `VACUUM INTO`;
- `scripts/notices.mjs`, `build.rs` placeholder, Tauri `resources`;
- `NoticesPanel`.
- ADR-0030 · [review 0023](../reviews/0023-guarded-engineering.md).

## Where to look

| Risk | Change (file:line) | If it's wrong | Caught by |
|---|---|---|---|
| high | `.claude/settings.json`, `scripts/hooks/no-push.mjs` | Claude pushes again, or normal commands are blocked | Pipe test (5 blocked, 5 allowed); a real push attempt was denied |
| high | `.github/workflows/guardrails.yml`, `scripts/guardrail-check.mjs` | Guardrail changes merge unread, or every PR fails | Local: no label → fail, label → pass, none touched → pass |
| med | `crates/lemuse-core/src/store/catalog.rs` (`migrate_list`, `backup_before_migration`) | An upgrade with no way back | Backup test (old schema inside; newest two kept) |
| med | `app/src-tauri/build.rs`, `tauri.conf.json` | Builds break, or the installer lacks notices | `cargo check` passes without notices; a real installer build bundled them |

- Guardrail files touched: `.claude/settings.json`, `scripts/hooks/no-push.mjs`,
  `.github/workflows/guardrails.yml`, `.github/workflows/release.yml`, `scripts/guardrail-check.mjs`,
  `scripts/secret-rules.mjs`, `.gitignore`, `app/src-tauri/tauri.conf.json`,
  `CLAUDE.md`, `SECURITY.md`.
- Acceptance examples: the owner's words. No push is possible; guardrail changes need a label; an upgrade leaves
  a backup; About lists the licences.

## Checklist

- [x] Secret scan clean
- [x] 123 Rust tests · fmt · clippy `-D warnings` (core, CLI, app) · typecheck · 18 UI unit tests · W3C 103 ·
  layout 14,008 checks
- [x] Installer build with the full notices (279 packages)
- [ ] Owner: read the guardrail files, add the `guardrails-reviewed` label, and make `guardrails` a required check
  in the ruleset

🤖 Generated with [Claude Code](https://claude.com/claude-code)
