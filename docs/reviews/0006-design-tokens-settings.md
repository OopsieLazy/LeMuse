# Review 0006: Design tokens, Settings, fullscreen, hideable controls

- **Branch:** `feat/0006-design-tokens-settings` (stacked on #5) · **ADR:** 0012
- **Admin pass:** an admin-review agent read the diff read-only on 2026-11-17, then Claude checked its findings.

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-25 | low-med | Cleveland's `page_url` went into `href` unchecked; React only warns on `javascript:`; middle-click bypassed `isHttps` | **Fixed (in #7):** the connector keeps only `https://` links, and the view renders the link only if `isHttps(page_url)` |
| A-26 | low | The review snapshot copied untracked key or credential files in full, which got around the `Read(*.pem/*.key)` denies | **Fixed (in #7):** files matching the scanner's forbidden list are named but withheld; `*.pem`, `*.key`, `*.pfx`, `*.p12` and `credentials*.json` are gitignored |

Verified fine: two narrow permissions (fullscreen; opener limited to `https://*`), both pinned and justified; CSP
unchanged; `set_ui_settings` uses a fixed path, objects only, a 16 KiB cap and an atomic write; `sanitize()` closes
style injection; no `innerHTML`.

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-31 | low | Headless Edge doesn't run animation frames under virtual time; the harness stalled after one render | **Fixed:** forced synchronous layout instead of waiting for frames |
| D-32 | med | The layout test found: at 800 px with the topic list docked, the control bar pushed Settings off screen; at 400 px with a 120% interface size, the button row couldn't wrap; an open Settings panel grew taller than the window | **Fixed:** the caption is a wrapping flex row and the controls may shrink and wrap; the dialog is fixed, capped and scrolls inside. 90/90 renders pass |
| D-33 | low | Auto-hide in docked layouts re-fits the image when the bar hides | Accepted: by owner rule the bar never overlays the image. In the register |
| D-34 | low | The browser preview stores settings in `localStorage`, the app in `ui.json` | By design (ADR-0012): InPrivate has no lasting storage |

- [x] Token audit: no colour literals in component CSS; remaining literals documented (`docs/design/tokens.md`)
- [x] `sanitize()` whitelists every enum and clamps every number; only `#rrggbb` reaches `--accent`
- [x] W3C 20 files, 0 errors; layout test 90 renders; 3 new `ui_settings` tests; clippy (app) clean
