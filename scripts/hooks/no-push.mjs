#!/usr/bin/env node
// PreToolUse hook (owner, session 19): Claude never pushes to GitHub. The
// owner pushes branches with their own account; Claude hands over the
// command. Catches `git push` anywhere in a command (after `cd … &&`, in a
// subshell, `git -C dir push`, `git.exe`), which a prefix rule can miss.
// Reads the hook's JSON from stdin; denies with a reason, else stays silent.
import { readFileSync } from "node:fs";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0);
}
const cmd = String(input?.tool_input?.command ?? "");
// `git` (optionally with options such as -C <dir>) followed by the push subcommand.
const pushes = /\bgit(?:\.exe)?\b(?:\s+-[^\s]+(?:\s+(?!push\b)[^\s-][^\s]*)?)*\s+push\b/i.test(cmd);
if (pushes) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          "Claude doesn't push (owner, session 19). Commit locally and give the owner the push command in the handoff.",
      },
    }),
  );
}
process.exit(0);
