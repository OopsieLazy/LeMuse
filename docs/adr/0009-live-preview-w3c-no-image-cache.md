---
status: proposed
date: 2026-11-16
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0009: Render the real app every PR, gate commits on W3C validation, keep images out of disk caches

## Context

The owner asked (2026-11-16, session 4) for three things:

1. "The app should render as we work on it so that by the end the end product is known and the design not
   guessed."
2. "Prepare W3C validator check for commits."
3. "Provide test build or artifact to view. No png downloads in cache."

Until now the UI was a topic list, the network layer was a stub, and nothing could be looked at. A design that
lives only in documents gets guessed. The owner needs to see the actual product grow, PR by PR.

## Decision

### 1. Every PR that touches the UI ships three ways to see it

| View | What it is | Images | Who it's for |
|---|---|---|---|
| **Test build** | `npm run tauri build -- --bundles nsis` installer; CI uploads one per PR (`test-build` job) | Real, streamed from the CDN | The owner, running the real app |
| **Browser preview** | `npm run preview:web` serves the real React UI against an exported catalog snapshot (`lemuse preview-data`) | Real, streamed from the CDN | Fast design iteration, no Rust build |
| **Design artifact** | `npm run preview:artifact` packs the same UI and snapshot into one HTML page, published as a private claude.ai Artifact at a stable URL that is updated in place | Drawn placeholders at each image's true size and aspect ratio | Viewing anywhere, including a phone |

All three run the **same components** (`app/src/SlideshowView.tsx`), so what's reviewed is what ships. The UI
talks to one `Backend` interface (`app/src/api.ts`): Tauri commands in the app, the snapshot in the previews.

The artifact uses placeholders because artifact pages may not load images from other hosts, and making a preview
must not download reference images (point 3).

### 2. W3C conformance gate on commits and in CI

- Checker: the official **Nu HTML Checker** (`vnu-jar`, the engine behind validator.w3.org/nu), run **locally**
  with Java. No page content is sent to a web service.
- What's checked: the built `index.html`, the built CSS (`--also-check-css`), and **the real UI markup**.
  `scripts/snapshot.tsx` renders `SlideshowView` in six states (playing, paused, refreshing, empty topic,
  refresh error, preview) to full HTML documents. Validating only the empty `index.html` shell would prove
  nothing.
- Gate: `.githooks/pre-commit` runs `npm run validate:w3c` when a commit touches the UI. Enable it once per clone
  with `git config core.hooksPath .githooks`. CI runs the same script on every PR. Errors fail; warnings
  print. React's `<img />` trailing-slash *Info* message is filtered.

### 3. No image files in any cache

- **Desktop app:** the WebView2 window runs **InPrivate** (`"incognito": true` in `tauri.conf.json`). Its HTTP
  cache lives in memory and is discarded on exit, so streamed images (PNG, JPEG or otherwise) are never written
  under `%LOCALAPPDATA%`. Preloading uses in-memory `Image()` objects only (still at most 2 ahead).
- **Core:** stream mode never writes image bytes (unchanged since ADR-0007). The first real refresh catalogued
  3,742 images and stored **0 files**.
- **Previews:** `preview-data` exports metadata only. The artifact draws placeholders instead of embedding
  downloaded images.
- **Repo:** generated preview and validation outputs (`app/preview/`, `app/dist-preview/`, `app/.snapshot/`) are
  gitignored.
- The only way an image reaches disk is the user pressing **Save**: originals go to the content-addressed store
  (ADR-0002/0007). Save isn't built yet; its button is shown disabled.

## Options considered

| Option | Verdict |
|---|---|
| Online validator API (validator.w3.org/nu `?out=json`) | Rejected: sends our markup to a third party on every commit, needs a network, and is rate-limited |
| `html-validate` (npm, no Java) | Rejected: a good linter, but not the W3C checker the owner asked for |
| **`vnu-jar` locally** | **Chosen**: the W3C engine; offline; Java is already installed here and on CI runners |
| Screenshots in PRs as the "render" | Rejected: stale the moment they're taken, and they are PNG files in a cache, which the owner ruled out |
| Disable the WebView2 disk cache with a browser flag | Rejected: Chromium flags vary; InPrivate is a documented, supported WebView2 mode |
| Embed real images (data: URIs) in the artifact | Rejected: that is downloading images into a file |

## Consequences

- The owner can open the design on any device at any time, and run the real app from each PR's installer.
- InPrivate also means WebView `localStorage` doesn't survive restarts. UI preferences (last topic, shuffle) must
  persist through the core (config or catalog), not browser storage. This is planned for M2.
- The browser preview runs in the owner's normal browser, which caches images as browsers do. The no-disk-cache
  guarantee is the desktop app's. Use the test build for that.
- UI commits take about 10 s longer (a build plus the checker). Rust-only commits skip the hook.
- The CI installer is unsigned, so Windows SmartScreen warns. It's a test build, not a release.

## Action items

1. [x] `SlideshowView` + `Backend` interface; slideshow (auto-advance, ←/→, space, S, preload ≤ 2, attribution,
       image-error skip).
2. [x] Production HTTP client (`UreqClient`), `refresh_library()`, CLI `sync`, app launch refresh and Refresh.
3. [x] `preview-data`, `preview:web`, `preview:artifact`; the artifact published.
4. [x] `validate:w3c` + `.githooks/pre-commit` + CI job; `test-build` CI job.
5. [x] InPrivate WebView2.
6. [ ] Every later UI PR: update the artifact at the same URL and link it, plus the test build, in the PR description.

## Review log

| Stage | Date | Reviewer | Outcome | Notes / finding IDs |
|---|---|---|---|---|
| Proposal | 2026-11-16 | Claude | drafted | From the owner's session-4 request |
| Admin pass | 2026-11-16 | Claude (architect role) | approved with notes | A-14…A-18 |
| Developer pass | 2026-11-16 | Claude (developer role) | approved with fixes | D-19…D-26 (D-21, D-22, D-25, D-26 fixed) |
| Owner gate | | Owner | pending | |
