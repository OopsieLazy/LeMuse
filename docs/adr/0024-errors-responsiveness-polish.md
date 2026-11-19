---
status: proposed
date: 2026-11-19
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0024: Error codes and error pages, a responsive window, and the finishing touches

## Context

The owner (session 15): LeMuse "works almost exactly as needed" and will stay open source. They asked for:
- proper error handling, with error pages where needed and proper codes;
- a more responsive app;
- polish;
- tests of the Are.na token they had just saved.

What we found:
- **Errors were strings everywhere:**
  - the CLI exited with 1 for every failure;
  - the dashboard answered with bare text ("not found", "busy") and missed the headers its statuses need;
  - the app had no screen for its own crash, so the window just went blank.
- **Tauri 2 runs plain `fn` commands on the UI thread.** Most catalog commands (`slides`, counts, categories,
  playlists) were plain `fn`s, so a slow query, or waiting on a refresh's write, froze the window.
- **Find channels and Add channel were refused during a refresh (D-74).** Big channels can refresh for minutes.
- Images that failed because the PC was offline looked like an empty topic ("No images yet").

## Decision

1. **Stable error codes** (`lemuse_core::error::code`). Codes are only ever added, never renamed:

   | Code | Meaning | CLI exit | Dashboard API |
   |---|---|---|---|
   | `invalid` | bad input or a bad `lemuse.toml` | 3 | 400 |
   | `not_found` | no such topic, playlist, channel or image | 4 | 404 |
   | `busy` | another refresh holds the library | 5 | 503 |
   | `rate_limited` | a source asked us to slow down | 6 | 500 |
   | `network` | can't reach a source, or it answered 5xx | 7 | 500 |
   | `source` | a source answered with a problem (private, odd data) | 8 | 500 |
   | `token` | the Are.na token: refused, unreadable, vault trouble | 9 | 500 |
   | `io`, `catalog` | files or the database | 10 | 500 (details only in the server window) |
   | `unsupported` | not built yet | 1 | 500 |

   - **CLI:** the `--json` envelope gains `"code"`. Text mode prints `error [code]: message`. Exit 2 stays clap's
     "bad arguments". The misleading "invalid config:" prefix is gone; real `lemuse.toml` errors now start with
     `lemuse.toml:`.
   - **App:** commands reject with `{ code, message }`, and the page turns that into an `AppError`.
2. **Error pages:**
   - **Dashboard (`lemuse serve`):** every non-API error is a small HTML page: the status, what it means, and
     "Back to the dashboard". It uses fixed text only (nothing from the request is echoed), a
     `default-src 'none'` CSP, and passes W3C.
     - Each status carries its required header: `Allow: GET, HEAD` on 405, `WWW-Authenticate: Bearer` on 401,
       `Retry-After` on 503.
     - API errors stay JSON, with a `code`. A 500 still hides details, because paths hold the Windows user name.
   - **App crash page:** a React error boundary shows "LeMuse hit a problem". It says the library is safe and
     offers **Reload**, **Copy details** (only when clicked) and **Report a problem**.
   - **States instead of blanks:**
     - **You're offline:** images come back on their own when the connection returns (`online` event).
     - **These images can't load right now:** with **Try again**.
     - **Refresh details:** which sources failed and why (first 20). It's offered from the refresh line, with
       **Refresh again**.
     - A whole failed refresh says what to do by code (network, busy, rate limited).
3. **Responsiveness:**
   - Every command runs on Tauri's blocking pool (`blocking()` helper); none runs on the UI thread.
   - UI-started Are.na reads now **wait their turn** instead of being refused (D-74). They are spaced to fit what
     the account's limit leaves:
     - during a refresh, the 20 % the engine keeps free (guest 6 a minute, free 24);
     - otherwise, the 80 % budget (guest 24, free 96).

     A read gives up only after a 30 s wait (`busy`). This still stops a compromised page from spending the
     budget (A-30).
4. **Single instance:** `tauri-plugin-single-instance` 2.5.5 (released 2026-10-28, 21 days old; pinned).
   - A second launch focuses the running window, so two windows can't refresh one library at once.
   - It adds one crate: everything it depends on was already locked. `cargo audit` is unchanged (0
     vulnerabilities, the same 6 allowed Linux-only warnings).
5. **Channels you follow:**
   - **Find channels** lists the channels the token's account follows: one page per click, the same Preview
     → Add flow as related channels.
   - `GET /v3/users/<slug>/following?type=Channel`, read only on a click (ADR-0004, ADR-0015).
   - `lemuse arena-token check` (one read) and `lemuse arena-token following [--page N]` cover the same from the
     command line.
6. **About and version:**
   - Settings → **About** shows the version, the MIT licence, the content credit, **Source code** and **Report a
     problem**.
   - The opener scope gains exactly `https://github.com/OopsieLazy/LeMuse` and its subpages. No other GitHub
     page, and no other site.
   - All version numbers move to **0.8.0**: Cargo, `tauri.conf.json` and `package.json`.

## Options considered

| Option | Verdict |
|---|---|
| **Codes on the existing `Error`, mapped by each front-end (chosen)** | One source of truth; messages stay human; nothing breaks for callers that read only `error` |
| A new error enum per front-end | Codes would drift between CLI, app and dashboard |
| `#[tauri::command(async)]` on the `fn`s | Same effect, but less explicit than one `blocking()` helper that also converts errors |
| Queue UI reads behind the whole refresh | A refresh can take minutes; the 20 % headroom already lets reads through safely |
| Single instance by a named mutex (`windows-sys`) | No new crate, but it can't hand focus to the running window without more Win32 code; the official plugin is small and passed the cooldown |

## Consequences

- Scripts can branch on `code` or the exit code instead of parsing messages (docs/automation.md).
- `--json` output gains a field. The envelope version stays 1: fields may be added.
- One new crate (the plugin) and one opener scope (the project's GitHub pages), both justified here.
- Not yet: a "copy diagnostics" bundle (logs are not kept: privacy first), and signed installers (v1.0).
