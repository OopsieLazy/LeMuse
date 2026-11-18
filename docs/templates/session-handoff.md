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

```sh
# 1. Review
git switch <branch>
git log --oneline main..<branch>
git diff --stat main...<branch>
cargo test && cargo clippy --all-targets -- -D warnings

# 2a. Merge on GitHub (preferred, once a remote exists)
git push -u origin <branch>
gh pr create --base main --head <branch> --title "<type(scope): title>" --body-file docs/pr/<NNNN>-<slug>.md
gh pr merge <NNNN> --squash --delete-branch

# 2b. Merge locally (no remote yet): squash with the checklist message
git switch main
git merge --squash <branch>
git commit -F docs/pr/<NNNN>-<slug>.merge.txt

# 3. Tag (only when releasing)
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z

# 4. Cleanup (-D is required after a squash merge)
git branch -D <branch>
git push origin --delete <branch>   # if it was pushed
git fetch --prune
```

### Merge description format (`docs/pr/<NNNN>-<slug>.merge.txt`)

```
<type(scope)>: <title> (#NNNN)

<one-paragraph summary>

✅ <done item>
✅ <done item>
⬜ <deferred item> (→ PLAN Mx)

Reviewed-by: admin pass, developer pass (docs/reviews/NNNN-<slug>.md)
Approved-by: <owner>
Co-Authored-By: …
```
