#!/usr/bin/env node
// Guardrail files (owner, session 19): the files that decide what gets checked
// and what's allowed (CI, hooks, scanner rules, ignore lists, app permissions,
// the CSP, Claude's own rules). A change to any of them must be read by the
// owner, not just by the AI that made it.
//
//   node scripts/guardrail-check.mjs [--range main...HEAD]
//
// Lists the guardrail files the range touches. In CI (pull requests), set
// GUARDRAIL_LABELS to the PR's labels as JSON: the check fails until the owner
// adds the "guardrails-reviewed" label after reading those files.
import { execFileSync } from "node:child_process";

export const GUARDRAILS = [
  /^\.github\/workflows\//,
  /^\.github\/CODEOWNERS$/,
  /^\.githooks\//,
  /^\.claude\/settings(\.local)?\.json$/,
  /^scripts\/hooks\//,
  /^scripts\/(scan-secrets|secret-rules|npm-audit-gate|guardrail-check)\.mjs$/,
  /^\.gitleaksignore$/,
  /^\.gitignore$/,
  /^docs\/security\//,
  /^app\/src-tauri\/capabilities\//,
  /^app\/src-tauri\/tauri\.conf\.json$/,
  /^app\/scripts\/(layout-test|validate-w3c)\.mjs$/,
  /^CLAUDE\.md$/,
  /^SECURITY\.md$/,
];

export const LABEL = "guardrails-reviewed";

export const isGuardrail = (file) => GUARDRAILS.some((re) => re.test(file));

function changedFiles(range) {
  const out = execFileSync("git", ["diff", "--name-only", range], { encoding: "utf8" });
  return out.split("\n").map((f) => f.trim()).filter(Boolean);
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  const at = process.argv.indexOf("--range");
  const range = at >= 0 ? process.argv[at + 1] : "main...HEAD";
  const touched = changedFiles(range).filter(isGuardrail);
  if (!touched.length) {
    console.log(`guardrails: none touched in ${range}.`);
    process.exit(0);
  }
  console.log(`guardrails: ${touched.length} guardrail file(s) changed in ${range}; the owner reads these before merging:`);
  for (const f of touched) console.log(`  - ${f}`);
  const raw = process.env.GUARDRAIL_LABELS;
  if (raw === undefined) process.exit(0); // local run: information only
  let labels = [];
  try {
    labels = JSON.parse(raw);
  } catch {
    labels = [];
  }
  if (Array.isArray(labels) && labels.includes(LABEL)) {
    console.log(`guardrails: the "${LABEL}" label is on the PR. OK.`);
    process.exit(0);
  }
  console.error(
    `guardrails: read the files above, then add the "${LABEL}" label to this PR (the check re-runs by itself).`,
  );
  process.exit(1);
}
