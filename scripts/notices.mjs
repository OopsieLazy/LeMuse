#!/usr/bin/env node
// Third-party notices for LeMuse (ADR-0030; 1.0 item). Every Rust crate the
// app and CLI ship (normal dependencies on Windows, not dev or build tools)
// and every non-dev npm package, each with its licence files' text. Identical
// texts are printed once with the packages that use them.
//
//   node scripts/notices.mjs [--out app/src-tauri/notices/THIRD-PARTY-NOTICES.txt]
//
// Reads `cargo metadata` and the local package sources only: no network
// (`--offline`). The output is git-ignored (it quotes third-party authors'
// copyright lines); the installer bundles it and Settings → About shows it.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const out = resolve(root, outAt >= 0 ? args[outAt + 1] : "app/src-tauri/notices/THIRD-PARTY-NOTICES.txt");

const LICENCE_FILE = /^(licen[cs]e|copying|notice|unlicense)([-._].*)?$/i;

/** Licence-ish files in a package folder, sorted; their text normalised. */
function licenceTexts(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => LICENCE_FILE.test(f))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf8").replace(/\r\n/g, "\n").trim())
    .filter(Boolean);
}

// ── Rust: walk normal dependencies from the shipped workspace members ──
const meta = JSON.parse(
  execFileSync(
    "cargo",
    ["metadata", "--format-version", "1", "--locked", "--offline", "--filter-platform", "x86_64-pc-windows-msvc"],
    { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  ),
);
const byId = new Map(meta.packages.map((p) => [p.id, p]));
const nodes = new Map(meta.resolve.nodes.map((n) => [n.id, n]));
const shipped = new Set();
const queue = meta.workspace_members.filter((id) => /lemuse-(app|cli|core)/.test(byId.get(id)?.name ?? ""));
while (queue.length) {
  const id = queue.pop();
  if (shipped.has(id)) continue;
  shipped.add(id);
  for (const d of nodes.get(id)?.deps ?? []) {
    // Normal dependencies only: dev and build-time tools aren't in the binaries.
    if (d.dep_kinds.some((k) => k.kind === null)) queue.push(d.pkg);
  }
}
const rust = [...shipped]
  .map((id) => byId.get(id))
  .filter((p) => p && !meta.workspace_members.includes(p.id))
  .map((p) => ({
    name: p.name,
    version: p.version,
    licence: p.license ?? (p.license_file ? "see file" : "unknown"),
    url: p.repository ?? p.homepage ?? `https://crates.io/crates/${p.name}`,
    texts: licenceTexts(dirname(p.manifest_path)),
  }));

// ── npm: non-dev packages from the lockfile, texts from node_modules ──
const lock = JSON.parse(readFileSync(join(root, "app/package-lock.json"), "utf8"));
const npm = Object.entries(lock.packages ?? {})
  .filter(([path, p]) => path && !p.dev && p.version)
  .map(([path, p]) => ({
    name: path.replace(/^.*node_modules\//, ""),
    version: p.version,
    licence: p.license ?? "unknown",
    url: `https://www.npmjs.com/package/${path.replace(/^.*node_modules\//, "")}`,
    texts: licenceTexts(join(root, "app", path)),
  }));

const all = [...rust, ...npm].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));

// Group identical licence texts.
const groups = new Map();
for (const p of all) {
  for (const t of p.texts) {
    const g = groups.get(t) ?? [];
    g.push(`${p.name} ${p.version}`);
    groups.set(t, g);
  }
}
const missing = all.filter((p) => !p.texts.length);

const lines = [
  "LeMuse: third-party notices",
  "",
  "LeMuse is MIT-licensed. It is built with the open-source packages below, each under its own licence.",
  `${rust.length} Rust crates and ${npm.length} npm packages.`,
  "",
  "== Packages ==",
  "",
  ...all.map((p) => `${p.name} ${p.version} (${p.licence})  ${p.url}`),
  "",
  "== Licence texts ==",
  "",
];
for (const [text, users] of groups) {
  lines.push(`-- Used by: ${users.join(", ")}`, "", text, "");
}
if (missing.length) {
  lines.push(
    "== Packages without a licence file in their source ==",
    "",
    "Their licence is the SPDX expression listed above; its standard text applies.",
    "",
    ...missing.map((p) => `${p.name} ${p.version} (${p.licence})`),
    "",
  );
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join("\n"));
console.log(
  `notices: ${all.length} packages (${rust.length} Rust, ${npm.length} npm), ${groups.size} distinct licence texts, ${missing.length} without a file → ${out}`,
);
