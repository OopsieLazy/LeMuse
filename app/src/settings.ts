// Look-and-feel settings (ADR-0012). The Settings panel edits these; they're
// applied as data attributes and CSS custom properties on <html>, so every
// visual decision flows through the tokens in theme/tokens.css.
//
// Saved values are untrusted input (a user can edit ui.json by hand), so
// `sanitize` whitelists every enum and clamps every number. Only validated
// numbers and #rrggbb colours ever reach style.setProperty.

import {
  DEFAULT_CUSTOM,
  EFFECTS,
  FOCI,
  GRIDS,
  NO_STUDY,
  PLAN_IDS,
  sanitizeRounds,
  TONES,
  type PlanId,
  type Round,
  type StudyAids,
} from "./practice";
import { DEFAULT_KEYS, sanitizeKeys, type KeyMap } from "./keys";
import { sanitizeThemes, THEME_TOKENS, themeTokens, type CustomTheme } from "./themes";

/** "custom" means one of your own themes (`customTheme`, ADR-0032). */
export const PRESETS = ["studio", "gallery", "blueprint", "paper", "millennium", "pine", "custom"] as const;
export const MODES = ["system", "light", "dark"] as const;
export const LAYOUTS = ["studio", "rail-right", "caption-top", "cinema", "minimal"] as const;
export const FONTS = ["system", "editorial", "technical", "millennium"] as const;
export const FITS = ["contain", "cover"] as const;
/** The grey behind the image (ADR-0029): the theme's own, or a neutral step. */
export const SURROUNDS = ["theme", "white", "light", "mid", "dark", "black"] as const;
/** How the pose clock shows during a session. */
export const CLOCKS = ["ring", "small", "hidden"] as const;

export type Preset = (typeof PRESETS)[number];
export type Mode = (typeof MODES)[number];
export type Layout = (typeof LAYOUTS)[number];
export type Font = (typeof FONTS)[number];
export type Fit = (typeof FITS)[number];
export type Surround = (typeof SURROUNDS)[number];
export type ClockStyle = (typeof CLOCKS)[number];

/** Where you were (ADR-0029): restored at the next launch. */
export interface LastPlace {
  /** sourceKey() of the view. */
  source: string;
  page: number;
  blockId: number | null;
}

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
  /** Timed sessions (ADR-0025): the last plan, your own rounds, the chime. */
  practicePlan: PlanId;
  customRounds: Round[];
  practiceSound: boolean;
  /** Content (ADR-0027): show images the nudity sensor flagged. Off by default. */
  showNudity: boolean;
  /** The practice log in the session planner (ADR-0027). */
  showPracticeLog: boolean;
  /** Look for a newer LeMuse on GitHub at launch, at most daily (ADR-0028). */
  checkUpdates: boolean;
  /** When it last looked (ms since 1970), or null. */
  lastUpdateCheck: number | null;
  /** Single-letter shortcuts (WCAG 2.1.4: can be turned off). Arrows, Space and Esc always work. */
  singleKeys: boolean;
  /** View comfort (ADR-0029). */
  surround: Surround;
  sessionClock: ClockStyle;
  /** A brief flash around the image when a pose changes (for quiet rooms). */
  poseFlash: boolean;
  /** The first-run welcome was shown. */
  welcomed: boolean;
  last: LastPlace | null;
  /** Study aids, kept between launches (the badge always says which are on). */
  study: StudyAids;
  /** Keyboard shortcuts (keys.ts); changed in the ? sheet. */
  keys: KeyMap;
  /** The folder the last Save went to (Save as starts there). */
  lastSaveDir: string | null;
  /** Your own themes from hex codes (ADR-0032), and the one in use when preset is "custom". */
  customThemes: CustomTheme[];
  customTheme: string | null;
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
  practicePlan: "gesture",
  customRounds: DEFAULT_CUSTOM,
  practiceSound: true,
  showNudity: false,
  showPracticeLog: true,
  checkUpdates: true,
  lastUpdateCheck: null,
  singleKeys: true,
  surround: "theme",
  sessionClock: "ring",
  poseFlash: true,
  welcomed: false,
  last: null,
  study: NO_STUDY,
  keys: DEFAULT_KEYS,
  lastSaveDir: null,
  customThemes: [],
  customTheme: null,
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

function lastPlace(v: unknown): LastPlace | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.source !== "string" || !o.source || o.source.length > 300) return null;
  return {
    source: o.source,
    page: int(o.page, 0, 10_000) ?? 0,
    // A block id is a positive whole number or nothing: never clamped to another image.
    blockId: Number.isSafeInteger(o.blockId) && (o.blockId as number) > 0 ? (o.blockId as number) : null,
  };
}

function studyAids(v: unknown): StudyAids {
  if (!v || typeof v !== "object") return NO_STUDY;
  const o = v as Record<string, unknown>;
  const n = NO_STUDY;
  return {
    mirror: bool(o.mirror, n.mirror),
    upside: bool(o.upside, n.upside),
    grey: bool(o.grey, n.grey),
    tones: (TONES as readonly unknown[]).includes(o.tones) ? (o.tones as StudyAids["tones"]) : n.tones,
    focus: oneOf(FOCI, o.focus, n.focus),
    balance: typeof o.balance === "number" && Number.isFinite(o.balance) ? Math.max(-1, Math.min(1, o.balance)) : n.balance,
    squint: bool(o.squint, n.squint),
    grid: oneOf(GRIDS, o.grid, n.grid),
    effect: oneOf(EFFECTS, o.effect, n.effect),
  };
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
    practicePlan: oneOf(PLAN_IDS, r.practicePlan, d.practicePlan),
    customRounds: r.customRounds === undefined ? d.customRounds : sanitizeRounds(r.customRounds),
    practiceSound: bool(r.practiceSound, d.practiceSound),
    showNudity: bool(r.showNudity, d.showNudity),
    showPracticeLog: bool(r.showPracticeLog, d.showPracticeLog),
    checkUpdates: bool(r.checkUpdates, d.checkUpdates),
    lastUpdateCheck:
      typeof r.lastUpdateCheck === "number" && Number.isFinite(r.lastUpdateCheck) && r.lastUpdateCheck > 0
        ? Math.round(r.lastUpdateCheck)
        : null,
    singleKeys: bool(r.singleKeys, d.singleKeys),
    surround: oneOf(SURROUNDS, r.surround, d.surround),
    sessionClock: oneOf(CLOCKS, r.sessionClock, d.sessionClock),
    poseFlash: bool(r.poseFlash, d.poseFlash),
    // Settings saved before the welcome existed belong to someone who knows the app.
    welcomed: bool(r.welcomed, Object.keys(r).length > 0),
    last: lastPlace(r.last),
    study: studyAids(r.study),
    keys: sanitizeKeys(r.keys),
    customThemes: sanitizeThemes(r.customThemes),
    customTheme: typeof r.customTheme === "string" && /^[a-z0-9]{1,24}$/.test(r.customTheme) ? r.customTheme : null,
    // A folder path is shown and offered to the Save dialog, never opened here.
    lastSaveDir:
      typeof r.lastSaveDir === "string" && r.lastSaveDir.length > 0 && r.lastSaveDir.length <= 1024 && !/[\u0000-\u001f]/.test(r.lastSaveDir)
        ? r.lastSaveDir
        : null,
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
  const theme = s.preset === "custom" ? s.customThemes.find((t) => t.id === s.customTheme) : undefined;
  const attrs: Record<string, string> = {
    // A custom theme that no longer exists falls back to Studio.
    "data-preset": theme ? "custom" : s.preset === "custom" ? "studio" : s.preset,
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
    "data-surround": s.surround,
    "data-session-clock": s.sessionClock,
  };
  if (s.mode !== "system") attrs["data-theme"] = s.mode;
  const style: Record<string, string> = {
    "--ui-scale": String(s.uiScale),
    "--radius-base": `${s.radius}px`,
    "--rail-width": `${s.railWidth}px`,
    "--stage-pad": `${s.stagePadding}px`,
    "--image-shadow-strength": String(s.imageShadow),
  };
  // Your theme's colours, all derived from four validated hex values.
  if (theme) Object.assign(style, themeTokens(theme));
  if (s.accent) {
    style["--accent"] = s.accent;
    style["--accent-ink"] = inkFor(s.accent);
    // On your own theme, links follow the override, made readable; built-in
    // themes keep their own tested link colour (ADR-0032).
    if (theme) style["--link"] = themeTokens({ ...theme, accent: s.accent })["--link"];
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
  // Clear what a previous theme or accent set (every token a theme can set).
  for (const k of THEME_TOKENS) root.style.removeProperty(k);
  for (const [k, v] of Object.entries(style)) root.style.setProperty(k, v);
}

export const LABELS: Record<Preset | Layout | Font | Mode | Fit, string> = {
  studio: "Studio",
  gallery: "Gallery",
  blueprint: "Blueprint",
  paper: "Paper",
  millennium: "Millennium",
  pine: "Pine & coral",
  custom: "Your theme",
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

export const SURROUND_LABELS: Record<Surround, string> = {
  theme: "Theme",
  white: "White",
  light: "Light grey",
  mid: "Mid grey",
  dark: "Dark grey",
  black: "Black",
};

export const CLOCK_LABELS: Record<ClockStyle, string> = {
  ring: "Large ring",
  small: "Small",
  hidden: "Hidden",
};
