# Session handoff template

Use at the end of **every** conversation. Part A is appended to `docs/PROGRESS.md`. Part B is pasted to the owner.

---

## Part A: progress log entry

```markdown
## YYYY-MM-DD: <session title>

**Branch:** `type/NNNN-slug` · **PR:** #NNNN · **Status:** awaiting owner review | merged | in progress

### Done
- …

### Decisions
- ADR-NNNN <title>: proposed | accepted

### Deferred / known gaps
- … (→ PLAN Mx)

### Next session starts with
1. …
```

---

## Part B: commands for the owner

Replace `<branch>`, `<NNNN>` and the title. Give *all* of these every time, even if some don't apply yet.

**Format rule (owner, Q13):** a comment goes on its **own line above** its command, never after it, so a whole
line copies cleanly. One command per line; no `&&` chains unless the steps must run together.

```sh
# Review: switch to the branch
git switch <branch>
# Review: list its commits
git log --oneline main..<branch>
# Review: which files changed
git diff --stat main...<branch>
# Review: security first, then tests and lint
node scripts/scan-secrets.mjs --range main...<branch>
cargo test
cargo clippy --all-targets -- -D warnings

# Merge on GitHub: push the branch
git push -u origin <branch>
# Merge on GitHub: open the PR (or use the web page GitHub prints after the push)
gh pr create --base main --head <branch> --title "<type(scope): title>" --body-file docs/pr/<NNNN>-<slug>.md
# Merge on GitHub: squash-merge it once CI is green
gh pr merge <NNNN> --squash --delete-branch

# Merge locally instead: squash with the checklist message
git switch main
git merge --squash <branch>
git commit -F docs/pr/<NNNN>-<slug>.merge.txt
git push origin main

# Tag (only when releasing)
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z

# Cleanup: -D is required after a squash merge
git branch -D <branch>
# Cleanup: delete the remote branch if it was pushed
git push origin --delete <branch>
# Cleanup: forget deleted remote branches
git fetch --prune
```

### Merge description format (`docs/pr/<NNNN>-<slug>.merge.txt`)

```
<type(scope)>: <title> (#NNNN)

What: <one line>
Why: <one line>

✅ <done item>
✅ <done item>
⬜ <deferred item> (→ PLAN Mx)

Reviewed-by: admin pass, developer pass (docs/reviews/NNNN-<slug>.md)
Approved-by: <owner>
Co-Authored-By: …
```
