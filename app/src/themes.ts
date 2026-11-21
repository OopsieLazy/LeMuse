// Your own themes from four hex colours (ADR-0032). Pure, so it is unit-tested
// and the W3C/layout snapshots render exactly what the app applies.
//
// A theme is background, panel, text and accent; every other token is derived
// here so it stays readable: muted text and links reach 4.5:1 (WCAG 1.4.3), and
// the area behind the image is a neutral grey (a tinted surround changes how
// light a picture reads; ADR-0029). Saved themes are untrusted input (ui.json
// can be edited by hand): only `#rrggbb` values and plain names pass.

export interface CustomTheme {
  id: string;
  name: string;
  bg: string;
  panel: string;
  text: string;
  accent: string;
}

export const MAX_THEMES = 24;
export const MAX_THEME_NAME = 40;
/** WCAG 1.4.3 for normal text. */
export const READABLE = 4.5;

const HEX6 = /^#[0-9a-f]{6}$/;
const ID = /^[a-z0-9]{1,24}$/;

/** "#FFB000", "ffb000", "#fb0" → "#ffb000"; anything else → null. */
export function parseHex(input: string): string | null {
  const v = input.trim().toLowerCase().replace(/^#/, "");
  if (/^[0-9a-f]{6}$/.test(v)) return `#${v}`;
  if (/^[0-9a-f]{3}$/.test(v)) return `#${[...v].map((c) => c + c).join("")}`;
  return null;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** `a` moved toward `b` by `t` (0 = a, 1 = b), in sRGB. */
export function mix(a: string, b: string, t: number): string {
  const [x, y] = [rgb(a), rgb(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

/** A zero-chroma grey as light as `hex` (the surround behind the image). */
export function neutralFor(hex: string): string {
  const l = luminance(hex);
  const v = l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055;
  return toHex([v * 255, v * 255, v * 255]);
}

/** `color`, moved toward `toward` until it reads at 4.5:1 on every one of `on`. */
function readableOn(color: string, on: string[], toward: string): string {
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const c = mix(color, toward, t);
    if (on.every((b) => contrast(c, b) >= READABLE)) return c;
  }
  return toward;
}

/** Black or white ink on `hex`, whichever reads better. */
export function inkOn(hex: string): string {
  return contrast("#111214", hex) >= contrast("#ffffff", hex) ? "#111214" : "#ffffff";
}

/** Every token a custom theme sets (also what's cleared when switching away). */
export const THEME_TOKENS = [
  "--bg",
  "--panel",
  "--panel-fill",
  "--stage",
  "--fg",
  "--muted",
  "--line",
  "--accent",
  "--accent-ink",
  "--link",
  "--ok",
  "--error",
  "--backdrop",
  "color-scheme",
] as const;

/** The full token set for a theme. */
export function themeTokens(t: CustomTheme): Record<(typeof THEME_TOKENS)[number], string> {
  const dark = luminance(t.bg) < 0.2;
  const stage = neutralFor(t.bg);
  const surfaces = [t.bg, t.panel, stage];
  return {
    "--bg": t.bg,
    "--panel": t.panel,
    "--panel-fill": t.panel,
    "--stage": stage,
    "--fg": t.text,
    "--muted": readableOn(mix(t.text, t.bg, 0.35), surfaces, t.text),
    "--line": mix(t.panel, t.text, 0.18),
    "--accent": t.accent,
    "--accent-ink": inkOn(t.accent),
    "--link": readableOn(t.accent, [t.panel, t.bg], t.text),
    "--ok": readableOn(dark ? "#7cc79a" : "#2f7a4f", [t.panel, t.bg], t.text),
    "--error": readableOn(dark ? "#ff8f80" : "#b23b2e", [t.panel, t.bg], t.text),
    "--backdrop": dark ? "rgb(0 0 0 / 0.6)" : "rgb(10 12 16 / 0.45)",
    "color-scheme": dark ? "dark" : "light",
  };
}

/** What stops a theme being saved: body text that would be hard to read. */
export function themeProblems(t: Pick<CustomTheme, "bg" | "panel" | "text">): string[] {
  const out: string[] = [];
  const onBg = contrast(t.text, t.bg);
  const onPanel = contrast(t.text, t.panel);
  if (onBg < READABLE) out.push(`Text on the background is ${onBg.toFixed(1)}:1; it needs ${READABLE}:1 to be easy to read.`);
  if (onPanel < READABLE) out.push(`Text on the panel is ${onPanel.toFixed(1)}:1; it needs ${READABLE}:1 to be easy to read.`);
  return out;
}

/** A theme name: one line, no control characters, at most 40 characters. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim();
  if (!name || name.length > MAX_THEME_NAME || /[\u0000-\u001f\u007f]/.test(raw)) return null;
  return name;
}

/** Saved themes → only well-formed ones, unique ids, at most 24. */
export function sanitizeThemes(raw: unknown): CustomTheme[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomTheme[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (out.length >= MAX_THEMES) break;
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const name = cleanName(o.name);
    const colours = [o.bg, o.panel, o.text, o.accent].map((c) => (typeof c === "string" ? c.toLowerCase() : ""));
    if (typeof o.id !== "string" || !ID.test(o.id) || seen.has(o.id) || !name || !colours.every((c) => HEX6.test(c))) continue;
    seen.add(o.id);
    const [bg, panel, text, accent] = colours;
    out.push({ id: o.id, name, bg, panel, text, accent });
  }
  return out;
}

/** A fresh id for a new theme (letters and digits only). */
export function newThemeId(existing: CustomTheme[]): string {
  for (;;) {
    const id = `t${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`.slice(0, 24);
    if (!existing.some((t) => t.id === id)) return id;
  }
}

/** A starting point for a new theme: today's Studio light colours. */
export const NEW_THEME: Omit<CustomTheme, "id" | "name"> = {
  bg: "#f2f3f1",
  panel: "#fafaf8",
  text: "#1b1c1e",
  accent: "#3150c2",
};
