// Look-and-feel settings (ADR-0012). The Settings panel edits these; they're
// applied as data attributes and CSS custom properties on <html>, so every
// visual decision flows through the tokens in theme/tokens.css.
//
// Saved values are untrusted input (a user can edit ui.json by hand), so
// `sanitize` whitelists every enum and clamps every number. Only validated
// numbers and #rrggbb colours ever reach style.setProperty.

export const PRESETS = ["studio", "gallery", "blueprint", "paper", "millennium"] as const;
export const MODES = ["system", "light", "dark"] as const;
export const LAYOUTS = ["studio", "rail-right", "caption-top", "cinema", "minimal"] as const;
export const FONTS = ["system", "editorial", "technical", "millennium"] as const;
export const FITS = ["contain", "cover"] as const;

export type Preset = (typeof PRESETS)[number];
export type Mode = (typeof MODES)[number];
export type Layout = (typeof LAYOUTS)[number];
export type Font = (typeof FONTS)[number];
export type Fit = (typeof FITS)[number];

export interface UiSettings {
  version: 1;
  preset: Preset;
  mode: Mode;
  layout: Layout;
  font: Font;
  /** `#rrggbb` override of the theme accent, or null for the theme's own. */
  accent: string | null;
  uiScale: number;
  radius: number;
  railWidth: number;
  stagePadding: number;
  imageShadow: number;
  fit: Fit;
  /** Seconds per slide for every topic, or null to use each topic's own. */
  slideSeconds: number | null;
  showTimer: boolean;
  showSpecs: boolean;
  showCreator: boolean;
  controlsHidden: boolean;
  autoHide: boolean;
  autoHideSeconds: number;
  fullscreenImmersive: boolean;
  /** Where the mini player was last (physical px), or null (ADR-0016). */
  miniBounds: { x: number; y: number; width: number; height: number } | null;
}

/** Ranges for every slider: [min, max, step]. One table feeds clamping and the UI. */
export const RANGES = {
  uiScale: [0.85, 1.3, 0.05],
  radius: [0, 16, 1],
  railWidth: [180, 360, 4],
  stagePadding: [0, 64, 2],
  imageShadow: [0, 1, 0.05],
  slideSeconds: [2, 120, 1],
  autoHideSeconds: [1, 15, 1],
} as const satisfies Record<string, readonly [number, number, number]>;

export const DEFAULTS: UiSettings = {
  version: 1,
  preset: "studio",
  mode: "system",
  layout: "studio",
  font: "system",
  accent: null,
  uiScale: 1,
  radius: 6,
  railWidth: 248,
  stagePadding: 28,
  imageShadow: 0.6,
  fit: "contain",
  slideSeconds: null,
  showTimer: true,
  showSpecs: true,
  showCreator: true,
  controlsHidden: false,
  autoHide: false,
  autoHideSeconds: 3,
  fullscreenImmersive: true,
  miniBounds: null,
};

const HEX = /^#[0-9a-f]{6}$/i;

function oneOf<T extends string>(list: readonly T[], v: unknown, fallback: T): T {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : fallback;
}

function num(key: keyof typeof RANGES, v: unknown, fallback: number): number {
  const [min, max] = RANGES[key];
  return typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

const int = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(max, Math.max(min, v))) : null;

/** Mini player bounds: whole pixels, sane sizes, positions within ±32k. */
function bounds(v: unknown): UiSettings["miniBounds"] {
  if (!v || typeof v !== "object") return null;
  const b = v as Record<string, unknown>;
  const x = int(b.x, -32000, 32000);
  const y = int(b.y, -32000, 32000);
  const width = int(b.width, 200, 8000);
  const height = int(b.height, 120, 8000);
  return x === null || y === null || width === null || height === null ? null : { x, y, width, height };
}

/** Any value in, a valid `UiSettings` out. Unknown keys are dropped. */
export function sanitize(raw: unknown): UiSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULTS;
  return {
    version: 1,
    preset: oneOf(PRESETS, r.preset, d.preset),
    mode: oneOf(MODES, r.mode, d.mode),
    layout: oneOf(LAYOUTS, r.layout, d.layout),
    font: oneOf(FONTS, r.font, d.font),
    accent: typeof r.accent === "string" && HEX.test(r.accent) ? r.accent.toLowerCase() : null,
    uiScale: num("uiScale", r.uiScale, d.uiScale),
    radius: num("radius", r.radius, d.radius),
    railWidth: num("railWidth", r.railWidth, d.railWidth),
    stagePadding: num("stagePadding", r.stagePadding, d.stagePadding),
    imageShadow: num("imageShadow", r.imageShadow, d.imageShadow),
    fit: oneOf(FITS, r.fit, d.fit),
    slideSeconds: r.slideSeconds === null ? null : num("slideSeconds", r.slideSeconds, NaN) || null,
    showTimer: bool(r.showTimer, d.showTimer),
    showSpecs: bool(r.showSpecs, d.showSpecs),
    showCreator: bool(r.showCreator, d.showCreator),
    controlsHidden: bool(r.controlsHidden, d.controlsHidden),
    autoHide: bool(r.autoHide, d.autoHide),
    autoHideSeconds: num("autoHideSeconds", r.autoHideSeconds, d.autoHideSeconds),
    fullscreenImmersive: bool(r.fullscreenImmersive, d.fullscreenImmersive),
    miniBounds: bounds(r.miniBounds),
  };
}

/** Black or white text for a background colour, by WCAG relative luminance. */
export function inkFor(hex: string): string {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#111214" : "#ffffff";
}

/**
 * Attributes and custom properties for <html>. Pure, so the W3C and layout
 * snapshots render exactly what the app applies.
 */
export function rootAttributes(
  s: UiSettings,
  state: { fullscreen?: boolean; idle?: boolean; mini?: boolean; compactBar?: boolean } = {},
) {
  const attrs: Record<string, string> = {
    "data-preset": s.preset,
    "data-layout": s.layout,
    "data-font": s.font,
    "data-fit": s.fit,
    "data-controls": s.controlsHidden || (s.autoHide && state.idle) ? "hidden" : "shown",
    "data-immersive": state.fullscreen && s.fullscreenImmersive ? "true" : "false",
    "data-timer": String(s.showTimer),
    "data-specs": String(s.showSpecs),
    "data-creator": String(s.showCreator),
    "data-mini": state.mini ? "true" : "false",
    // Compact windows (tablets, small windows) hide the bar until a tap.
    "data-compact-bar": state.compactBar ? "shown" : "hidden",
  };
  if (s.mode !== "system") attrs["data-theme"] = s.mode;
  const style: Record<string, string> = {
    "--ui-scale": String(s.uiScale),
    "--radius-base": `${s.radius}px`,
    "--rail-width": `${s.railWidth}px`,
    "--stage-pad": `${s.stagePadding}px`,
    "--image-shadow-strength": String(s.imageShadow),
  };
  if (s.accent) {
    style["--accent"] = s.accent;
    style["--accent-ink"] = inkFor(s.accent);
  }
  return { attrs, style };
}

/** Apply settings to the live document. */
export function applyToDocument(
  s: UiSettings,
  state: { fullscreen?: boolean; idle?: boolean; mini?: boolean; compactBar?: boolean } = {},
) {
  const root = document.documentElement;
  const { attrs, style } = rootAttributes(s, state);
  // Only clear a theme we set ourselves; a host page (the design artifact)
  // may set data-theme for its own light/dark switch.
  if (!attrs["data-theme"] && root.dataset.themeOwner === "lemuse") {
    root.removeAttribute("data-theme");
    delete root.dataset.themeOwner;
  }
  if (attrs["data-theme"]) root.dataset.themeOwner = "lemuse";
  for (const [k, v] of Object.entries(attrs)) root.setAttribute(k, v);
  root.style.removeProperty("--accent");
  root.style.removeProperty("--accent-ink");
  for (const [k, v] of Object.entries(style)) root.style.setProperty(k, v);
}

export const LABELS: Record<Preset | Layout | Font | Mode | Fit, string> = {
  studio: "Studio",
  gallery: "Gallery",
  blueprint: "Blueprint",
  paper: "Paper",
  millennium: "Millennium",
  system: "System",
  light: "Light",
  dark: "Dark",
  "rail-right": "Topics on the right",
  "caption-top": "Controls on top",
  cinema: "Cinema",
  minimal: "Minimal",
  editorial: "Editorial serif",
  technical: "Technical mono",
  contain: "Whole image",
  cover: "Fill the frame",
};
