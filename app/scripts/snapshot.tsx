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
import type { ChannelPreview, Playlist, Slide, TopicInfo, Vocabulary } from "../src/api";
import { DiscoverPanel, type DiscoverPanelProps } from "../src/DiscoverPanel";
import { LibraryPanel, type LibraryPanelProps } from "../src/LibraryPanel";
import { SettingsPanel, type ArenaTokenView } from "../src/SettingsPanel";
import { ErrorScreen } from "../src/ErrorScreen";
import { RefreshDetails } from "../src/RefreshDetails";
import { DEFAULTS, rootAttributes, sanitize, type UiSettings } from "../src/settings";
import { SlideshowView, type SlideshowViewProps } from "../src/SlideshowView";
import sample from "./sample-data.json";

const topics: TopicInfo[] = sample.topics.map(({ slides, ...t }, i) => ({
  ...t,
  slides: slides.length,
  channels: i === 0 ? ["objects-26", "poetry-in-objects", "gesture-incense"] : [],
}));
const playlists: Playlist[] = [
  { id: 1, name: "Chair studies", items: 24 },
  { id: 2, name: "A deliberately long playlist name that has to wrap", items: 3 },
];
// Sample metadata predates categories; give each slide some (ADR-0015).
const CATS = [["sculpture", "ceramic"], ["furniture", "wood"], ["metal", "tools-instruments"], ["print", "paper"]];
const slides: Slide[] = sample.topics[0].slides.map((s, i) => ({
  ...s,
  categories: ["image", ...CATS[i % CATS.length]],
  connector: i % 2 ? "arena" : "cleveland",
}));

// A slice of the built-in vocabulary (crates/lemuse-core/assets/categories.toml).
const vocabulary: Vocabulary = {
  groups: [
    { id: "kind", label: "Kind", categories: [{ id: "image", label: "Image" }, { id: "web-page", label: "Web page" }] },
    {
      id: "material",
      label: "Material",
      categories: [
        { id: "wood", label: "Wood" },
        { id: "metal", label: "Metal" },
        { id: "ceramic", label: "Ceramic & clay" },
        { id: "rubber", label: "Rubber & silicone" },
        { id: "paper", label: "Paper & card" },
        { id: "bone-ivory-shell", label: "Bone, ivory & shell" },
      ],
    },
    {
      id: "medium",
      label: "Medium & method",
      categories: [
        { id: "print", label: "Print" },
        { id: "sculpture", label: "Sculpture" },
        { id: "painting", label: "Painting" },
        { id: "casting-molding", label: "Casting & molds" },
      ],
    },
    {
      id: "object",
      label: "Object",
      categories: [
        { id: "furniture", label: "Furniture" },
        { id: "tools-instruments", label: "Tools & instruments" },
        { id: "electronics", label: "Electronics & tech" },
      ],
    },
  ],
  discover: [
    { label: "Drawing practice", words: ["gesture drawing", "figure drawing", "drapery", "perspective"] },
    { label: "CAD & making", words: ["exploded view", "joinery", "injection molding", "sheet metal"] },
    { label: "Material", words: ["rubber", "wood", "plywood", "silicone"] },
  ],
};
const categoryCounts = {
  image: 4484, "web-page": 412, wood: 327, metal: 255, ceramic: 270, rubber: 1, paper: 12,
  "bone-ivory-shell": 36, print: 262, sculpture: 302, painting: 286, "casting-molding": 217,
  furniture: 812, "tools-instruments": 108, electronics: 321,
};
const channelPreview: ChannelPreview = {
  channel: { slug: "woodworking", title: "Woodworking", contents: 214 },
  items: slides.slice(0, 12).map((s, i) => ({
    title: i === 3 ? null : s.title,
    image_url: s.display_url,
    kind: "image",
  })),
};

const base: SlideshowViewProps = {
  mode: "app",
  topics,
  playlists,
  allCount: 4484,
  active: { kind: "topic", name: topics[0].name },
  activeLabel: topics[0].name,
  inPlaylists: [1],
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
  vocabulary,
  categoryCounts,
};

interface State {
  props: SlideshowViewProps;
  settings?: Partial<UiSettings>;
  fullscreen?: boolean;
  panel?: boolean;
  /** The Are.na account section of Settings (ADR-0023). */
  arena?: ArenaTokenView;
  /** Settings → About (ADR-0024). */
  about?: { version: string; licence: string; repository: string };
  /** The crash page instead of the app (ADR-0024). */
  crash?: { code: string; message: string };
  /** Refresh details dialog (ADR-0024). */
  refreshDetails?: { failed: string[]; total: number };
  library?: Partial<LibraryPanelProps>;
  discover?: Partial<DiscoverPanelProps>;
  mini?: boolean;
  /** Compact windows: the tapped-open bar. */
  compactBar?: boolean;
}

// A tall portrait image is the case that used to run under the control bar.
const tall: Slide = { ...slides[0], block_id: 9001, width: 1200, height: 3000, title: "Tall portrait test image" };
const wide: Slide = { ...slides[0], block_id: 9002, width: 4000, height: 900, title: "Wide panorama test image" };

export const STATES: Record<string, State> = {
  playing: { props: base },
  paused: { props: { ...base, playing: false, index: 0 } },
  refreshing: { props: { ...base, refresh: { label: "Refreshing topics", busy: true, tone: "idle" } } },
  "empty-topic": { props: { ...base, active: { kind: "topic", name: "Molds" }, activeLabel: "Molds", slides: [], index: 0 } },
  all: { props: { ...base, active: { kind: "all" }, activeLabel: "All" } },
  playlist: { props: { ...base, active: { kind: "playlist", id: 1 }, activeLabel: "Chair studies", shuffle: false } },
  "playlist-empty": {
    props: { ...base, active: { kind: "playlist", id: 1 }, activeLabel: "Chair studies", slides: [], index: 0 },
  },
  "no-playlists": { props: { ...base, playlists: [], inPlaylists: [] } },
  "playlist-menu": { props: { ...base, slides: [tall], index: 0, playlistMenuOpen: true } },
  "playlist-menu-empty": {
    props: {
      ...base,
      playlists: [],
      inPlaylists: [],
      playlistMenuOpen: true,
      playlistMenuError: "Give the playlist a name.",
    },
  },
  "playlist-menu-top": {
    props: { ...base, slides: [tall], index: 0, playlistMenuOpen: true },
    settings: { layout: "caption-top" },
  },
  "playlist-menu-cinema": { props: { ...base, playlistMenuOpen: true }, settings: { layout: "cinema" } },
  "library-open": { props: base, library: {} },
  "library-added": {
    props: base,
    library: { status: { tone: "ok", text: "Added Woodworking (4 items) to Objects. Its images are loading now." } },
  },
  "library-error": {
    props: base,
    library: {
      status: { tone: "error", text: "Only are.na channel links can be added." },
      playlistStatus: { tone: "error", text: "There's already a playlist named Chair studies." },
    },
  },
  "library-busy-empty": {
    props: { ...base, playlists: [] },
    library: { busy: true, playlists: [], status: { tone: "idle", text: "Checking the channel with Are.na" } },
  },
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
  "settings-token-none": {
    props: base,
    panel: true,
    arena: { mode: "app", status: { saved: false, account: null } },
  },
  "settings-token-saved": {
    props: base,
    panel: true,
    arena: {
      mode: "app",
      status: { saved: true, account: "example-person" },
      message: { text: "Saved for example-person (free account). The next refresh uses it.", tone: "ok" },
    },
  },
  "settings-token-refused": {
    props: { ...base, refresh: { label: "Are.na refused your saved token, so this refresh ran as a guest.", busy: false, tone: "error" } },
    panel: true,
    arena: {
      mode: "app",
      status: { saved: false, account: null },
      message: { text: "Are.na didn't accept that token. Make a new one and paste it again.", tone: "error" },
    },
  },
  "settings-about": {
    props: base,
    panel: true,
    arena: { mode: "app", status: { saved: true, account: "example-person" } },
    about: { version: "0.8.0", licence: "MIT", repository: "https://github.com/OopsieLazy/LeMuse" },
  },
  "crash-screen": {
    props: base,
    crash: { code: "ui_crash", message: "Cannot read properties of undefined (reading 'display_url')" },
  },
  "refresh-details": {
    props: {
      ...base,
      refresh: { label: "Updated 120 images, 2 sources failed", busy: false, tone: "error", details: true },
    },
    refreshDetails: {
      failed: [
        "arena: That channel is private. Save your Are.na token in Settings to open your own private channels.",
        "temporary problem reaching cleveland: timed out after 3 tries",
      ],
      total: 2,
    },
  },
  offline: { props: { ...base, slides: [], offline: true } },
  "images-failed": { props: { ...base, slides: [], imagesFailed: 12 } },
  "discover-following": {
    props: base,
    discover: {
      canFollow: true,
      following: {
        result: {
          channels: [
            { slug: "chairs-xyz", title: "Chairs", owner: "Example Person", contents: 412 },
            { slug: "joinery-abc", title: "Joinery details", owner: null, contents: 88 },
          ],
          total: 21,
          next_page: 2,
        },
      },
    },
  },
  "discover-following-no-token": { props: base, discover: { canFollow: false } },
  "settings-token-preview": { props: { ...base, mode: "preview" }, panel: true, arena: { mode: "preview", status: null } },
  // ---- Compact windows (tablets, small windows); wide sizes are unaffected ----
  "compact-bar": { props: { ...base, compactBarOpen: true }, compactBar: true },
  "compact-drawer": { props: { ...base, railOpen: true } },
  "compact-bar-menu": { props: { ...base, compactBarOpen: true, playlistMenuOpen: true }, compactBar: true },
  // ---- ADR-0016: mini player, Copy link ----
  mini: { props: { ...base, mini: true }, mini: true },
  "mini-bar": { props: { ...base, mini: true, miniBarOpen: true }, mini: true },
  "mini-menu": { props: { ...base, mini: true, miniMenuOpen: true }, mini: true },
  "mini-tall": { props: { ...base, mini: true, slides: [tall], index: 0 }, mini: true },
  "mini-empty": { props: { ...base, mini: true, slides: [], index: 0, total: 0 }, mini: true },
  "link-copied": { props: { ...base, toast: "Link copied" } },
  "context-menu": { props: { ...base, contextMenu: { x: 300, y: 200 } } },
  "context-menu-preview": { props: { ...base, mode: "preview", contextMenu: { x: 300, y: 200 } } },
  saved: {
    props: { ...base, slides: base.slides.map((s) => ({ ...s, saved: true })), toast: "Saved to LeMuse › views › Wood objects" },
  },
  // ---- ADR-0015: pages, categories, Find channels ----
  pages: { props: { ...base, active: { kind: "all" }, activeLabel: "All", total: 4489, page: 1 } },
  "pages-cinema": {
    props: { ...base, active: { kind: "all" }, activeLabel: "All", total: 4489, page: 8 },
    settings: { layout: "cinema" },
  },
  "filter-menu": {
    props: {
      ...base,
      total: 812,
      filterMenuOpen: true,
      filter: { include: ["furniture"], exclude: ["painting"] },
    },
  },
  "filter-menu-top": {
    props: { ...base, slides: [tall], index: 0, filterMenuOpen: true, filter: { include: ["wood"], exclude: [] } },
    settings: { layout: "caption-top" },
  },
  "filter-empty": {
    props: { ...base, slides: [], index: 0, total: 0, filter: { include: ["rubber", "furniture"], exclude: [] } },
  },
  "discover-open": { props: base, discover: {} },
  "discover-preview": {
    props: base,
    discover: {
      preview: channelPreview,
      previewLink: "https://www.are.na/someone/woodworking",
      status: { tone: "ok", text: "Previewing Woodworking. Add it to a topic below if you like it." },
    },
  },
  "discover-related": {
    props: base,
    discover: {
      related: {
        imageTitle: "Part of a chair",
        result: {
          total: 107,
          next_page: 2,
          channels: [
            { slug: "pretty-things", title: "Pretty things", owner: "Example Owner", contents: 51 },
            { slug: "objects-forms-rituals", title: "Objects, forms, rituals", owner: null, contents: 103 },
            {
              slug: "long",
              title: "A channel with a deliberately long title that has to wrap onto a second line",
              owner: "Another Owner",
              contents: null,
            },
          ],
        },
      },
    },
  },
  "discover-busy-preview-mode": {
    props: { ...base, mode: "preview" },
    discover: { busy: true, related: { imageTitle: "Untitled", result: null } },
  },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function documentFor(name: string, st: State, extraHead = "") {
  const settings = sanitize({ ...DEFAULTS, ...st.settings });
  const { attrs, style } = rootAttributes(settings, {
    fullscreen: st.fullscreen,
    mini: st.mini,
    compactBar: st.compactBar,
  });
  const attrText = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join("");
  const styleText = Object.entries(style)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
  if (st.crash) {
    return page(name, attrText, styleText, renderToStaticMarkup(<ErrorScreen {...st.crash} />), extraHead);
  }
  const body =
    renderToStaticMarkup(<SlideshowView {...st.props} controlsHidden={settings.controlsHidden} />) +
    (st.panel
      ? renderToStaticMarkup(<SettingsPanel settings={settings} arena={st.arena} about={st.about} staticOpen />)
      : "") +
    (st.refreshDetails ? renderToStaticMarkup(<RefreshDetails {...st.refreshDetails} staticOpen />) : "") +
    (st.library
      ? renderToStaticMarkup(
          <LibraryPanel
            mode={st.props.mode}
            topics={st.props.topics}
            playlists={st.props.playlists}
            staticOpen
            {...st.library}
          />,
        )
      : "") +
    (st.discover
      ? renderToStaticMarkup(
          <DiscoverPanel
            mode={st.props.mode}
            vocabulary={st.props.vocabulary ?? null}
            topics={st.props.topics}
            staticOpen
            {...st.discover}
          />,
        )
      : "");
  return page(name, attrText, styleText, body, extraHead);
}

function page(name: string, attrText: string, styleText: string, body: string, extraHead: string) {
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
    discover: st.discover && {
      ...st.discover,
      preview: st.discover.preview && {
        ...st.discover.preview,
        items: st.discover.preview.items.map((it) => ({ ...it, image_url: placeholder(400, 300) })),
      },
    },
  };
  layoutDocs.push({ name, html: documentFor(name, swapped, `\n<style>${css}</style>`), images: swapped.props.slides.length ? 1 : 0 });
}
writeFileSync(join(outLayout, "states.json"), JSON.stringify(layoutDocs));
console.log(`rendered ${layoutDocs.length} UI states (W3C: ${outHtml}, layout: ${outLayout})${css ? "" : " (no CSS: run npm run build first)"}`);
