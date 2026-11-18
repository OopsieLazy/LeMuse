# Review 0015: Public-repo hygiene (what must be git-ignored)

- **Branch:** `chore/0015-public-repo-hygiene` (stacked on #14) · **ADR:** 0011 (security gates)
- **Passes:** Claude ran both passes on 2026-11-18.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-78 | med | The repo is public, and recent commands write files that hold personal data: `export-links` (links, titles), `sheet` (HTML; PDFs printed from it), `status --json` (the library path, which holds the Windows user name), `serve` (a token in the address and in logs) | `.gitignore` gains a section for LeMuse outputs. `FORBIDDEN_FILES` refuses them even with `git add -f`: `lemuse.toml`, `ui.json`, `*.sqlite`, `*.log`, `*.har`, `*.pdf`, `sheet*.html`, `*-links.*`, images outside the app icons |
| A-79 | med | A dashboard address or `LEMUSE_SERVE_TOKEN=…` pasted into docs or an issue would publish a token | Two new scanner rules: `#token=<32+ chars>` and `LEMUSE_SERVE_TOKEN` assignments. Docs use `#token=…` |
| A-80 | low | Files that `.gitignore` covers can still be tracked (`git add -f`, or a rule added later) | The scanner runs `git check-ignore --no-index` on every scanned file and fails on a match |
| A-81 | info | Should `lemuse serve` itself be ignored? | No. It's source code, MIT, and safe in public by design: no secret lives in the code, and the token is made at run time. Only its outputs are kept out |
| A-82 | info | The rule for the future | CLAUDE.md § Security: before each commit, and whenever a change writes files, ask "would this be fine on a public page?" and update `.gitignore` and `FORBIDDEN_FILES` together |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-83 | low | The image rule could block a legitimate image later (e.g. docs screenshots) | Images are against ADR-0009 anyway; an allowed path can be added to `ALLOWED_FORBIDDEN` in a reviewed change |
| D-84 | info | `/*.csv` and `/*.pdf` apply to the repo root only, so fixtures stay possible | Fixtures are JSON under `crates/lemuse-core/tests/fixtures/` |

- [x] `scan-secrets --all`: clean (182 tracked files; nothing tracked today breaks the new rules).
- [x] Negative test (staged with `git add -f`, then unstaged and deleted; nothing committed): an image, a link
  export and a sheet were refused as forbidden types, the export and sheet also as ignored-but-tracked, and a
  dashboard token in a note was caught. 6 findings, no values printed.
