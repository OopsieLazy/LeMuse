// Unit tests for the UI's pure logic (practice tools, redaction). Built by
// `vite build --ssr` and run with node's built-in test runner:
//   npm run test:unit
// No network, no files outside .snapshot/ (git-ignored).
import assert from "node:assert/strict";
import { test } from "node:test";
import { labelLine, parseSourceKey, redact, reportUrl, sharpSlide, sourceKey, withContentDefaults, type Slide } from "../src/api";
import { altText } from "../src/SlideshowView";
import { welcomeTopics } from "../src/WelcomePanel";
import {
  balanceExponent,
  clock,
  duration,
  gridLines,
  nextOf,
  nextPose,
  NO_STUDY,
  planFor,
  planSeconds,
  poseCount,
  posesBefore,
  finishPose,
  restartPose,
  startSession,
  stopSession,
  tickSession,
  weeklyLog,
  weekStart,
  logSince,
  sanitizeRounds,
  SESSION_PLANS,
  studyActive,
  studyFilter,
  toneTable,
  focusTable,
  valueStrip,
  filterGraph,
  TONES,
} from "../src/practice";
import { DEFAULTS, sanitize } from "../src/settings";

test("redact hides the Windows user folder and token-shaped text", () => {
  const out = redact(
    "failed at C:\\Users\\someone\\Pictures\\LeMuse\\lemuse.toml; Bearer abc123; token=xyz; " +
      "id 0123456789abcdef0123456789abcdef01",
  );
  assert.ok(!out.includes("someone"), out);
  assert.ok(out.includes("%USERPROFILE%\\Pictures\\LeMuse"), out);
  assert.ok(!out.includes("abc123") && !out.includes("xyz"), out);
  assert.ok(!out.includes("0123456789abcdef0123456789abcdef01"), out);
  // User names can hold spaces.
  assert.equal(redact("C:\\Users\\Ann Lee\\Pictures"), "%USERPROFILE%\\Pictures");
  assert.equal(redact("/home/name/lib"), "~/lib");
  assert.equal(redact("plain message"), "plain message");
});

test("reportUrl carries only a safe version", () => {
  assert.equal(reportUrl("0.9.0"), "https://github.com/OopsieLazy/LeMuse/issues/new?template=bug.yml&version=0.9.0");
  assert.equal(reportUrl("x&evil=1"), "https://github.com/OopsieLazy/LeMuse/issues/new?template=bug.yml");
  assert.equal(reportUrl(), "https://github.com/OopsieLazy/LeMuse/issues/new?template=bug.yml");
});

test("study aids: filters, tones, balance, cycling", () => {
  assert.equal(studyFilter(NO_STUDY), undefined);
  assert.equal(studyFilter({ ...NO_STUDY, grey: true }), "grayscale(1)");
  // Values include greyscale; squint blurs first.
  assert.equal(studyFilter({ ...NO_STUDY, grey: true, tones: 3, squint: true }), "blur(var(--squint-blur)) url(#lemuse-values)");
  assert.equal(toneTable(2), "0 1");
  assert.equal(toneTable(5), "0 0.25 0.5 0.75 1");
  assert.equal(balanceExponent(0), 1);
  assert.ok(balanceExponent(1) < 1 && balanceExponent(-1) > 1);
  assert.equal(nextOf(TONES, 5), 7);
  assert.equal(nextOf(TONES, 9), 0);
  assert.equal(studyActive({ ...NO_STUDY, mirror: true, grid: "thirds" }), 2);
});

test("grids: thirds, quarters, squares stay square, diagonals", () => {
  assert.equal(gridLines("off", 300, 200).length, 0);
  assert.equal(gridLines("thirds", 300, 300).length, 4);
  assert.equal(gridLines("quarters", 400, 400).length, 6);
  const sq = gridLines("squares", 1200, 600);
  const xs = sq.filter(([x1, , x2]) => x1 === x2).map(([x]) => x);
  const ys = sq.filter(([, y1, , y2]) => y1 === y2).map(([, y]) => y);
  assert.equal(xs[1] - xs[0], 100);
  assert.equal(ys[1] - ys[0], 100);
  assert.equal(gridLines("diagonals", 10, 10).length, 4);
});

test("session plans: counts, lengths, order", () => {
  const cls = planFor("class", []);
  assert.equal(poseCount(cls), 18);
  assert.equal(planSeconds(cls), 10 * 30 + 5 * 60 + 2 * 300 + 600);
  assert.deepEqual(nextPose(cls, { round: 0, pose: 9 }), { round: 1, pose: 0 });
  assert.equal(nextPose(cls, { round: 3, pose: 0 }), null);
  assert.equal(posesBefore(cls, { round: 1, pose: 2 }), 12);
  assert.equal(planFor("custom", [{ count: 2, seconds: 60 }]).name, "Your plan");
  assert.ok(SESSION_PLANS.every((p) => p.rounds.length > 0));
  assert.equal(planSeconds(planFor("class-hour", [])), 3600);
});

test("saved rounds and settings are sanitized", () => {
  assert.deepEqual(sanitizeRounds([{ count: 500, seconds: 61 }, { nope: 1 }, { count: 0, seconds: 30 }]), [
    { count: 100, seconds: 60 },
    { count: 1, seconds: 30 },
  ]);
  assert.equal(sanitizeRounds("x").length > 0, true);
  assert.equal(sanitizeRounds(new Array(20).fill({ count: 1, seconds: 30 })).length, 6);
  const s = sanitize({ practicePlan: "hack", practiceSound: "yes", customRounds: [{ count: 3, seconds: 120 }] });
  assert.equal(s.practicePlan, DEFAULTS.practicePlan);
  assert.equal(s.practiceSound, true);
  assert.deepEqual(s.customRounds, [{ count: 3, seconds: 120 }]);
});

test("clock and duration text", () => {
  assert.equal(clock(24.2), "0:25");
  assert.equal(clock(600), "10:00");
  assert.equal(clock(3600), "1:00:00");
  assert.equal(duration(30), "30 s");
  assert.equal(duration(90), "1 min 30 s");
  assert.equal(duration(1800), "30 min");
  assert.equal(duration(3600), "1 h");
});

test("a session runs: waits for the image, counts down, beeps, moves on, finishes", () => {
  const plan = { id: "t", name: "Test", rounds: [{ count: 2, seconds: 10 }] };
  const img = { block_id: 1, title: "A", display_url: "https://example.org/a.jpg", creator: null };
  let s = startSession(plan, "Chairs", true, 0);
  assert.equal(s.waiting, true);
  // Waiting: the clock doesn't run until the image loads (or 8 s pass).
  assert.equal(tickSession(s, 1000, 1000).s.left, 10_000);
  assert.equal(tickSession(s, 1000, 9000).s.waiting, false);
  s = { ...s, waiting: false };
  // Paused: nothing moves.
  assert.equal(tickSession({ ...s, paused: true }, 5000, 0).s.left, 10_000);
  // Beeps at 3, 2, 1 seconds left.
  const beeps = [7000, 8000, 9000].map((t) => tickSession({ ...s, left: 10_000 - t + 1 }, 2, 0).beep);
  assert.deepEqual(beeps, [true, true, true]);
  assert.equal(tickSession(s, 3000, 0).beep, false);
  const out = tickSession({ ...s, left: 100 }, 200, 0);
  assert.equal(out.done, true);
  // Pose 1 done → pose 2, waiting for its image.
  const step = finishPose(out.s, img, "done", true, 0);
  assert.ok("next" in step);
  if (!("next" in step)) return;
  assert.deepEqual(step.next.at, { round: 0, pose: 1 });
  assert.equal(step.next.drawn.length, 1);
  assert.equal(step.next.seconds, 10);
  // Pose 2 done → the plan is finished.
  const end = finishPose({ ...step.next, waiting: false, left: 0 }, img, "done", true, 0);
  assert.ok("result" in end && end.result.finished && end.result.drawn.length === 2);
});

test("skips, early stops and restarts count fairly", () => {
  const plan = { id: "t", name: "Test", rounds: [{ count: 3, seconds: 60 }] };
  const img = { block_id: 7, title: null, display_url: "https://example.org/b.jpg", creator: "Someone" };
  const s = { ...startSession(plan, "All", true, 0), waiting: false };
  // Skipped early: not drawn, counted as skipped.
  const early = finishPose({ ...s, left: 50_000 }, img, "skip", true, 0);
  assert.ok("next" in early && early.next.skipped === 1 && early.next.drawn.length === 0);
  // Skipped after half the pose: drawn, for the time used.
  const late = finishPose({ ...s, left: 20_000 }, img, "skip", true, 0);
  assert.ok("next" in late && late.next.drawn.length === 1 && late.next.drawn[0].seconds === 40);
  // Stopped early: a half-done pose counts, a fresh one doesn't.
  assert.equal(stopSession({ ...s, left: 25_000 }, img).drawn.length, 1);
  assert.equal(stopSession({ ...s, left: 55_000 }, img).drawn.length, 0);
  assert.equal(stopSession({ ...s, left: 25_000 }, img).finished, false);
  // ← restarts the pose and waits for the image again.
  const back = restartPose({ ...s, left: 5000 }, true, 42);
  assert.equal(back.left, 60_000);
  assert.equal(back.waiting, true);
  assert.equal(back.since, 42);
  // One image only: nothing to wait for.
  assert.equal(startSession(plan, "One", false, 0).waiting, false);
});

test("values: up to 9 tones, isolating darks, lights or both", () => {
  assert.equal(toneTable(9).split(" ").length, 9);
  assert.equal(focusTable(5, "all"), "0 0.25 0.5 0.75 1");
  assert.equal(focusTable(9, "darks"), "0 1 1 1 1 1 1 1 1");
  assert.equal(focusTable(9, "lights"), "0 0 0 0 0 0 0 0 1");
  assert.equal(focusTable(5, "extremes"), "0 0.5 0.5 0.5 1");
  // Notan has nothing to isolate.
  assert.equal(focusTable(2, "darks"), "0 1");
  assert.deepEqual(valueStrip(3, "all"), [0, 0.5, 1]);
});

test("the study filter graph: values, lines, strokes, cross-hatch", () => {
  const tags = (s: Partial<typeof NO_STUDY>) => filterGraph({ ...NO_STUDY, ...s }).map((n) => n.tag);
  // Always luma then balance; the discrete step only with tones.
  assert.deepEqual(tags({ tones: 0 }), ["feColorMatrix", "feComponentTransfer"]);
  assert.equal(tags({ tones: 5 }).length, 3);
  const toned = filterGraph({ ...NO_STUDY, tones: 9, focus: "darks" })[2];
  assert.equal(toned.children?.[0].attrs.tableValues, "0 1 1 1 1 1 1 1 1");
  // Lines: blur, edge kernel, ink; blended over the values when they're on.
  assert.deepEqual(tags({ effect: "lines" }).slice(2), ["feGaussianBlur", "feConvolveMatrix", "feComponentTransfer"]);
  assert.equal(tags({ effect: "lines", tones: 3 }).at(-1), "feBlend");
  // Strokes: vertical noise is fine across, long along (x freq > y freq).
  const v = filterGraph({ ...NO_STUDY, effect: "vertical" }).find((n) => n.tag === "feTurbulence");
  const [fx, fy] = String(v?.attrs.baseFrequency).split(" ").map(Number);
  assert.ok(fx > fy * 10);
  // The composite keeps alpha at 1: k2 + k3 + k4 ≥ 1.
  const c = filterGraph({ ...NO_STUDY, effect: "horizontal" }).find((n) => n.tag === "feComposite");
  assert.ok(Number(c?.attrs.k2) + Number(c?.attrs.k3) + Number(c?.attrs.k4) >= 1);
  // Cross-hatch: two stroke layers multiplied.
  assert.equal(tags({ effect: "cross" }).filter((t) => t === "feTurbulence").length, 2);
  assert.equal(tags({ effect: "cross" }).at(-1), "feBlend");
  // Effects use the SVG filter; plain greyscale doesn't.
  assert.equal(studyFilter({ ...NO_STUDY, effect: "lines" }), "url(#lemuse-values)");
  assert.equal(studyActive({ ...NO_STUDY, effect: "cross" }), 1);
});

test("practice log: local weeks, oldest first, empty weeks kept", () => {
  // Wed 19 Nov 2026, 15:00 local.
  const now = new Date(2026, 10, 19, 15, 0).getTime();
  const monday = new Date(2026, 10, 16).getTime();
  assert.equal(weekStart(now), monday);
  const sec = (d: Date) => Math.floor(d.getTime() / 1000);
  const log = weeklyLog(
    [
      { started_at: sec(new Date(2026, 10, 18, 9)), drawings: 10, seconds: 300 },
      { started_at: sec(new Date(2026, 10, 16, 0, 5)), drawings: 4, seconds: 240 },
      // Sunday the week before.
      { started_at: sec(new Date(2026, 10, 15, 23, 50)), drawings: 18, seconds: 1800 },
      // Too old for 8 weeks: ignored.
      { started_at: sec(new Date(2026, 5, 1)), drawings: 99, seconds: 99 },
    ],
    now,
  );
  assert.equal(log.length, 8);
  assert.equal(log[7].start, monday);
  assert.deepEqual([log[7].sessions, log[7].drawings, log[7].seconds], [2, 14, 540]);
  assert.equal(log[6].drawings, 18);
  assert.equal(log.slice(0, 6).reduce((n, w) => n + w.drawings, 0), 0);
  assert.equal(logSince(now), Math.floor(log[0].start / 1000));
});

test("content defaults: hidden always out, nudity unless shown, named filters respected", () => {
  assert.deepEqual(withContentDefaults({ include: [], exclude: [] }, false).exclude, ["hidden", "nudity"]);
  assert.deepEqual(withContentDefaults({ include: [], exclude: [] }, true).exclude, ["hidden"]);
  assert.deepEqual(withContentDefaults({ include: ["nudity"], exclude: [] }, false).exclude, ["hidden"]);
  assert.deepEqual(withContentDefaults({ include: [], exclude: ["wood"] }, false).exclude, ["wood", "hidden", "nudity"]);
});

test("new settings are sanitized", () => {
  const s = sanitize({ showNudity: "yes", lastUpdateCheck: -5, singleKeys: false, checkUpdates: 1 });
  assert.equal(s.showNudity, false);
  assert.equal(s.lastUpdateCheck, null);
  assert.equal(s.singleKeys, false);
  assert.equal(s.checkUpdates, true);
  assert.equal(sanitize({ lastUpdateCheck: 1_700_000_000_000.4 }).lastUpdateCheck, 1_700_000_000_000);
});

test("views: source keys round-trip and bad stored keys are refused", () => {
  for (const src of [
    { kind: "all" as const },
    { kind: "saved" as const },
    { kind: "topic" as const, name: "Wood: objects" },
    { kind: "playlist" as const, id: 42 },
    { kind: "search" as const, query: "oak chair" },
  ])
    assert.deepEqual(parseSourceKey(sourceKey(src)), src);
  for (const bad of [null, 7, "", "topic:", "playlist:x", "playlist:-1", "search:   ", "x".repeat(400)])
    assert.equal(parseSourceKey(bad), null, String(bad).slice(0, 20));
});

test("museum label line, alt text and sharper museum images", () => {
  assert.equal(labelLine({ date: "c. 1650", medium: "Oil", dimensions: " 50 x 40 cm " }), "c. 1650 · Oil · 50 x 40 cm");
  assert.equal(labelLine({ date: null, medium: "", dimensions: undefined }), "");
  assert.equal(altText({ title: "Chair", creator: "Ann", date: "1900s" }), "Chair, Ann, 1900s");
  assert.equal(altText({ title: null, creator: null }), "Untitled reference image");
  const s = {
    block_id: 1,
    title: "x",
    display_url: "https://openaccess-cdn.clevelandart.org/a_web.jpg",
    original_url: "https://openaccess-cdn.clevelandart.org/a_print.jpg",
    fallback_urls: [],
    connector: "cleveland",
  } as unknown as Slide;
  const big = sharpSlide(s, true);
  assert.equal(big.display_url, s.original_url);
  assert.deepEqual(big.fallback_urls, [s.display_url], "the web size is the first fallback");
  assert.equal(sharpSlide(s, false), s, "small windows keep the web size");
  assert.equal(sharpSlide({ ...s, connector: "arena" }, true).display_url, s.display_url, "Are.na is untouched");
});

test("settings for finishing 1.0 are sanitized", () => {
  const s = sanitize({
    surround: "neon",
    sessionClock: "huge",
    poseFlash: "no",
    last: { source: "topic:Chairs", page: 99_999, blockId: -3 },
    study: { mirror: true, tones: 6, grid: "thirds", effect: "x", balance: 9 },
  });
  assert.equal(s.surround, "theme");
  assert.equal(s.sessionClock, "ring");
  assert.equal(s.poseFlash, true);
  assert.deepEqual(s.last, { source: "topic:Chairs", page: 10_000, blockId: null });
  assert.equal(s.study.mirror, true);
  assert.equal(s.study.tones, 0, "6 tones isn't offered");
  assert.equal(s.study.grid, "thirds");
  assert.equal(s.study.effect, "off");
  assert.equal(s.study.balance, 1);
  // A brand-new library sees the welcome; existing settings mean someone knows the app.
  assert.equal(sanitize({}).welcomed, false);
  assert.equal(sanitize({ fit: "cover" }).welcomed, true);
  assert.equal(sanitize({ last: { source: "" } }).last, null);
});

test("the welcome offers the fullest topics first, at most 12", () => {
  const t = (name: string, slides: number) => ({ name, slides, slide_seconds: 8, shuffle: true, sources: 1, channels: [] });
  const many = Array.from({ length: 20 }, (_, i) => t(`T${i}`, i));
  const offer = welcomeTopics(many);
  assert.equal(offer.length, 12);
  assert.equal(offer[0].name, "T19");
  assert.ok(offer.every((x) => x.slides > 0), "empty topics aren't offered");
});
