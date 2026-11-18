# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**ServeNSurf** is a Windows desktop app that plays a **stream or slideshow of reference images on a topic**
(drawing, design, CAD). A topic is fed by Are.na channels the user picks (later open museum and 3D sources).
Images stream from the source CDN; the user can Save any image as a local file. Topic metadata refreshes
automatically on launch. Owner: free Are.na tier, MIT licence. See ADR-0007 for the stream-first design.

Start of every session: read [docs/PROGRESS.md](docs/PROGRESS.md) (latest entry first) and [docs/PLAN.md](docs/PLAN.md)
for the current milestone. Research backing the design is in `reports/` and `research_notes/`.

## Operating model — enterprise, staged review loop

This project runs at an enterprise level. Every non-trivial change goes through four stages **before** it reaches
the owner. Use [docs/templates/review-loop.md](docs/templates/review-loop.md) and save the filled copy to
`docs/reviews/NNNN-<slug>.md`.

1. **Proposal** — make the decision yourself. Write or update an ADR (`docs/adr/`, template `0000-template.md`)
   for anything architectural. Don't hand the owner an open menu of options.
2. **Admin / architect pass** — re-read the change as an architect: fit with existing ADRs, ToS/licensing
   (ADR-0004), security, data integrity, scope creep. Record findings with IDs `A-1, A-2…`.
3. **Developer pass** — re-read as the implementing engineer: correctness, edge cases, tests, error handling,
   Windows specifics (paths, line endings, file locks). Record findings `D-1, D-2…`.
4. **Owner gate** — only now present to the owner: summary, decisions made, findings fixed vs deferred, open
   questions. The owner approves merges. **Never merge to `main` yourself.**

Fix findings between passes. Every finding is either fixed in the PR or deferred with a home in docs/PLAN.md.

**Ask for clarification** (AskUserQuestion) when a decision is genuinely the owner's and can't be reversed
cheaply: product scope, licensing, spending money, contacting third parties (e.g. emailing Are.na), publishing,
anything touching the owner's accounts. Otherwise decide, document the reasoning in the ADR/review, and proceed.

## Git and PR standards

- **GitHub Flow:** `main` is always releasable; work on short-lived branches `type/NNNN-short-slug`
  (`feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `test/`, `ci/`). NNNN = PR/work-item number.
- **Conventional Commits 1.0:** `type(scope): imperative summary` ≤ 72 chars; scopes: `core`, `cli`, `app`, `ui`,
  `arena`, `store`, `sync`, `adr`, `docs`, `ci`, `process`. Breaking changes use `!` + `BREAKING CHANGE:` footer.
  End every commit with the `Co-Authored-By:` trailer given in the session.
- Commits are small and logical (one concern each); the PR is squash-merged with a Conventional-Commit title.
- PR description: fill [.github/pull_request_template.md](.github/pull_request_template.md). Save a copy to
  `docs/pr/NNNN-<slug>.md` while there's no GitHub remote (`gh` is not installed on this machine).
- Never force-push shared branches, never rewrite `main`, never skip hooks.

## End of every conversation (required)

Finish with a handoff using [docs/templates/session-handoff.md](docs/templates/session-handoff.md):
append an entry to `docs/PROGRESS.md`, then give the owner **every command** they need — review, merge
(squash, with the ✅-checklist merge description), tag if releasing, and branch cleanup
(`git branch -D`, `git push origin --delete`, `git fetch --prune`).

## Commands

Run from the repo root unless noted. Rust 1.80+ (MSVC toolchain), Node 20+.

```sh
cargo build                          # core + CLI (default workspace members)
cargo test                           # all core/CLI tests
cargo test -p servensurf-core sync::engine::tests::stream_mode_records_media_without_downloading  # one test
cargo test -p servensurf-core catalog # tests whose path matches "catalog"
cargo fmt --all -- --check           # CI enforces formatting
cargo clippy --all-targets -- -D warnings

cargo run -p servensurf-cli -- --library ./library init     # scratch library (./library is gitignored)
cargo run -p servensurf-cli -- --library ./library topics   # list [[topic]]s from servensurf.toml
cargo run -p servensurf-cli -- --library ./library slides "Topic name"   # what the slideshow would show
cargo run -p servensurf-cli -- --library ./library status

cd app && npm install                # first time only
cd app && npm run typecheck          # UI type-check
cd app && npm run tauri dev          # desktop app with hot reload (builds app/src-tauri)
cd app && npm run tauri build        # NSIS/MSI installer
```

`cargo build` deliberately skips `app/src-tauri` (it's not in `default-members`); build it with
`cargo build -p servensurf-app` or via `npm run tauri`.

## Architecture (big picture)

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for diagrams and the reasoning behind each choice; ADRs hold the decisions.

- **One core, thin front-ends.** `crates/servensurf-core` holds everything non-UI. `crates/servensurf-cli`
  (binary `servensurf`, run by Task Scheduler) and `app/src-tauri` (Tauri 2 shell + React UI in `app/src`)
  only call into it. Launch refresh, scheduled refresh and the Refresh button must share `sync::SyncEngine::run`.
- **Data flow:** `config` `[[topic]]` → `[[topic.source]]` → `connectors::Connector` (maps remote pages to
  `model::Block` with `MediaRef` URLs + `DownloadRequest`s) → `sync::engine` (lock, throttle, retry, page budget,
  watermark; downloads only in `download` mode) → `store::catalog` (SQLite+FTS5; `slides()` feeds the UI).
  Images are displayed straight from the CDN URL in `block_media`; nothing is written to disk unless the user
  saves (→ `blobs` CAS `objects/ab/cd/<sha256>.<ext>` + `views/<topic>/` hardlinks).
- **Local vs remote state:** `block_media` is remote state (replaced on refresh). `block_files` is local state
  (only ever added; a refresh must never unlink a saved file).
- **Connectors never do I/O policy.** They declare a `SourcePolicy` (rate budget, background-sync allowed,
  attribution); the engine enforces it. All HTTP goes through `connectors::http::HttpClient` so tests replay
  fixtures (`crates/servensurf-core/tests/fixtures/`) — never hit the network in tests.
- **Incremental refresh:** pages ordered `updated_at` desc, at most `sync.pages_per_refresh` per channel; stop at
  the collection watermark; the watermark advances only after a *complete*, error-free pass.
- **Schema changes:** add `crates/servensurf-core/migrations/000N_*.sql` and append to `MIGRATIONS` in
  `store/catalog.rs`. Never edit a shipped migration.
- `objects/` is the source of truth for files; `thumbs/` and `views/` are rebuildable caches.

## Are.na constraints (ADR-0004, ADR-0007) — do not regress

- API v3 (`https://api.are.na/v3`); v2 is deprecated. Send a descriptive `ServeNSurf/<ver> (+contact)` User-Agent;
  generic UAs get 403. Owner is on the **free** tier: 120 reads/min with a token, 30 as guest, **no search API**.
- Use **only** channels the user lists as topic sources. No crawling, no following links to discover channels,
  no bulk export. "Paginate, don't enumerate": cap pages per refresh, load more lazily. Budget 80% of the tier's
  read limit, ≥500 ms between calls, honour `retry_after`.
- **Stream by default:** display `large` → `medium` → `original` from the CDN. Preload at most 2 slides ahead.
  Saves download originals from `image.src` (never the q75 resized variants).
- Always show attribution (creator + Are.na link). Store creator/source on every block.
- Tokens live in Windows Credential Manager — never in config files, logs, or the repo.
