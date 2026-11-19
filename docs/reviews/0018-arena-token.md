# Review 0018: Are.na token in Windows Credential Manager

- **Branch:** `feat/0018-arena-token` (stacked on #17) · **ADR:** 0023
- **Passes:** Claude ran both passes on 2026-11-18. The commit hook's admin agent reviews each commit too.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-94 | high | A secret enters the app for the first time | Stored only in Credential Manager (DPAPI, this PC only). It's never in a file, the catalog, logs, errors, the clipboard or the page. The page sends it once and gets back the account slug only. The client sends it only to `https://api.are.na` (exact host, no port or userinfo; never across redirects) |
| A-95 | med | A token pasted into a file in the project folder could reach the public repo | `.gitignore` and `FORBIDDEN_FILES` refuse `token*.txt`, `*token.txt`, `*.token`, `.arena*`, `arena-token*` and `secrets/`. The scanner already flags `Bearer <value>`. Checked that no tracked file matches (a first pattern caught `0006-design-tokens…merge.txt`, so it was narrowed) |
| A-96 | med | `GET /v3/me` returns the account's email | Only `slug`, `name` and `tier` are deserialised; the email is never read or kept. The test fixture leaves it out |
| A-97 | low | New dependency? | None: `windows-sys` 0.61.2 is already locked (Tauri, rustls); only features are added, and the lockfile gains one line. `cargo audit` is unchanged |
| A-98 | low | Tauri surface | Three app commands (`arena_token_status`, `set_arena_token`, `clear_arena_token`); no new plugin, capability or CSP host. The token page link uses the existing `https://www.are.na/*` opener scope |
| A-99 | info | ToS (ADR-0004) | A personal access token for the owner's own account, read scope; budget stays at 80 % of the tier; same channels-only rule |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-97 | med | Are.na treats a bad token as a guest on public reads (probed), so a revoked token would run at 96 reads a minute against a 30 limit | Each refresh checks the token with `/v3/me` first. If it's refused, the refresh drops it, runs as a guest and says so. If the check fails on the network, the token is kept at the guest budget. Tests cover all three cases |
| D-98 | med | Pasted text could carry a newline (header injection) or a `Bearer ` prefix | `clean_token`: trims, drops the prefix, and needs 16–512 printable ASCII characters. Errors never echo the input. Test |
| D-99 | low | The CLI could leave the token in shell history or on screen | `lemuse arena-token set` reads stdin with console echo off (restored on drop), or from a pipe; never from an argument |
| D-100 | low | Windows FFI | Wide strings are NUL-terminated and kept alive for the call; `CredFree` runs once; the blob is zeroed after writing; `ERROR_NOT_FOUND` means "none". The real-vault round trip test is `#[ignore]`d so `cargo test` never touches the vault; run once on this PC: passed, and nothing was left behind |
| D-101 | info | The `/v3/me` fixture is shaped from the OpenAPI `Me` schema, not a real answer (no token in the repo or tests) | Register: trim a real one once the owner has saved a token |
| D-102 | info | The token stays in memory while LeMuse runs | Accepted (ADR-0023); no zeroizing crate added |
| D-103 | med | Owner opened the release build on `Pictures\LeMuse`, whose catalog had never been refreshed: everything showed 0 until the whole first refresh ended (minutes at the guest rate) | **Fixed:** while a refresh runs and the current view is empty, the app looks again every 10 s (catalog reads only), and the status says "First refresh: images appear as they arrive". A view with images isn't reloaded mid-slideshow |

- [x] 106 tests (6 new) plus 1 ignored vault test (run once: passed) · fmt · clippy `-D warnings` (core, CLI, app)
  · typecheck · W3C 57 files · layout 55 states × 6 sizes = 330 renders.
- [x] CLI by hand: `status` with none saved; `set` refuses a short value with no request; `set` with a fake
  token: Are.na refused it (one read) and nothing was saved; `clear` with none saved.
- [x] Secret scan of the branch clean.
