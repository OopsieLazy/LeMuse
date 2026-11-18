---
status: proposed
date: 2026-11-17
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0011: Security gates on every commit, before the agent finishes, and in CI

## Context

The owner (2026-11-17): "always check for secrets that could be exposed and security concerns, run checks and
validators. Security is utmost concern. Build hooks that call agent to review as admin for finishing."

Until now, security relied on instructions alone. The repo is now public on GitHub, so a leaked token or personal
detail would be published the moment it's pushed.

## Decision

Four layers. Each is cheap, and each catches what the one before it can't.

| Layer | Runs | Checks | Blocks |
|---|---|---|---|
| `scripts/scan-secrets.mjs` | git pre-commit (everyone), Stop gate, CI | Added lines for keys, tokens, JWTs, bearer literals, hard-coded credentials, **personal email addresses**; forbidden files (`.env`, `*.pem`, `*.key`, `*.db`, `.npmrc`…). Prints file:line, **never the value** | The commit |
| **Agent hook** (`PreToolUse`, `Bash(git commit*)`, Sonnet) | Every commit Claude makes | Reads the staged diff as the admin/architect: secrets, personal data, token handling, CSP/capability creep, HttpClient bypass, ADR-0004 source rules, migration edits, disabled checks | The commit |
| **Stop gate** (`scripts/hooks/stop-gate.mjs`) | When Claude tries to finish on a work branch | Secret scan of `main...HEAD` and uncommitted work; `docs/reviews/NNNN-*.md` exists with an admin pass | Finishing. The reason tells Claude to run an admin-review agent and record A-n findings. A second stop is allowed, so Claude can still pause to ask a question |
| **CI `security` job** | Every PR and push to main | Repo scanner (`--all`), **gitleaks** (full history), `npm audit --audit-level=high`, `cargo audit`, dependency review | The PR |

Plus:

- `.claude/settings.json` **deny rules**: force pushes, pushes to main, merges into main, `--no-verify`, and reading
  `.env` / `*.pem` / `*.key`.
- **Installer size budget**: 10 MiB in CI (currently 3.56 MiB), which keeps the app slim.
- Deny rules are **best-effort** prefix matches; a determined command can be phrased around them. The real
  control is **GitHub branch protection on `main`** (owner sets it up; commands in the handoff): required PR,
  required checks, no force pushes (review 0005 A-20).
- CI: third-party actions are pinned to full commit SHAs, the default `GITHUB_TOKEN` is read-only, and
  `cargo-audit` is pinned (A-21).
- Vite upgraded 5.4 → **6.4.5**. That fixes a high-severity dev-server path traversal and the esbuild advisory;
  `npm audit` now reports 0.

## Options considered

| Option | Verdict |
|---|---|
| Instructions only | Rejected: that's the status quo, and it isn't enforceable |
| An agent hook on `Stop` | Not available: agent hooks run on tool events only. A command Stop gate plus an agent on commit covers both moments |
| gitleaks locally | Not installed; it needs a binary download. The dependency-free node scanner runs everywhere, and gitleaks runs in CI |
| Agent review on every file edit | Rejected: slow and costly. Commits are the natural checkpoint |

## Consequences

- Commits by Claude take about 30–90 s longer (one agent review). Your own commits get only the fast scan.
- Claude Code loads the hooks from `.claude/settings.json` at session start. After pulling this, restart Claude
  Code or open `/hooks` once.
- A false positive can be allowed per line with `secret-scan: allow <reason>`, which reviewers must check.

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-17 | Claude | drafted | |
| Admin pass | 2026-11-17 | admin-review agent + Claude | see review 0005 | A-20… |
| Developer pass | 2026-11-17 | Claude (developer role) | see review 0005 | D-28… |
| Owner gate | | Owner | pending | |
