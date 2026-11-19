# Hands-on map

A guide for working on LeMuse yourself: where things live, the guardrails that keep it safe, and first
exercises that touch real code. Read top to bottom once; after that, jump to the part you need.

## 1. The map

```
crates/lemuse-core/   everything that isn't UI (Rust)
  src/config.rs         lemuse.toml: topics and sources
  src/connectors/       one file per source (arena.rs, cleveland.rs); http.rs is the only network door
  src/sync/             refresh engine: budgets, retries, watermarks
  src/store/catalog.rs  SQLite catalog; migrations/ holds the schema (never edit a shipped one)
  src/save.rs           Save: the only code that writes image bytes
  src/credentials.rs    Are.na token in Windows Credential Manager
  src/error.rs          error codes (not_found, network, token…)
crates/lemuse-cli/    the `lemuse` command (Task Scheduler, scripts)
app/src-tauri/        the desktop shell: commands the UI can call, capabilities (what the window may do)
app/src/              the UI (React + TypeScript)
  SlideshowView.tsx     the main screen. A *pure view*: it only draws what its props say
  App.tsx               state and behaviour: loads data, runs the slideshow and sessions, handles keys
  practice.ts           practice tools as plain functions: study aids, the value/effect filter graph,
                        session plans, the pose clock, the practice log's weeks
  StudyMenu.tsx, PracticePanel.tsx, ShortcutsPanel.tsx   the practice menus and dialogs
  settings.ts           look-and-feel settings (every saved value is checked before use)
  theme/tokens.css      every colour, size and timing. Change the look here, not in components
  styles.css            layout and components, reading the tokens
app/scripts/          snapshot.tsx (every UI state, for checks), layout-test.mjs, unit-test.ts
docs/                 PLAN (what's next), PROGRESS (what happened), adr/ (decisions), reviews/, pr/
```

How a click becomes a picture: `App.tsx` asks `api.ts` → the desktop shell (`app/src-tauri/src/lib.rs`) →
`lemuse-core` reads the catalog → slides come back → `SlideshowView` draws them, streaming each image from its
source.

## 2. Guardrails (the rules that never bend)

- **Security first.** Tokens only in Credential Manager. Never paste tokens, your Windows user name or private
  links into code, issues or chat logs. The secret scan runs on every commit: `node scripts/scan-secrets.mjs --staged`.
- **The repo is public.** If a change writes a file (export, log, sheet), add its pattern to `.gitignore` *and*
  to `FORBIDDEN_FILES` in `scripts/secret-rules.mjs`.
- **No images on disk** except Save. Study aids are drawn on screen (CSS/SVG) and never read or save pixels.
- **Remote text is untrusted.** Show titles as text (React does this), never as HTML.
- **Never push `main`, never skip hooks** (`--no-verify` is blocked). Work on a branch; the owner merges on GitHub.
- **New dependency?** At least 14 days old, pinned, audited; npm installs with `--ignore-scripts`.
- **UI changes ship three ways:** the app, the browser preview, and the design artifact. New states go into
  `app/scripts/snapshot.tsx`.

## 3. Run it

```sh
# Go to the UI folder
cd "C:/Users/<you>/Desktop/Are N/app"
# First time, or after the lockfile changes
npm ci --ignore-scripts
# The desktop app with hot reload (edits show up as you save)
npm run tauri dev
# Or the browser preview at http://localhost:1421 (no desktop features)
npm run preview:web
```

The checks, from fastest to slowest. Run the first two often and all of them before a commit.

```sh
# Types
npm run typecheck
# Practice and redaction logic
npm run test:unit
# Every UI state through the W3C checker (needs Java)
npm run validate:w3c
# Every UI state at six window sizes in headless Edge: layout, 24 px targets, text contrast
npm run test:layout
# Back in the repo root: core tests and lint
cd ..
cargo test
cargo clippy --all-targets -- -D warnings
```

## 4. First exercises

Each one is small, touches real code, and has a check that tells you it worked.

**A. Add a session preset.** In `app/src/practice.ts`, add a plan to `SESSION_PLANS`, for example
`{ id: "hands", name: "Hands", rounds: [{ count: 8, seconds: 90 }] }`, and add `"hands"` to `PLAN_IDS`.
Check: `npm run typecheck`, then open the session planner (N) and see it. Add a line to
`scripts/unit-test.ts` that checks its total (`planSeconds`) and run `npm run test:unit`.

**B. Change the look of the grid.** In `app/src/theme/tokens.css`, change `--grid-line` (for example to a warm
`rgb(255 220 160 / 0.9)`) or `--grid-line-width`. Check: `npm run tauri dev`, press O.

**C. Add a grid type.** In `practice.ts`: add `"golden"` to `GRIDS` and a label to `GRID_LABELS`, then draw its
lines in `gridLines` (golden ratio: split at 0.382 and 0.618 of each side). Check: unit test for its line count;
`npm run test:layout` checks that the grid sits on the image at every size.

**D. Rebind a key.** Keys live in `App.tsx` (the `onKey` handler) and are listed for people in
`ShortcutsPanel.tsx`. Change both, or the ? sheet will lie. Check: press ? in the app.

**E. Tune a drawing effect.** In `practice.ts`, `strokes()` sets the stroke noise (`baseFrequency`: fine across,
long along) and the ramp; `filterGraph()` chains them. Change the vertical frequency, run `npm run test:unit`, then
press E in the app.

**F. Change a word.** Every sentence the app says is in the `.tsx` files as plain text. Search for it, change
it, and run `npm run validate:w3c`.

## 5. Shipping a change

```sh
# Start a branch from an up-to-date main (type/NNNN-short-slug)
git switch main
git pull
git switch -c feat/0021-my-change
# Commit small (Conventional Commits); the pre-commit hook runs the secret scan
git add -A
git commit -m "feat(ui): add a hands session preset"
# Before pushing: scan everything the branch changes
node scripts/scan-secrets.mjs --range main...HEAD
# Push the branch (never main), then open the PR from the compare link
git push -u origin feat/0021-my-change
```

The PR description follows `.github/pull_request_template.md` (What / Why / How + checklist). Merge with
**Squash and merge** on GitHub.

## 6. Working with Claude

Claude follows [CLAUDE.md](../../CLAUDE.md): it plans in [PLAN.md](../PLAN.md) first, writes an ADR for
decisions, reviews its own work as an architect and a developer (`docs/reviews/`), and hands back a PR link. You
approve merges. Good requests name the outcome ("sessions should pause when I minimise"), not the code.
