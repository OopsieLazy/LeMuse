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
