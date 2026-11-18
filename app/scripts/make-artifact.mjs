// Packs the preview build into one self-contained HTML fragment for a
// claude.ai Artifact: the design preview the owner can open anywhere.
//
// Artifact pages may not load images from other hosts, and we never
// download reference images to make a preview (ADR-0009). So each slide's
// image becomes a drawn placeholder at the image's real aspect ratio,
// labelled with its size and source. The desktop app and
// `npm run preview:web` show the real streamed images.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = "dist-preview";
const assets = join(dist, "assets");
// Only the entry chunk: the lazily imported Tauri chunks never run in the
// preview, and inlining them would execute them out of context.
const indexHtml = readFileSync(join(dist, "index.html"), "utf8");
const js = [...indexHtml.matchAll(/<script[^>]+src="\/assets\/([^"]+\.js)"/g)].map((m) => m[1]);
const css = readdirSync(assets).filter((f) => f.endsWith(".css"));
if (js.length !== 1) throw new Error(`expected one entry script, found ${js.length}`);
const data = JSON.parse(readFileSync(join("preview", "preview-data.json"), "utf8"));

const ENT = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ENT[c]);
const host = (u) => {
  try {
    return new URL(u).hostname;
  } catch {
    return "its source";
  }
};

function placeholder(slide) {
  const w = slide.width || 1200;
  const h = slide.height || 900;
  const s = Math.min(w, h) / 900; // similar text size at any resolution
  const m = 40 * s;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<rect width="100%" height="100%" fill="#c9cbc6"/>`,
    `<rect x="${m}" y="${m}" width="${w - 2 * m}" height="${h - 2 * m}" fill="none" stroke="#9fa29c" stroke-width="${2 * s}" stroke-dasharray="${12 * s} ${10 * s}"/>`,
    `<path d="M${m} ${m}L${w - m} ${h - m}M${w - m} ${m}L${m} ${h - m}" stroke="#b3b6b0" stroke-width="${1.5 * s}"/>`,
    `<g font-family="Segoe UI, system-ui, sans-serif" fill="#2c2e30" text-anchor="middle">`,
    `<text x="${w / 2}" y="${h / 2 - 34 * s}" font-size="${44 * s}" font-weight="600">${w} × ${h}</text>`,
    `<text x="${w / 2}" y="${h / 2 + 22 * s}" font-size="${26 * s}">streams from ${esc(host(slide.display_url))} in the app</text>`,
    `<text x="${w / 2}" y="${h / 2 + 62 * s}" font-size="${22 * s}" fill="#56595d">${esc((slide.title || "Untitled").slice(0, 60))}</text>`,
    `</g></svg>`,
  ].join("");
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
for (const t of data.topics) for (const s of t.slides) s.display_url = placeholder(s);

const safeScript = (s) => s.replace(/<\/script/gi, "<\\/script");
const styles = css.map((f) => readFileSync(join(assets, f), "utf8")).join("\n");
const scripts = js
  .map((f) => `<script type="module">${safeScript(readFileSync(join(assets, f), "utf8"))}</script>`)
  .join("\n");
const html = `<title>LeMuse Preview</title>
<style>${styles}</style>
<div id="root"></div>
<script type="application/json" id="preview-data">${safeScript(JSON.stringify(data))}</script>
${scripts}
`;
const out = join(dist, "lemuse-preview.html");
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KiB)`);
