# ci: fix the secret scan and the PR-title check (work item 11)

**Branch:** `ci/0011-fix-security-checks` → `main` · **Merge:** Squash and merge on GitHub. Merge this before the
roadmap PR, then press **Update branch** on that one.

## What

- **Secret scan:** gitleaks now runs as the program itself, at a pinned version whose checksum is checked, and
  scans the **full history** every time. Before, the GitHub add-on scanned nothing on the first push of `main`
  and failed.
- **PR-title check:** moved into its own workflow, which also re-runs when you edit a title.

## Why

The first CI run on `main` failed. Nothing leaked: the scan never ran. Pull requests couldn't clear a wrong title
without a new commit.

## How

- `.github/workflows/ci.yml`: the gitleaks step uses `curl`, then `sha256sum -c`, then `gitleaks git --redact`.
  The `pr-title` job is removed.
- `.github/workflows/pr-title.yml` (new): runs on `opened, edited, synchronize, reopened`, with `pull-requests:
  read` only.
- Details: [review 0011](../reviews/0011-fix-security-checks.md).

## Checklist

- [x] Secret scan clean (`main...HEAD`)
- [x] No change to what the gates check; gitleaks now covers more (full history)
- [ ] CI green on this PR (rust, app, security, pr-title, test-build)
- [ ] Owner: enable Dependency graph (Settings → Security), or Dependency review keeps failing

🤖 Generated with [Claude Code](https://claude.com/claude-code)
