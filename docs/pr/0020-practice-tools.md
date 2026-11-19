# feat: practice tools: timed sessions, study aids, favourites (work item 20)

**Branch:** `feat/0020-practice-tools` → `main` · **Stacked on:** #19 (open it against `feat/0019-polish`;
GitHub retargets it to `main` when #19 merges) · **Merge:** Squash and merge, after #19

**PR title:** `feat: practice tools: timed sessions, study aids, favourites`

## What

- **Timed sessions (N):**
  - plans: gesture warm-up, relaxed, class (30 min), long class (1 h), sketches, long study, or your own (up to
    6 rounds); each shows its poses and total time;
  - the clock starts when the image has loaded and pauses when LeMuse is minimised;
  - soft ticks in the last 3 s and a tone on each new pose (can be switched off);
  - Space pause, → skip, ← back (restarts the pose), Esc end;
  - the **summary** shows what you drew, with ♥ on each image, **Keep as a playlist** and **Resume**.
- **Study aids**, on screen only (the image is never changed or saved):
  - mirror (X), upside down (U), greyscale (G);
  - values 2–5 and notan, with a darker/lighter balance (V), and squint (B);
  - grids (O): thirds, 4 × 4, squares, diagonals;
  - 0 turns everything off, and a badge on the image says what's on.
- **♥ Favourites (K)**, a playlist made on your first ♥, and a **?** sheet of every shortcut.
- **Finishing touches:**
  - About tells what LeMuse is for ("Real art, credited");
  - alt text includes the creator;
  - Studio's stage is neutral grey.
- **Public-repo hygiene:**
  - Copy details hides your Windows user name and token-like text;
  - Report a problem fills in only the version, and the bug form warns that issues are public;
  - AIC's host is out of the link list and CSP while AIC is held back;
  - CODE_OF_CONDUCT, plus privacy and takedown notes in the README.
- **For working on it yourself:** [docs/guide/hands-on.md](../guide/hands-on.md) (map, guardrails, exercises),
  and the first UI unit tests (`npm run test:unit`, in CI).
- **Research:** five tracks and a design/art report ([reports/LeMuse design and art review.md](../../reports/LeMuse%20design%20and%20art%20review.md)). **Version 0.9.0.**

## Why

The owner: "practice tools seems fun, goal is to make it to 1.0 … a final Design Analyst and Art Specialist
pass, full research; still feels like something missing". The research's answer was that the missing piece was
the drawing session itself: a start, a structure and an end.

## How

- `app/src/practice.ts`: pure functions for:
  - the study aids (filter, tone table, balance curve, grid lines);
  - the plans and sanitizing;
  - the session clock (`startSession`, `tickSession`, `finishPose`, `stopSession`, `restartPose`).
- `App.tsx` adds the side effects: moving the slideshow, sound (`sound.ts`, Web Audio, no files) and dialogs.
- `SlideshowView`:
  - an SVG value filter;
  - a grid SVG in the image's cell (same viewBox and fit as the image; the layout test checks they line up);
  - the pose clock and the study badge on the image;
  - three new buttons.
- New views: `StudyMenu`, `PracticePanel`, `ShortcutsPanel`.
- Settings keep the plan, your rounds and the sound switch (sanitized).
- No Rust change beyond the version, no schema change, no new dependency.
- ADR-0025 · [review 0020](../reviews/0020-practice-tools.md) (admin, developer, design/art).

## Checklist

- [x] Secret scan clean
- [x] `cargo test` · fmt · clippy `-D warnings` (core, CLI, app) · typecheck · unit tests (9) · W3C 78 · layout
  480 renders
- [x] No dependency change; opener scope and CSP narrower (AIC removed)
- [x] Design artifact republished (same URL)
- [ ] Owner: press N, pick Gesture warm-up, draw a few, end with Esc, try Resume; press V, then O; ♥ a few; ?

🤖 Generated with [Claude Code](https://claude.com/claude-code)
