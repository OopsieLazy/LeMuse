# feat: compact layout for tablets and small windows; CI fix (work item 16)

**Branch:** `feat/0016-compact-layout` → `main` · **Merge:** Squash and merge on GitHub
([0016-compact-layout.merge.txt](0016-compact-layout.merge.txt))

**PR title:** `feat: compact layout for tablets and small windows`

## What

- **Compact windows:** on a tablet, or in a window under 1,024 px wide or 560 px tall, the app behaves like the
  mini player.
  - The image fills the window.
  - The topic list becomes a **☰ drawer** on the left, with everything the rail has.
  - The bottom bar stays hidden until you **tap the image**, and it is slimmer when it shows.
  - A small credit stays on the image while the bar is hidden.
  - Wide windows are unchanged.
- **CI fix**, carried over because its own PR was never opened:
  - gitleaks runs as a pinned, checksum-verified program over the full history;
  - the PR-title check re-runs when you edit a title.

## Why

The owner: on tablets and smaller windows "the image gets smaller and smaller and the peripherals larger";
they want it to behave like the mini player as the window shrinks. The CI fix was still waiting.

## How

- **UI:**
  - `SlideshowView` gains a tap layer, a ☰ button and a credit line;
  - `App` keeps the bar's open state;
  - `settings.rootAttributes` sets `data-compact-bar`;
  - one compact media query in `styles.css` replaces the old horizontal-strip rules.
- **Tests:** a tablet size in the layout test, an "image fills a compact window" check, and 3 new snapshot
  states.
- **CI:** `.github/workflows/ci.yml` and `pr-title.yml` ([review 0011](../reviews/0011-fix-security-checks.md)).
- Design decision: ADR-0012 amendment. Review: [0016](../reviews/0016-compact-layout.md).

## Checklist

- [x] Secret scan clean
- [x] W3C 50 files, 0 errors · layout 288 renders passed · typecheck
- [x] No new capability, CSP host or dependency
- [x] Design artifact republished · app rebuilt and launched for review
- [ ] Owner: drag the app window narrow, or try it on a tablet: tap the image, use ☰
- [ ] CI green, including the first real full-history gitleaks run

🤖 Generated with [Claude Code](https://claude.com/claude-code)
