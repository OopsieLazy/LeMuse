import { execFileSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The commit this build came from, shown in Settings → About and the portable
// README, so an old copy is easy to spot (work item 26). "dev" outside git.
function buildId(): string {
  try {
    const hash = execFileSync("git", ["rev-parse", "--short=7", "HEAD"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { encoding: "utf8" }).trim();
    return /^[0-9a-f]{7}$/.test(hash) ? `${hash}${dirty ? "+" : ""}` : "dev";
  } catch {
    return "dev";
  }
}

// Tauri expects a fixed dev port and must not clear its terminal output.
// `--mode preview` is the browser preview (ADR-0009): it serves exported
// catalog metadata from preview/ on its own port. That folder never ships in
// the desktop build.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: { __LEMUSE_BUILD__: JSON.stringify(buildId()) },
  clearScreen: false,
  // The dashboard (`lemuse serve`, ADR-0019) reads live data from its API, so
  // it ships no exported snapshot.
  publicDir: mode === "preview" ? "preview" : mode === "dashboard" ? false : "public",
  server: mode === "preview" ? { port: 1421, open: true } : { port: 1420, strictPort: true },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: { target: "es2022", sourcemap: mode !== "preview" && mode !== "dashboard" },
}));
