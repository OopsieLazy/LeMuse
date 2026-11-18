// W3C conformance gate (ADR-0009). Runs the official Nu HTML Checker
// (vnu.jar, the engine behind validator.w3.org/nu) locally, so no page
// content leaves the machine. Checks:
//   - dist/index.html and the built CSS (`npm run build` first);
//   - .snapshot/html/*.html, the real UI markup in several states
//     (`npm run build:snapshot` first).
// Exits non-zero on any error; warnings are printed but don't fail.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const jar = require("vnu-jar");

try {
  execFileSync("java", ["-version"], { stdio: "ignore" });
} catch {
  console.error("validate:w3c needs Java 11+ on PATH (the W3C checker is a .jar). Install a JDK, then retry.");
  process.exit(2);
}

const files = [];
const add = (dir, ext) => {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) if (f.endsWith(ext)) files.push(join(dir, f));
};
add("dist", ".html");
add(join("dist", "assets"), ".css");
add(join(".snapshot", "html"), ".html");
if (files.length === 0) {
  console.error("Nothing to validate. Run `npm run build` first.");
  process.exit(2);
}

console.log(`W3C Nu HTML Checker: ${files.length} files`);
const r = spawnSync("java", [
  "-jar",
  jar,
  "--also-check-css",
  "--format",
  "text",
  // React emits `<img />`; the checker reports that as Info, not an error.
  "--filterpattern",
  ".*Trailing slash on void elements.*",
  ...files,
], {
  stdio: "inherit",
});
if (r.status !== 0) {
  console.error("W3C validation failed. Fix the errors above before committing.");
  process.exit(r.status ?? 1);
}
console.log("W3C validation passed.");
