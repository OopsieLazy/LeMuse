#!/usr/bin/env node
// Secret and personal-data scanner (ADR-0011). Dependency-free, so it runs in
// the git pre-commit hook, the Claude Code Stop gate and CI alike.
//
//   node scripts/scan-secrets.mjs --staged          # lines being committed
//   node scripts/scan-secrets.mjs --range main...HEAD
//   node scripts/scan-secrets.mjs --untracked       # new files not yet added
//   node scripts/scan-secrets.mjs --all             # every tracked file
//
// Diff modes scan only ADDED lines, so history doesn't re-alarm. Exit 1 on
// any finding. Output names file:line and the rule, never the matched text.
// A reviewed false positive can be allowed on its line with the comment
// `secret-scan: allow <reason>`.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isForbiddenFile, personalEmails, RULES } from "./secret-rules.mjs";

const SELF = new Set(["scripts/scan-secrets.mjs", "scripts/secret-rules.mjs"]);
const ALLOW_PRAGMA = /secret-scan:\s*allow/;

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

function addedLinesFromDiff(diff) {
  const out = [];
  let file = null;
  let line = 0;
  let inHeader = false;
  for (const raw of diff.split("\n")) {
    // Files are tracked by `diff --git` headers, so an added line that starts
    // with "++ " can't be mistaken for a file name (review 0005 A-22).
    if (raw.startsWith("diff --git ")) {
      inHeader = true;
      file = null;
    } else if (inHeader && raw.startsWith("+++ ")) {
      file = raw.slice(4).replace(/^b\//, "");
      if (file === "/dev/null") file = null;
    } else if (raw.startsWith("@@")) {
      inHeader = false;
      const m = /\+(\d+)/.exec(raw);
      line = m ? Number(m[1]) - 1 : 0;
    } else if (!inHeader && file && raw.startsWith("+")) {
      line += 1;
      out.push({ file, line, text: raw.slice(1) });
    } else if (!inHeader && file && !raw.startsWith("-")) {
      line += 1;
    }
  }
  return out;
}

function wholeFiles(files) {
  const lines = [];
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (text.includes("\0")) continue; // binary
    text.split("\n").forEach((t, i) => lines.push({ file, line: i + 1, text: t }));
  }
  return lines;
}

function collect(mode, arg) {
  if (mode === "--all" || mode === "--untracked") {
    const list = mode === "--all" ? git("ls-files") : git("ls-files", "--others", "--exclude-standard");
    const files = list.split("\n").filter(Boolean);
    return { files, lines: wholeFiles(files) };
  }
  const base = mode === "--staged" ? ["diff", "--cached"] : ["diff", arg];
  const files = git(...base, "--name-only", "--diff-filter=ACMR").split("\n").filter(Boolean);
  const lines = addedLinesFromDiff(git(...base, "--unified=0", "--no-color", "--diff-filter=ACMR"));
  return { files, lines };
}

const [mode = "--staged", arg] = process.argv.slice(2);
if (!["--staged", "--range", "--untracked", "--all"].includes(mode) || (mode === "--range" && !arg)) {
  console.error("usage: scan-secrets.mjs --staged | --range <a...b> | --untracked | --all");
  process.exit(2);
}

const { files, lines } = collect(mode, arg);
const findings = [];
for (const f of files) {
  if (isForbiddenFile(f))
    findings.push(`${f}: forbidden file type (secrets, keys, local data, outputs or images never go in git)`);
}
// A file that .gitignore covers but is tracked or staged anyway (`git add -f`,
// or the rule came later). The repo is public (review 0015).
if (files.length) {
  const r = spawnSync("git", ["check-ignore", "--no-index", "--stdin"], { input: files.join("\n"), encoding: "utf8" });
  for (const f of (r.stdout ?? "").split("\n").filter(Boolean))
    findings.push(`${f}: matches .gitignore but is in git; remove it with \`git rm --cached\``);
}
for (const { file, line, text } of lines) {
  if (SELF.has(file) || ALLOW_PRAGMA.test(text)) continue;
  for (const [name, re] of RULES) {
    if (re.test(text)) findings.push(`${file}:${line}: ${name}`);
  }
  if (personalEmails(text).length) findings.push(`${file}:${line}: email address (not on the allow-list)`);
}

if (findings.length) {
  console.error(`secret scan: ${findings.length} finding(s). Nothing was printed from the matched text.`);
  for (const f of findings) console.error(`  - ${f}`);
  console.error("Remove the secret (and rotate it if it was ever real), or mark a reviewed false positive");
  console.error("with `secret-scan: allow <reason>` on that line.");
  process.exit(1);
}
console.log(`secret scan: clean (${lines.length} lines, ${files.length} files)`);
