// Practice tools (ADR-0025): study aids drawn over the image on screen, and
// timed sessions. Pure data and functions, so the view, the app and the
// snapshots share one definition.
//
// Study aids never read or save pixels: mirror is a CSS transform, greyscale
// and squint are CSS filters, the value view is an SVG filter, the grid is an
// SVG overlay. Images stay cross-origin and nothing is written to disk.

// ---- Study aids ----

export const GRIDS = ["off", "thirds", "quarters", "squares", "diagonals"] as const;
export type Grid = (typeof GRIDS)[number];

/** 0 = off; otherwise the number of value tones (2 = notan, 9 = a Munsell-like scale). */
export const TONES = [0, 2, 3, 4, 5, 7, 9] as const;
export type Tones = (typeof TONES)[number];

/**
 * Which values to show (ADR-0026): all of them, or isolate the extremes. With
 * 9 tones, "darks" is the darkest ninth: where the absolute darks are.
 */
export const FOCI = ["all", "darks", "lights", "extremes"] as const;
export type Focus = (typeof FOCI)[number];

export const FOCUS_LABELS: Record<Focus, string> = {
  all: "All values",
  darks: "Darks only",
  lights: "Lights only",
  extremes: "Darks + lights",
};

/**
 * Drawing effects (ADR-0026): the picture redrawn as marks, so you can study
 * how to draw an effect (grass, hair, water) rather than every blade. Marks
 * follow the values: darker areas get more of them.
 */
export const EFFECTS = ["off", "lines", "vertical", "horizontal", "cross"] as const;
export type Effect = (typeof EFFECTS)[number];

export const EFFECT_LABELS: Record<Effect, string> = {
  off: "Off",
  lines: "Lines",
  vertical: "Strokes ↕",
  horizontal: "Strokes ↔",
  cross: "Cross-hatch",
};

export interface StudyAids {
  mirror: boolean;
  /** Upside down: draw shapes, not symbols (a classic exercise). */
  upside: boolean;
  grey: boolean;
  tones: Tones;
  /** Which values the value view shows. */
  focus: Focus;
  /** −1 (more dark) … +1 (more light); moves the value thresholds. */
  balance: number;
  squint: boolean;
  grid: Grid;
  effect: Effect;
}

export const NO_STUDY: StudyAids = {
  mirror: false,
  upside: false,
  grey: false,
  tones: 0,
  focus: "all",
  balance: 0,
  squint: false,
  grid: "off",
  effect: "off",
};

export const GRID_LABELS: Record<Grid, string> = {
  off: "Off",
  thirds: "Thirds",
  quarters: "4 × 4",
  squares: "Squares",
  diagonals: "Diagonals",
};

export function studyActive(s: StudyAids): number {
  return [s.mirror, s.upside, s.grey, s.tones > 0, s.squint, s.grid !== "off", s.effect !== "off"].filter(Boolean)
    .length;
}

export function nextOf<T>(list: readonly T[], v: T): T {
  return list[(list.indexOf(v) + 1) % list.length];
}

/** Id of the SVG study filter in the page (SlideshowView renders it). */
export const VALUES_FILTER_ID = "lemuse-values";

/**
 * The filter works on exactly the image's box: the default region is 10%
 * larger on every side, and stroke noise would paint outside the picture.
 */
export const FILTER_REGION = { x: "0%", y: "0%", width: "100%", height: "100%" } as const;

/** The value view or a drawing effect needs the SVG filter. */
export const usesStudyFilter = (s: StudyAids) => s.tones > 0 || s.effect !== "off";

/** The CSS `filter` for the image. Squint blurs first, so values and marks show big masses. */
export function studyFilter(s: StudyAids): string | undefined {
  const parts: string[] = [];
  if (s.squint) parts.push("blur(var(--squint-blur))");
  if (usesStudyFilter(s)) parts.push(`url(#${VALUES_FILTER_ID})`);
  else if (s.grey) parts.push("grayscale(1)");
  return parts.length ? parts.join(" ") : undefined;
}

/**
 * The value view's gamma exponent: balance 0 keeps mid-grey at the middle
 * threshold; + lightens (more light shapes), − darkens.
 */
export function balanceExponent(balance: number): number {
  const b = Math.max(-1, Math.min(1, balance));
  return Math.round(2 ** (-b * 1.5) * 1000) / 1000;
}

const r3 = (v: number) => String(Math.round(v * 1000) / 1000);

/** Evenly spaced output tones for N values, e.g. 3 → "0 0.5 1". */
export function toneTable(tones: number): string {
  const n = Math.max(2, Math.min(9, Math.round(tones)));
  return Array.from({ length: n }, (_, i) => r3(i / (n - 1))).join(" ");
}

/**
 * The tones as shown: all, or only the darkest band (black on white), only
 * the lightest (white on black), or both extremes on a mid grey.
 */
export function focusTable(tones: number, focus: Focus): string {
  const n = Math.max(2, Math.min(9, Math.round(tones)));
  if (focus === "all" || n === 2) return toneTable(n);
  return Array.from({ length: n }, (_, i) => {
    if (focus === "darks") return i === 0 ? "0" : "1";
    if (focus === "lights") return i === n - 1 ? "1" : "0";
    return i === 0 ? "0" : i === n - 1 ? "1" : "0.5";
  }).join(" ");
}

/** The swatches of the value strip (0 = black … 1 = white), dark to light. */
export function valueStrip(tones: number, focus: Focus): number[] {
  return focusTable(tones, focus).split(" ").map(Number);
}

/** One SVG filter primitive; SlideshowView renders these as elements. */
export interface FilterNode {
  tag:
    | "feColorMatrix"
    | "feComponentTransfer"
    | "feFuncR"
    | "feFuncG"
    | "feFuncB"
    | "feGaussianBlur"
    | "feConvolveMatrix"
    | "feTurbulence"
    | "feComposite"
    | "feBlend";
  attrs: Record<string, string | number>;
  children?: FilterNode[];
}

const LUMA = "0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0";
/** Grey noise with full alpha (turbulence's own alpha would punch holes). */
const NOISE_GREY = "0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1";

const rgb = (attrs: Record<string, string | number>, input: string, result?: string): FilterNode => ({
  tag: "feComponentTransfer",
  attrs: { in: input, ...(result ? { result } : {}) },
  children: (["feFuncR", "feFuncG", "feFuncB"] as const).map((tag) => ({ tag, attrs })),
});

/**
 * Stroke marks over a value image (`input`): noise stretched along one axis
 * (vertical: grass, hair, rain; horizontal: water, wood grain), inked where
 * the image is darker than the noise.
 */
function strokes(dir: "vertical" | "horizontal", input: string, result: string): FilterNode[] {
  // Fine across the stroke, long along it.
  const freq = dir === "vertical" ? "0.45 0.012" : "0.012 0.45";
  return [
    {
      tag: "feTurbulence",
      attrs: { type: "fractalNoise", baseFrequency: freq, numOctaves: 2, seed: dir === "vertical" ? 7 : 11, result: `${result}-noise` },
    },
    { tag: "feColorMatrix", attrs: { in: `${result}-noise`, type: "matrix", values: NOISE_GREY, result: `${result}-grey` } },
    // Fractal noise sits near 0.5; stretch it to cover 0–1 and invert it in
    // one step (2 − 3n), so mark density can follow every value.
    rgb({ type: "linear", slope: -3, intercept: 2 }, `${result}-grey`, `${result}-inv`),
    // value + (1 − n) − 0.4 = value − n + 0.6: below 0.5 means "ink here"
    // (the 0.1 bias keeps the lights clean, as an artist would). Adding, not
    // subtracting, keeps alpha at 1 (1 + 1 − 0.4, clamped), so the page never
    // shows through the marks.
    {
      tag: "feComposite",
      attrs: { in: input, in2: `${result}-inv`, operator: "arithmetic", k1: 0, k2: 1, k3: 1, k4: -0.4, result: `${result}-diff` },
    },
    // A steep ramp turns that into crisp marks with soft edges.
    rgb({ type: "linear", slope: 6, intercept: -2.5 }, `${result}-diff`, result),
  ];
}

/**
 * The whole study filter as a graph: luma in sRGB → balance → values (with
 * focus) → a drawing effect on top. Pure, so it's unit-tested and the view
 * just renders it. Nothing here reads pixels in script.
 */
export function filterGraph(s: StudyAids): FilterNode[] {
  const g: FilterNode[] = [
    { tag: "feColorMatrix", attrs: { in: "SourceGraphic", type: "matrix", values: LUMA, result: "luma" } },
    rgb({ type: "gamma", amplitude: 1, exponent: balanceExponent(s.balance), offset: 0 }, "luma", "balanced"),
  ];
  let value = "balanced";
  if (s.tones > 0) {
    g.push(rgb({ type: "discrete", tableValues: focusTable(s.tones, s.focus) }, "balanced", "toned"));
    value = "toned";
  }
  if (s.effect === "lines") {
    // Contours: a light blur against noise, an edge kernel, then dark lines on white.
    g.push(
      { tag: "feGaussianBlur", attrs: { in: "luma", stdDeviation: 1, result: "soft" } },
      {
        tag: "feConvolveMatrix",
        attrs: { in: "soft", order: 3, kernelMatrix: "-1 -1 -1 -1 8 -1 -1 -1 -1", preserveAlpha: "true", result: "edges" },
      },
      // Steep, with a cutoff: faint edges (gradient banding, noise) stay white.
      rgb({ type: "linear", slope: -8, intercept: 1.3 }, "edges", "ink"),
    );
    // Over the values when they're on, so lines and masses read together.
    if (s.tones > 0) g.push({ tag: "feBlend", attrs: { in: "ink", in2: value, mode: "multiply" } });
  } else if (s.effect === "vertical" || s.effect === "horizontal") {
    g.push(...strokes(s.effect, value, "marks"));
  } else if (s.effect === "cross") {
    g.push(...strokes("vertical", value, "marks-v"), ...strokes("horizontal", value, "marks-h"));
    g.push({ tag: "feBlend", attrs: { in: "marks-v", in2: "marks-h", mode: "multiply" } });
  }
  return g;
}

/** Grid lines in a viewBox of the image's own size (w × h). */
export function gridLines(grid: Grid, w: number, h: number): [number, number, number, number][] {
  const lines: [number, number, number, number][] = [];
  const split = (n: number) => {
    for (let i = 1; i < n; i++) {
      lines.push([(w * i) / n, 0, (w * i) / n, h]);
      lines.push([0, (h * i) / n, w, (h * i) / n]);
    }
  };
  if (grid === "thirds") split(3);
  else if (grid === "quarters") split(4);
  else if (grid === "squares") {
    // Square cells: six across the short side, centred.
    const cell = Math.min(w, h) / 6;
    const x0 = ((w % cell) + cell) % cell / 2;
    const y0 = ((h % cell) + cell) % cell / 2;
    for (let x = x0 || cell; x < w - 0.5; x += cell) lines.push([x, 0, x, h]);
    for (let y = y0 || cell; y < h - 0.5; y += cell) lines.push([0, y, w, y]);
  } else if (grid === "diagonals") {
    lines.push([0, 0, w, h], [w, 0, 0, h], [w / 2, 0, w / 2, h], [0, h / 2, w, h / 2]);
  }
  return lines.map((l) => l.map((v) => Math.round(v * 10) / 10) as [number, number, number, number]);
}

// ---- Timed sessions ----

export interface Round {
  /** Poses in this round. */
  count: number;
  /** Seconds per pose. */
  seconds: number;
}

export interface SessionPlan {
  id: string;
  name: string;
  rounds: Round[];
}

/**
 * Built-in plans, after the common class structure (research: practice tools):
 * fast gestures first, then longer poses. "Relaxed" is for beginners who find
 * 30 s too fast.
 */
export const SESSION_PLANS: SessionPlan[] = [
  { id: "gesture", name: "Gesture warm-up", rounds: [{ count: 10, seconds: 30 }] },
  { id: "relaxed", name: "Relaxed gestures", rounds: [{ count: 10, seconds: 60 }] },
  {
    id: "class",
    name: "Class",
    rounds: [
      { count: 10, seconds: 30 },
      { count: 5, seconds: 60 },
      { count: 2, seconds: 300 },
      { count: 1, seconds: 600 },
    ],
  },
  {
    id: "class-hour",
    name: "Long class",
    rounds: [
      { count: 10, seconds: 30 },
      { count: 5, seconds: 60 },
      { count: 5, seconds: 120 },
      { count: 2, seconds: 300 },
      { count: 3, seconds: 600 },
    ],
  },
  { id: "sketches", name: "Quick sketches", rounds: [{ count: 10, seconds: 120 }] },
  { id: "study", name: "Long study", rounds: [{ count: 1, seconds: 1200 }] },
];

export const PLAN_IDS = ["gesture", "relaxed", "class", "class-hour", "sketches", "study", "custom"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** Pose lengths offered when building a plan. */
export const POSE_SECONDS = [15, 30, 45, 60, 90, 120, 180, 300, 600, 900, 1200, 1800, 3600] as const;

export const MAX_ROUNDS = 6;
export const MAX_POSES = 100;

export const DEFAULT_CUSTOM: Round[] = [
  { count: 5, seconds: 60 },
  { count: 2, seconds: 300 },
];

/** Saved rounds are untrusted (ui.json): keep 1–6 rounds of 1–100 poses of a listed length. */
export function sanitizeRounds(raw: unknown): Round[] {
  if (!Array.isArray(raw)) return DEFAULT_CUSTOM;
  const out = raw
    .slice(0, MAX_ROUNDS)
    .map((r) => (r && typeof r === "object" ? (r as Record<string, unknown>) : {}))
    .filter((r) => typeof r.count === "number" && typeof r.seconds === "number")
    .map((r) => ({
      count: Math.round(Math.min(MAX_POSES, Math.max(1, r.count as number))),
      seconds: (POSE_SECONDS as readonly number[]).includes(r.seconds as number) ? (r.seconds as number) : 60,
    }))
    .filter((r) => Number.isFinite(r.count));
  return out.length ? out : DEFAULT_CUSTOM;
}

export function planFor(id: string, custom: Round[]): SessionPlan {
  return SESSION_PLANS.find((p) => p.id === id) ?? { id: "custom", name: "Your plan", rounds: custom };
}

export const poseCount = (p: SessionPlan) => p.rounds.reduce((n, r) => n + r.count, 0);
export const planSeconds = (p: SessionPlan) => p.rounds.reduce((n, r) => n + r.count * r.seconds, 0);

/** 30 → "30 s", 90 → "1 min 30 s", 600 → "10 min", 3600 → "1 h". */
export function duration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  if (s >= 3600 && s % 3600 === 0) return `${s / 3600} h`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

/** "10 × 30 s, 5 × 1 min" */
export function planText(p: SessionPlan): string {
  return p.rounds.map((r) => `${r.count} × ${duration(r.seconds)}`).join(", ");
}

/** The pose clock: 0:24, 9:59, 1:00:00. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Where a running session is. */
export interface SessionProgress {
  round: number;
  /** Pose within the round (0-based). */
  pose: number;
}

/** The pose after this one, or null when the plan is finished. */
export function nextPose(plan: SessionPlan, at: SessionProgress): SessionProgress | null {
  const r = plan.rounds[at.round];
  if (r && at.pose + 1 < r.count) return { round: at.round, pose: at.pose + 1 };
  return at.round + 1 < plan.rounds.length ? { round: at.round + 1, pose: 0 } : null;
}

/** Poses finished before this one (for "pose 7 of 18"). */
export function posesBefore(plan: SessionPlan, at: SessionProgress): number {
  return plan.rounds.slice(0, at.round).reduce((n, r) => n + r.count, 0) + at.pose;
}

/** What the view shows while a session runs. */
export interface SessionView {
  planName: string;
  /** 1-based pose over the whole plan. */
  pose: number;
  poses: number;
  round: number;
  rounds: number;
  /** Seconds left in this pose. */
  left: number;
  paused: boolean;
}

/** One image drawn in a session (enough to show it again and keep it). */
export interface Drawn {
  block_id: number;
  title: string | null;
  display_url: string;
  creator: string | null;
  seconds: number;
}

export interface SessionResult {
  /** When the session started (ms since 1970), for the practice log. */
  startedAt: number;
  planName: string;
  from: string;
  drawn: Drawn[];
  /** Seconds spent drawing (completed and half-done poses). */
  seconds: number;
  skipped: number;
  /** The plan ran to the end (not stopped early). */
  finished: boolean;
}

// ---- The session clock as pure steps (App.tsx adds the side effects:
// moving the slideshow, sounds, dialogs). Unit-tested in scripts/unit-test.ts.

/** A running session. Time counts only while not paused and the image is shown. */
export interface Running {
  plan: SessionPlan;
  /** When the session started (ms since 1970). */
  startedAt: number;
  from: string;
  at: SessionProgress;
  /** Milliseconds left in this pose. */
  left: number;
  paused: boolean;
  /** Waiting for this pose's image to load; `since` (ms) caps the wait. */
  waiting: boolean;
  since: number;
  drawn: Drawn[];
  skipped: number;
  seconds: number;
}

/** A pose starts anyway if its image takes longer than this to load. */
export const POSE_LOAD_WAIT_MS = 8_000;

/** What a drawn image keeps (enough to show it again and ♥ or keep it). */
export type DrawnSource = Pick<Drawn, "block_id" | "title" | "display_url" | "creator">;

export const poseMs = (s: Running) => (s.plan.rounds[s.at.round]?.seconds ?? 30) * 1000;

const drawnOf = (d: DrawnSource, secs: number): Drawn => ({
  block_id: d.block_id,
  title: d.title,
  display_url: d.display_url,
  creator: d.creator,
  seconds: Math.round(secs),
});

/**
 * The first pose. With more than one image the slideshow moves on and the
 * clock waits for that image; with one image it starts at once.
 */
export function startSession(plan: SessionPlan, from: string, many: boolean, now: number): Running {
  return {
    plan,
    startedAt: now,
    from,
    at: { round: 0, pose: 0 },
    left: (plan.rounds[0]?.seconds ?? 30) * 1000,
    paused: false,
    waiting: many,
    since: now,
    drawn: [],
    skipped: 0,
    seconds: 0,
  };
}

/** One clock step of `dt` ms: `done` when the pose ran out, `beep` in its last 3 s. */
export function tickSession(s: Running, dt: number, now: number): { s: Running; done: boolean; beep: boolean } {
  if (s.paused) return { s, done: false, beep: false };
  if (s.waiting) {
    return { s: now - s.since > POSE_LOAD_WAIT_MS ? { ...s, waiting: false } : s, done: false, beep: false };
  }
  const left = s.left - dt;
  if (left <= 0) return { s: { ...s, left: 0 }, done: true, beep: false };
  const before = Math.ceil(s.left / 1000);
  const after = Math.ceil(left / 1000);
  const beep = after !== before && after >= 1 && after <= 3 && poseMs(s) > 5000;
  return { s: { ...s, left }, done: false, beep };
}

/**
 * Finish the pose (time ran out, or → skipped it). A skipped pose counts as
 * drawn when at least half its time was used. Returns the next pose, or the
 * result when the plan is done.
 */
export function finishPose(
  s: Running,
  shown: DrawnSource | undefined,
  kind: "done" | "skip",
  many: boolean,
  now: number,
): { next: Running } | { result: SessionResult } {
  const full = poseMs(s) / 1000;
  const elapsed = full - s.left / 1000;
  let { drawn, seconds, skipped } = s;
  if (shown && !s.waiting && (kind === "done" || elapsed * 2 >= full)) {
    const secs = kind === "done" ? full : elapsed;
    drawn = [...drawn, drawnOf(shown, secs)];
    seconds += secs;
  } else if (kind === "skip") skipped += 1;
  const at = nextPose(s.plan, s.at);
  if (!at)
    return {
      result: { startedAt: s.startedAt, planName: s.plan.name, from: s.from, drawn, seconds, skipped, finished: true },
    };
  return {
    next: { ...s, drawn, seconds, skipped, at, left: s.plan.rounds[at.round].seconds * 1000, waiting: many, since: now },
  };
}

/** Stop early (Esc, the End button). A pose at least half done still counts. */
export function stopSession(s: Running, shown: DrawnSource | undefined): SessionResult {
  const elapsed = (poseMs(s) - s.left) / 1000;
  let { drawn, seconds } = s;
  if (shown && !s.waiting && elapsed * 2000 >= poseMs(s)) {
    drawn = [...drawn, drawnOf(shown, elapsed)];
    seconds += elapsed;
  }
  return {
    startedAt: s.startedAt,
    planName: s.plan.name,
    from: s.from,
    drawn,
    seconds,
    skipped: s.skipped,
    finished: false,
  };
}

/** ← in a session: the previous image, and the pose starts over. */
export const restartPose = (s: Running, many: boolean, now: number): Running => ({
  ...s,
  left: poseMs(s),
  waiting: many,
  since: now,
});

// ---- The practice log (ADR-0027): weeks, never streaks ----

/** One week of the log (weeks start on Monday, local time). */
export interface LogWeek {
  /** Monday 00:00 local, as ms since 1970. */
  start: number;
  sessions: number;
  drawings: number;
  seconds: number;
}

/** Monday 00:00 (local) of the week holding `t` (ms). */
export function weekStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const back = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - back);
  return d.getTime();
}

/**
 * The last `weeks` weeks, oldest first, including empty ones (an empty week
 * is just a short bar: nothing is "broken"). `sessions` carry Unix seconds.
 */
export function weeklyLog(
  sessions: { started_at: number; drawings: number; seconds: number }[],
  now: number,
  weeks = 8,
): LogWeek[] {
  const out: LogWeek[] = [];
  let start = weekStart(now);
  for (let i = 0; i < weeks; i++) {
    out.unshift({ start, sessions: 0, drawings: 0, seconds: 0 });
    const prev = new Date(start);
    prev.setDate(prev.getDate() - 7);
    start = weekStart(prev.getTime());
  }
  for (const s of sessions) {
    const w = weekStart(s.started_at * 1000);
    const slot = out.find((x) => x.start === w);
    if (slot) {
      slot.sessions += 1;
      slot.drawings += s.drawings;
      slot.seconds += s.seconds;
    }
  }
  return out;
}

/** Unix seconds of the first week the log shows (for the catalog query). */
export const logSince = (now: number, weeks = 8) => Math.floor(weeklyLog([], now, weeks)[0].start / 1000);

/** Name for "Keep as a playlist": "Session 19 Nov, 14:05". */
export function sessionPlaylistName(at: Date): string {
  const day = at.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const time = at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `Session ${day}, ${time}`;
}

/** The ♥ playlist; made on the first ♥ (ADR-0025). */
export const FAVOURITES = "Favourites";
