# docs: roadmap to 1.0 and the GitHub review flow (work item 10)

**Branch:** `docs/0010-roadmap-review-flow` → `main` · **Merge:** Squash and merge on GitHub
([0010-roadmap-review-flow.merge.txt](0010-roadmap-review-flow.merge.txt)). This is the first PR opened on
GitHub, so GitHub numbers it #1; the local work-item number is 10.

## What

- **Roadmap** in `docs/PLAN.md`:
  - v0.7 Save and sign in (recommended next);
  - v0.8 Browse and organize;
  - v0.9 Practice tools;
  - v1.0 Ambient and release;
  - robustness and more sources alongside.
- **Feature ideas** that aren't scheduled yet, grouped by practice, discover, make, CAD, categories and app.
- **Review flow:**
  - Claude pushes work branches (never `main`); you open the PR from a link, review it on GitHub and click
    Squash and merge;
  - `main` gets locked by a ruleset;
  - CLAUDE.md and the handoff template are updated to match.
- ADR-0002…0015 marked accepted (Q9: accepted on merge).
- **ADR-0016 (round 2):** mini player, kept links, iPhone as a Home Screen web app first, automation, and who LeMuse
  is for; roadmap gains v0.7 (mini player + links) and v0.11 (iPhone + automation). Open: Q18, Q19.

## Why

The owner's session-8 request: keep files safe while work is in progress, put work up for review before the
final merge, and show the roadmap plus features that would round out the app.

## How

Docs only. Review 0010 covers the passes, including the open CI gitleaks finding (A-47).

## Checklist

- [x] Secret scan clean (`main...HEAD`)
- [x] No code, dependency or capability change
- [x] Admin and developer passes: [review 0010](../reviews/0010-roadmap-review-flow.md)
- [ ] Owner: find the gitleaks finding (A-47), set up the `main` ruleset, then merge

🤖 Generated with [Claude Code](https://claude.com/claude-code)
