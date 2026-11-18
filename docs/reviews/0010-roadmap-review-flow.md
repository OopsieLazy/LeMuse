# Review 0010: Roadmap and the GitHub review flow

- **Branch:** `docs/0010-roadmap-review-flow` · docs and process only, no code
- **Passes:** Claude ran both passes on 2026-11-17.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-47 | high | CI's first run on `main` (the v0.6.0 push) failed in **gitleaks, full history**. The finding isn't visible without the job log, and running gitleaks locally needs the owner's permission | **Open, owner:** see the handoff. Likely a false positive: the project holds no tokens or keys yet, `scan-secrets` is clean, and a masked history search found only constants. If it's real, **rotate** it, then record it in `.gitleaksignore` by fingerprint (history is never rewritten) |
| A-48 | med | The repo is public, so a pushed branch is public before review | The secret scan of `main...HEAD` runs before every push (CLAUDE.md). `.claude/settings.json` already denies pushing `main` and force-pushes |
| A-49 | low | GitHub doesn't let you approve your own PR, so a "1 approval" rule would block the sole owner | The ruleset requires a PR with 0 approvals, plus status checks (`rust`, `app`, `security`) once they've run on a PR. Review happens on the PR page |
| A-50 | low | CI warnings: pinned actions target Node 20 (deprecated), and `ubuntu-latest` moves to Ubuntu 26 | Register: bump the pinned SHAs to Node 24 releases (14-day cooldown) |
| A-51 | info | ADR-0002…0015 were merged in v0.6.0 while still "proposed" | Marked accepted (Q9: "accepted on merge") |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-57 | low | The handoff template still described local squash merges and `gh pr create` | Rewritten for the web flow: compare link, Squash and merge on GitHub, then `git pull` |
| D-58 | info | GitHub has no PRs yet, so its numbering starts at #1, while local work items reached #10 | NNNN stays the work-item number; the PR doc names both |
| D-59 | info | Local `main` diverges if the owner merges on GitHub but keeps an old local `main` | The handoff always ends with `git switch main` and `git pull` |

- [x] Markdown only; no code, dependency or capability change.
- [x] Secret scan of `main...HEAD` clean before the push.
