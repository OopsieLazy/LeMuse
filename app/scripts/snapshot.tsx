// Renders the real UI markup (SlideshowView) to static HTML documents so the
// W3C Nu HTML Checker validates what users actually see, not just the empty
// index.html shell. Built by `vite build --ssr` and run before
// scripts/validate-w3c.mjs. Uses committed sample metadata, so it is
// deterministic and needs no network or catalog.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Slide, TopicInfo } from "../src/api";
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
    root: "C:\\Users\\you\\Pictures\\ServeNSurf",
    blocks: sample.blocks,
    schema_version: 2,
    refreshing: false,
  },
  refresh: { label: "Up to date · 12 new or changed", busy: false, tone: "ok" },
};

const states: Record<string, SlideshowViewProps> = {
  playing: base,
  paused: { ...base, playing: false, index: 0 },
  refreshing: { ...base, refresh: { label: "Refreshing topics", busy: true, tone: "idle" } },
  "empty-topic": { ...base, active: "Molds", slides: [], index: 0 },
  "refresh-error": { ...base, refresh: { label: "Refresh failed: offline", busy: false, tone: "error" } },
  preview: { ...base, mode: "preview" },
};

const out = process.argv[2] ?? ".snapshot/html";
mkdirSync(out, { recursive: true });
for (const [name, props] of Object.entries(states)) {
  const body = renderToStaticMarkup(<SlideshowView {...props} />);
  const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ServeNSurf (${name})</title>
</head>
<body>
<div id="root">${body}</div>
</body>
</html>
`;
  writeFileSync(join(out, `${name}.html`), doc);
}
console.log(`rendered ${Object.keys(states).length} UI states to ${out}`);
