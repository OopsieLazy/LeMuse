#!/usr/bin/env node
// Writes everything not yet committed to .claude/review/changes.diff, so the
// admin-review agent hook (ADR-0011) can read it. That agent may only read
// files; it can't run git. Runs after every edit (PostToolUse hook) and can be
// run by hand right before a commit:
//
//   node scripts/hooks/review-snapshot.mjs
//
// Contents: `git status --porcelain`, `git diff HEAD`, and the text of new
// untracked (not ignored) files, capped per file and overall. The folder is
// gitignored; nothing here is ever committed.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isForbiddenFile } from "../secret-rules.mjs";

const MAX_FILE = 200 * 1024;
const MAX_TOTAL = 2 * 1024 * 1024;

const git = (...a) => {
  try {
    return execFileSync("git", a, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
};

// Hooks pipe JSON on stdin; we don't need it, but drain it so the writer
// never blocks.
try {
  readFileSync(0);
} catch {
  /* no stdin */
}

const root = git("rev-parse", "--show-toplevel").trim();
if (!root) process.exit(0);

const parts = [];
parts.push(`# Uncommitted work at ${new Date().toISOString()} on ${git("rev-parse", "--abbrev-ref", "HEAD").trim()}`);
parts.push("## git status --porcelain", git("status", "--porcelain").trimEnd() || "(clean)");
parts.push("## git diff HEAD", git("diff", "HEAD", "--no-color").trimEnd() || "(no tracked changes)");

const untracked = git("ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean);
for (const f of untracked) {
  // Never copy key or credential files into the snapshot; name them only
  // (review 0006 A-26).
  if (isForbiddenFile(f)) {
    parts.push(`## new file ${f}`, "(credential or key file: contents withheld)");
    continue;
  }
  let text;
  try {
    if (statSync(join(root, f)).size > MAX_FILE) {
      parts.push(`## new file ${f}`, `(over ${MAX_FILE} bytes; not inlined)`);
      continue;
    }
    text = readFileSync(join(root, f), "utf8");
  } catch {
    continue;
  }
  parts.push(`## new file ${f}`, text.includes("\0") ? "(binary)" : text);
}

let out = parts.join("\n\n") + "\n";
if (out.length > MAX_TOTAL) out = out.slice(0, MAX_TOTAL) + "\n\n(TRUNCATED: review the rest of the changes by file)\n";
const dir = join(root, ".claude", "review");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "changes.diff"), out);
