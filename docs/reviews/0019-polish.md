# Review 0019: Error codes and pages, responsiveness, followed channels, single instance

- **Branch:** `feat/0019-polish` (stacked on #18) · **ADR:** 0024
- **Passes:** Claude ran both passes on 2026-11-19. The commit hook's admin agent reviews each commit too.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-100 | med | New dependency `tauri-plugin-single-instance` | 2.5.5, released 2026-10-28 (21 days, past the 14-day cooldown), pinned `=2.5.5`. Its dependencies were already locked, so the lockfile adds one crate. `cargo audit`: 0 vulnerabilities, the same 6 allowed warnings before and after. No JS API, so no capability |
| A-101 | med | Opener scope widened | Exactly `https://github.com/OopsieLazy/LeMuse` and its subpages (About, Report a problem); `isOpenable` mirrors it with an exact path check. No other GitHub page opens |
| A-102 | med | Error pages could reflect request text (XSS) | The dashboard pages use fixed text only, plus `default-src 'none'` and inline styles only. The app's crash page renders the message as React text. 500s still hide details (paths hold the Windows user name) |
| A-103 | low | UI reads during a refresh (D-74) could exceed Are.na's limit | They fit in the 20 % the engine leaves free (guest 6 a minute, free 24) and give up after 30 s. A compromised page still can't spend the budget faster (A-30) |
| A-104 | low | Followed channels read the owner's account | One page per click; slug, title, owner and count only; nothing stored. Same rule as related channels (ADR-0015) |
| A-105 | info | "Copy details" on the crash page | Copied only on click; it stays on this PC unless pasted. No logs are written |
| A-106 | info | npm audit exception GHSA-fc5q-39xc-vjpf | No longer needed (the gate said so); removed |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-104 | high | Tauri runs plain `fn` commands on the UI thread: catalog queries could freeze the window | Every command now runs through `blocking()` on the blocking pool |
| D-105 | med | Every CLI failure exited 1; messages started "invalid config:" even for a missing topic | `Error::code()`, exit codes 3–10, and `code` in `--json`. Config-file errors now say `lemuse.toml:`. Tests cover every variant |
| D-106 | med | The dashboard answered errors as bare text, missing `Allow`/`WWW-Authenticate`/`Retry-After` | HTML error pages and the required headers. Tests cover each status. The page passes W3C (checked with vnu). Probed live: 404 page, 405 with `Allow`, 401 with `WWW-Authenticate` |
| D-107 | med | Offline or failing images looked like an empty topic | Offline and "can't load" states with Try again; `online` retries automatically. Snapshot states for both |
| D-108 | low | "N sources failed" with no way to see which | Refresh details lists them (first 20) with Refresh again |
| D-109 | low | A blank window if the UI throws | Error boundary with the crash page. Snapshot state; the layout test caught 24 px of overflow, which is fixed |
| D-74 | low | Add channel and Find channels were refused during a refresh | **Fixed** (see A-103) |
| D-101 | info | `/v3/me` fixture was schema-shaped | **Closed:** checked live with the owner's token. `account()` parsed the real answer (free tier), and the following list returned 21 channels. The fixture keeps placeholder values; real account data stays out of the public repo |

- [x] 109 tests (3 new) plus 1 ignored vault test · fmt · clippy `-D warnings` (core, CLI, app) · typecheck ·
  W3C 64 files · layout 62 states × 6 sizes = 372 renders · `cargo audit` · npm audit gate.
- [x] Live: `arena-token check` (one read, free tier), `arena-token following` (21 channels), exit code 4 for
  a missing topic, dashboard 404/405/401 pages and headers.
- [x] Secret scan of the branch clean.
