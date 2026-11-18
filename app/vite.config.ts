import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri expects a fixed dev port and must not clear its terminal output.
// `--mode preview` is the browser preview (ADR-0009): it serves exported
// catalog metadata from preview/ on its own port. That folder never ships in
// the desktop build.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  clearScreen: false,
  // The dashboard (`lemuse serve`, ADR-0019) reads live data from its API, so
  // it ships no exported snapshot.
  publicDir: mode === "preview" ? "preview" : mode === "dashboard" ? false : "public",
  server: mode === "preview" ? { port: 1421, open: true } : { port: 1420, strictPort: true },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: { target: "es2022", sourcemap: mode !== "preview" && mode !== "dashboard" },
}));
