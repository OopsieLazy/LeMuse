# feat: error codes and pages, a responsive window, channels you follow (work item 19)

**Branch:** `feat/0019-polish` → `main` · **Stacked on:** #18 (open it against `feat/0018-arena-token`;
GitHub retargets it to `main` when #18 merges) · **Merge:** Squash and merge, after #18

**PR title:** `feat: error codes and pages, a responsive window, channels you follow`

## What

- **Error codes:**
  - every failure has a stable code (`not_found`, `network`, `token`…);
  - `--json` includes it and the CLI exits 3–10 by kind;
  - the app says what to do instead of showing raw messages.
- **Error pages:**
  - the dashboard answers with real HTML pages and the headers each status needs (`Allow`,
    `WWW-Authenticate`, `Retry-After`);
  - the app shows a crash page instead of a blank window (Reload, Copy details, Report a problem);
  - **You're offline** and **These images can't load right now** (Try again) replace a misleading empty topic;
  - **Refresh details** lists which sources failed and why.
- **Responsive:**
  - nothing runs on the UI thread any more;
  - Find channels and Add channel wait their turn during a refresh instead of refusing.
- **Channels you follow** in Find channels, read one page at a time with your token.
- **One running copy:** opening LeMuse again focuses the window.
- **Settings → About:** version, licence, Source code, Report a problem.
- **Version 0.8.0.**
- **CLI:** `lemuse arena-token check` and `following`.

## Why

The owner: "close to complete … create proper error handling and error pages where needed with proper codes,
responsiveness, polish; the token was input, so some testing can be done."

## How

- **Core:**
  - `error::code` and `Error::code()`;
  - `serve` error pages and status headers;
  - `arena::followed_channels` and a shared channel-page parser;
  - `lemuse.toml:` prefixes on config errors.
- **CLI:** exit codes and `code` in `--json`.
- **App (Rust):**
  - `AppError { code, message }` and a `blocking()` helper on every command;
  - `wait_for_reads` sized by the account's tier;
  - the refresh event carries the failed list;
  - `followed_channels` and `about`;
  - the single-instance plugin.
- **UI:** `ErrorBoundary`/`ErrorScreen`, `RefreshDetails`, offline and failed states, About, the following list,
  and eight new snapshot states.
- ADR-0024 · [review 0019](../reviews/0019-polish.md).

## Checklist

- [x] Secret scan clean
- [x] 109 tests · fmt · clippy `-D warnings` (core, CLI, app) · typecheck · W3C 64 · layout 372 renders
- [x] `cargo audit` (0 vulnerabilities, unchanged warnings) · npm audit gate
- [x] One new crate (`tauri-plugin-single-instance` 2.5.5, 21 days old); opener scope adds only the project's
  GitHub pages
- [x] Live: token accepted (free tier), 21 followed channels listed, dashboard error pages and headers
- [ ] Owner: Find channels → Show the channels I follow; open LeMuse twice; pull the network cable for a moment

🤖 Generated with [Claude Code](https://claude.com/claude-code)
