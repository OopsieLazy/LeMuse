# Review 0020: Practice tools (study aids, timed sessions, favourites)

- **Branch:** `feat/0020-practice-tools` (stacked on #19) · **ADR:** 0025
- **Passes:** Claude ran all three passes on 2026-11-19: admin, developer, and design analyst / art
  specialist. The third is backed by five research tracks
  ([report](../../reports/LeMuse%20design%20and%20art%20review.md)). The commit hook's admin agent reviews each
  commit too.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-107 | med | Study aids could read or keep image pixels | They don't. CSS transforms and filters, an SVG value filter and an SVG grid; no canvas, no `getImageData`, no bytes written. Images stay cross-origin; only Save writes files (ADR-0009) |
| A-108 | low | Favourites is identified by its name | Accepted (ADR-0025 §3): no schema change. Renaming it starts a fresh one on the next ♥. A `role` column can come with the playlist editor |
| A-109 | low | The session summary loads up to 100 thumbnails at once | They're `loading="lazy"` and come from the image CDNs, not the API, so no read budget is spent. In memory only (InPrivate) |
| A-110 | med | The opener scope and CSP still listed AIC's host while AIC is held back (D-18) | **Fixed:** removed from the opener scope, `isOpenable` and `img-src`. It comes back with D-18 |
| A-111 | med | "Report a problem" and "Copy details" could put the Windows user name or a token into a public issue. Are.na tokens never expire | **Fixed:** `redact()` covers user folders (names with spaces too) and token-shaped text. The issue link carries only the version (strict pattern, `URLSearchParams`). The bug form warns that issues are public and asks reporters to confirm. Unit-tested |
| A-112 | low | The code of conduct needs a private contact | It uses GitHub's private reporting form. Owner to confirm (Q29) |
| A-113 | info | README now says "museum images are CC0" | Verified: Cleveland is queried with `cc0=1` and records without `share_license_status = CC0` are dropped |
| A-114 | info | Research notes and report are public | Checked: no personal data (owner name, email, user name, account slug); the secret scan is clean |
| A-115 | info | Session sound | Web Audio oscillators: no files, no network, no permission. Created on the Start click |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-110 | high | A pose clock that starts before a streamed image appears steals time from short poses | **Fixed:** the clock waits for the image's `load` (at most 8 s), and pauses when the window is hidden or minimised. It doesn't pause on blur (artists draw in other apps) |
| D-111 | med | The session logic in `App.tsx` was hard to test | **Fixed:** moved into pure functions in `practice.ts` (`startSession`, `tickSession`, `finishPose`, `stopSession`, `restartPose`). 9 unit tests in `npm run test:unit`, now in CI |
| D-112 | med | The grid has to sit exactly on the shown image, at every size and fit | With a grid on, the image fills its cell (`object-fit` contain or cover) and the SVG uses the loaded image's size with the same fit. The layout test asserts grid box = image box and equal proportions (474 checks) |
| D-113 | med | A first version used container query units; the W3C checker rejects `container-type` | Rewritten without them rather than filtering the gate (ADR-0025 §1) |
| D-114 | low | One image in view: moving on reloads nothing, so the clock would wait forever | `many = visible.length > 1`: with one image there's no wait. The 8 s cap covers any other missed `load` |
| D-115 | low | Early end by accident (Quick Poses relabelled End for this reason) | **Resume** on the summary puts the session back as it was. End stays a separate button from pause |
| D-116 | low | Skip or stop after most of a pose lost the drawing | Counts as drawn when at least half the time was used. Tested |
| D-117 | low | Saved custom rounds are untrusted (`ui.json`) | `sanitizeRounds`: 1–6 rounds, 1–100 poses, listed lengths only. Unknown plan ids fall back. Tested |
| D-118 | low | A double ♥ before Favourites existed could try to create it twice | **Fixed:** one ♥ at a time |
| D-119 | info | The app re-renders every 200 ms during a session | Fine at that rate; DOM work is the clock text only (React leaves unchanged filters and SVG alone) |
| D-120 | info | Two sessions kept in the same minute get the same playlist name | The second shows "already a playlist named …"; accepted |

## Design analyst / art specialist pass

The full reasoning, with sources, is in the report. In short, the "something missing" was the job, not a
feature: a session with a start, a structure and an end. This PR is the first change aimed at that job.

| ID | Finding | Resolution |
|---|---|---|
| DA-1 | Timer fairness on streamed images | **Fixed** (D-110) |
| DA-2 | A forgotten flip or value view corrupts the reference | **Fixed:** a badge on the image while any aid is on |
| DA-3 | Show a plan's length before starting (Proko users asked) | **Fixed:** "18 poses · 30 min" on each plan |
| DA-4 | Back / restart pose; a 1-hour class; a relaxed preset for beginners | **Fixed** |
| DA-5 | Greyscale is luma, not L* | **Fixed:** said in the menu. Exact L* and auto-threshold need pixels: CORS check first (PLAN) |
| DA-6 | The surround should be zero-chroma, dark grey rather than black | **Partly:** Studio is now neutral (`#e2e2e2` / `#161616`). Other presets keep their character. Surround picker → PLAN |
| DA-7 | Alt text was the title only | **Fixed:** "title, creator" |
| DA-8 | Empty states should teach; accidental ends | **Fixed:** Favourites empty state; Resume |
| DA-9 | The story ("real art, credited, no ads, no AI feed") lived only in ADRs | **Fixed:** About and README; an unaffiliated line; privacy paragraph |
| DA-10 | Governance basics | **Fixed:** CODE_OF_CONDUCT, takedown section, SECURITY.md updated |
| DA-11 | Cleveland's 900 px "web" image is upscaled on large screens | → PLAN (museum label and sharpness PR) |
| DA-12 | Museum label hierarchy, measurements, credit line, CC0 / "rights unknown" badges | → PLAN |
| DA-13 | Large timer ring, a visual flash for quiet rooms, crossfade after `decode()` | → PLAN (session craft PR) |
| DA-14 | First run: "What are you drawing today?" topic chips; remember position, plan and aids | → PLAN |
| DA-15 | Content controls (hide image or channel; nudity default) | → PLAN; default is an owner decision (Q27) |
| DA-16 | A forgiving practice log, never a streak chain | → PLAN; whether to keep history is an owner decision (Q28) |
| DA-17 | A setting to turn off single-key shortcuts (WCAG 2.1.4) | → PLAN |

## Checks

- [x] `npm run typecheck` · `npm run test:unit` (9) · W3C 78 files · layout 76 states × 6 sizes = 480 renders.
- [x] `cargo test` · fmt · clippy `-D warnings` (core, CLI, app); Rust changed only in the version.
- [x] No dependency change, so the audits are unchanged.
- [x] Secret scan of the branch clean.
