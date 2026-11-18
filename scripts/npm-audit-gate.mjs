#!/usr/bin/env node
// npm audit gate (ADR-0011, review 0008). Fails on any high or critical
// advisory, exactly like `npm audit --audit-level=high`, except for entries
// in docs/security/npm-audit-exceptions.json. An exception must name the
// advisory id and package, give a reason, and carry an expiry date (at most
// 30 days ahead), and the package must be dev-only (never shipped in the
// app). Expired or non-matching exceptions fail the gate, so an accepted
// risk is re-reviewed instead of forgotten.
//
//   node scripts/npm-audit-gate.mjs app
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = resolve(process.argv[2] ?? "app");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exceptions = JSON.parse(readFileSync(join(root, "docs", "security", "npm-audit-exceptions.json"), "utf8"));
const lock = JSON.parse(readFileSync(join(dir, "package-lock.json"), "utf8"));
const MAX_DAYS = 30;
const today = new Date().toISOString().slice(0, 10);

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const r = spawnSync(npm, ["audit", "--json"], { cwd: dir, encoding: "utf8", shell: process.platform === "win32" });
let report;
try {
  report = JSON.parse(r.stdout);
} catch {
  report = undefined;
}
// A failed audit (network, registry, npm crash) must fail the gate, never
// pass it as "no findings" (review 0008 A-31).
if (r.status === null || !report || report.error || typeof report.metadata?.vulnerabilities !== "object") {
  const why = report?.error?.summary ?? report?.error?.code ?? (r.error ? String(r.error) : (r.stderr || "").slice(0, 400));
  console.error(`npm-audit-gate: npm audit did not produce a report, so nothing was checked: ${why}`);
  process.exit(2);
}

/** Every lockfile copy of `name` is dev-only (not bundled into the app). */
const devOnly = (name) => {
  const copies = Object.entries(lock.packages ?? {}).filter(([k]) => k === `node_modules/${name}` || k.endsWith(`/node_modules/${name}`));
  return copies.length > 0 && copies.every(([, v]) => v.dev === true);
};

const problems = [];
const accepted = [];
const used = new Set();
for (const [name, v] of Object.entries(report.vulnerabilities ?? {})) {
  if (!["high", "critical"].includes(v.severity)) continue;
  // Advisories come either directly (objects) or through other packages (strings).
  const direct = v.via.filter((x) => typeof x === "object");
  const own = direct.filter((x) => ["high", "critical"].includes(x.severity));
  if (own.length === 0) continue; // only inherited; judged at the source package
  for (const adv of own) {
    const id = adv.url?.split("/").pop() ?? String(adv.source);
    const ex = exceptions.find((e) => e.id === id && e.package === name);
    const days = ex ? (Date.parse(ex.expires) - Date.parse(today)) / 86400000 : -1;
    if (ex) used.add(id);
    if (!ex) problems.push(`${name}: ${id} (${adv.severity}) ${adv.title}`);
    else if (!(days >= 0)) problems.push(`${name}: exception for ${id} expired on ${ex.expires}; review it again`);
    else if (days > MAX_DAYS) problems.push(`${name}: exception for ${id} runs past ${MAX_DAYS} days`);
    else if (!ex.reason) problems.push(`${name}: exception for ${id} has no reason`);
    else if (!devOnly(name)) problems.push(`${name}: ${id} is in a runtime dependency; exceptions are for dev-only packages`);
    else {
      accepted.push(`${name}: ${id} accepted until ${ex.expires} (${ex.reason})`);
    }
  }
}
for (const e of exceptions) if (!used.has(e.id)) console.log(`npm-audit-gate: note: exception ${e.id} is no longer needed; remove it`);
for (const a of accepted) console.log(`npm-audit-gate: ${a}`);
if (problems.length) {
  console.error(`npm-audit-gate: ${problems.length} high/critical advisory problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("npm-audit-gate: passed (no unreviewed high or critical advisories)");
