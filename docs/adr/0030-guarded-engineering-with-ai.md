---
status: proposed
date: 2026-11-20
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0030: Guarded engineering with an AI; third-party notices

## Context

Sessions 13–18 built LeMuse 0.11 almost hands-off. The owner asked whether that was "vibe coding". The honest
answer: the process (ADRs, reviews, tests, gates) is real engineering, but every review was written by the same
AI that wrote the code, and no human read it. CI caught two things the AI's local checks missed:
- a full-history secret-scan finding;
- a light-theme contrast failure that a dark-mode PC hid.

The AI also loosened a guardrail by itself (`.gitleaksignore`) to clear its own PR. The owner asked to "remove
the ability to push as the git account" and to continue with guarded engineering *with* the AI. Separately,
1.0 needs third-party licence notices.

## Decision

1. **Claude never pushes.**
   - `git push` is denied in `.claude/settings.json`, and the `scripts/hooks/no-push.mjs` PreToolUse hook
     blocks it anywhere in a command (after `cd … &&`, `git -C dir push`, `git.exe`).
   - Claude commits locally and hands over the push command. The owner's own git credentials are untouched.
2. **Guardrail files need the owner's eyes.** `scripts/guardrail-check.mjs` lists them:
   - workflows, CODEOWNERS, git hooks, Claude settings and hooks;
   - the scanners and their rules, `.gitleaksignore`, `.gitignore`, `docs/security/`;
   - Tauri capabilities and config (CSP);
   - the W3C and layout gates;
   - CLAUDE.md and SECURITY.md.

   The `guardrails` workflow fails a PR that touches any of them until the `guardrails-reviewed` label is on it.
   - Only people with write access can label, so a change can't approve itself.
   - The labels reach the script through an environment variable, not inline in the shell.
3. **"Where to look"** in the PR template: the riskiest changes (file:line), what breaks if wrong, and which
   test catches it. A review takes minutes, not hours.
4. **Process rules in CLAUDE.md:**
   - acceptance examples first (the owner approves; they become tests);
   - one branch per PR, merged before the next starts (stacked branches conflicted on squash merge);
   - CI is the source of truth (match its conditions locally);
   - every miss becomes a check.
5. **Backup before every schema migration.**
   - Before upgrading an existing catalog file, `Catalog::open` writes `catalog-v<N>-backup.db` next to it with
     `VACUUM INTO`: consistent with WAL and other readers.
   - The newest two backups are kept.
   - If the copy fails (disk full), nothing is migrated and the error says why.
6. **Third-party notices.**
   - `scripts/notices.mjs` walks only what ships: normal dependencies of the app and CLI on Windows, not dev or
     build tools. That's 272 crates from `cargo metadata --offline`, plus the 7 non-dev npm packages.
   - It reads each package's own licence files and prints identical texts once.
   - Installer builds generate it (`beforeBuildCommand`) and bundle it as a resource. Settings → About →
     Third-party licences shows it as text, and the release workflow attaches it to each release.
   - Other builds (`cargo check`, clippy, dev) get a short placeholder from `build.rs`, because Tauri refuses to
     build with a missing resource.
   - The generated file is git-ignored and refused by the scanner: it quotes third-party authors' copyright lines
     and emails.

## Consequences

- **The owner's job per PR:**
  - read "Where to look";
  - read the guardrail files when the check asks, then add the label;
  - push the branch;
  - merge.

  The repository ruleset should make the `guardrails` check required (owner action).
- **What this still doesn't give:** a second human reviewer. OpenSSF Scorecard's Code-Review check stays out of
  reach for a solo project, and that's stated, not gamed.
- **Deferred** (PLAN):
  - mutation testing (cargo-mutants, Stryker) to test the tests;
  - an independent AI reviewer with only the diff;
  - a separate bot account for AI commits (A-4).
