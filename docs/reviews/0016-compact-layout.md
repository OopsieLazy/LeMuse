# Review 0016: Compact windows (tablets and small windows); CI fix carried over

- **Branch:** `feat/0016-compact-layout` · **ADR:** 0012 (amendment) · Also carries the unmerged CI fix
  (`ci/0011`, [review 0011](0011-fix-security-checks.md)), cherry-picked unchanged
- **Passes:** Claude ran both passes on 2026-11-18.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-83 | med | Hiding the bar by default on compact windows would hide attribution (ADR-0004 "always show") | A small credit (creator · source) stays on the image while the bar is hidden, in the mini player too |
| A-84 | info | The owner's rule that the bar never covers the image (D-33) | Kept: the bar is in the flow when shown; the layout test still checks the image is clear of it |
| A-85 | info | Security surface | CSS and view only; no new capability, CSP host, command or dependency |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-85 | low | A tap on the image with the drawer open would also toggle the bar | A tap with the drawer open just closes the drawer |
| D-86 | low | The old ≤ 720 px rules (rail as a horizontal strip) conflicted with the drawer | Removed; compact rules replace them. The filter sheet at ≤ 720 px stays |
| D-87 | info | Compact starts at 1,024 px, so a 1024 × 640 window is compact too | Intended ("smaller window"); above it the docked layouts are unchanged |
| D-88 | info | `rail-right` opens its drawer from the left in compact mode | The ☰ button is on the left; one place to look |

- [x] W3C 50 files, 0 errors · layout 48 states × 6 sizes (new: 768 × 1024) = 288 renders passed, including the
  new "image fills a compact window" check · typecheck.
