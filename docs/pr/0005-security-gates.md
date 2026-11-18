# ci: security gates on commits, before the agent finishes, and in CI (#5)

**Branch:** `ci/0005-security-gates` → `main` · **Stacked on:** #4 · **Merge:** squash
([0005-security-gates.merge.txt](0005-security-gates.merge.txt))

## What

- A secret and personal-data scanner runs on every commit (git hook), before Claude finishes (Stop gate) and in CI.
- An admin-review agent checks every commit Claude makes.
- CI adds gitleaks, `npm audit`, `cargo audit`, dependency review and a 10 MiB installer budget.
- Vite is upgraded to clear two dev-server advisories.
- The PR template now uses What / Why / How plus a checklist, and handoff commands put each comment on its own line
  above the command.

## Why

"Security is utmost concern… build hooks that call agent to review as admin for finishing" (ADR-0011). The repo is
now public, so anything committed is published.

## How

- `scripts/scan-secrets.mjs`: dependency-free; scans added lines; reports file:line, **never the value**.
- `.claude/settings.json`:
  - `PreToolUse` agent hook (Sonnet) on `git commit`;
  - `Stop` gate (`scripts/hooks/stop-gate.mjs`): blocks until the scan is clean and the branch has an admin
    review;
  - deny rules for force pushes, pushes and merges to main, `--no-verify`, and reading `.env`/keys.
- Found while using it (fixed in #6, commit `fix(process)`): the agent hook can't run shell commands, so it reads a
  snapshot of the uncommitted work (`.claude/review/changes.diff`, gitignored) instead (D-28, D-29).

## Checklist

- [x] Secret scan `--all`: clean (20,067 lines). A planted fake token, password, personal email and `.env` were all
      caught; a noreply address passes
- [x] `npm audit`: 0 (was 1 high, 1 moderate) · fmt and clippy clean · tests pass
- [x] Stop gate pipe-tested (blocks; the loop guard allows the second stop) · agent hook live (it blocked, then
      approved, real commits)
- [x] ADR-0011 · review 0005
- [ ] gitleaks and `cargo audit` run only in CI (not installed locally); first run on push

## Risk and rollback

- Risk: low. Tooling only, plus a Vite minor-line upgrade (W3C and layout tests pass on it).
- Rollback: revert the squash commit.

## Owner gate

- **Q15:** allow read-only git (`git diff/status/log/show`) for the review agent? The auto-mode classifier refused
  to let me add it myself, rightly. The snapshot approach works without it. Default: no.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
