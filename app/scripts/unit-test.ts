// Unit tests for the UI's pure logic (practice tools, redaction). Built by
// `vite build --ssr` and run with node's built-in test runner:
//   npm run test:unit
// No network, no files outside .snapshot/ (git-ignored).
import assert from "node:assert/strict";
import { test } from "node:test";
import { redact, reportUrl } from "../src/api";
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
  sanitizeRounds,
  SESSION_PLANS,
  studyActive,
  studyFilter,
  toneTable,
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
  assert.equal(nextOf(TONES, 5), 0);
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
