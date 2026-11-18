# Review 0008: Playlists, All, Add channel, security upkeep

- **Branch:** `feat/0008-playlists-import` (stacked on #7) · **ADR:** 0014
- **Admin pass:** an admin-review agent read the diff read-only on 2026-11-17, then Claude checked its findings.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-30 | med | Add-channel lookups bypass the engine's throttle. The 2 s cooldown allows 30/min (the whole guest limit), and a lookup during a refresh could exceed it, which breaks ADR-0004 | **Fixed:** 2.5 s cooldown (≤ 24/min, the 80% budget); refused while a refresh runs; a 429 sets the next allowed time from Retry-After (1–600 s) |
| A-31 | med | The npm audit gate passed when `npm audit` itself failed (offline, registry error): weaker than the old `--audit-level=high` | **Fixed:** fails closed (exit 2) without a real report; proven offline (exit 2) and online (exit 0) |
| A-32 | low | App and CLI shared a fixed temp name with no cross-process lock, so the last writer could drop the other's channel; an editor save in between was clobbered | **Fixed:** OS lock on `lemuse.toml.lock` shared by app and CLI; unique temp file (`tempfile`), deleted on failure; written only if the file still matches what was read. New test |
| A-33 | low | Growth a compromised page could cause: 20,000 sources would overflow SQLite's variable limit in All; unbounded keywords and playlist rows; no index for "which playlists hold this image" | **Fixed:** ≤ 500 sources in total, ≤ 50 keywords per topic, ≤ 200,000 playlist rows in total; index in new migration 0004. The thread-per-add wait is bounded by A-30 (adds refused during refreshes) |
| A-34 | low | Names allowed bidi overrides, zero-width characters and BOMs (spoofing); topics matched case-sensitively, so "lamps" and "Lamps" became two topics sharing one Windows folder | **Fixed:** invisible format characters refused; topics match and dedupe case-insensitively, and an add uses the stored spelling. Tests |
| A-35 | low | Stricter validation could refuse an existing hand-written config (e.g. an uppercase slug) | **Fixed:** slugs are trimmed and lowercased on load; other errors name the topic and value; release note in CHANGELOG |
| A-36 | low | `$CLAUDE_PROJECT_DIR` probably isn't expanded in agent-hook prompts (an absolute path would leak the Windows username) | **Fixed:** the prompt says "the folder that holds CLAUDE.md", with a Glob fallback |
| A-37 | low | Pre-existing: download mode fetches image URLs from any https host the API names | **Deferred** to the Save PR (PLAN): allow-list download hosts per connector, matching the CSP |

The agent confirmed the areas below have no issue:
- **Link parsing:** trailing dots, IP literals, backslashes, IDN/fullwidth forms, `//` paths and over-long input.
- **TOML, SQL and XSS:** only constants are substituted, and React renders text only.
- **Contact header:** CR/LF refused.
- **Token and HTTPS handling.**
- **Tauri:** CSP and capabilities unchanged.
- **Migrations:** 0001 and 0002 untouched.
- **Terms of service:** one user-initiated read per add.
- **`--ignore-scripts`:** safe.
- **Personal data:** none added.

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-37 | med | The admin-review hook read `.claude/review/changes.diff` relative to the current folder. After a `cd app` it couldn't find the file and blocked every command | **Fixed:** the prompt names the repo-root path (`$CLAUDE_PROJECT_DIR/...`). Checks still apply; only the path changed |
| D-38 | low | The Add-channel topic picker kept its first value: it didn't follow the topic being played, and could point at a removed topic | **Fixed:** follows `defaultTopic`; falls back to the first topic |
| D-39 | low | The URL parser silently drops tabs and newlines, so `x\r\nHost: …` was judged by scheme, not refused | **Fixed:** control characters are refused before parsing; test covers it |
| D-40 | low | Playlist menu: a long name widened the grid track and pushed "Create" off-screen (layout test, 15 failures) | **Fixed:** `minmax(0, 1fr)` columns; the name ellipsizes |
| D-41 | info | `cargo audit` on the #7 stack reported RUSTSEC-2026-0459 (bundled SQLite). CI would have failed on the first push | **Fixed:** rusqlite 0.41.1; test asserts SQLite ≥ 3.54.0 |
| D-42 | info | `npm audit` now reports GHSA-fc5q-39xc-vjpf (picomatch ≤ 4.0.7, no fix yet) via Vite. CI's `--audit-level=high` would fail every PR | Gate script with an expiring, dev-only exception (see A-section); re-check by 2026-12-15 |
| D-43 | low | Adding a channel while a full refresh runs: that refresh read the config before the channel existed | The single-channel refresh waits for the running one (≤ 15 min), then runs |
| D-44 | info | Preview playlists last only for the page view | By design: the preview is a snapshot; the app stores them in the catalog |
| D-46 | low | `review-snapshot.mjs` drains stdin for hooks; run by hand inside a command, an inherited stdin that never closed hung the first commit for 20 min | **Fixed:** `--manual` skips the drain; the hook's block message says so |
| D-45 | info | Playlists can't be copied to an Are.na channel yet | Deferred (PLAN): needs the owner's token and write access, an owner decision |

- [x] 66 core tests (15 new):
  - link parsing (accept and refuse lists);
  - lookup;
  - TOML injection;
  - never writing an invalid config;
  - playlists;
  - counts;
  - the SQLite version;
  - the token host check.
- [x] Real CLI smoke test against the scratch library:
  - private channel → "private" message;
  - existing channel → "already in";
  - look-alike host refused with no request.
- [x] `cargo audit`: 0 vulnerabilities (was 1). Six unmaintained/unsound warnings remain, all transitive via Tauri
  (GTK/zbus are Linux-only).
- [x] npm: `npm ci --ignore-scripts` builds and validates cleanly. The vnu-jar install script, which downloads a
  JRE from GitHub, isn't needed.
