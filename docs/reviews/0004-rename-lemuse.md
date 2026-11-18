# Review 0004: Rename to LeMuse

- **Branch:** `refactor/0004-rename-lemuse` (stacked on `feat/0003-live-preview`) · **ADR:** 0010

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-19 | low | "LeMuse" wasn't checked against trademark registers | Deferred: before any public release (PLAN register) |

- [x] No personal data: the default User-Agent contact is the public repo URL; CODEOWNERS uses the public handle
- [x] Historical records and shipped migrations are left unchanged

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-27 | low | Installs of the PR #3 test build keep `Pictures\ServeNSurf` and `%LOCALAPPDATA%\dev.servensurf.app` | No migration before release; manual cleanup steps in ADR-0010 and the PR |

- [x] `cargo fmt`, `cargo clippy --all-targets -D warnings`, `cargo clippy -p lemuse-app -D warnings`: clean
- [x] `cargo test`: 44 passed. `npm run typecheck` and `validate:w3c` (pre-commit): pass
- [x] `git grep -i servensurf` shows only historical records and migration comments
