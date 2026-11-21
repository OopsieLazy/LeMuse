---
status: proposed
date: 2026-11-20
decision-makers: owner
consulted: admin pass, developer pass
informed: —
---

# ADR-0032: Your own themes from hex codes; Pine & coral

## Context

Themes are fixed token blocks in `app/src/theme/tokens.css` (ADR-0012): Studio (light or dark), Gallery,
Blueprint, Paper and Millennium. There is one accent override. The owner asked for "a method that takes hex
codes to create own custom theme (can make as many themes as you want)", and for a built-in theme of pine,
cream and coral.

A theme needs about a dozen colour tokens, and several of them carry rules:
- the area behind the image stays zero-chroma, because a tinted surround changes how light a picture reads
  (ADR-0029);
- muted text and links need 4.5:1 contrast (WCAG 1.4.3, checked by the layout test since ADR-0028);
- text on the accent needs its own ink colour.

Asking people for twelve hex codes would be tedious and easy to get wrong.

## Decision

1. **Four colours make a theme:** background, panel, text, accent. The rest is derived by `app/src/themes.ts`
   (pure, unit-tested):
   - **behind the image:** a neutral grey with the background's lightness;
   - **muted text:** mixed from text toward the background, but never below 4.5:1 on the background, panel or
     surround;
   - **lines:** a mix between panel and text;
   - **text on the accent:** black or white, whichever reads;
   - **links:** the accent, moved toward the text colour until it reads at 4.5:1 on the panel;
   - **ok/error colours and the dim behind dialogs:** the light or dark set, by the background's lightness.
2. **A new token `--link`** (links in the bar and dialogs) defaults to the accent everywhere else. A coral or
   yellow accent can then stay vivid on buttons while links stay readable.
3. **Saving needs readable text:** body text must reach 4.5:1 on the background and on the panel. Below that,
   the editor names the problem and Save waits. Everything else is adjusted, not refused.
4. **Stored in `ui.json`** as `customThemes` (at most 24; name up to 40 characters; four `#rrggbb` values) and
   applied through the existing setting `preset: "custom"` plus `customTheme: <id>`.
   - Saved values are untrusted (a hand-edited file): only `#rrggbb` colours and known ids pass
     `sanitizeThemes`, and the derived tokens reach the page through `style.setProperty`, never as CSS text.
   - A missing or deleted theme falls back to Studio.
5. **The editor lives in Settings → Look:**
   - your themes are listed as radios next to the built-in ones, with Edit and Delete (Delete asks once);
   - New theme takes a name and, for each of the four colours, a picker plus a hex field (`#ffb000` or
     `ffb000`);
   - a live preview shows the panel, text, muted text, a link and an accent button.
6. **Built-in "Pine & coral"** (`data-preset="pine"`), chosen by eye, not official Pantone values:

   | Role | Colour |
   |---|---|
   | Background | pine `#183a2f` |
   | Panel | `#1f4537` |
   | Text | cream `#f4ecdc` |
   | Accent | coral `#ff7f66` |
   | Links | a lighter coral, `#ff9680` (5.05:1 on the panel) |
   | Behind the image | neutral `#343434` |

   Living Coral's published value (`#ff6f61`) reads only 3.9:1 on pine, so the accent is slightly lighter.

## Options considered

- **Every token editable.** Rejected: twelve fields, easy to make unreadable, and the surround rule would be up
  to each user.
- **One accent picker only (as before).** Rejected: the owner asked for whole themes, and several of them.
- **Store themes as CSS files.** Rejected: CSS from a file is an injection path; four validated hex values are
  not.

## Consequences

- Any number of themes (24 kept) without new CSS. The layout test checks a custom theme state and the Pine &
  coral state for contrast in every run.
- `--link` is a new token. Styles for links use it; the default keeps today's look.
- Light/dark (Studio's mode) doesn't apply to custom themes: a custom theme is one fixed palette, like Gallery.
