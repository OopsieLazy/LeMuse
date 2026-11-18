# refactor!: rename ServeNSurf to LeMuse (#4)

**Branch:** `refactor/0004-rename-lemuse` → `main` · **Stacked on:** #3 · **Merge:** squash
([0004-rename-lemuse.merge.txt](0004-rename-lemuse.merge.txt))

## What

The app, crates, binary, config file, library folder, environment variable, app identifier and User-Agent are
renamed from ServeNSurf to **LeMuse**. The GitHub remote is added and CODEOWNERS is set.

## Why

You chose LeMuse from your shortlist. It ranked first because no existing software uses it; "Muse" collides with
an inspiration-board app in the same category (ADR-0010).

## How

- `git mv crates/servensurf-* crates/lemuse-*`, then a scripted case-aware replace over the living files. History
  docs and migrations are untouched.
- The User-Agent contact defaults to `https://github.com/OopsieLazy/LeMuse` (fixes A-8; never a personal address).
- `origin` = `https://github.com/OopsieLazy/LeMuse.git`; CODEOWNERS `* @OopsieLazy`.

## Checklist

- [x] ADR-0010 written; review 0004 (A-19, D-27)
- [x] fmt, clippy (all + app): clean · tests: 44 passed · W3C: pass
- [x] No secrets or personal data added
- [x] PLAN owner decisions Q3–Q5, Q8, Q10–Q13 recorded
- [ ] Trademark check before a public release (A-19)

## Risk and rollback

- **BREAKING:** names and paths changed. Nothing is released, so there's no migration. If you installed the
  PR #3 build, uninstall it and delete `Pictures\ServeNSurf` and `%LOCALAPPDATA%\dev.servensurf.app`.
- Rollback: revert the squash commit.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
