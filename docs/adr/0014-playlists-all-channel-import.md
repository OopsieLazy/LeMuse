---
status: proposed
date: 2026-11-17
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0014: Local playlists, an "All" view, and paste-a-link channel import

## Context

The owner asked for three things (session 6):

1. Add images to their own playlist (a "custom channel") inside the app, plus an **All** view with everything
   from every saved channel.
2. A working Add-channel feature, so they can add the channels that weren't matched by name (Q14).
3. A security review of that feature: can it be used for injection, and what happens if someone changes what
   the app fetches from?

The constraints:

- The free Are.na plan has no search API (ADR-0004).
- Writing to Are.na needs the owner's token and touches their account.
- Images stream; only Save writes bytes (ADR-0007, ADR-0009).
- A refresh never deletes posts (ADR-0013).

## Decision

1. **Playlists are local.** They are two SQLite tables, `playlists` and `playlist_items` (migrations 0003–0004),
   holding block references only. They are local state like `block_files`: a refresh never reads or writes them,
   and blocks are never deleted, so a playlist keeps its images even after a channel drops them. Copying a
   playlist to an Are.na channel would need the owner's token and write access; that is left for a later
   decision.
2. **All** is the union of every topic's sources, deduplicated, over the same `slides()` query. Counts use
   `COUNT(*)` (fixes D-19).
3. **Add channel** parses the pasted text into a slug and never fetches the pasted URL. It then makes one
   `GET /v3/channels/<slug>` request to the fixed API host through `HttpClient`, and writes `lemuse.toml` with a
   structural TOML editor (`toml_edit`). Each edit holds an OS lock shared by the app and the CLI, is fully
   validated, goes to a uniquely named temp file, and is renamed over the config only if the file still matches
   what was read (an editor's save in between is never clobbered). Only the new channel is refreshed afterwards. "Remove" is the same edit in reverse; catalogued images
   stay.
4. **Requests can't be steered by config or by pasted text.** Hosts are compile-time constants. `Config::validate`
   checks every config value that reaches a URL or a header:
   - channel slugs: `[a-z0-9][a-z0-9_-]{0,119}`;
   - queries and contact: one line, at most 200 characters;
   - topic and playlist names: one line, at most 60 visible characters (no bidi or zero-width characters),
     unique ignoring case;
   - at most 200 topics, 100 sources per topic, 500 sources in total and 50 keywords per topic.

   Slugs are lowercased on load, so an uppercase hand edit isn't fatal.

   The HTTP client is `https_only`, never carries an `Authorization` header across a redirect, and sends a token
   only to the parsed host `api.are.na`.

## Options considered

### Option A: local playlists + link import + structural config edits (chosen)

| Dimension | Assessment |
|---|---|
| Complexity | Low–medium: 2 tables, 1 parser, 1 editor |
| Cost | Free; one Are.na read per added channel |
| Security | Strong: no URL from the user is ever fetched; no text splicing into TOML or SQL |
| Fit | Works on the free plan; nothing leaves the machine |

### Option B: playlists as real Are.na channels

| Dimension | Assessment |
|---|---|
| Complexity | Medium: OAuth or a personal token, write calls, conflict handling |
| Cost | Needs the owner's token and write scope; uses the write budget |
| Security | Higher risk: the app could change the owner's public account |
| Fit | Owner decision (it touches their account); could come later as "Copy playlist to Are.na" |

### Option C: build the config by string formatting

This was rejected because a topic name containing quotes or newlines could inject TOML keys, for example to switch
`sync.files` to `download`. The structural editor plus re-validation closes that by construction.

## Trade-off analysis

A wins: it is fully reversible, private by default, and needs no credentials. B can be layered on top later
without changing A's tables.

## Security analysis (owner's question 3)

| Attack | What happens |
|---|---|
| Paste a look-alike link: `are.na.evil.example`, `evil.example/are.na/…`, `www.are.na@evil.example`, a port, user info, a Unicode homograph (`аre.na`), `javascript:`, `file:` | Refused before any request. Exact hosts only; the URL parser punycodes homographs |
| Smuggle path or query syntax: `..%2F`, `?per=100000`, `#`, CR/LF, spaces, Unicode | Refused: the slug charset excludes them, and control characters are refused before parsing |
| Hostile or compromised API answer: odd slug, markup in the title | The slug is re-validated; the title is trimmed to plain text; React renders it as text. Images can load only from CSP-listed hosts |
| Hand-edited or tampered `lemuse.toml` ("change what we fetch from") | There is no host setting to change. Bad slugs, queries or contact strings fail validation and the app refuses the config |
| TOML injection through topic names | Not possible: the structural editor escapes values, and newlines are refused |
| SQL injection through playlist names or ids | Not possible: everything is bound parameters; foreign keys refuse unknown ids |
| A redirect to `http://` or to another host carrying a token | `https_only`; no auth on redirect; the token goes to `api.are.na` only (parsed check) |
| A script in the WebView (XSS) calling IPC in a loop | Every command validates in Rust. Add channel is spaced ≥ 2.5 s apart (≤ 24 reads/min, the 80% guest budget), refused during a refresh, and backs off on 429. Playlists are capped (500 lists, 20,000 per list, 200,000 rows in total) |
| Path traversal through names | Names are never used as paths here; Save already sanitises them (`views::sanitize_name`) |
| Supply chain: npm worm wave 2026 (Shai-Hulud / ChainDrop) | CI installs with `--ignore-scripts`. None of our 136 npm packages is on the affected lists |
| Bundled SQLite advisories (RUSTSEC-2026-0459; FTS5 CVE-2026-11822/11824) | rusqlite 0.41.1 bundles SQLite 3.54; a test asserts ≥ 3.54.0 |

**Dependency cooldown.** A new dependency or version must be at least 14 days old when it is added (rusqlite
0.41.1 is 20 days old; 0.42 and 0.43 were skipped). It is recorded in the review.

## Consequences

- Easier: adding channels without editing files, collecting images across topics, and keeping them when channels
  change.
- Harder: `lemuse.toml` now has two writers (the user and the app). Edits are atomic and re-validated, and a broken
  hand edit is never overwritten.
- Revisit: copying a playlist to Are.na (needs the owner's decision and token); Save from a playlist (M1).
