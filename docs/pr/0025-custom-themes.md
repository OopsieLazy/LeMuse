# feat: your own themes from hex codes; Pine & coral (work item 25)

**Branch:** `feat/0025-custom-themes` → `main` · **Merge:** Squash and merge (needs the `guardrails-reviewed`
label: it changes `app/scripts/layout-test.mjs`)

**PR title:** `feat(ui): your own themes from hex codes; Pine & coral`

## What

- **Your own themes:**
  - Settings → Look → New theme from colours… takes a name and four colours (background, panel, text, accent),
    picked or typed as hex.
  - A live preview shows the result; Save and use applies it.
  - As many as you like (up to 24), each with Edit and Delete, listed with the built-in themes.
- **Readable by design:** text under 4.5:1 is named and Save waits. Muted text, links and messages are adjusted
  for you. The area behind the image stays a neutral grey.
- **Pine & coral** built in: a pine background, cream text and a coral accent, with lighter coral links.
- **Fixed:** links in Millennium, and with an accent override, were hard to read; each theme now has its own
  readable link colour.

## Why

You said: "build a method that takes hex codes to create own custom theme (can make as many themes as you want).
and also create a theme with pine, cream and coral".

## How

- `app/src/themes.ts` (pure: parse, sanitise, derive, contrast); `app/src/ThemeEditor.tsx`;
  `settings.ts` (`customThemes`, `customTheme`, preset `pine` and `custom`); `tokens.css` (`--link`, Pine & coral).
- Snapshots: `pine-coral`, `pine-coral-menu`, `custom-theme`, `custom-theme-editor`,
  `custom-theme-editor-unreadable`.
- ADR-0032 · [review 0025](../reviews/0025-custom-themes.md).

## Where to look

| Risk | Change (file:line) | If it's wrong | Caught by |
|---|---|---|---|
| high | `app/src/themes.ts` `sanitizeThemes`; `app/src/settings.ts` `rootAttributes` | A hand-edited settings file injects CSS | Unit tests: only hex colours and plain names pass; values set with `setProperty` |
| med | `app/src/themes.ts` `themeTokens` | Unreadable text in your theme | Unit test (4.5:1 everywhere); layout contrast check |
| med | `app/src/theme/tokens.css` (`--link`) | Links look different in built-in themes | Layout test now checks links |

- Guardrail file touched: `app/scripts/layout-test.mjs`. One line, stricter: links and form messages are now
  in the contrast check.
- Acceptance examples: PLAN rows 18–19 and review 0025.

## Checklist

- [x] Secret scan clean
- [x] typecheck · 23 UI unit tests · W3C · layout 112 states × 7 sizes, both themes
- [ ] Owner: read `app/scripts/layout-test.mjs` and add the `guardrails-reviewed` label

🤖 Generated with [Claude Code](https://claude.com/claude-code)
