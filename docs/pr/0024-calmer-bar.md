# fix: a calmer bar; the source always shows; the arrow off the grid (work item 24)

**Branch:** `fix/0024-calmer-bar` → `main` · **Merge:** Squash and merge (needs the `guardrails-reviewed` label:
it changes `app/scripts/layout-test.mjs` and `.githooks/pre-commit`)

**PR title:** `fix(ui): a calmer bar; the source always shows; the arrow off the grid`

## What

- **A calmer bar** (13 buttons, not 17):
  - **Practice ◐** holds the timed session, the grid view and the study aids. While a session runs, ⏱ appears
    to end it.
  - **⋯** opens the image menu above the bar: Save original as…, Copy link, Related Are.na channels, Open source
    page, Hide, Mark as nudity.
- **The source always shows** (ADR-0004):
  - small windows shorten the creator, never the source;
  - the Minimal layout keeps its byline;
  - the credit line fits a 400 px window.
- **Grid view:** the ⌃ arrow gets its own strip under the grid. In small windows, tapping a thumbnail opens it.
- **New checks:**
  - no control covered by anything;
  - the source visible wherever an image shows;
  - the arrow off the grid;
  - a 1040 px size;
  - the pre-commit hook refuses commits on `main`.

## Why

You said: "the bar up arrow covers 'grid', as the window is made smaller the source information disappears. Some
items of the bar could probably be converted into swappable items to save room… (Art parts together, etc)".

## How

- `SlideshowView.tsx` (the bar, ⋯, compact credit); `StudyMenu.tsx` (Practice section); `styles.css`;
  `tokens.css` (menu height).
- `layout-test.mjs` (four checks, 1040 px); `snapshot.tsx` (`grid-view-bar-hidden`, `more-menu`);
  `.githooks/pre-commit`.
- ADR-0031 §9 · [review 0024](../reviews/0024-calmer-bar.md).

## Where to look

| Risk | Change (file:line) | If it's wrong | Caught by |
|---|---|---|---|
| med | `app/src/SlideshowView.tsx` (Practice button, ⋯ button, compact credit) | A tool can't be found or reached | Layout checks; snapshots `study-menu`, `more-menu` |
| med | `app/src/styles.css` (`.credit-source`, Minimal byline, grid strip) | Attribution hidden again | Layout check "source attribution" |
| low | `app/scripts/layout-test.mjs`, `.githooks/pre-commit` (guardrails) | The gates get weaker | Only additions: each new check failed on the old UI first; the hook refuses only `main` |

- Guardrail files touched: `app/scripts/layout-test.mjs`, `.githooks/pre-commit`. Both are stricter; nothing
  loosened.
- Acceptance examples: PLAN rows 15–17 and review 0024.

## Checklist

- [x] Secret scan clean
- [x] typecheck · 21 UI unit tests · W3C · layout 107 states × 7 sizes (+2 mini sizes), both themes
- [ ] Owner: read the two guardrail files and add the `guardrails-reviewed` label

🤖 Generated with [Claude Code](https://claude.com/claude-code)
