---
status: proposed
date: 2026-11-18
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0023: The Are.na token, kept in Windows Credential Manager

## Context

- LeMuse reads Are.na as a guest: 30 reads a minute per IP, and public channels only. A personal access token
  from a **free** account gives 120 reads a minute and the owner's private channels. Search stays Premium-only
  (ADR-0004), so Find channels doesn't change.
- Tokens are made at `are.na/settings/personal-access-tokens`. They don't expire, and `read` is the default scope.
- ADR-0004 and CLAUDE.md already say tokens live in Windows Credential Manager only. `UreqClient` already sends a
  token to `https://api.are.na` only (`is_arena_api`), never to CDNs or museums. What was missing was a way to save
  one.
- Probed 2026-11-18: Are.na treats a **bad token as a guest** on public reads (200, `x-ratelimit-tier: guest`).
  Only endpoints that need authentication, such as `GET /v3/me`, answer 401. A revoked token would therefore
  fail quietly and run at a budget Are.na won't give.

## Decision

1. **Storage:** one generic credential, `LeMuse/api.are.na`, in Windows Credential Manager.
   - It is stored for this PC only (`CRED_PERSIST_LOCAL_MACHINE`) and holds the token as its secret.
   - Its user name is the Are.na account slug, so Settings can say whose token it is without a network call.
   - The code calls the Win32 API through `windows-sys` 0.61.2. That crate is already in `Cargo.lock` through
     Tauri and rustls; only features are turned on (`Win32_Foundation`, `Win32_Security_Credentials`,
     `Win32_System_Console`), so nothing new is downloaded and the cooldown and audit are unchanged.
   - `keyring` was not used: it is a new dependency for three calls.
2. **Check before saving:** a pasted token is cleaned first.
   - Surrounding whitespace and a `Bearer ` prefix are removed.
   - It must be 16–512 printable ASCII characters, with no spaces or line breaks, so it can't inject a header.
   - Are.na then checks it with one read of `GET /v3/me`. Nothing is saved if Are.na refuses it.
   - Only `slug`, `name` and `tier` are read from the answer. The answer also holds the account's **email**, which
     is never read, kept or shown.
3. **Each refresh** checks the saved token once with `GET /v3/me`, then waits 500 ms before the engine starts:
   - **accepted:** the engine keeps to that tier's budget (80 % of it: 96 reads a minute on free);
   - **refused:** the refresh runs as a guest **without** the token, and the status line says so
     (`RunSummary.notes`, the refresh event's `note`);
   - **network trouble:** the token is kept, but the refresh stays at the guest budget.
4. **Every other read** goes through `production_client`, which carries the saved token: Add channel, previews,
   Find channels, related channels and Save. Private channels therefore open everywhere.
5. **Front-ends:**
   - **Settings → Are.na account:** a password field, **Check and save**, **Remove token**, and a link to Are.na's
     token page. The field is cleared as soon as the token is handed on, and the token never comes back to the
     page; status shows the account only.
   - **CLI:** `lemuse arena-token status | set | clear`. `set` reads the token with console echo off, or from a
     pipe, so it never lands in shell history or on screen.
   - The browser preview and the dashboard say the token is a desktop feature.
6. **Errors never contain the token.** A new `Error::Token` variant holds plain messages ("That doesn't look like
   an Are.na token: it's too short.").
7. **Defence in depth for the public repo:** `.gitignore` and `FORBIDDEN_FILES` refuse likely token files
   (`token*.txt`, `*token.txt`, `*.token`, `.arena*`, `arena-token*`, `secrets/`), in case one is ever pasted
   into a file in the project folder. The content scanner already flags `Bearer <long value>`.

## Options considered

| Option | Verdict |
|---|---|
| **Credential Manager via `windows-sys` (chosen)** | No new crate; the OS encrypts it per user (DPAPI); visible and removable in Control Panel |
| `keyring` crate | Same store, but a new dependency (cooldown and audit) for three calls |
| `.env` or `lemuse.toml` | Rejected: plain text in the library folder, one copy away from the public repo |
| OAuth with PKCE ("Sign in with Are.na") | Right for LeMuse Web and stage 2 (ADR-0020); needs a registered app and a redirect. Later |

## Consequences

- The owner pastes the token once, in Settings or with `lemuse arena-token set`, and refreshes speed up about 4×.
  Their own private channels can be added.
- Each refresh costs one extra read (`/v3/me`).
- Task Scheduler refreshes run as the same Windows user, so they see the same credential.
- The token is in memory while LeMuse runs (inside the HTTP client). Wiping it from memory is not attempted.
- Not yet:
  - importing the channels the owner follows (`/v3/users/{id}/following`);
  - a single running instance;
  - queueing reads during a refresh (D-74);
  - replacing the schema-shaped `/v3/me` test fixture with a trimmed real one once a token is saved (D-101).
