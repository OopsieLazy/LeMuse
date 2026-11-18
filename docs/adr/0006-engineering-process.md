---
status: proposed
date: 2026-11-16
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0006: GitHub Flow, Conventional Commits, squash merges, and a staged AI review loop

## Context

The owner wants the project run "at an enterprise level". Decisions are made, then looped back through an
admin pass and a developer pass, before coming to the owner. Commits and PRs should follow company standards,
and every conversation ends with the full command set. Most code is written by an AI agent (Claude Code), with
one human owner.

## Decision

| Concern | Standard |
|---|---|
| Branching | GitHub Flow: protected `main`, short-lived `type/NNNN-slug` branches, SemVer tags. No Git Flow; cut `release/x.y` only to patch an old version |
| Commits | Conventional Commits 1.0, small and single-concern, with a `Co-Authored-By` trailer |
| Merging | Squash-merge with a Conventional-Commit PR title. Post-merge: `git branch -D` (squash needs `-D`), `git push origin --delete`, `git fetch --prune` |
| Releases | release-please (adds a human-approved release PR) once a remote exists (M1) |
| Decisions | MADR-style ADRs in `docs/adr/` with a review log |
| Reviews | Proposal → admin pass → developer pass → owner gate (`docs/templates/review-loop.md`) |
| Records | `CHANGELOG.md` (Keep a Changelog), `docs/PROGRESS.md` (append-only session log), `docs/reviews/`, `docs/pr/` |
| CI | GitHub Actions on `windows-latest`: fmt, clippy `-D warnings`, tests, UI typecheck, PR-title lint |
| PR size | Aim for under ~400 changed lines. Skeleton PR #1 is an accepted exception |

## Options considered

- **Git Flow:** rejected. Its author says it's only still a fit when supporting several shipped versions at once.
- **Trunk-based with direct commits to main:** rejected, because the owner gate needs a PR.
- **semantic-release:** rejected for now. It has no human gate by default; release-please gives one.

## Enforcement (guidance alone isn't enough)

CLAUDE.md is guidance, and the agent may judge a rule inapplicable. Hard gates belong in tooling:

- **GitHub ruleset on `main`:** require a PR, require status checks, block force-push.
- **Owner approval:** GitHub won't let a PR's author approve it. So the agent must push from a **bot account or
  GitHub App** for the owner to be a required CODEOWNERS approver. Until then, the owner gate is procedural: the
  agent never merges.
- **Claude Code deny rules** (project `.claude/settings.json`) for force-push and pushes to `main`. This is a
  follow-up: the exact rule syntax gets verified with the `update-config` skill before it's committed.

## Consequences

- Easier: an auditable history, a generated changelog, and safe rollback (one squash commit per PR).
- Harder: there's process overhead on tiny changes. Typo-level fixes may skip the ADR, but never the review log.

## Action items

1. [x] CLAUDE.md, templates, PR/issue templates, CODEOWNERS placeholder, CI workflow.
2. [ ] Owner: create the GitHub repo, push, configure the ruleset, install `gh` (Q3 in PR).
3. [ ] M1: release-please workflow; `.claude/settings.json` deny rules.

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-16 | Claude | drafted | |
| Admin pass | 2026-11-16 | Claude (architect role) | approved with notes | A-4 (enforcement gap documented) |
| Developer pass | 2026-11-16 | Claude (developer role) | approved | |
| Owner gate | | Owner | pending | Q3 in PR |
