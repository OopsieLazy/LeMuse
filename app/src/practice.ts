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

/** 0 = off; otherwise the number of value tones (2 = notan). */
export const TONES = [0, 2, 3, 4, 5] as const;
export type Tones = (typeof TONES)[number];

export interface StudyAids {
  mirror: boolean;
  /** Upside down: draw shapes, not symbols (a classic exercise). */
  upside: boolean;
  grey: boolean;
  tones: Tones;
  /** −1 (more dark) … +1 (more light); moves the value thresholds. */
  balance: number;
  squint: boolean;
  grid: Grid;
}

export const NO_STUDY: StudyAids = { mirror: false, upside: false, grey: false, tones: 0, balance: 0, squint: false, grid: "off" };

export const GRID_LABELS: Record<Grid, string> = {
  off: "Off",
  thirds: "Thirds",
  quarters: "4 × 4",
  squares: "Squares",
  diagonals: "Diagonals",
};

export function studyActive(s: StudyAids): number {
  return [s.mirror, s.upside, s.grey, s.tones > 0, s.squint, s.grid !== "off"].filter(Boolean).length;
}

export function nextOf<T>(list: readonly T[], v: T): T {
  return list[(list.indexOf(v) + 1) % list.length];
}

/** Id of the SVG value filter in the page (SlideshowView renders it). */
export const VALUES_FILTER_ID = "lemuse-values";

/** The CSS `filter` for the image. Squint blurs first, so the value view shows big masses. */
export function studyFilter(s: StudyAids): string | undefined {
  const parts: string[] = [];
  if (s.squint) parts.push("blur(var(--squint-blur))");
  if (s.tones > 0) parts.push(`url(#${VALUES_FILTER_ID})`);
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

/** Evenly spaced output tones for N values, e.g. 3 → "0 0.5 1". */
export function toneTable(tones: number): string {
  const n = Math.max(2, Math.min(5, Math.round(tones)));
  return Array.from({ length: n }, (_, i) => String(Math.round((i / (n - 1)) * 1000) / 1000)).join(" ");
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
  if (!at) return { result: { planName: s.plan.name, from: s.from, drawn, seconds, skipped, finished: true } };
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
  return { planName: s.plan.name, from: s.from, drawn, seconds, skipped: s.skipped, finished: false };
}

/** ← in a session: the previous image, and the pose starts over. */
export const restartPose = (s: Running, many: boolean, now: number): Running => ({
  ...s,
  left: poseMs(s),
  waiting: many,
  since: now,
});

/** Name for "Keep as a playlist": "Session 19 Nov, 14:05". */
export function sessionPlaylistName(at: Date): string {
  const day = at.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const time = at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `Session ${day}, ${time}`;
}

/** The ♥ playlist; made on the first ♥ (ADR-0025). */
export const FAVOURITES = "Favourites";
