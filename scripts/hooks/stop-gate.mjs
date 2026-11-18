#!/usr/bin/env node
// Claude Code Stop hook: the admin gate before the agent finishes (ADR-0011).
//
// Blocks the agent from ending its turn on a work branch until:
//   1. the branch's changes and the uncommitted work pass the secret scan;
//   2. docs/reviews/NNNN-*.md exists with an admin pass, written after an
//      admin-review agent looked at `git diff main...HEAD`.
// When it blocks, its reason tells the agent what to run. To avoid loops,
// a second stop in a row (stop_hook_active) is always allowed, so the agent
// can still stop to ask the owner a question.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const read = () => {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
};
const input = read();
if (input.stop_hook_active) process.exit(0);

const git = (...a) => {
  try {
    return execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};
const root = git("rev-parse", "--show-toplevel");
if (!root) process.exit(0);
const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (!branch || branch === "main" || branch === "HEAD") process.exit(0);

const problems = [];
const scanner = join(root, "scripts", "scan-secrets.mjs");
const hasMain = git("rev-parse", "--verify", "--quiet", "main") !== "";
for (const range of [hasMain ? "main...HEAD" : null, "HEAD"].filter(Boolean)) {
  const r = spawnSync(process.execPath, [scanner, "--range", range], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) {
    problems.push(`Secret scan failed for ${range === "HEAD" ? "uncommitted changes" : range}:\n${r.stderr.trim()}`);
  }
}

const id = /^[a-z]+\/(\d{4})-/.exec(branch)?.[1];
const reviews = join(root, "docs", "reviews");
const review = id && existsSync(reviews) ? readdirSync(reviews).find((f) => f.startsWith(`${id}-`)) : undefined;
if (id && !review) {
  problems.push(`No admin review for this branch: docs/reviews/${id}-<slug>.md is missing.`);
} else if (review && !/admin/i.test(readFileSync(join(reviews, review), "utf8"))) {
  problems.push(`docs/reviews/${review} has no admin pass.`);
}

if (problems.length === 0) process.exit(0);

const reason = [
  "Admin gate (CLAUDE.md § Security, ADR-0011) blocked finishing:",
  ...problems.map((p) => `- ${p}`),
  "",
  "Before finishing: spawn an admin-review agent (Agent tool, general-purpose) to review",
  "`git diff main...HEAD` plus uncommitted changes as the architect: secrets, personal data, CSP and",
  "Tauri capabilities, HttpClient-only network access, ADR-0004 source rules, migrations. Record its",
  "findings as A-n in the branch's docs/reviews/NNNN-<slug>.md, fix or defer each, and re-run",
  "`node scripts/scan-secrets.mjs --range HEAD`. If you are only pausing to ask the owner a question,",
  "say so and stop again.",
].join("\n");
process.stdout.write(JSON.stringify({ decision: "block", reason }));
