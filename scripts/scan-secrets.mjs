#!/usr/bin/env node
// Secret and personal-data scanner (ADR-0011). Dependency-free, so it runs in
// the git pre-commit hook, the Claude Code Stop gate and CI alike.
//
//   node scripts/scan-secrets.mjs --staged          # lines being committed
//   node scripts/scan-secrets.mjs --range main...HEAD
//   node scripts/scan-secrets.mjs --all             # every tracked file
//
// Scans only ADDED lines (diff modes) so history doesn't re-alarm. Exit 1 on
// any finding. A false positive can be allowed on its line with the comment
// `secret-scan: allow` and a reason; reviewers check every use.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const RULES = [
  ["private key", /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ["AWS access key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Slack token", /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ["Stripe key", /\b[sr]k_live_[0-9A-Za-z]{20,}\b/],
  ["Anthropic/OpenAI key", /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}\b/],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ["bearer token literal", /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/],
  [
    "hard-coded credential",
    /\b(?:api[_-]?key|secret|token|passw(?:or)?d|client[_-]?secret)\b\s*[:=]\s*["'][^"'\s${}<>]{12,}["']/i,
  ],
  // Personal addresses never belong in the repo (privacy rule in CLAUDE.md).
  [
    "personal email address",
    /\b[A-Za-z0-9._%+-]+@(?:gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|proton|protonmail|aol)\.[a-z.]{2,}\b/i,
  ],
];

// Files that must never be committed, whatever they contain.
const FORBIDDEN_FILES = [
  /(^|\/)\.env(\..+)?$/,
  /\.(pem|key|pfx|p12|keystore|jks)$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/,
  /(^|\/)credentials(\.json)?$/i,
  /(^|\/)\.npmrc$/,
  /\.db(-wal|-shm)?$/,
];
const ALLOW_ENV_EXAMPLE = /(^|\/)\.env\.example$/;
const SELF = "scripts/scan-secrets.mjs";
const ALLOW_PRAGMA = /secret-scan:\s*allow/;

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

function addedLinesFromDiff(diff) {
  const out = [];
  let file = null;
  let line = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      file = raw.slice(4).replace(/^b\//, "");
      if (file === "/dev/null") file = null;
    } else if (raw.startsWith("@@")) {
      const m = /\+(\d+)/.exec(raw);
      line = m ? Number(m[1]) - 1 : 0;
    } else if (file && raw.startsWith("+")) {
      line += 1;
      out.push({ file, line, text: raw.slice(1) });
    } else if (file && !raw.startsWith("-")) {
      line += 1;
    }
  }
  return out;
}

function collect(mode, arg) {
  if (mode === "--all") {
    const files = git("ls-files").split("\n").filter(Boolean);
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
    return { files, lines };
  }
  const base = mode === "--staged" ? ["diff", "--cached"] : ["diff", arg];
  const files = git(...base, "--name-only", "--diff-filter=ACMR").split("\n").filter(Boolean);
  const lines = addedLinesFromDiff(git(...base, "--unified=0", "--no-color", "--diff-filter=ACMR"));
  return { files, lines };
}

const [mode = "--staged", arg] = process.argv.slice(2);
if (!["--staged", "--range", "--all"].includes(mode) || (mode === "--range" && !arg)) {
  console.error("usage: scan-secrets.mjs --staged | --range <a...b> | --all");
  process.exit(2);
}

const { files, lines } = collect(mode, arg);
const findings = [];
for (const f of files) {
  if (FORBIDDEN_FILES.some((re) => re.test(f)) && !ALLOW_ENV_EXAMPLE.test(f)) {
    findings.push(`${f}: forbidden file type (secrets, keys or local databases never go in git)`);
  }
}
for (const { file, line, text } of lines) {
  if (file === SELF || ALLOW_PRAGMA.test(text)) continue;
  for (const [name, re] of RULES) {
    if (re.test(text) && !/noreply@/i.test(text)) {
      findings.push(`${file}:${line}: ${name}`);
    }
  }
}

if (findings.length) {
  console.error(`secret scan: ${findings.length} finding(s). Nothing was printed from the matched text.`);
  for (const f of findings) console.error(`  - ${f}`);
  console.error("Remove the secret (and rotate it if it was ever real), or mark a reviewed false positive");
  console.error("with `secret-scan: allow <reason>` on that line.");
  process.exit(1);
}
console.log(`secret scan: clean (${lines.length} lines, ${files.length} files)`);
