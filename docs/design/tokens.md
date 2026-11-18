# Design tokens: what's tokenized, what isn't, and why

All visual values live in [`app/src/theme/tokens.css`](../../app/src/theme/tokens.css). Components
([`styles.css`](../../app/src/styles.css)) only read tokens. The Settings panel changes tokens at runtime through
[`settings.ts`](../../app/src/settings.ts). Audited 2026-11-17 (ADR-0012). The audit command and its result are
at the bottom.

## Tokenized

| Group | Tokens | Changed by |
|---|---|---|
| Colour (semantic) | `--bg --panel --panel-fill --stage --fg --muted --line --accent --accent-ink --ok --error --backdrop --shadow-rgb` | Theme preset; light/dark mode; accent picker (ink computed for contrast) |
| Typography | `--font-ui --font-display --font-data`, `--text-2xs…xl`, weights, leading, tracking | Typeface set; **Interface size** scales every size |
| Space | `--space-1…8` (4 px rhythm × scale) | Interface size |
| Layout | `--rail-width --stage-pad --stage-pad-narrow --control-size --icon-size --icon-stroke --timer-height --dialog-width --dialog-max-height --measure --menu-width --menu-max-height --field-min --status-min --filter-menu-width --chip-radius --thumb-size --pager-width --sheet-max-height` | Topic list width slider; Space around the image slider; Cinema sets stage padding to 0 |
| Shape | `--radius-base` → `--radius-sm/md/lg`, `--border`, `--focus-ring --focus-offset` | Corner rounding slider |
| Elevation | `--image-shadow-strength` → `--image-shadow`, `--dialog-shadow` | Image shadow slider |
| Motion | `--dur-fast --dur-med --ease` | Also turned off by `prefers-reduced-motion` |
| Layers | `--z-reveal --z-menu --z-drawer` | none (fixed) |

**Layout presets** (Studio, Topics on the right, Controls on top, Cinema, Minimal) and **toggles** (timer, specs,
creator, hidden controls, fit, fullscreen-immersive) are `data-*` attributes on `<html>` that components select
on. They aren't tokens, because they change structure (grid areas, what's displayed) rather than values.

## Deliberately not tokenized

| Value | Where | Why not |
|---|---|---|
| `720px` breakpoint | `@media (max-width: 720px)` | CSS custom properties **can't be used inside media queries**. It's the single breakpoint, and the layout test checks both sides of it (800 and 400 px) |
| `1px` hairlines (borders, separator) and the 1 px `.visually-hidden` box | borders, `.controls-sep`, screen-reader-only labels | Structural: a hairline is one device pixel by definition. Scaling it would blur it |
| `0`, `100%`, `1fr`, `minmax(0, 1fr)`, grid areas | layout | Structure, not style. Changing them breaks the "image never under the bar" guarantee the layout test enforces |
| SVG path data | `ICONS` in `SlideshowView.tsx` | Geometry. Icon size, stroke width and colour *are* tokens |
| Timer duration (`animationDuration`) | inline style on the timer bar | Data (seconds per slide), not style. It comes from the topic or the Settings slider |
| `@keyframes timer-fill` | styles.css | An animation definition; its timing comes from data |
| Theme colour values | tokens.css preset blocks | These *are* the tokens. Each preset is one block |
| Placeholder colours in the design-artifact build | `scripts/make-artifact.mjs` | Not part of the app; preview-only stand-ins for streamed images |

## How to change the look

- **One value everywhere:** edit its token in `tokens.css`.
- **A new theme:** copy a preset block (`:root[data-preset="…"]`), change its colours, and add the id to `PRESETS`
  and `LABELS` in `settings.ts`.
- **A new slider:** add a range to `RANGES`, a default to `DEFAULTS`, a field in `sanitize`, a token in
  `rootAttributes`, and a `slider(…)` in `SettingsPanel.tsx`.
- Then run `npm run validate:w3c` and `node scripts/layout-test.mjs` (both also run in pre-commit).

## Audit

```sh
# From app/src: colour literals and raw sizes left in component CSS
grep -nE "#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(" styles.css
grep -nE "[0-9.]+(px|em|rem|ms|s)\b" styles.css | grep -v "var("
```

Result: no colour literals. The only sizes are the `1px` hairlines and the `720px` breakpoint (see above).
