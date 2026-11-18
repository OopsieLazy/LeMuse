# chore: keep LeMuse outputs and tokens out of the public repo (work item 15)

**Branch:** `chore/0015-public-repo-hygiene` → `main` · **Stacked on:** #14 · **Merge:** Squash and merge, last

## What

- **`.gitignore`:** a section for what LeMuse commands and local runs produce, such as config, UI settings,
  databases, logs, browser captures, sheets, PDFs and link exports.
- **Secret scanner:**
  - refuses those files even if someone forces them in;
  - refuses images other than the app's icons;
  - catches a pasted dashboard token;
  - fails when a tracked file matches `.gitignore`.
- **CLAUDE.md:** a standing rule. The repo is public, so every change that writes files must check what to
  ignore and update `.gitignore` and the scanner together.

## Why

The owner asked whether to git-ignore `lemuse serve`, and for a clause to watch for files that shouldn't be in
a public repo. The code itself is fine to publish; its outputs aren't.

## How

`scripts/secret-rules.mjs` (`FORBIDDEN_FILES`, `ALLOWED_FORBIDDEN`, 2 new rules) · `scripts/scan-secrets.mjs`
(`git check-ignore`) · `.gitignore` · CLAUDE.md § Security. Details: [review 0015](../reviews/0015-public-repo-hygiene.md).

## Checklist

- [x] `scan-secrets --all` clean; the negative test caught all 4 bad file types (6 findings)
- [x] No code or dependency change

🤖 Generated with [Claude Code](https://claude.com/claude-code)
