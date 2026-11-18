# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**LeMuse** is a Windows desktop app that plays a **stream or slideshow of reference images on a topic**
(drawing, design, CAD). Topics are subjects (the owner's 15 are in `crates/lemuse-core/assets/starter_topics.toml`)
fed by free museum keyword search (Cleveland; AIC built but held back) plus curated Are.na channels (ADR-0008).
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

## Security first (ADR-0011): the utmost concern

Before every commit and before finishing, check what could leak or be abused. **Always run the checks**; don't
assume.

- **Secrets and personal data:** `node scripts/scan-secrets.mjs --staged` (pre-commit runs it) and `--range
  main...HEAD` before finishing. Never commit tokens, keys, `.env`, databases or personal emails, and never print
  them. Findings name the file and line, never the value. If a real secret ever lands, **rotate it**; deleting it
  isn't enough.
- **Validators:** fmt, clippy `-D warnings`, tests, `npm run typecheck`, `npm run validate:w3c` (UI), and
  `node scripts/npm-audit-gate.mjs app` / `cargo audit` when dependencies change. Report failures as they are.
- **Dependencies:** a new dependency or version must be at least 14 days old (supply-chain cooldown), and npm
  installs run with `--ignore-scripts` (the 2026 npm worms spread through install hooks). Audit exceptions live
  in `docs/security/npm-audit-exceptions.json`: dev-only packages, with a reason and an expiry of 30 days or less.
- **Review each change for:**
  - Tauri capabilities, plugins and CSP hosts (least privilege; justify each in the ADR);
  - network access only via `HttpClient`;
  - tokens only in Credential Manager;
  - input from remote APIs treated as untrusted (render as text, never `innerHTML`);
  - no bot-protection workarounds;
  - dependencies pinned and audited.
- **Hooks enforce it:**
  - git `pre-commit` runs the secret scan (plus W3C for UI commits);
  - the Claude Code `PreToolUse` agent hook reviews each staged commit as admin;
  - the `Stop` hook (`scripts/hooks/stop-gate.mjs`) blocks finishing until the scan is clean and the branch has
    an admin review;
  - CI runs gitleaks, the npm audit gate, `cargo audit` and dependency review.

  Never bypass a hook (`--no-verify` is denied in `.claude/settings.json`).

## See it, don't guess it (ADR-0009)

- Every PR that touches the UI ships it three ways:
  - the **test build** (NSIS installer; CI's `test-build` job uploads one per PR);
  - the **browser preview** (`npm run preview:web`);
  - the **design artifact** (`npm run preview:artifact`), republished to the same Artifact URL and linked in
    the PR.
- All three render `app/src/SlideshowView.tsx`. Keep it a pure view; data comes through `app/src/api.ts`.
- **W3C:** commits that touch `app/` run the Nu HTML Checker (`.githooks/pre-commit` → `npm run validate:w3c`,
  local Java, no web service). Enable once per clone: `git config core.hooksPath .githooks`. New UI states go
  into `app/scripts/snapshot.tsx` so they get validated too.
- **No images in caches:** the WebView runs InPrivate (`incognito: true`); preload is in-memory and ≤ 2; previews
  carry metadata only and the artifact draws placeholders. No screenshots or downloaded PNGs in the repo or caches.
  Only Save writes image bytes.

## Git and PR standards

- **GitHub Flow:** `main` is always releasable; work on short-lived branches `type/NNNN-short-slug`
  (`feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `test/`, `ci/`). NNNN = PR/work-item number.
- **Conventional Commits 1.0:** `type(scope): imperative summary` ≤ 72 chars; scopes: `core`, `cli`, `app`, `ui`,
  `arena`, `store`, `sync`, `adr`, `docs`, `ci`, `process`. Breaking changes use `!` + `BREAKING CHANGE:` footer.
  End every commit with the `Co-Authored-By:` trailer given in the session.
- Commits are small and logical (one concern each); the PR is squash-merged with a Conventional-Commit title.
- PR description: fill [.github/pull_request_template.md](.github/pull_request_template.md) (What / Why / How +
  checklist) and save a copy to `docs/pr/NNNN-<slug>.md`. Remote: `origin` = github.com/OopsieLazy/LeMuse
  (**public**).
- **Review flow (owner, Q17):**
  - Claude **pushes the work branch** (`git push -u origin <branch>`) after each commit batch, once the secret
    scan of `main...HEAD` is clean. Pushed branches are public.
  - **Never push `main`.** `main` is locked by a ruleset: PR required, no force-push.
  - `gh` isn't installed. The owner opens the PR from the compare link
    `https://github.com/OopsieLazy/LeMuse/compare/main...<branch>?expand=1`, pastes `docs/pr/NNNN-<slug>.md`,
    reviews on GitHub (Files changed, CI, the test installer artifact) and clicks **Squash and merge**.
  - GitHub numbers PRs on its own; NNNN stays the work-item number.
- Never force-push shared branches, never rewrite `main`, never skip hooks.

## End of every conversation (required)

Finish with a handoff using [docs/templates/session-handoff.md](docs/templates/session-handoff.md):
append a **short** entry to `docs/PROGRESS.md`, then give the owner **every command** they need:

- review: the compare link to open the PR, what to look at, and local checks if wanted;
- merge: **Squash and merge** on GitHub, with the ✅-checklist merge description to paste;
- after the merge: `git switch main`, `git pull`, and tag if releasing;
- branch cleanup (`git branch -D`, `git fetch --prune`; GitHub deletes the remote branch on merge).

**Command format:** each comment on its own line *above* its command, never trailing (owner, Q13).
PR descriptions use What / Why / How + checklist (`.github/pull_request_template.md`).

**Keep notes slim and tidy:** PROGRESS entries ≤ ~15 lines, PLAN holds only open work and the findings register,
details live in ADRs and reviews. Plan before executing: put multi-part requests into PLAN § Now first.

## Commands

Run from the repo root unless noted. Rust 1.89+ (MSVC toolchain), Node 20+, Java 11+ (W3C check).

```sh
cargo build                          # core + CLI (default workspace members)
cargo test                           # all core/CLI tests
cargo test -p lemuse-core sync::engine::tests::stream_mode_records_media_without_downloading  # one test
cargo test -p lemuse-core catalog # tests whose path matches "catalog"
cargo fmt --all -- --check           # CI enforces formatting
cargo clippy --all-targets -- -D warnings

cargo run -p lemuse-cli -- --library ./library init     # scratch library (./library is gitignored)
cargo run -p lemuse-cli -- --library ./library topics   # list [[topic]]s from lemuse.toml
cargo run -p lemuse-cli -- --library ./library slides "Topic name"   # what the slideshow would show
cargo run -p lemuse-cli -- --library ./library status
cargo run -p lemuse-cli -- --library ./library sync     # real metadata refresh (no image files)
cargo run -p lemuse-cli -- --library ./library add-channel https://www.are.na/<user>/<slug> --topic "Name" [--new-topic]

cd app && npm ci --ignore-scripts     # first time / after lockfile changes (no install hooks)
cd app && npm run typecheck          # UI type-check
cd app && npm run validate:w3c       # build + render UI states + W3C Nu HTML Checker (needs Java)
cd app && npm run preview:data       # export catalog metadata for previews ($LEMUSE_LIBRARY or default)
cd app && npm run preview:web        # real UI in the browser at :1421, images streamed
cd app && npm run preview:artifact   # one-file design preview → app/dist-preview/lemuse-preview.html
cd app && npm run tauri dev          # desktop app with hot reload (builds app/src-tauri)
cd app && npm run tauri build        # NSIS/MSI installer
```

`cargo build` deliberately skips `app/src-tauri` (it's not in `default-members`); build it with
`cargo build -p lemuse-app` or via `npm run tauri`.

## Architecture (big picture)

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for diagrams and the reasoning behind each choice; ADRs hold the decisions.

- **One core, thin front-ends.** `crates/lemuse-core` holds everything non-UI. `crates/lemuse-cli`
  (binary `lemuse`, run by Task Scheduler) and `app/src-tauri` (Tauri 2 shell + React UI in `app/src`)
  only call into it. Launch refresh, scheduled refresh and the Refresh button must share `sync::SyncEngine::run`.
- **Data flow:** `config` `[[topic]]` → `[[topic.source]]` → `connectors::Connector` (maps remote pages to
  `model::Block` with `MediaRef` URLs + `DownloadRequest`s) → `sync::engine` (lock, throttle, retry, page budget,
  watermark; downloads only in `download` mode) → `store::catalog` (SQLite+FTS5; `slides()` feeds the UI).
  Images are displayed straight from the CDN URL in `block_media`; nothing is written to disk unless the user
  saves (→ `blobs` CAS `objects/ab/cd/<sha256>.<ext>` + `views/<topic>/` hardlinks).
- **Topics:** `[[topic]] keywords = [...]`; a keyword source (`connectors::KEYWORD_SOURCES`) without `query` runs
  one search per keyword (`Topic::resolved_sources`). Relevance-ordered sources (`PageOrdering::Relevance`) skip
  watermarks and honour `SourcePolicy.min_refresh_hours` (museums: weekly, 1 page).
- **Adding a source:** new `connectors/<id>.rs` implementing `Connector` + a trimmed *real* response fixture,
  register it in `connectors::all` and `KNOWN_SOURCES`, and add its image host to the CSP in
  `app/src-tauri/tauri.conf.json`. Probe that its images load first: AIC's host serves a Cloudflare challenge,
  so it's held back (review 0002 D-18). Never work around bot protection.
- **Local vs remote state:** `block_media` is remote state (replaced on refresh). `block_files` and `playlists` /
  `playlist_items` are local state (a refresh never touches them; a refresh must never unlink a saved file).
- **Editing `lemuse.toml` from code:** only via `config_edit` (`toml_edit`, full re-validation, atomic write). Never
  build TOML, SQL or URLs by splicing user or remote text; slugs pass `arena::is_valid_slug` first (ADR-0014).
- **Connectors never do I/O policy.** They declare a `SourcePolicy` (rate budget, background-sync allowed,
  attribution); the engine enforces it. All HTTP goes through `connectors::http::HttpClient` so tests replay
  fixtures (`crates/lemuse-core/tests/fixtures/`) — never hit the network in tests.
- **Incremental refresh:** pages ordered `updated_at` desc, at most `sync.pages_per_refresh` per channel; stop at
  the collection watermark; the watermark advances only after a *complete*, error-free pass.
- **Schema changes:** add `crates/lemuse-core/migrations/000N_*.sql` and append to `MIGRATIONS` in
  `store/catalog.rs`. Never edit a shipped migration.
- `objects/` is the source of truth for files; `thumbs/` and `views/` are rebuildable caches.

## Are.na constraints (ADR-0004, ADR-0007) — do not regress

- API v3 (`https://api.are.na/v3`); v2 is deprecated. Send a descriptive `LeMuse/<ver> (+contact)` User-Agent;
  generic UAs get 403. Owner is on the **free** tier: 120 reads/min with a token, 30 as guest, **no search API**.
- Use **only** channels the user lists as topic sources. No crawling, no automatic following of links to discover
  channels, no bulk export. Find channels (ADR-0015) reads only on a click: one page of related channels or a
  24-item preview; the search itself happens on Are.na's site in the browser (the search API is Premium-only). "Paginate, don't enumerate": cap pages per refresh, load more lazily. Budget 80% of the tier's
  read limit, ≥500 ms between calls, honour `retry_after`.
- **Stream by default:** display `large` → `medium` → `original` from the CDN. Preload at most 2 slides ahead.
  Saves download originals from `image.src` (never the q75 resized variants).
- Always show attribution (creator + Are.na link). Store creator/source on every block.
- Tokens live in Windows Credential Manager — never in config files, logs, or the repo.
