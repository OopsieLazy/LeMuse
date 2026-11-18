# Review 0003: Live preview, W3C gate, first real slideshow

- **Branch:** `feat/0003-live-preview` (stacked on `feat/0002-keyword-topics`)
- **PR:** #3 (local; see `docs/pr/0003-live-preview.md`)
- **ADRs touched:** ADR-0009 (new)
- **Round:** 1

## 1. Proposal (author: Claude)

The owner asked to see the real product as it's built, a W3C check on commits, a test build or artifact to view,
and no PNG downloads in cache. So this PR pulls the visible half of M1 forward:

| # | Decision | Why | ADR |
|---|---|---|---|
| 1 | Build the real slideshow UI now, as one pure view component shared by the app, the previews and the validator | The design is seen, not guessed; one component means no drift | 0009 |
| 2 | Production HTTP client + real refresh (CLI, launch, button) | Without real data there's nothing honest to look at | 0003, 0005 |
| 3 | Three views per PR: installer, browser preview, design artifact | Real images in the app; anywhere-access via the artifact | 0009 |
| 4 | W3C Nu HTML Checker locally (pre-commit + CI) on the real rendered markup | The owner asked for the W3C validator; local keeps markup private | 0009 |
| 5 | WebView2 InPrivate; the artifact uses drawn placeholders | No image bytes in any disk cache | 0009 |

## 2. Admin / architect pass

- [x] ADR-0004/0007: stream-only; preload ≤ 2; attribution shown on every slide (creator, source, source page link)
- [x] ToS: the first real refresh stayed within budgets (Are.na guest 24/min, Cleveland 30/min); 0 errors, 0 files
- [x] Privacy: the User-Agent carries no personal data. `sync.contact` stays owner-set; never auto-filled
- [x] Security: CSP unchanged. The artifact is private, and it inlines only our own code and metadata
- [x] Scope: Save, lazy `load_more`, token storage and 5xx retry stay in M1 (not this PR)

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-14 | low | The preview snapshot holds third-party metadata (titles, creators, URLs) | Generated files are gitignored. Only a 3×3 sample (`app/scripts/sample-data.json`) is committed, like the API fixtures; attribution is kept |
| A-15 | med | Artifact pages block images from other hosts, and we must not download images | Placeholders drawn at each image's real size; the page says the image streams in the app. Real images: test build or `preview:web` |
| A-16 | low | `preview:web` runs in the owner's normal browser, which does cache images | Documented in ADR-0009: the no-cache guarantee belongs to the desktop app |
| A-17 | low | InPrivate WebView loses `localStorage` on exit | Accepted. UI preferences must persist through the core → M2 |
| A-18 | low | CI installer is unsigned (SmartScreen warning) | Accepted for test builds; code signing before a public release |

## 3. Developer pass

- [x] `cargo fmt --check`, `cargo clippy --all-targets -D warnings`, `cargo clippy -p servensurf-app -D warnings`: clean
- [x] `cargo test`: **44 passed** (4 new: User-Agent, `ensure_library`, leftover lock file, interrupted runs)
- [x] `npm run validate:w3c`: 8 files, **0 errors**. A deliberately broken page fails with exit 1 (gate proven)
- [x] Real refresh: `servensurf sync` → 55 targets, 3,742 blocks, 0 errors, 0 files stored
- [x] `npm run tauri build -- --bundles nsis` → `ServeNSurf_0.1.0_x64-setup.exe` (3.56 MiB)
- [x] Smoke test of the release app (InPrivate): ran 25 s and stayed up; WebView folder has 0 image files, cache folders 0 KB
- [x] Second run, 150 s: the in-app launch refresh completed (`sync_runs` id 3, `ok`) with the killed run's lock file still present

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-19 | low | `topics` counts slides by running `slides(…, 10000)` per topic on every call | Fine at 3.7k blocks. Deferred → M2: a `COUNT(*)` query |
| D-20 | low | If the CLI holds the sync lock, the app's refresh fails | The UI shows "Refresh failed: …" from the event; no crash. Accepted |
| D-21 | med | A slide whose image fails to load (403, hotlink block, 404) would stall the slideshow on a broken frame | **Fixed:** `onError` drops the slide from the rotation for this topic visit |
| D-22 | med | The HTTP client capped bodies at 64 MiB by truncating, so an oversized file would be stored silently cut | **Fixed:** reads limit + 1 and errors if over the limit |
| D-23 | low | After a refresh the active topic reloads and restarts at slide 1 | Accepted for now; M1 `load_more` will append instead of reload |
| D-25 | **high** | Found by the smoke test: closing the app during a launch refresh left `.sync.lock` behind, blocking every refresh for 6 h (the stale-lock timeout) | **Fixed:** the lock is now an OS file lock (`File::try_lock`), which Windows releases when the process exits. A leftover file isn't a lock (new test). MSRV 1.80 → 1.89 |
| D-26 | low | A run killed mid-way stays `running` in `sync_runs` forever | **Fixed:** `start_run` (under the lock) marks leftover `running` rows `interrupted`; test added |
| D-24 | low | React renders `<img />`; the checker reports *Info* (not an error) | Filtered in `validate-w3c.mjs` with a comment |

**Verification evidence:**

```
cargo test                          → 44 passed, 0 failed
app launch refresh (release build)  → ok in 47 s despite a leftover lock file: 13 channels refreshed,
                                      42 museum searches skipped (weekly), errors [], files_stored 0
cargo clippy (all targets + app)    → clean
npm run validate:w3c                → W3C Nu HTML Checker: 8 files … No errors found.
bad-markup probe                    → 5 errors, exit 1
servensurf sync (real network)      → targets_seen 55, blocks_upserted 3742, errors [], files_stored 0
```

## 4. Owner gate

See `docs/pr/0003-live-preview.md`.
