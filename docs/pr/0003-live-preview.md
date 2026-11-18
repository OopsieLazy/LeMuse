# feat: live preview with the real slideshow, W3C gate and no image cache (#3)

**Branch:** `feat/0003-live-preview` → `main`. **Stacked on #2** (which is stacked on #1). Merge #1, then #2,
then this one, rebasing each onto `main` first (commands in the handoff).
**Merge method:** squash (message: [0003-live-preview.merge.txt](0003-live-preview.merge.txt))

## Summary

- You asked to see the real app as it's built (not a guessed design), for a W3C check on commits, for a test
  build or artifact, and for no PNG downloads in cache. Decisions are in ADR-0009.
- **Real data:** a production HTTP client. `servensurf sync` and the app's launch refresh and Refresh button
  share one path. The first real refresh catalogued **3,742 images from 55 sources with 0 errors and 0 files
  written**.
- **Real UI:** a topic rail, a full-window image on a neutral stage, and a caption strip. The strip shows title,
  creator, source and a link to the source page, the slide counter and pixel size, a timer bar, and controls
  (prev, play/pause, next, shuffle, Save shown disabled).
  - Keys: ← → Space S.
  - Preloads the next 2 images; broken images are skipped.
- **Three ways to see it:**
  - test installer;
  - browser preview with real images;
  - design artifact.

  All three render the same component.
- **W3C:** the official Nu HTML Checker runs locally on the built page, its CSS and **6 rendered UI states**,
  from a pre-commit hook and in CI.
- **No image cache:** the app's WebView runs InPrivate, so streamed images stay in memory. Previews carry
  metadata only, and the artifact draws placeholders.

## See it

- **Design artifact** (private; the same URL is updated each PR): https://claude.ai/artifact/T6ucPPa6HwhkWqvLEiSHfY
  - Real UI and real catalog (15 topics × up to 40 slides).
  - Images are drawn placeholders at true size: artifact pages can't load other sites' images, and we don't
    download them.
- **Test build:** `target/release/bundle/nsis/ServeNSurf_0.1.0_x64-setup.exe` (local, unsigned). Once the repo
  is on GitHub, CI attaches one to every PR as `servensurf-test-build-<PR>`.
- **Browser preview, real images:** `cd app && npm run preview:data && npm run preview:web`.

## Type of change

- [x] feat: new capability
- [x] ci / docs
- [ ] ⚠️ Breaking change

## Decisions and review loop

- ADRs: ADR-0009 (new, proposed)
- Review log: [docs/reviews/0003-live-preview.md](../reviews/0003-live-preview.md)
- [x] Admin pass: A-14…A-18 (preview metadata, artifact image limits, browser cache, InPrivate storage,
      unsigned build)
- [x] Developer pass: D-19…D-26. **D-26 fixed** (killed runs stayed "running" in the log). **D-25 fixed** (closing the app mid-refresh left a lock that blocked refreshes
      for 6 h; found by the smoke test). **D-21 fixed** (a broken image stalled the slideshow), **D-22 fixed** (an
      oversized body was silently truncated). D-19 and D-23 deferred; D-20 and D-24 accepted

## Testing

- [x] `cargo fmt --all -- --check`: clean
- [x] `cargo clippy --all-targets -- -D warnings` and `-p servensurf-app`: clean
- [x] `cargo test`: **44 passed, 0 failed** (4 new)
- [x] `cd app && npm run validate:w3c`: 8 files, **0 errors**. A deliberately broken page fails with exit 1
- [x] Real refresh: `servensurf sync` → 55 targets, 3,742 blocks, `errors: []`, `files_stored: 0`
- [x] `npm run tauri build -- --bundles nsis`: installer built (3.56 MiB)
- [x] Smoke test of the release app: stays up; WebView folder has **0 image files**, cache folders 0 KB
- [x] In-app launch refresh finished in 47 s with the killed run's lock file still present (D-25 fix proven)
- [ ] Not done: CI has never run (no remote); Save, `load_more` and fullscreen are M1

## Risk and rollback

- MSRV raised 1.80 → 1.89 (`File::try_lock`, for the lock fix).
- Risk: **medium**. This is the first PR that makes network calls. They stay within the budgets of ADR-0004/0008
  and use the engine's existing throttle, lock and watermark.
- Data or schema impact: none (no migration). Stream mode writes no files.
- Rollback: revert the squash commit.

## Compliance (ADR-0004, ADR-0007, ADR-0009)

- [x] Stream only; preload ≤ 2; attribution and a source link on every slide
- [x] Descriptive User-Agent with no personal data; `sync.contact` stays owner-set
- [x] W3C check runs locally; no markup sent to a web service
- [x] No image bytes on disk: InPrivate WebView, metadata-only previews, placeholder artifact

## Owner gate

| # | Question | Default |
|---|---|---|
| — | Does the layout read right: topic rail on the left, image stage, caption strip with controls underneath? | Keep |

- [x] `docs/PROGRESS.md` entry added
- [x] `CHANGELOG.md` `Unreleased` updated

🤖 Generated with [Claude Code](https://claude.com/claude-code)
