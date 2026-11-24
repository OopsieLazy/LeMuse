#!/usr/bin/env node
// A portable LeMuse folder (owner, session 20; ADR-0031): no installer. Run
// from app/: `npm run portable`. It builds the release app and writes
//
//   app/dist-portable/LeMuse/
//     LeMuse.exe                  the app (needs Microsoft Edge WebView2, part of Windows 10/11)
//     THIRD-PARTY-NOTICES.txt     licences (Settings → About reads it from here)
//     Add shortcuts.cmd           Desktop + Start menu shortcuts to LeMuse.exe in this folder
//     Remove shortcuts.cmd        takes them away again
//     README.txt
//
// Move the folder anywhere (e.g. your Apps folder), then double-click
// "Add shortcuts.cmd" there. Your library, topics and settings live outside
// this folder, so moving or replacing it keeps them. The output is
// git-ignored and refused by the secret scanner (it holds an .exe).
//
//   --skip-build   reuse the last release build (target/release)
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = join(root, "app");
const cli = join(app, "node_modules", "@tauri-apps", "cli", "tauri.js");
const target = process.env.CARGO_TARGET_DIR ? resolve(process.env.CARGO_TARGET_DIR) : join(root, "target");
const exe = join(target, "release", "lemuse-app.exe");
const notices = join(app, "src-tauri", "notices", "THIRD-PARTY-NOTICES.txt");
const out = join(app, "dist-portable", "LeMuse");

if (!process.argv.includes("--skip-build")) {
  if (!existsSync(cli)) {
    console.error("portable: the Tauri CLI isn't installed; run `npm ci --ignore-scripts` in app/ first.");
    process.exit(2);
  }
  // The release app without an installer (the notices are made by beforeBuildCommand).
  const r = spawnSync(process.execPath, [cli, "build", "--no-bundle"], { cwd: app, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(
      "portable: the build failed. If it says \"Access is denied\" on lemuse-app.exe, close LeMuse (it is running\n" +
        "from target/release) or build elsewhere: set CARGO_TARGET_DIR to another folder and run this again.",
    );
    process.exit(1);
  }
}
for (const [what, path] of [
  ["the app", exe],
  ["the notices", notices],
]) {
  if (!existsSync(path)) {
    console.error(`portable: ${what} is missing (${path}); run without --skip-build.`);
    process.exit(1);
  }
}

// CRLF: these are Windows batch files.
const crlf = (lines) => lines.join("\r\n") + "\r\n";
// The folder reaches PowerShell through an environment variable, never spliced
// into the command, so any folder name works (spaces, quotes, &).
const ps = (body) => `powershell -NoProfile -ExecutionPolicy Bypass -Command "${body}"`;
const places =
  "$places = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'));";
const addShortcuts = crlf([
  "@echo off",
  "rem LeMuse: a shortcut on the Desktop and in the Start menu (All apps), to",
  "rem LeMuse.exe in this folder. Moved the folder? Run this again.",
  'set "LEMUSE_DIR=%~dp0"',
  ps(
    "$dir = $env:LEMUSE_DIR.TrimEnd('\\'); $exe = Join-Path $dir 'LeMuse.exe';" +
      " if (-not (Test-Path -LiteralPath $exe)) { Write-Host 'LeMuse.exe is not in this folder.'; exit 1 };" +
      ` $ws = New-Object -ComObject WScript.Shell; ${places}` +
      " foreach ($p in $places) { $s = $ws.CreateShortcut((Join-Path $p 'LeMuse.lnk'));" +
      " $s.TargetPath = $exe; $s.WorkingDirectory = $dir; $s.IconLocation = $exe + ',0';" +
      " $s.Description = 'LeMuse: reference images for drawing'; $s.Save(); Write-Host ('Made ' + $s.FullName) }",
  ),
  "pause",
]);
const removeShortcuts = crlf([
  "@echo off",
  "rem LeMuse: removes the Desktop and Start menu shortcuts made by Add shortcuts.cmd.",
  ps(
    places +
      " foreach ($p in $places) { $l = Join-Path $p 'LeMuse.lnk';" +
      " if (Test-Path -LiteralPath $l) { Remove-Item -LiteralPath $l; Write-Host ('Removed ' + $l) } }",
  ),
  "pause",
]);
// Which build this is, so an old copy is easy to spot: the same version and
// commit Settings → About shows (work item 26: a copied folder was stale).
const version = JSON.parse(readFileSync(join(app, "package.json"), "utf8")).version;
const git = (...args) => {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "";
};
const commit = git("rev-parse", "--short=7", "HEAD");
const dirty = git("status", "--porcelain", "--untracked-files=no") ? "+" : "";
const build = /^[0-9a-f]{7}$/.test(commit) ? `${commit}${dirty}` : "dev";
const readme = crlf([
  `LeMuse ${version} (portable) · build ${build}`,
  "Settings → About shows the same build; if they differ, this folder is older than the app you built.",
  "",
  "1. Move this whole folder where you keep apps (for example C:\\Users\\<you>\\Apps\\LeMuse).",
  "2. Double-click \"Add shortcuts.cmd\": LeMuse appears on the Desktop and in the Start menu.",
  "3. Start LeMuse from either shortcut.",
  "",
  "Moved the folder later? Run \"Add shortcuts.cmd\" again. To stop using it: \"Remove shortcuts.cmd\",",
  "then delete the folder. Your library, topics, playlists and settings are kept elsewhere",
  "(the LeMuse library folder and %APPDATA%), so replacing this folder with a newer build keeps them.",
  "",
  "Needs Microsoft Edge WebView2, which Windows 10 and 11 include.",
]);

// Build the new folder beside the old one, then swap. The old folder is moved
// aside whole (Windows refuses while LeMuse runs from it), so a running copy is
// never left half-deleted (review 0025 D-168).
const staging = `${out}.new`;
const old = `${out}.old`;
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
copyFileSync(exe, join(staging, "LeMuse.exe"));
copyFileSync(notices, join(staging, "THIRD-PARTY-NOTICES.txt"));
writeFileSync(join(staging, "Add shortcuts.cmd"), addShortcuts);
writeFileSync(join(staging, "Remove shortcuts.cmd"), removeShortcuts);
writeFileSync(join(staging, "README.txt"), readme);
try {
  rmSync(old, { recursive: true, force: true });
  if (existsSync(out)) renameSync(out, old);
} catch (e) {
  rmSync(staging, { recursive: true, force: true });
  console.error(`portable: LeMuse is running from ${out} (${e.code}); nothing was changed. Close it, then try again.`);
  process.exit(1);
}
renameSync(staging, out);
rmSync(old, { recursive: true, force: true });
console.log(`portable: ${out} (LeMuse ${version}, build ${build})`);
