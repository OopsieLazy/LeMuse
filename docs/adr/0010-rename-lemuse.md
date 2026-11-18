---
status: accepted
date: 2026-11-17
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0010: Rename ServeNSurf to LeMuse

## Context

The owner wanted a new name chosen from TheMuse, LeMuse, TheMuses, Muses and Muse, and asked for help ranking
them. A web search on 2026-11-17 for existing products with each name found:

| Rank | Name | Conflicts found | Verdict |
|---|---|---|---|
| 1 | **LeMuse** | No software product found | Distinctive and searchable. In French a muse is feminine (*la muse*), so "Le" reads as a stylised twist |
| 2 | TheMuses | Generic mythology term | Fine, but it crowds against "The Muse" |
| 3 | Muses | "Muses", an AI image generator on Product Hunt | Generic; mild overlap in the visual space |
| 4 | TheMuse | themuse.com, a large careers site | Buried in search |
| 5 | Muse | "Muse — canvas for ideas" (museapp.com, an inspiration board app in this category), the Muse headband, the band | Worst: direct category clash |

## Decision

**LeMuse** (the owner chose it, 2026-11-17). Every identifier follows:

| Before | After |
|---|---|
| `servensurf-core`, `servensurf-cli`, `servensurf-app` | `lemuse-core`, `lemuse-cli`, `lemuse-app` |
| binary `servensurf` | `lemuse` |
| `servensurf.toml`, `%USERPROFILE%\Pictures\ServeNSurf` | `lemuse.toml`, `%USERPROFILE%\Pictures\LeMuse` |
| `SERVENSURF_LIBRARY` | `LEMUSE_LIBRARY` |
| app identifier `dev.servensurf.app` | `dev.lemuse.app` |
| User-Agent `ServeNSurf/<ver>` | `LeMuse/<ver> (+https://github.com/OopsieLazy/LeMuse)` |

Repo: <https://github.com/OopsieLazy/LeMuse> (MIT). The public repo URL is now the default User-Agent contact.
It is never a personal address (this resolves A-8).

Historical records (PROGRESS entries, reviews 0001–0003, PR descriptions 0001–0003, spec 0002) and shipped
migration comments keep the old name, because they describe the past.

## Consequences

- There's no automatic migration: nothing has been released. If you installed the PR #3 test build, uninstall
  it, then delete `%USERPROFILE%\Pictures\ServeNSurf` and `%LOCALAPPDATA%\dev.servensurf.app`.
- The design artifact keeps its URL; it is republished under the new name.
- "LeMuse" wasn't checked against trademark registers. Do that before any public release.

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-17 | Claude | ranked | From the owner's shortlist |
| Owner choice | 2026-11-17 | Owner | **LeMuse** | |
| Admin pass | 2026-11-17 | Claude (architect role) | approved | A-19 |
| Developer pass | 2026-11-17 | Claude (developer role) | approved | D-27 |
