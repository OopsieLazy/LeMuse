// Layout test (ADR-0012): renders every UI state at several window sizes in
// headless Microsoft Edge and measures the boxes. No screenshots, no network:
// the states inline the built CSS and use same-size SVG placeholders. Edge
// runs with a throwaway profile, and every host lookup is mapped to nowhere.
//
// Fails if, in any state at any size:
//   - the image leaves its frame, or overlaps the control bar (zoomed: the
//     frame clips it and stays off the bar);
//   - the page scrolls (the app is one screen) or scrolls sideways;
//   - a visible control falls outside the window;
//   - an open dialog doesn't fit the window;
//   - a control is smaller than 24 x 24 px (WCAG 2.5.8);
//   - text has too little contrast on its real background (WCAG 1.4.3);
//   - a study grid doesn't sit exactly on its image.
//
// The report comes back in the page's URL hash (the title says when it's
// ready), read from Edge's DevTools HTTP endpoint on 127.0.0.1 (a random
// port, this run only). Edge's
// --dump-dom stdout proved unreliable on Windows (it can return nothing).
//
// Run after `npm run build && npm run build:snapshot`.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const VIEWPORTS = [
  [1920, 1080],
  [1280, 800],
  [1024, 640],
  // Just wider than the compact cutoff (1024): the full bar's tightest fit
  // (owner, session 20: "as the window is made smaller the source information disappears").
  [1040, 700],
  [800, 600],
  [768, 1024],
  [400, 800],
];
// The mini player's own window: its default and its smallest (api.ts
// MINI_DEFAULT, MINI_MIN). Mini states are also checked at these sizes (the
// save note once hid its × off the right edge there, review 0023 D-146).
const MINI_VIEWPORTS = [
  [360, 225],
  [200, 125],
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
  const miniViewports = JSON.parse(document.getElementById("mini-viewports").textContent);
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
    const sizes = st.html.includes('data-mini="true"') ? [...viewports, ...miniViewports] : viewports;
    for (const [w, h] of sizes) {
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
      // Zoomed (ADR-0033), the image is bigger than its frame on purpose: then
      // the frame must clip it, and the frame itself must stay off the bar.
      const zoomed = frameEl?.getAttribute("data-zoomed") === "true";
      if (zoomed) {
        const f = frameEl.getBoundingClientRect();
        const clip = win.getComputedStyle(frameEl);
        if (clip.overflowX !== "hidden" || clip.overflowY !== "hidden") fail("zoomed image isn't clipped by its frame");
        if (visible(caption, win) && overlap(f, caption.getBoundingClientRect()) > 1) fail("zoomed frame overlaps the control bar");
      }
      if (img && visible(img, win)) {
        const r = img.getBoundingClientRect();
        const f = frameEl.getBoundingClientRect();
        if (!zoomed && (r.left < f.left - 1 || r.top < f.top - 1 || r.right > f.right + 1 || r.bottom > f.bottom + 1))
          fail(`image leaves its frame (img ${Math.round(r.top)}–${Math.round(r.bottom)}, frame ${Math.round(f.top)}–${Math.round(f.bottom)})`);
        if (r.height < 40 || r.width < 40) fail(`image too small to see (${Math.round(r.width)}x${Math.round(r.height)})`);
        if (!zoomed && visible(caption, win) && overlap(r, caption.getBoundingClientRect()) > 1) fail("image overlaps the control bar");
      }
      // Accessibility (ADR-0028 §a11y): WCAG 2.5.8 target size, 24 × 24 CSS px
      // for controls (inline text buttons and the full-image tap areas are
      // exempt), and WCAG 1.4.3 text contrast on its real background.
      for (const b of doc.querySelectorAll("button, select, [role=menuitem]")) {
        if (!visible(b, win) || b.matches(".inline-btn, .compact-tap, .mini-tap")) continue;
        if (b.closest(".rail") && win.getComputedStyle(b.closest(".rail")).visibility === "hidden") continue;
        const r = b.getBoundingClientRect();
        checks++;
        if (r.width < 23.5 || r.height < 23.5)
          fail(`target "${b.getAttribute("aria-label") || b.textContent.trim().slice(0, 30)}" is ${Math.round(r.width)}x${Math.round(r.height)} (min 24x24)`);
        // Nothing may sit on top of a control (owner, session 20: "the bar up
        // arrow covers grid"): at its centre and four points around it, the
        // topmost element must be the control (or inside it). Skipped: controls
        // scrolled out of their own list, the page under an open drawer, and
        // open menus or dialogs, which are meant to cover things.
        const underDrawer = doc.querySelector('.app[data-rail-open="true"]') && !b.closest(".rail");
        if (!underDrawer && !b.closest("dialog")) {
          const points = [
            [0.5, 0.5],
            [0.25, 0.25],
            [0.75, 0.25],
            [0.25, 0.75],
            [0.75, 0.75],
          ].map(([fx, fy]) => [r.left + r.width * fx, r.top + r.height * fy]);
          const clippedAt = (x, y) => {
            for (let n = b.parentElement; n && n !== doc.body; n = n.parentElement) {
              const o = win.getComputedStyle(n).overflowY;
              if (o === "auto" || o === "scroll" || o === "hidden") {
                const q = n.getBoundingClientRect();
                if (y < q.top || y > q.bottom || x < q.left || x > q.right) return true;
              }
            }
            return false;
          };
          for (const [x, y] of points) {
            if (x < 0 || y < 0 || x >= win.innerWidth || y >= win.innerHeight || clippedAt(x, y)) continue;
            const top = doc.elementFromPoint(x, y);
            // An ancestor "on top" is content-visibility skipping offscreen work, not a cover.
            if (!top || top === b || b.contains(top) || top.contains(b)) continue;
            const cover = top.closest("button, a, select, input, [role=menuitem]") || top;
            if (cover.closest(".playlist-menu, .filter-menu, .study-menu, .context-menu, .mini-menu, dialog[open], .toast, .save-note")) continue;
            fail(`"${b.getAttribute("aria-label") || b.textContent.trim().slice(0, 30)}" is covered by ${cover.tagName.toLowerCase()}.${cover.className || "?"}${cover.getAttribute("aria-label") ? ` "${cover.getAttribute("aria-label")}"` : ""}`);
            break;
          }
        }
      }
      const rgba = (c) => {
        const m = c.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
      };
      const lum = ({ r, g, b }) => {
        const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      // The colour behind an element: blend translucent backgrounds up the tree.
      const backdrop = (el) => {
        const layers = [];
        for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
          const c = rgba(win.getComputedStyle(n).backgroundColor);
          if (c && c.a > 0) {
            layers.push(c);
            if (c.a >= 1) break;
          }
        }
        let out = { r: 255, g: 255, b: 255 };
        for (const c of layers.reverse()) out = { r: c.r * c.a + out.r * (1 - c.a), g: c.g * c.a + out.g * (1 - c.a), b: c.b * c.a + out.b * (1 - c.a) };
        return out;
      };
      const textSel =
        ".slide-title, .creator, .source, .refresh-label, .library-line, .rail-heading, .topic-name, .topic-count, .menu-empty, .settings-note, .list-label, .chip-label, .chip-count, .compact-credit, .study-badge, .session-pose, .session-time, .plan-rounds, .plan-total, .drawn-meta, .related-meta, .specs dt, .specs dd, .menu-title, .empty-body, .error-code, .save-note-title, .save-note-file, .source-link, .text-link, .form-status";
      // Colour doesn't change with size: check at one desktop and one compact size.
      const contrastHere = (w === 1280 && h === 800) || (w === 800 && h === 600);
      // Both themes, whatever this PC's own setting is (a dark-mode PC once
      // hid a light-theme failure that CI found): force each in turn, unless
      // the state chose a theme itself.
      const ownTheme = root.getAttribute("data-theme");
      const themes = contrastHere ? (ownTheme ? [ownTheme] : ["light", "dark"]) : [];
      for (const theme of themes) {
      if (!ownTheme) root.setAttribute("data-theme", theme);
      void doc.body.offsetHeight;
      for (const t of doc.querySelectorAll(textSel)) {
        if (!visible(t, win) || !t.textContent.trim() || t.closest("[disabled], :disabled, [aria-hidden=true]")) continue;
        if (t.closest(".rail") && win.getComputedStyle(t.closest(".rail")).visibility === "hidden") continue;
        if (t.closest(".frame") && !t.closest(".compact-credit, .study-badge, .session-clock, .empty")) continue;
        const cs = win.getComputedStyle(t);
        const fg = rgba(cs.color);
        if (!fg) continue;
        const bg = backdrop(t);
        const L1 = lum(fg.a < 1 ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) } : fg);
        const L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const size = parseFloat(cs.fontSize);
        const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
        checks++;
        if (ratio < (large ? 3 : 4.5) - 0.01)
          fail(`${theme}: text "${t.textContent.trim().slice(0, 24)}" (${t.className}) contrast ${ratio.toFixed(2)}:1, needs ${large ? 3 : 4.5}:1`);
      }
      }
      if (!ownTheme) root.removeAttribute("data-theme");
      // Study grid (ADR-0025): same box as the image and the image's proportions,
      // so the lines sit on the picture, not on the empty bands around it.
      const grid = doc.querySelector(".frame .grid-overlay");
      if (img && grid && visible(img, win)) {
        checks++;
        const a = img.getBoundingClientRect();
        const b = grid.getBoundingClientRect();
        if (Math.abs(a.left - b.left) > 1 || Math.abs(a.top - b.top) > 1 || Math.abs(a.width - b.width) > 1 || Math.abs(a.height - b.height) > 1)
          fail(`grid box ${Math.round(b.width)}x${Math.round(b.height)} isn't the image box ${Math.round(a.width)}x${Math.round(a.height)}`);
        const vb = grid.viewBox.baseVal;
        if (img.naturalHeight && vb && Math.abs(vb.width / vb.height - img.naturalWidth / img.naturalHeight) > 0.01)
          fail("grid proportions differ from the image");
      }
      const outside = (r) =>
        r.right > win.innerWidth + 1 || r.bottom > win.innerHeight + 1 || r.left < -1 || r.top < -1;
      const controls =
        ".controls button, .page-select, .reveal, .rail-actions button, .brand .icon-btn, .playlist-menu :is(button, input, select), .mini-bar button, .mini-burger, .mini-menu button, .compact-burger, .context-menu :is(button, a), .save-note-close, .toast-undo";
      // A control in a scrolling list that itself fits the window is reached
      // by scrolling (the mini player's menu at its smallest size).
      const scrolledInto = (el) => {
        for (let n = el.parentElement; n && n !== doc.body; n = n.parentElement) {
          const o = win.getComputedStyle(n).overflowY;
          if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight + 1)
            return !outside(n.getBoundingClientRect());
        }
        return false;
      };
      for (const b of doc.querySelectorAll(controls)) {
        if (!visible(b, win)) continue;
        if (b.closest(".rail") && win.getComputedStyle(b.closest(".rail")).visibility === "hidden") continue;
        if (outside(b.getBoundingClientRect()) && !scrolledInto(b))
          fail(`control "${b.getAttribute("aria-label") || b.textContent.trim()}" is outside the window`);
      }
      // Attribution is never hidden (ADR-0004): with an image on screen, its
      // source is visible and not clipped, in the bar or, with the compact bar
      // tucked away, in the small credit line.
      if (doc.querySelector(".frame img") && !doc.querySelector("dialog[open]") && !doc.querySelector(".grid-view")) {
        const where = visible(caption, win) ? doc.querySelector(".caption .byline .source") : doc.querySelector(".compact-credit .credit-source");
        checks++;
        if (where && root.getAttribute("data-controls") !== "hidden") {
          const sr = where.getBoundingClientRect();
          let clippedBy = null;
          for (let n = where.parentElement; n && n !== doc.body && !clippedBy; n = n.parentElement) {
            const cs = win.getComputedStyle(n);
            if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
              const q = n.getBoundingClientRect();
              if (sr.left < q.left - 1 || sr.right > q.right + 1 || sr.top < q.top - 1 || sr.bottom > q.bottom + 1) clippedBy = n.className || n.tagName;
            }
          }
          if (!visible(where, win) || sr.width < 2 || outside(sr)) fail(`source attribution "${where.textContent.trim().slice(0, 30)}" isn't visible`);
          else if (clippedBy) fail(`source attribution is cut off by .${clippedBy}`);
        }
      }
      // The ⌃ arrow (bar hidden) never sits on the grid view or its scrollbar.
      const reveal = doc.querySelector(".reveal");
      const gridView = doc.querySelector(".grid-view");
      if (reveal && gridView && visible(reveal, win) && visible(gridView, win)) {
        checks++;
        if (overlap(reveal.getBoundingClientRect(), gridView.getBoundingClientRect()) > 1) fail("the ⌃ arrow covers the grid view");
      }
      // Pop-ups over the image (the save note once hid its × off the right
      // edge of the mini player, review 0023 D-146): wholly in the window.
      for (const pop of doc.querySelectorAll(".save-note, .toast")) {
        if (visible(pop, win) && outside(pop.getBoundingClientRect())) fail(`pop-up "${pop.className}" leaves the window`);
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
  // The full report goes in the URL hash (titles are cut at ~4 KB); the
  // title says it's ready.
  history.replaceState(null, "", "#" + encodeURIComponent(JSON.stringify({ checks, failures })));
  document.title = "REPORT:DONE";
});

const states = JSON.parse(readFileSync(statesPath, "utf8"));
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const harness = `<!doctype html><html><head><meta charset="utf-8"><title>layout test</title></head><body>
<pre id="report">PENDING</pre>
<script type="application/json" id="states">${safe(JSON.stringify(states))}</script>
<script type="application/json" id="viewports">${JSON.stringify(VIEWPORTS)}</script>
<script type="application/json" id="mini-viewports">${JSON.stringify(MINI_VIEWPORTS)}</script>
<script>(${measure})().catch(e => { history.replaceState(null, "", "#" + encodeURIComponent(JSON.stringify({ error: String(e && e.stack || e) }))); document.title = "REPORT:DONE"; });</script>
</body></html>`;
const harnessPath = resolve(".snapshot", "layout", "harness.html");
writeFileSync(harnessPath, harness);

const profile = mkdtempSync(join(tmpdir(), "lemuse-layout-"));
// A random local port for this run; DevTools listens on 127.0.0.1 only.
const port = 20000 + Math.floor(Math.random() * 20000);
const browser = spawn(
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
    `--remote-debugging-port=${port}`,
    "--remote-debugging-address=127.0.0.1",
    pathToFileURL(harnessPath).href,
  ],
  { stdio: "ignore" },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let text = "";
try {
  const deadline = Date.now() + 420_000;
  while (Date.now() < deadline && !text) {
    await sleep(1000);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const pages = await res.json();
      const done = pages.find((pg) => typeof pg.title === "string" && pg.title.startsWith("REPORT:"));
      if (done) text = decodeURIComponent(String(done.url).split("#")[1] ?? "");
    } catch {
      // Not listening yet.
    }
  }
} finally {
  // Edge runs several processes: end the whole tree, then remove the profile.
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(browser.pid), "/T", "/F"], { stdio: "ignore" });
  else browser.kill();
  for (let i = 0; i < 10; i++) {
    try {
      rmSync(profile, { recursive: true, force: true });
      break;
    } catch {
      await sleep(500);
    }
  }
}

let report;
try {
  report = JSON.parse(text);
} catch {
  console.error("layout-test: no report from Edge (timed out or it couldn't start).", text.length, text.slice(-120));
  process.exit(2);
}
if (report.error) {
  console.error("layout-test: harness error:", report.error);
  process.exit(2);
}
console.log(`layout-test: ${states.length} states x ${VIEWPORTS.length} sizes (+${MINI_VIEWPORTS.length} for mini states) = ${report.checks} checks`);
if (report.failures.length) {
  for (const f of report.failures) console.error(`  FAIL ${f}`);
  console.error(`layout-test: ${report.failures.length} failure(s).`);
  process.exit(1);
}
console.log("layout-test: passed (layout, 24 px targets, text contrast, grid on the image).");
