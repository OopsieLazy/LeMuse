---
status: proposed
date: 2026-11-19
decision-makers: owner
consulted: admin pass, developer pass, design analyst and art specialist pass (research report)
informed: —
---

# ADR-0025: Practice tools: study aids, timed sessions, favourites

## Context

The owner (session 16): "practice tools seems fun, goal is to make it to 1.0", plus a final Design Analyst and
Art Specialist pass with full research, because "it still feels like something is missing from every app I
make".

The research ([report](../../reports/LeMuse%20design%20and%20art%20review.md), notes in
`research_notes/LeMuse design and art review/`) found:
- **The missing piece is the job, not a feature.** LeMuse streamed good images but had no session with a
  start, a structure and an end. Leading free timers (Art in Context's Pose Reference, Line of Action, Quick
  Poses, Proko) all share one shape: class presets that start with fast poses, then pause / skip / back, sound
  cues in the last seconds, and a summary of what you drew.
- **Timer fairness matters more for LeMuse than for its rivals.** Every image streams from a CDN, so a pose
  clock that starts before the image appears steals time from short poses.
- **Study aids artists use:** mirror, upside down, greyscale, values/notan with an adjustable threshold, squint
  (blur), and grids for proportion.
- **Constraints we keep:** no image bytes on disk except Save (ADR-0009); remote text rendered as text; the
  control bar never covers the image (D-33); attribution always shown.

## Decision

**1. Study aids are drawn on screen only, never computed from pixels.**
- **Mirror and upside down** are CSS transforms. A badge on the image says so ("Mirrored · Upside down"), so a
  changed reference is never mistaken for the real one.
- **Greyscale** is CSS `grayscale(1)` (Rec.709 luma on sRGB values). The menu says it's luma, close to value
  but not exact for strong colours.
- **Values (2 = notan, 3, 4, 5 tones)** are an SVG filter: luma in sRGB (`color-interpolation-filters="sRGB"`),
  a gamma curve for **balance** (darker ↔ lighter, which moves the thresholds), then a `discrete` transfer into N
  flat tones.
- **Squint** is a CSS blur applied *before* the value filter, so notan shows big masses.
- **Grids** (thirds, 4 × 4, squares, diagonals) are an SVG in the same grid cell as the image.
  - The SVG's viewBox is the image's own loaded size, with the same fit (`meet` for contain, `slice` for cover).
  - With a grid on, the image fills its cell with `object-fit: contain`, so both boxes match exactly.
  - The layout test asserts this at every window size.
- **Why not canvas:** canvas would read pixels. Cross-origin images taint it unless the CDN sends CORS headers
  (unverified), and it would tempt caching. Exact L* greyscale and automatic notan thresholds need pixels, so
  they wait for a CORS check (PLAN).
- **Why not container queries:** a container-units version was simpler, but the W3C checker's CSS module
  doesn't know `container-type` yet. We keep the W3C gate strict, not filtered.

**2. Timed sessions run on pure functions in `practice.ts`; `App.tsx` adds the side effects.**
- **Plans:**
  - Gesture warm-up: 10 × 30 s.
  - Relaxed: 10 × 1 min, for beginners who find 30 s too fast.
  - Class: 10 × 30 s, 5 × 1 min, 2 × 5 min, 1 × 10 min (30 min).
  - Long class: about 1 h.
  - Quick sketches and a long study.
  - **Your plan:** up to 6 rounds of up to 100 poses, of listed lengths from 15 s to 1 h, saved in `ui.json`
    and sanitized on load.
  - Each plan shows its poses and total time before you start.
- **The clock:**
  - It counts only while the pose's image is on screen: it waits for `load` (at most 8 s) and pauses when the
    window is hidden or minimised.
  - It doesn't pause on blur, because artists often draw in another app.
  - Space pauses, → skips, ← goes back and restarts the pose, Esc or the timer button ends the session.
  - A skipped or stopped pose counts as drawn when at least half its time was used.
- **Sound:** three soft ticks in the last 3 s, a tone on each new pose and a chord at the end. Web Audio
  oscillators: no files, no network. They can be switched off.
- **The end is the moment:** the summary shows how many drawings and how long, plus a contact sheet of what you
  drew with ♥ on each.
  - **Keep as a playlist** saves the session's images as a playlist ("Session 19 Nov, 14:05").
  - **Resume** undoes an early end, instead of a "are you sure?" warning.
- **Pose clock placement:** on the image at the top right, with pose n / N. In the bar there's also round and
  time left (hidden in compact windows like the other specs).

**3. ♥ Favourites is a playlist named "Favourites", made on the first ♥.**
- It needs no schema change, it works in the preview backend, and the dashboard and exports already handle
  playlists.
- Trade-off: renaming it makes the next ♥ start a new "Favourites" (A-108). A `role` column can come with the
  playlist editor (v0.9 browse PR) if that bites.

**4. Small finishing work in the same PR:**
- a **?** shortcuts sheet;
- alt text "title, creator";
- an empty-Favourites hint;
- a neutral Studio stage (`#e2e2e2` light, `#161616` dark: zero chroma, dark grey rather than black). Other
  presets keep their character until the surround picker lands;
- the About story ("Real art, credited"), with a privacy line and an unaffiliated line.

**5. Enterprise-proportionate fixes:**
- **Copy details** redacts the Windows user folder (names with spaces included) and token-shaped text.
- **Report a problem** opens the bug form with only the version filled in (built with `URLSearchParams`,
  version checked against a strict pattern).
- **The bug form** warns that issues are public and asks reporters to confirm they removed tokens, user names
  and private links.
- **AIC's host** is removed from the opener scope and the CSP while AIC is held back (D-18).
- **CODE_OF_CONDUCT** and a README takedown section are added.

## Consequences

- **Gains:**
  - Sessions with a start, a structure and an end, and honest study aids.
  - The first unit tests for the UI's logic (`npm run test:unit`, in CI).
  - A hands-on map for the owner (`docs/guide/hands-on.md`).
- **No change to:**
  - Rust code (only the version) or the schema;
  - permissions beyond a narrower opener scope;
  - dependencies.
- **Costs:**
  - With a grid on, small images scale up to fill the frame, and the drop shadow is off.
  - The bar has three more buttons: Session, Study, ♥. The layout test passes at all six sizes.
- **Deferred** (PLAN, from the art review):
  - surround picker;
  - Cleveland's 3,400 px print image on large windows;
  - museum label (measurements, credit line, CC0 badge);
  - a visual flash cue;
  - a large timer ring;
  - a forgiving practice log (no streaks);
  - content controls;
  - Save provenance sidecar;
  - release pipeline;
  - a way to turn single-key shortcuts off (WCAG 2.1.4).
