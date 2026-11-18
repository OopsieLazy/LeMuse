// Renders the real UI (SlideshowView + SettingsPanel) to static HTML so we can
// check what users actually see:
//   .snapshot/html/*.html      → W3C Nu HTML Checker (scripts/validate-w3c.mjs)
//   .snapshot/layout/states.json → layout test in headless Edge (scripts/layout-test.mjs)
// Built by `vite build --ssr` after `npm run build` (the layout docs inline the
// built CSS). Uses committed sample metadata; layout docs swap every image for
// a same-size inline SVG, so nothing is fetched and nothing is cached.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Slide, TopicInfo } from "../src/api";
import { SettingsPanel } from "../src/SettingsPanel";
import { DEFAULTS, rootAttributes, sanitize, type UiSettings } from "../src/settings";
import { SlideshowView, type SlideshowViewProps } from "../src/SlideshowView";
import sample from "./sample-data.json";

const topics: TopicInfo[] = sample.topics.map(({ slides, ...t }) => ({ ...t, slides: slides.length }));
const slides = sample.topics[0].slides as Slide[];

const base: SlideshowViewProps = {
  mode: "app",
  topics,
  active: topics[0].name,
  slides,
  index: 1,
  playing: true,
  shuffle: true,
  slideSeconds: 8,
  tick: 1,
  status: {
    root: "C:\\Users\\you\\Pictures\\LeMuse",
    blocks: sample.blocks,
    schema_version: 2,
    refreshing: false,
  },
  refresh: { label: "Up to date · 12 new or changed", busy: false, tone: "ok" },
};

interface State {
  props: SlideshowViewProps;
  settings?: Partial<UiSettings>;
  fullscreen?: boolean;
  panel?: boolean;
}

// A tall portrait image is the case that used to run under the control bar.
const tall: Slide = { ...slides[0], block_id: 9001, width: 1200, height: 3000, title: "Tall portrait test image" };
const wide: Slide = { ...slides[0], block_id: 9002, width: 4000, height: 900, title: "Wide panorama test image" };

export const STATES: Record<string, State> = {
  playing: { props: base },
  paused: { props: { ...base, playing: false, index: 0 } },
  refreshing: { props: { ...base, refresh: { label: "Refreshing topics", busy: true, tone: "idle" } } },
  "empty-topic": { props: { ...base, active: "Molds", slides: [], index: 0 } },
  "refresh-error": { props: { ...base, refresh: { label: "Refresh failed: offline", busy: false, tone: "error" } } },
  preview: { props: { ...base, mode: "preview" } },
  "tall-image": { props: { ...base, slides: [tall], index: 0 } },
  "wide-image": { props: { ...base, slides: [wide], index: 0 } },
  "controls-hidden": { props: { ...base, slides: [tall], index: 0 }, settings: { controlsHidden: true } },
  "rail-right": { props: { ...base, slides: [tall], index: 0 }, settings: { layout: "rail-right" } },
  "caption-top": { props: { ...base, slides: [tall], index: 0 }, settings: { layout: "caption-top" } },
  cinema: { props: { ...base, slides: [tall], index: 0 }, settings: { layout: "cinema", preset: "gallery" } },
  minimal: { props: { ...base, slides: [tall], index: 0 }, settings: { layout: "minimal", preset: "paper" } },
  "cinema-drawer": { props: { ...base, railOpen: true }, settings: { layout: "cinema" } },
  fullscreen: { props: { ...base, slides: [tall], index: 0, fullscreen: true }, fullscreen: true },
  "blueprint-technical": { props: base, settings: { preset: "blueprint", font: "technical", uiScale: 1.2 } },
  "millennium-cover": { props: base, settings: { preset: "millennium", font: "millennium", fit: "cover" } },
  "settings-open": { props: base, settings: { accent: "#c2410c" }, panel: true },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function documentFor(name: string, st: State, extraHead = "") {
  const settings = sanitize({ ...DEFAULTS, ...st.settings });
  const { attrs, style } = rootAttributes(settings, { fullscreen: st.fullscreen });
  const attrText = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join("");
  const styleText = Object.entries(style)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
  const body =
    renderToStaticMarkup(<SlideshowView {...st.props} controlsHidden={settings.controlsHidden} />) +
    (st.panel ? renderToStaticMarkup(<SettingsPanel settings={settings} staticOpen />) : "");
  return `<!doctype html>
<html lang="en"${attrText} style="${esc(styleText)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LeMuse (${name})</title>${extraHead}
</head>
<body>
<div id="root">${body}</div>
</body>
</html>
`;
}

function placeholder(w: number, h: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#888"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const outHtml = join(".snapshot", "html");
const outLayout = join(".snapshot", "layout");
mkdirSync(outHtml, { recursive: true });
mkdirSync(outLayout, { recursive: true });

const assets = join("dist", "assets");
const css = existsSync(assets)
  ? readdirSync(assets)
      .filter((f) => f.endsWith(".css"))
      .map((f) => readFileSync(join(assets, f), "utf8"))
      .join("\n")
  : "";

const layoutDocs: { name: string; html: string; images: number }[] = [];
for (const [name, st] of Object.entries(STATES)) {
  writeFileSync(join(outHtml, `${name}.html`), documentFor(name, st));
  const swapped: State = {
    ...st,
    props: {
      ...st.props,
      slides: st.props.slides.map((s) => ({ ...s, display_url: placeholder(s.width ?? 1200, s.height ?? 900) })),
    },
  };
  layoutDocs.push({ name, html: documentFor(name, swapped, `\n<style>${css}</style>`), images: swapped.props.slides.length ? 1 : 0 });
}
writeFileSync(join(outLayout, "states.json"), JSON.stringify(layoutDocs));
console.log(`rendered ${layoutDocs.length} UI states (W3C: ${outHtml}, layout: ${outLayout})${css ? "" : " (no CSS: run npm run build first)"}`);
