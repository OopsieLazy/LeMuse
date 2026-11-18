# Review 0011: Fix the CI secret scan and PR-title check

- **Branch:** `ci/0011-fix-security-checks` · **ADR:** 0011 (security gates; the gate is unchanged in intent)
- **Passes:** Claude ran both passes on 2026-11-18; the owner approved the change ("complete the ci fix").

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-52 | high | On the first push of `main`, `gitleaks-action` ran `git log <first commit>^..HEAD`. The root commit has no parent, so git refused, gitleaks scanned 0 bytes ("no leaks found in partial scan"), and the step failed. History had never really been checked by gitleaks | **Fixed:** the step runs the gitleaks binary itself (8.28.0, checksum pinned in the workflow, verified with `sha256sum -c`) and scans **every commit** of the full clone on every run. Stricter than before; no third-party action and no Node 20 runtime |
| A-53 | med | Dependency review fails: the repository's Dependency graph is off | **Owner:** Settings → Security → Dependency graph → Enable. The gate stays as it is |
| A-54 | info | The new binary download is a supply-chain input | Pinned version (released mid-2025, well past the 14-day cooldown), fixed URL on github.com, checksum from that release checked before use. Same tool and rules CI used before |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-60 | med | The PR-title check only ran on `opened`/`synchronize`, so fixing a title on GitHub never cleared the failure | **Fixed:** moved to `pr-title.yml` with `edited` added; its own concurrency group, so title edits don't re-run the build jobs. The status check is still named `pr-title` |
| D-61 | low | GitHub prefills a PR title from the branch name ("Docs/0010 …") | Handoff links now prefill a Conventional-Commit title (`?title=` on the compare link) |
| D-62 | info | The test-build job was skipped because `security` failed | It runs again once `security` passes |

- [x] Both workflow files parse as plain YAML (no tabs); the gitleaks command and flags match 8.28.0's `git`
  subcommand.
- [ ] Proven on GitHub: this PR's own CI run is the test (the PR's workflow files are used).
