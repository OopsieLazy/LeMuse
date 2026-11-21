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
import { SettingsPanel, type ArenaTokenView, type SettingsPanelProps } from "../src/SettingsPanel";
import { ErrorScreen } from "../src/ErrorScreen";
import { RefreshDetails } from "../src/RefreshDetails";
import { PracticePanel, type PracticePanelProps } from "../src/PracticePanel";
import { WelcomePanel } from "../src/WelcomePanel";
import { NoticesPanel } from "../src/NoticesPanel";
import { ShortcutsPanel } from "../src/ShortcutsPanel";
import { DEFAULT_KEYS } from "../src/keys";
import { NO_STUDY, weeklyLog, type SessionResult } from "../src/practice";
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
  // Museum slides carry a label and CC0 (ADR-0029); Are.na ones don't.
  ...(i % 2
    ? {}
    : {
        date: "c. 1650–1700",
        medium: "Walnut, with later upholstery",
        dimensions: "Overall: 104.1 x 52.7 x 48.3 cm (41 x 20 3/4 x 19 in.)",
        credit: "Gift of a long-named family foundation in memory of a collector, 1929.323",
        license_id: "CC0-1.0",
      }),
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
  /** The timed-session planner or summary (ADR-0025). */
  practice?: Partial<PracticePanelProps>;
  /** Extra Settings props (Content, Updates; ADR-0027, ADR-0028). */
  settingsExtra?: Partial<SettingsPanelProps>;
  shortcuts?: boolean | "edit";
  /** The first-run welcome (ADR-0029). */
  welcome?: boolean;
  /** Third-party licences (ADR-0030). */
  notices?: string;
}

// A tall portrait image is the case that used to run under the control bar.
const tall: Slide = { ...slides[0], block_id: 9001, width: 1200, height: 3000, title: "Tall portrait test image" };
const wide: Slide = { ...slides[0], block_id: 9002, width: 4000, height: 900, title: "Wide panorama test image" };

// Practice tools (ADR-0025).
const studyOn = { ...NO_STUDY, mirror: true, tones: 3 as const, balance: 0.2, grid: "thirds" as const };
const running = { planName: "Class", pose: 7, poses: 18, round: 1, rounds: 4, left: 24, total: 30, paused: false };
const sessionResult: SessionResult = {
  startedAt: Date.UTC(2026, 10, 19, 14, 5),
  planName: "Gesture warm-up",
  from: topics[0].name,
  drawn: slides.slice(0, 8).map((s) => ({
    block_id: s.block_id,
    title: s.title,
    display_url: s.display_url,
    creator: s.creator,
    seconds: 30,
  })),
  seconds: 240,
  skipped: 2,
  finished: true,
};
const practiceBase: PracticePanelProps = {
  view: "plan",
  planId: "class",
  customRounds: [{ count: 5, seconds: 60 }],
  sound: true,
  from: topics[0].name,
  images: 420,
};

export const STATES: Record<string, State> = {
  playing: { props: base },
  "study-menu": { props: { ...base, studyMenuOpen: true, study: studyOn } },
  "study-aids": { props: { ...base, slides: [tall], index: 0, study: { ...studyOn, grid: "squares", upside: true } } },
  "study-notan-squint": { props: { ...base, study: { ...NO_STUDY, tones: 2, squint: true, grid: "diagonals" } } },
  "study-cover": { props: { ...base, study: { ...NO_STUDY, grey: true, grid: "quarters" } }, settings: { fit: "cover" } },
  favourite: { props: { ...base, favourite: true } },
  "favourites-empty": {
    props: { ...base, playlists: [...playlists, { id: 3, name: "Favourites", items: 0 }], active: { kind: "playlist", id: 3 }, activeLabel: "Favourites", slides: [], index: 0 },
  },
  "session-running": { props: { ...base, session: running } },
  "session-paused": { props: { ...base, session: { ...running, paused: true, left: 3 } } },
  "session-mini": { props: { ...base, mini: true, session: { ...running, left: 4 } }, mini: true },
  "practice-plan": { props: base, practice: {} },
  "practice-custom": {
    props: base,
    practice: { planId: "custom", customRounds: [{ count: 10, seconds: 30 }, { count: 3, seconds: 300 }] },
  },
  "practice-summary": {
    props: base,
    practice: { view: "summary", result: sessionResult, favourites: [slides[1].block_id], kept: "Kept as “Session 19 Nov, 14:05” (8 images). It's in Playlists." },
  },
  "practice-summary-empty": {
    props: base,
    practice: { view: "summary", result: { ...sessionResult, drawn: [], seconds: 0, finished: false }, onResume: () => undefined },
  },
  shortcuts: { props: base, shortcuts: true },
  "shortcuts-edit": { props: base, shortcuts: "edit", settings: { singleKeys: false, keys: { ...DEFAULT_KEYS, save: "", bar: "F2" } } },
  // Finishing 1.0 (ADR-0029).
  "museum-label": { props: { ...base, index: 0 } },
  "museum-label-compact": { props: { ...base, index: 0, compactBarOpen: true }, compactBar: true },
  "grid-view": { props: { ...base, grid: true, index: 2 } },
  "grid-view-cinema": { props: { ...base, grid: true }, settings: { layout: "cinema" } },
  // The bar hidden (H): its ⌃ arrow must not cover a grid image (owner, session 20).
  "grid-view-bar-hidden": {
    props: {
      ...base,
      grid: true,
      slides: Array.from({ length: 36 }, (_, i) => ({ ...slides[i % slides.length], block_id: 9000 + i })),
    },
    settings: { controlsHidden: true },
  },
  "session-ring": { props: { ...base, session: { ...running, total: 30 }, clockStyle: "ring", flashKey: 3 } },
  "session-small-warn": { props: { ...base, session: { ...running, total: 30, left: 4 }, clockStyle: "small" } },
  "session-clock-hidden": { props: { ...base, session: { ...running, total: 30 }, clockStyle: "hidden" } },
  "toast-undo": { props: { ...base, toast: "Hidden. Settings → Content shows it again.", onUndo: () => undefined } },
  "search-results": { props: { ...base, active: { kind: "search", query: "chair" }, activeLabel: "“chair”", savedCount: 12 } },
  "search-empty": {
    props: { ...base, active: { kind: "search", query: "zzz" }, activeLabel: "“zzz”", slides: [], index: 0, total: 0 },
  },
  "saved-empty": { props: { ...base, active: { kind: "saved" }, activeLabel: "Saved", slides: [], index: 0, total: 0 } },
  "surround-mid": { props: base, settings: { surround: "mid" } },
  "surround-black-dark": { props: base, settings: { surround: "black", mode: "dark" } },
  welcome: { props: base, welcome: true },
  notices: {
    props: base,
    notices: [
      "LeMuse: third-party notices",
      "",
      "== Packages ==",
      "",
      ...Array.from({ length: 40 }, (_, i) => `example-crate-${i} 1.0.${i} (MIT OR Apache-2.0)  https://example.org/crate-${i}`),
    ].join("\n"),
  },
  "image-ready": { props: { ...base, imageReady: true } },
  // Followed channels as their own topics, under a heading (ADR-0026 addendum).
  "rail-following": {
    props: {
      ...base,
      topics: [
        ...topics,
        ...["Jewellery", "Jewellery · Ben", "False planets", "Typography :: Retro", "A followed channel with a long name that wraps"].map(
          (name, i) => ({ name, slide_seconds: 8, shuffle: true, sources: 1, slides: 120 + i * 37, channels: [`c-${i}`], group: "Following on Are.na" }),
        ),
      ],
    },
  },
  // Session 17 (ADR-0026, ADR-0027, ADR-0028).
  "study-9-darks": { props: { ...base, study: { ...NO_STUDY, tones: 9, focus: "darks" } } },
  "study-5-extremes": { props: { ...base, slides: [tall], index: 0, study: { ...NO_STUDY, tones: 5, focus: "extremes" } } },
  "study-strokes": { props: { ...base, study: { ...NO_STUDY, effect: "vertical", tones: 4, squint: true } } },
  "study-lines-cover": { props: { ...base, study: { ...NO_STUDY, effect: "lines", tones: 3, grid: "thirds" } }, settings: { fit: "cover" } },
  "study-menu-effects": {
    props: { ...base, studyMenuOpen: true, study: { ...NO_STUDY, tones: 7, focus: "lights", effect: "cross" } },
  },
  "update-available": { props: { ...base, update: { version: "1.0.0", url: "https://github.com/OopsieLazy/LeMuse/releases/tag/v1.0.0" } } },
  "settings-content-updates": {
    props: base,
    panel: true,
    about: { version: "0.10.0", licence: "MIT", repository: "https://github.com/OopsieLazy/LeMuse" },
    settingsExtra: {
      marks: { hidden: 12, nudity: 3 },
      contentNote: "Cleared 4 practice sessions.",
      update: {
        state: "available",
        release: { version: "1.0.0", name: "LeMuse 1.0.0", url: "https://github.com/OopsieLazy/LeMuse/releases/tag/v1.0.0", published_at: null, newer: true },
      },
    },
    settings: { showNudity: false, singleKeys: false },
  },
  "practice-plan-log": {
    props: base,
    practice: {
      log: weeklyLog(
        [
          { started_at: Date.UTC(2026, 10, 18) / 1000, drawings: 24, seconds: 1800 },
          { started_at: Date.UTC(2026, 10, 12) / 1000, drawings: 10, seconds: 300 },
          { started_at: Date.UTC(2026, 9, 30) / 1000, drawings: 36, seconds: 3600 },
        ],
        Date.UTC(2026, 10, 19, 12),
      ),
    },
  },
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
  // Your own themes (ADR-0032): Pine & coral built in, a custom one applied, and the editor.
  "pine-coral": { props: base, settings: { preset: "pine" } },
  "pine-coral-menu": { props: { ...base, contextMenu: { x: 760, y: 720, above: true } }, settings: { preset: "pine" } },
  "custom-theme": {
    props: base,
    settings: {
      preset: "custom",
      customTheme: "tnight",
      customThemes: [
        { id: "tnight", name: "Night shift", bg: "#101418", panel: "#182028", text: "#e8e8e8", accent: "#ffb000" },
        { id: "tsand", name: "Sand and ink, a long theme name", bg: "#efe6d2", panel: "#f7f1e3", text: "#1d1a16", accent: "#e4572e" },
      ],
    },
    panel: true,
  },
  "custom-theme-editor": {
    props: base,
    settings: {
      preset: "custom",
      customTheme: "tnight",
      customThemes: [{ id: "tnight", name: "Night shift", bg: "#101418", panel: "#182028", text: "#e8e8e8", accent: "#ffb000" }],
    },
    panel: true,
    settingsExtra: { staticThemeDraft: { name: "Cream & pine", bg: "#f4ecdc", panel: "#fbf6ec", text: "#183a2f", accent: "#ff7f66" } },
  },
  "custom-theme-editor-unreadable": {
    props: base,
    panel: true,
    settingsExtra: { staticThemeDraft: { name: "Too faint", bg: "#f2f3f1", panel: "#fafaf8", text: "#b0b0b0", accent: "#3150c2" } },
  },
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
            { slug: "chairs-xyz", title: "Chairs", owner: "Example Person", contents: 412, in_topics: [topics[0].name], suggested: topics[0].name, own_topic: "Chairs" },
            { slug: "joinery-abc", title: "Joinery details", owner: null, contents: 88, in_topics: [], suggested: topics[1].name, own_topic: "Joinery details" },
            { slug: "a-very-long-channel-name-for-wrapping", title: "A very long followed channel title that has to wrap neatly", owner: "Someone", contents: 1203, in_topics: [], suggested: topics[1].name, own_topic: "A very long followed channel title that has to wrap neatly" },
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
  // The bar's ⋯ opens the same menu above it (ADR-0031).
  "more-menu": { props: { ...base, contextMenu: { x: 760, y: 720, above: true } } },
  "context-menu-preview": { props: { ...base, mode: "preview", contextMenu: { x: 300, y: 200 } } },
  // Save as (ADR-0031): the note stays until its × (placeholder path, never a real one).
  saved: {
    props: {
      ...base,
      slides: base.slides.map((s) => ({ ...s, saved: true })),
      savedNote: { folder: "C:\\Users\\you\\Pictures\\References", file: "Oak_ chair_ [7].jpg" },
      onDismissSavedNote: () => undefined,
    },
  },
  "saved-long-path-mini": {
    props: {
      ...base,
      mini: true,
      savedNote: {
        folder: "D:\\Drawing\\References\\Furniture and objects\\Chairs, stools and benches\\2026",
        file: "A rather long image title that goes on for a while [12345].jpg",
      },
      onDismissSavedNote: () => undefined,
    },
    mini: true,
  },
  "saved-with-toast": {
    props: {
      ...base,
      savedNote: { folder: "C:\\Users\\you\\Pictures\\References", file: "Oak_ chair_ [7].jpg" },
      onDismissSavedNote: () => undefined,
      toast: "Link copied",
    },
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
  "discover-nested": {
    props: base,
    discover: {
      preview: {
        channel: { slug: "see-through-things", title: "See-through things", contents: 3 },
        items: [],
        channels: [
          { slug: "clear-plastic-cases", title: "Clear plastic cases", owner: "Example Person", contents: 120 },
          { slug: "see-through-gadgets", title: "See-through gadgets", owner: "Another Person", contents: 48 },
          { slug: "glass-objects", title: "Glass objects with a rather long channel title", owner: null, contents: null },
        ],
      },
      previewLink: "https://www.are.na/someone/see-through-things",
      status: { tone: "ok", text: "Previewing See-through things. Add it to a topic below if you like it." },
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
    renderToStaticMarkup(<SlideshowView {...st.props} controlsHidden={settings.controlsHidden} cover={settings.fit === "cover"} />) +
    (st.panel
      ? renderToStaticMarkup(
          <SettingsPanel settings={settings} arena={st.arena} about={st.about} staticOpen {...st.settingsExtra} />,
        )
      : "") +
    (st.refreshDetails ? renderToStaticMarkup(<RefreshDetails {...st.refreshDetails} staticOpen />) : "") +
    (st.practice ? renderToStaticMarkup(<PracticePanel {...practiceBase} {...st.practice} staticOpen />) : "") +
    (st.shortcuts === true ? renderToStaticMarkup(<ShortcutsPanel staticOpen />) : "") +
    (st.shortcuts === "edit"
      ? renderToStaticMarkup(
          <ShortcutsPanel staticOpen staticCapturing="favourite" keys={settings.keys} lettersOff={!settings.singleKeys} />,
        )
      : "") +
    (st.welcome ? renderToStaticMarkup(<WelcomePanel topics={st.props.topics} staticOpen />) : "") +
    (st.notices !== undefined ? renderToStaticMarkup(<NoticesPanel text={st.notices} staticOpen />) : "") +
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
