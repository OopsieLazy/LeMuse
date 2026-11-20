# Review 0024: A calmer bar; the source always shows; the arrow off the grid

- **Branch:** `fix/0024-calmer-bar` (from `main` after #4) · **ADR:** 0031 §9
- **Passes:** Claude ran both passes on 2026-11-20. It touches guardrail files (`app/scripts/layout-test.mjs`,
  `.githooks/pre-commit`), so it needs the owner's `guardrails-reviewed` label.

The owner: "the bar up arrow covers 'grid'", "as the window is made smaller the source information disappears",
"some items of the bar could … be swappable … (art parts together)".

## Acceptance examples (PLAN rows 15–17)

| Done when | Check |
|---|---|
| Grid view with the bar hidden: no thumbnail sits under the ⌃ arrow | Layout check "the ⌃ arrow covers the grid view" (state `grid-view-bar-hidden`) |
| Compact grid: tapping a thumbnail opens it | Layout check "covered by" at five points per control |
| The source is fully visible at every size and layout | Layout check "source attribution" (all states with an image) |
| 13 bar buttons, not 17; N, W, L, R and right-click unchanged; ⋯ opens the image menu above | Snapshot `more-menu`, `study-menu`; keys unchanged in `keys.ts` |

## Where to look

| Risk | Change (file:line) | If it's wrong | Caught by |
|---|---|---|---|
| med | `app/src/SlideshowView.tsx` (the bar: Practice, ⋯, timer only during a session) | A tool can't be found or reached | Layout checks (covered, outside); snapshots `study-menu`, `more-menu` |
| med | `app/src/styles.css` (`.credit-source`, Minimal byline, grid strip) | Attribution hidden again (ADR-0004) | Layout check "source attribution" |
| med | `app/scripts/layout-test.mjs` (guardrail) | The gate gets weaker or flaky | It only adds checks and a 1040 px size; each failed on the old UI first |
| low | `.githooks/pre-commit` (guardrail) | Commits on main slip through, or branches are blocked | Refuses only when the current branch is `main` |

## Admin / architect and developer passes

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-148 | high | Attribution hidden in places ADR-0004 requires it: the compact credit cut off the source after a long creator; Minimal hid the byline | Source in its own part, never shortened; Minimal keeps the byline. **New check:** source visible and unclipped wherever an image shows |
| D-158 | med | With the bar hidden, the ⌃ arrow sat on the grid's last thumbnails and scrollbar | A strip under the grid for the arrow. **New check:** the arrow never overlaps the grid (it failed at 1040, 1280, 1920 before the fix) |
| D-159 | med | In compact windows the tap-for-bar layer covered grid thumbnails (a tap toggled the bar) | No tap layer over the grid. **New check:** no control covered at five points (it found this at every compact size) |
| D-160 | low | The compact credit was 6 px wider than a 400 px window | `box-sizing: border-box` |
| D-161 | low | The layout test never rendered just above the compact cutoff, where the full bar is tightest | New 1040 × 700 size |
| D-162 | low | Headless Edge screenshots below about 500 px or near 1040 px come out cropped or shifted | Visual checks render the page in an iframe of the exact size (the harness already does) |
| D-163 | med | After PR #4 merged and `main` was pulled, these commits went onto local `main` (the branch changed between turns; Claude didn't check it). Nothing was pushed | Moved to `fix/0024-calmer-bar`; local `main` reset to `origin/main`. **New check:** the pre-commit hook refuses commits on `main` |

## Checks

- [x] typecheck · 21 UI unit tests · W3C · layout 107 states × 7 sizes (+2 mini sizes), both themes
- [x] Secret scan of `main...HEAD` clean
