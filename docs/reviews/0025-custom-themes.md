# Review 0025: Your own themes from hex codes; Pine & coral

- **Branch:** `feat/0025-custom-themes` (from `main` after #5) · **ADR:** 0032
- **Passes:** Claude ran both passes on 2026-11-20. It touches a guardrail file (`app/scripts/layout-test.mjs`),
  so it needs the owner's `guardrails-reviewed` label.

## Acceptance examples (PLAN rows 18–19)

| Done when | Check |
|---|---|
| New theme "Night shift" from four hex codes recolours the app and is listed with the built-in themes | Snapshot `custom-theme` (two themes); unit test "your own themes" |
| Typed or picked hex; anything else refused | Unit test (`parseHex`) |
| Hard-to-read text is named and Save waits; muted text and links adjusted; neutral surround | Unit test; snapshot `custom-theme-editor-unreadable`; layout contrast check |
| Edit, Delete; a deleted theme in use falls back to Studio; `ui.json` can't inject CSS | Unit test "saved themes are untrusted" |
| Pine & coral passes the contrast check | Snapshots `pine-coral`, `pine-coral-menu` (layout test) |

## Where to look

| Risk | Change (file:line) | If it's wrong | Caught by |
|---|---|---|---|
| high | `app/src/themes.ts` `sanitizeThemes`, `app/src/settings.ts` `rootAttributes` | A hand-edited `ui.json` injects CSS, or a theme breaks the app | Unit tests: only `#rrggbb`, known ids, plain names; values go through `style.setProperty` |
| med | `app/src/themes.ts` `themeTokens` | Unreadable muted text or links in a user's theme | Unit test (4.5:1 on every surface); layout test contrast on `custom-theme` |
| med | `app/src/theme/tokens.css` (`--link` in each theme, Pine & coral) | Links change colour or contrast in built-in themes | Layout test now checks links (it failed on Millennium and the accent override first) |
| low | `app/src/ThemeEditor.tsx` | Enter in a field closes Settings | `noSubmit` on every field |
| low | `app/scripts/layout-test.mjs` (guardrail) | The gate gets weaker | One line: links and form messages added to the contrast check |

## Admin / architect pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| A-149 | high | Themes are stored in `ui.json`, which can be edited by hand: a CSS injection path | Only four `#rrggbb` values per theme, ids `[a-z0-9]{1,24}`, names one line ≤ 40; tokens set with `setProperty`, never CSS text; at most 24 themes |
| A-150 | med | A user theme could make the app unreadable (WCAG 1.4.3, ADR-0028) | Body text must reach 4.5:1 to save; muted text, links, ok/error derived to 4.5:1 |
| A-151 | med | A tinted surround changes how an image reads (ADR-0029) | Custom themes always get a neutral grey surround; the Behind-the-image setting still applies |
| A-152 | low | "Pantone equivalents" | Colours chosen by eye and documented as not official Pantone values (ADR-0032); no trademarked swatch data shipped |

## Developer pass

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| D-164 | med | The layout test never checked link contrast. Adding links found Millennium's (3.55:1) and an accent override's (3.40:1), both there since 1.0 | Each theme has its own `--link`; an override recolours buttons, not links (custom themes recompute theirs). **New check:** links and form messages in the contrast check |
| D-165 | low | Enter in a theme field would submit the Settings form and close it | Prevented on every editor field |
| D-166 | low | The colour dots inherited the theme pills' styling (stacked, oversized) | Drawn as a small inline SVG |
| D-167 | low | The theme in use deleted | Falls back to Studio (unit test) |
| D-168 | med | `npm run portable` deleted the old folder before copying; with LeMuse running from it, a partly deleted folder was possible | Builds into `LeMuse.new`, moves the old folder aside whole (refused while it runs, so nothing changes), then swaps. Checked with LeMuse running: "nothing was changed" |

## Checks

- [x] typecheck · 23 UI unit tests · W3C · layout 112 states × 7 sizes (+2 mini sizes), both themes
- [x] Secret scan of `main...HEAD` clean
