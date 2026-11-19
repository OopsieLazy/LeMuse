# feat: keep your Are.na token in Credential Manager (work item 18)

**Branch:** `feat/0018-arena-token` → `main` · **Stacked on:** #17 (open it against
`feat/0017-save-originals`; GitHub retargets it to `main` when #17 merges) · **Merge:** Squash and merge, after #17

**PR title:** `feat: keep your Are.na token in Credential Manager`

## What

- **Settings → Are.na account:** paste a personal access token (free accounts can make one at
  are.na/settings/personal-access-tokens) and click **Check and save**.
  - Are.na checks it first; nothing is saved if Are.na refuses it.
  - It's kept in **Windows Credential Manager**, never in a file.
  - **Remove token** deletes it.
- **With a token:**
  - refreshes run at the free account's limit (120 reads a minute instead of 30, about 4× faster);
  - your **private channels** can be added and previewed.
- **A revoked token** is caught at the start of each refresh: that refresh runs as a guest and the status line
  says so.
- **CLI:** `lemuse arena-token status | set | clear`. `set` hides what you paste.
- **Public-repo guard:** `.gitignore` and the secret scanner refuse files that look like a saved token.

## Why

The owner's question: "where do I put the token, and should it be git-ignored?" The answer is in no file at all.
It also speeds up big channels and opens private ones. Search stays Premium-only, so Find channels is unchanged.

## How

- **Core:**
  - `credentials` (Win32 Credential Manager through `windows-sys`, which is already in the lockfile, with
    features only);
  - `arena::account` (`GET /v3/me`; it reads slug, name and tier only, never the email);
  - `sync::arena_session` (checks the token each refresh, with a guest fallback), `save_arena_token` and
    `production_client` with the token;
  - `RunSummary.notes`;
  - `Error::Token`.
- **App:** the `arena_token_status`, `set_arena_token` and `clear_arena_token` commands; the token never comes
  back to the page.
- **UI:** a section in the Settings panel, four snapshot states, and a note in the refresh label.
- ADR-0023 · [review 0018](../reviews/0018-arena-token.md) · ADR-0020 addendum: is there a SaaS product?

## Checklist

- [x] Secret scan clean; no tracked file matches the new token patterns
- [x] 106 tests (6 new), plus the Credential Manager round trip (ignored by default; run once: passed)
- [x] fmt · clippy `-D warnings` (core, CLI, app) · typecheck · W3C 57 · layout 330 renders
- [x] No new crate (one lockfile line), capability, plugin or CSP host
- [x] By hand: a fake token was refused by Are.na and nothing was saved
- [ ] Owner: Settings → Are.na account → paste your token → Check and save, then Refresh

🤖 Generated with [Claude Code](https://claude.com/claude-code)
