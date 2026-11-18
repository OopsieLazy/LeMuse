# Review 0005: Security gates

- **Branch:** `ci/0005-security-gates` (stacked on #4) · **ADR:** 0011
- **Admin pass:** an admin-review agent (general-purpose) read the diff read-only on 2026-11-17, then Claude checked
  its findings.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-20 | med | Deny rules missed: `git switch main` followed by merge, `push HEAD:main`, `commit -nm`, `git -c core.hooksPath=`, and unsetting `core.hooksPath` | **Fixed (in #7):** 10 more deny rules. ADR-0011 now says prefix denies are best-effort and that **GitHub branch protection** is the real control (owner commands in the handoff) |
| A-21 | med | `gitleaks-action` was on a mutable tag; no workflow-level token permissions; `cargo-audit` unpinned | **Fixed (in #7):** all 9 actions pinned to full commit SHAs; top-level `permissions: contents: read`; `cargo-audit 0.22.2` |
| A-22 | low | The scanner skipped every rule on a `noreply@` line; the email rule covered only consumer domains; an added line starting `++ ` could be misread as a file header | **Fixed (in #7):** the noreply exception applies to emails only; *any* address off an allow-list is flagged (the repo was re-scanned: only public organisation addresses, now allow-listed); files are tracked by `diff --git` headers. Each bypass was re-tested and caught |
| A-23 | low | The Stop gate didn't scan untracked files, and accepted any review file containing the word "admin" | **Fixed (in #7):** new `--untracked` scan mode; it requires a `## Admin` section with A-n findings or "no findings", and no placeholder |
| A-24 | med | The review and PR files cited by ADR-0011–0013 were missing | **Fixed:** reviews 0005–0007 and PR docs 0005–0007 were added |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-28 | **high** | The `PreToolUse` agent hook runs without shell access ("don't ask" mode), so it couldn't run `git diff` and blocked every commit | **Fixed in #6** (`fix(process)`): `scripts/hooks/review-snapshot.mjs` writes status, `git diff HEAD` and new files to `.claude/review/changes.diff` (gitignored) after each edit; the agent reads it. Adding read-only git `allow` rules was refused by the auto-mode classifier → owner decision Q15 |
| D-29 | med | `PreToolUse` fires before a chained `git add`, so "staged changes" were empty when reviewed | **Fixed in #6:** the agent reviews all uncommitted work, not just staged changes |
| D-30 | low | The snapshot refreshes asynchronously and can lag one tool call | Mitigated: run the snapshot script before committing; the agent blocks on a stale snapshot. In the PLAN register |

- [x] Scanner proven on planted fakes (token, password, personal email, `.env`); `noreply` passes; output never
      contains the value
- [x] Stop gate pipe-tested; the loop guard works; agent hook live (it blocked, then approved, real commits)
- [x] `npm audit` 0 after Vite 6.4.5; W3C and layout tests pass on it
