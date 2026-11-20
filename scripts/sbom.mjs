#!/usr/bin/env node
// Software bill of materials for a LeMuse release (ADR-0028): every Rust
// crate in Cargo.lock and every non-dev npm package in app/package-lock.json,
// as CycloneDX 1.5 JSON. Reads the lockfiles only: no network, no new tool.
//
//   node scripts/sbom.mjs [--out target/sbom/lemuse.cdx.json]
//
// The default output lives under target/ (git-ignored). The release workflow
// attaches it to the GitHub Release and attests it.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const out = outAt >= 0 ? args[outAt + 1] : "target/sbom/lemuse.cdx.json";

// Cargo.lock: [[package]] tables with name, version and (for crates.io) source.
function cargoComponents(text) {
  const comps = [];
  for (const block of text.split(/\n\[\[package\]\]\n/).slice(1)) {
    const get = (k) => (block.match(new RegExp(`^${k} = "([^"]*)"`, "m")) ?? [])[1];
    const name = get("name");
    const version = get("version");
    if (!name || !version) continue;
    const source = get("source");
    const local = !source;
    comps.push({
      type: local ? "application" : "library",
      name,
      version,
      purl: `pkg:cargo/${encodeURIComponent(name)}@${encodeURIComponent(version)}`,
      ...(local ? {} : { externalReferences: [{ type: "distribution", url: `https://crates.io/crates/${name}/${version}` }] }),
      ...(get("checksum") ? { hashes: [{ alg: "SHA-256", content: get("checksum") }] } : {}),
    });
  }
  return comps;
}

// package-lock v3: "packages" keyed by node_modules path; dev-only ones are skipped.
function npmComponents(lock) {
  const comps = [];
  for (const [path, p] of Object.entries(lock.packages ?? {})) {
    if (!path || p.dev || !p.version) continue;
    const name = path.replace(/^.*node_modules\//, "");
    const [scope, bare] = name.startsWith("@") ? name.split("/") : [null, name];
    const purlName = scope ? `${encodeURIComponent(scope)}/${encodeURIComponent(bare)}` : encodeURIComponent(bare);
    comps.push({
      type: "library",
      name,
      version: p.version,
      purl: `pkg:npm/${purlName}@${encodeURIComponent(p.version)}`,
      ...(p.license ? { licenses: [{ license: { id: p.license } }] } : {}),
    });
  }
  return comps;
}

const version = (readFileSync("Cargo.toml", "utf8").match(/^version = "([^"]+)"/m) ?? [])[1] ?? "0.0.0";
const components = [
  ...cargoComponents(readFileSync("Cargo.lock", "utf8").replace(/\r\n/g, "\n")),
  ...npmComponents(JSON.parse(readFileSync("app/package-lock.json", "utf8"))),
];
const bom = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  serialNumber: `urn:uuid:${randomUUID()}`,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    component: { type: "application", name: "LeMuse", version, licenses: [{ license: { id: "MIT" } }] },
  },
  components,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(bom, null, 2) + "\n");
console.log(`sbom: ${components.length} components → ${out}`);
