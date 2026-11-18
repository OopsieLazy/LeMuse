---
status: accepted          # amended by ADR-0007 (stream-first)
date: 2026-11-16
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0002: SQLite catalog + content-addressed file store + hardlinked browse folders

## Context

"Local blocks just for the user" means metadata (title, source, creator, licence, tags, collections) plus
the actual files. The library must survive crashes, avoid duplicates (the same image in several channels), stay
searchable, and remain usable *without* the app, from Windows Explorer and in tools like PureRef or CAD software.

## Decision

- **Catalog:** one SQLite database (`catalog.db`, WAL mode, versioned migrations) with an FTS5 index
  (`unicode61` tokenizer).
- **Files:** content-addressed store, `objects/ab/cd/<sha256>.<ext>`, written temp-then-rename.
- **Browsing:** `views/<collection>/<title> [<id>].<ext>` as **hardlinks** to objects, falling back to a copy.
- **Thumbnails:** generated into `thumbs/` in M2. They're a cache and can be deleted.

## Options considered

### Option A: SQLite + CAS + hardlink views (chosen)

**Pros:**
- Dedup for free.
- Integrity: the file name *is* the hash.
- Atomic writes.
- Fast full-text search.
- Explorer-friendly views at no extra disk cost.
- Views and thumbs are rebuildable.

**Cons:** objects aren't human-named (views fix that). Hardlinks only work within one volume (copy fallback).

### Option B: Plain folders + JSON sidecars per file

**Pros:** maximally transparent.
**Cons:** no dedup, slow search over 10k+ files, sidecars drift out of sync, renames break references.

### Option C: Files inside the database (BLOBs)

**Cons:** a multi-GB database, invisible to other apps, painful backups. Rejected.

### Symlinks instead of hardlinks

**Cons:** Windows symlinks need Developer Mode or admin. Rejected for views.

## Trade-off analysis

Hydrus-style hash storage is robust but opaque. Folder-per-channel is friendly but fragile. Hardlinked views
give both, because the database stays the source of truth. FTS5 trigram (substring search) is still
experimental and has a reported bug with external-content tables, so v1 uses `unicode61` plus prefix queries.

## Consequences

- Easier: dedup, integrity checks (re-hash), backup (copy `catalog.db` + `objects/`), search.
- Harder: deleting a block must garbage-collect unreferenced objects (M3). A renamed title leaves a stale view
  file until views are rebuilt (M2 `rebuild-views`).
- Revisit when: libraries exceed ~100k objects, or the owner wants cross-volume libraries.

## Action items

1. [x] `0001_init.sql` schema, `Catalog`, `BlobStore`, `views` with tests.
2. [ ] M1: stream downloads to a temp file while hashing (no whole-file buffering).
3. [ ] M2: thumbnails + `rebuild-views`. M3: object GC.

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-16 | Claude | drafted | |
| Admin pass | 2026-11-16 | Claude (architect role) | approved | |
| Developer pass | 2026-11-16 | Claude (developer role) | approved with fixes | D-1 deferred (streaming), D-5 deferred (stale views), D-7 fixed (FTS query escaping) |
| Owner gate | | Owner | pending | |
