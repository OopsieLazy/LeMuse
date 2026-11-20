#!/usr/bin/env node
// App icons from the owner's design (ADR-0031). Run from app/: `npm run icons`.
//
// - app/app-icon.svg (full detail) → every PNG, icon.ico and icon.icns in
//   app/src-tauri/icons/ (only the files that folder already has: no Android
//   or iOS sets, LeMuse is a Windows app);
// - app/app-icon-small.svg (bolder lines, one grip) → the 16, 24 and 32 px
//   frames of icon.ico and 32x32.png, where thin lines would blur away.
//
// The ICO keeps PNG frames (Windows Vista and later), like the Tauri CLI's
// own. Uses only the Tauri CLI already installed; no network.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = join(root, "app");
const icons = join(app, "src-tauri", "icons");
const cli = join(app, "node_modules", "@tauri-apps", "cli", "tauri.js");
if (!existsSync(cli)) {
  console.error("icons: the Tauri CLI isn't installed; run `npm ci --ignore-scripts` in app/ first.");
  process.exit(2);
}

function tauriIcon(source, out, sizes) {
  const args = [cli, "icon", join(app, source), "-o", out];
  if (sizes) args.push("-p", sizes.join(","));
  // Its progress lines go to stderr; shown only if it fails.
  const r = spawnSync(process.execPath, args, { cwd: app, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stdout + r.stderr);
    console.error(`icons: tauri icon ${source} failed`);
    process.exit(1);
  }
}

/** An ICO file from PNG frames: [size, png bytes][]. */
function ico(frames) {
  const head = Buffer.alloc(6 + 16 * frames.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2); // 1 = icon
  head.writeUInt16LE(frames.length, 4);
  let offset = head.length;
  frames.forEach(([size, png], i) => {
    const e = 6 + 16 * i;
    head[e] = size >= 256 ? 0 : size; // 0 means 256
    head[e + 1] = size >= 256 ? 0 : size;
    head[e + 2] = 0; // no palette
    head[e + 3] = 0;
    head.writeUInt16LE(1, e + 4); // planes
    head.writeUInt16LE(32, e + 6); // bits per pixel
    head.writeUInt32LE(png.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...frames.map(([, png]) => png)]);
}

const tmp = mkdtempSync(join(tmpdir(), "lemuse-icons-"));
try {
  const all = join(tmp, "all");
  const full = join(tmp, "full");
  const small = join(tmp, "small");
  tauriIcon("app-icon.svg", all);
  tauriIcon("app-icon.svg", full, [48, 64, 256]);
  tauriIcon("app-icon-small.svg", small, [16, 24, 32]);

  const kept = readdirSync(icons).filter((f) => existsSync(join(all, f)));
  for (const f of kept) copyFileSync(join(all, f), join(icons, f));
  copyFileSync(join(small, "32x32.png"), join(icons, "32x32.png"));

  const png = (dir, n) => readFileSync(join(dir, `${n}x${n}.png`));
  writeFileSync(
    join(icons, "icon.ico"),
    ico([
      [16, png(small, 16)],
      [24, png(small, 24)],
      [32, png(small, 32)],
      [48, png(full, 48)],
      [64, png(full, 64)],
      [256, png(full, 256)],
    ]),
  );
  console.log(`icons: ${kept.length} files in app/src-tauri/icons (ICO: 16, 24, 32 small; 48, 64, 256 full)`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
