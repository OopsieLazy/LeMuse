// Layout test (ADR-0012): renders every UI state at several window sizes in
// headless Microsoft Edge and measures the boxes. No screenshots, no network:
// the states inline the built CSS and use same-size SVG placeholders. Edge
// runs with a throwaway profile, and every host lookup is mapped to nowhere.
//
// Fails if, in any state at any size:
//   - the image leaves its frame, or overlaps the control bar;
//   - the page scrolls (the app is one screen) or scrolls sideways;
//   - a visible control falls outside the window;
//   - an open dialog doesn't fit the window.
//
// Run after `npm run build && npm run build:snapshot`.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const VIEWPORTS = [
  [1920, 1080],
  [1280, 800],
  [1024, 640],
  [800, 600],
  [768, 1024],
  [400, 800],
];

const statesPath = join(".snapshot", "layout", "states.json");
if (!existsSync(statesPath)) {
  console.error("No layout states. Run `npm run build && npm run build:snapshot` first.");
  process.exit(2);
}

const edge = [
  process.env.EDGE_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => p && existsSync(p));
if (!edge) {
  console.error("layout-test needs Microsoft Edge (set EDGE_PATH).");
  process.exit(2);
}

// Runs inside Edge. Kept dependency-free and self-contained.
const measure = String(async function run() {
  const states = JSON.parse(document.getElementById("states").textContent);
  const viewports = JSON.parse(document.getElementById("viewports").textContent);
  const failures = [];
  let checks = 0;
  // Hidden means display:none or visibility:hidden (the compact bar collapses
  // with visibility:hidden so it can animate).
  const visible = (el, win) => {
    if (!el) return false;
    const cs = win.getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && el.getClientRects().length > 0;
  };
  const overlap = (a, b) =>
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  for (const st of states) {
    for (const [w, h] of viewports) {
      const frame = document.createElement("iframe");
      frame.style.cssText = `width:${w}px;height:${h}px;border:0;display:block`;
      const loaded = new Promise((r) => frame.addEventListener("load", r, { once: true }));
      frame.srcdoc = st.html;
      document.body.appendChild(frame);
      await loaded;
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      const img = doc.querySelector(".frame img");
      if (img && !img.complete) await new Promise((r) => img.addEventListener("load", r, { once: true }));
      // getBoundingClientRect forces a synchronous layout; no frame wait needed
      // (animation frames don't run under headless virtual time).
      void doc.body.offsetHeight;
      const at = `${st.name} @ ${w}x${h}`;
      const fail = (msg) => failures.push(`${at}: ${msg}`);
      const root = doc.documentElement;
      checks++;
      if (root.scrollWidth > win.innerWidth + 1) fail(`page scrolls sideways (${root.scrollWidth}px wide)`);
      if (root.scrollHeight > win.innerHeight + 1) fail(`page scrolls (${root.scrollHeight}px tall)`);
      const frameEl = doc.querySelector(".frame");
      const caption = doc.querySelector(".caption");
      if (img && visible(img, win)) {
        const r = img.getBoundingClientRect();
        const f = frameEl.getBoundingClientRect();
        if (r.left < f.left - 1 || r.top < f.top - 1 || r.right > f.right + 1 || r.bottom > f.bottom + 1)
          fail(`image leaves its frame (img ${Math.round(r.top)}–${Math.round(r.bottom)}, frame ${Math.round(f.top)}–${Math.round(f.bottom)})`);
        if (r.height < 40 || r.width < 40) fail(`image too small to see (${Math.round(r.width)}x${Math.round(r.height)})`);
        if (visible(caption, win) && overlap(r, caption.getBoundingClientRect()) > 1) fail("image overlaps the control bar");
      }
      const outside = (r) =>
        r.right > win.innerWidth + 1 || r.bottom > win.innerHeight + 1 || r.left < -1 || r.top < -1;
      const controls =
        ".controls button, .page-select, .reveal, .rail-actions button, .brand .icon-btn, .playlist-menu :is(button, input, select), .mini-bar button, .mini-burger, .mini-menu button, .compact-burger, .context-menu :is(button, a)";
      for (const b of doc.querySelectorAll(controls)) {
        if (!visible(b, win)) continue;
        if (b.closest(".rail") && win.getComputedStyle(b.closest(".rail")).visibility === "hidden") continue;
        if (outside(b.getBoundingClientRect()))
          fail(`control "${b.getAttribute("aria-label") || b.textContent.trim()}" is outside the window`);
      }
      for (const dialog of doc.querySelectorAll("dialog[open]")) {
        if (outside(dialog.getBoundingClientRect()))
          fail(`dialog "${dialog.getAttribute("aria-labelledby")}" doesn't fit the window`);
      }
      // Compact windows (tablets, small windows): with the bar tucked away the
      // image area must fill the window, like the mini player.
      if ((w <= 1024 || h <= 560) && frameEl && !visible(caption, win) && !doc.querySelector("dialog[open]")) {
        const f = frameEl.getBoundingClientRect();
        if (f.width < win.innerWidth * 0.95 || f.height < win.innerHeight * 0.95)
          fail(`compact: image area is only ${Math.round(f.width)}x${Math.round(f.height)}`);
      }
      for (const menu of doc.querySelectorAll(".playlist-menu")) {
        if (visible(menu, win) && outside(menu.getBoundingClientRect())) fail(`menu "${menu.id}" leaves the window`);
      }
      // Discover's preview grid must not push the dialog sideways.
      for (const grid of doc.querySelectorAll("dialog[open] .preview-grid")) {
        if (grid.scrollWidth > grid.clientWidth + 1) fail("preview grid scrolls sideways");
      }
      frame.remove();
    }
  }
  document.getElementById("report").textContent = JSON.stringify({ checks, failures });
});

const states = JSON.parse(readFileSync(statesPath, "utf8"));
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const harness = `<!doctype html><html><head><meta charset="utf-8"><title>layout test</title></head><body>
<pre id="report">PENDING</pre>
<script type="application/json" id="states">${safe(JSON.stringify(states))}</script>
<script type="application/json" id="viewports">${JSON.stringify(VIEWPORTS)}</script>
<script>(${measure})().catch(e => { document.getElementById("report").textContent = JSON.stringify({ error: String(e && e.stack || e) }); });</script>
</body></html>`;
const harnessPath = resolve(".snapshot", "layout", "harness.html");
writeFileSync(harnessPath, harness);

const profile = mkdtempSync(join(tmpdir(), "lemuse-layout-"));
let out;
try {
  out = spawnSync(
    edge,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      `--user-data-dir=${profile}`,
      "--host-resolver-rules=MAP * ~NOTFOUND",
      "--window-size=2000,1200",
      "--virtual-time-budget=60000",
      "--dump-dom",
      pathToFileURL(harnessPath).href,
    ],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: 180000 },
  );
} finally {
  rmSync(profile, { recursive: true, force: true });
}

const m = /<pre id="report">([\s\S]*?)<\/pre>/.exec(out.stdout ?? "");
const text = m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";
let report;
try {
  report = JSON.parse(text);
} catch {
  console.error("layout-test: no report from Edge.", (out.stderr || "").slice(0, 500), text.slice(0, 200));
  process.exit(2);
}
if (report.error) {
  console.error("layout-test: harness error:", report.error);
  process.exit(2);
}
console.log(`layout-test: ${states.length} states x ${VIEWPORTS.length} sizes = ${report.checks} renders`);
if (report.failures.length) {
  for (const f of report.failures) console.error(`  FAIL ${f}`);
  console.error(`layout-test: ${report.failures.length} failure(s).`);
  process.exit(1);
}
console.log("layout-test: passed (image always inside its frame and clear of the control bar).");
