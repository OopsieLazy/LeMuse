// The only place the UI talks to a backend. Two backends share one shape:
//
// - Tauri (the desktop app): commands in app/src-tauri/src/lib.rs.
// - Preview (a plain browser, `npm run preview:web`, or the design artifact):
//   reads exported catalog metadata (`lemuse preview-data`). Images still
//   stream from the source CDN; nothing is downloaded (ADR-0009).

export interface LibraryStatus {
  root: string;
  blocks: number;
  schema_version: number;
  refreshing: boolean;
}

export interface TopicInfo {
  name: string;
  slide_seconds: number;
  shuffle: boolean;
  sources: number;
  slides: number;
  /** Are.na channel slugs in this topic (Add-channel dialog). */
  channels: string[];
}

/** What the slideshow plays: everything, one topic, or one playlist. */
export type SlideSource = { kind: "all" } | { kind: "topic"; name: string } | { kind: "playlist"; id: number };

export function sourceKey(s: SlideSource | null): string {
  if (!s) return "";
  if (s.kind === "all") return "all";
  return s.kind === "topic" ? `topic:${s.name}` : `playlist:${s.id}`;
}

/** A local list of images (ADR-0014). */
export interface Playlist {
  id: number;
  name: string;
  items: number;
}

export interface AddedChannel {
  topic: string;
  channel: { slug: string; title: string; contents: number | null };
  /** False when the channel was already in that topic. */
  added: boolean;
}

/** Client-side mirror of the core's name rule; the core decides. */
export function nameProblem(kind: string, name: string): string | undefined {
  if (!name.trim()) return `Give the ${kind} a name.`;
  if (name.length > 60) return `${kind[0].toUpperCase()}${kind.slice(1)} names are at most 60 characters.`;
  return undefined;
}

/** One slideshow frame; `display_url` streams from the source CDN. */
export interface Slide {
  block_id: number;
  title: string | null;
  display_url: string;
  width: number | null;
  height: number | null;
  page_url: string | null;
  creator: string | null;
  attribution: string | null;
  saved: boolean;
  /** Category ids LeMuse assigned (ADR-0015). */
  categories: string[];
  /** Connector id: `arena` images offer Related channels. */
  connector: string;
  /** Full-size image link (Copy link). */
  original_url?: string | null;
  /** Other stored sizes, tried in turn when `display_url` fails (ADR-0016). */
  fallback_urls?: string[];
}

/** Result of Save (ADR-0022). `view` is relative to the library folder. */
export interface Saved {
  block_id: number;
  view: string;
  bytes: number;
  already_stored: boolean;
}

/** Where the mini player sat last time, in physical pixels. */
/** Where Are.na makes personal access tokens (free accounts too). */
export const ARENA_TOKEN_PAGE = "https://www.are.na/settings/personal-access-tokens";

export interface TokenStatus {
  saved: boolean;
  account: string | null;
}

export interface ArenaAccount {
  slug: string;
  name: string;
  tier: "guest" | "free" | "premium" | "supporter";
}

export interface MiniBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Images per page of the page menu; the core caps it too. */
export const PAGE_SIZE = 500;

/** Genre-style filter: in every `include` category, in no `exclude` one. */
export interface CategoryFilter {
  include: string[];
  exclude: string[];
}

export const NO_FILTER: CategoryFilter = { include: [], exclude: [] };

export function filterKey(f: CategoryFilter): string {
  return `${[...f.include].sort().join(",")}|${[...f.exclude].sort().join(",")}`;
}

/** off → include → exclude → off. */
export function cycleCategory(f: CategoryFilter, id: string): CategoryFilter {
  if (f.include.includes(id)) return { include: f.include.filter((x) => x !== id), exclude: [...f.exclude, id] };
  if (f.exclude.includes(id)) return { include: f.include, exclude: f.exclude.filter((x) => x !== id) };
  return { include: [...f.include, id], exclude: f.exclude };
}

export interface CategoryCount {
  id: string;
  count: number;
}

export interface Vocabulary {
  groups: { id: string; label: string; categories: { id: string; label: string }[] }[];
  /** Word lists for Discover's dropdown. */
  discover: { label: string; words: string[] }[];
}

/** One thumbnail of a channel preview; shown, never stored. */
export interface PreviewItem {
  title: string | null;
  image_url: string;
  kind: string;
}

export interface ChannelPreview {
  channel: { slug: string; title: string; contents: number | null };
  items: PreviewItem[];
}

export interface ChannelSummary {
  slug: string;
  title: string;
  owner: string | null;
  contents: number | null;
}

export interface RelatedChannels {
  channels: ChannelSummary[];
  total: number | null;
  next_page: number | null;
}

/** Are.na's own search page for a word, opened in the system browser
 * (the search API is Premium-only, ADR-0015). Built with URL, not by
 * splicing text. */
export function arenaSearchUrl(word: string): string {
  const u = new URL("https://www.are.na/search");
  u.searchParams.set("q", word.trim().slice(0, 200));
  return u.toString();
}

export type RefreshEvent =
  | { state: "running"; trigger: string }
  | {
      state: "done";
      trigger: string;
      blocks_upserted: number;
      errors: number;
      note?: string;
      /** What failed and why (first 20), for Refresh details. */
      failed?: string[];
    }
  | { state: "error"; trigger: string; code?: string; message: string };

/**
 * A failure with a stable code (ADR-0024): `invalid`, `not_found`, `busy`,
 * `rate_limited`, `network`, `source`, `token`, `io`, `catalog`,
 * `unsupported` or `internal`. The message is for people.
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** The code of any thrown value (`internal` when it has none). */
export function errorCode(e: unknown): string {
  return e instanceof AppError ? e.code : "internal";
}

export interface About {
  version: string;
  licence: string;
  repository: string;
}

/** The project's own pages, the only GitHub links LeMuse opens. */
export const PROJECT_URL = "https://github.com/OopsieLazy/LeMuse";

export interface Backend {
  kind: "app" | "preview";
  /** Saved look-and-feel settings; untrusted, run them through `sanitize`. */
  loadSettings(): Promise<unknown>;
  saveSettings(settings: unknown): Promise<void>;
  /** Toggle fullscreen; resolves to the new state. */
  toggleFullscreen(): Promise<boolean>;
  /**
   * Enter or leave the mini player (ADR-0016). Entering uses `saved` bounds
   * when they're still on a screen; leaving resolves to the bounds to save.
   */
  setMini(on: boolean, saved: MiniBounds | null): Promise<MiniBounds | null>;
  /** Put text on the clipboard. */
  copyText(text: string): Promise<void>;
  /** Save the image's original into the library folder for this source. */
  saveImage(blockId: number, source: SlideSource): Promise<Saved>;
  /** Open an https link outside the app (system browser). */
  openExternal(url: string): Promise<void>;
  /** Whether an Are.na token is saved, and whose (never the token itself; ADR-0023). */
  arenaTokenStatus(): Promise<TokenStatus>;
  /** Check a pasted token with Are.na, then keep it in Credential Manager. */
  setArenaToken(token: string): Promise<ArenaAccount>;
  clearArenaToken(): Promise<boolean>;
  /** Channels the token's account follows: one page, one read (ADR-0024). */
  followedChannels(page: number): Promise<RelatedChannels>;
  about(): Promise<About>;
  libraryStatus(): Promise<LibraryStatus>;
  topics(): Promise<TopicInfo[]>;
  /** Image count for "All". */
  allCount(): Promise<number>;
  /** One page of slides; the core checks the filter. */
  slides(source: SlideSource, filter?: CategoryFilter, limit?: number, offset?: number): Promise<Slide[]>;
  /** Images in a view after the filter, over all pages. */
  slideCount(source: SlideSource, filter?: CategoryFilter): Promise<number>;
  categoryCounts(source: SlideSource, filter?: CategoryFilter): Promise<CategoryCount[]>;
  vocabulary(): Promise<Vocabulary>;
  /** A pasted channel's first images, before adding it (two Are.na reads). */
  previewChannel(link: string): Promise<ChannelPreview>;
  /** Public channels an Are.na image also appears in (one read per page). */
  relatedChannels(blockId: number, page: number): Promise<RelatedChannels>;
  /** Paste-a-link import; the core validates the link (ADR-0014). */
  addChannel(link: string, topic: string, createTopic: boolean): Promise<AddedChannel>;
  removeChannel(topic: string, channel: string): Promise<boolean>;
  playlists(): Promise<Playlist[]>;
  createPlaylist(name: string): Promise<Playlist>;
  renamePlaylist(id: number, name: string): Promise<boolean>;
  deletePlaylist(id: number): Promise<boolean>;
  setInPlaylist(playlistId: number, blockId: number, present: boolean): Promise<void>;
  /** Ids of the playlists holding this image. */
  playlistsWith(blockId: number): Promise<number[]>;
  refreshNow(): Promise<void>;
  onRefresh(cb: (e: RefreshEvent) => void): () => void;
}

interface PreviewTopic {
  name: string;
  slide_seconds: number;
  shuffle: boolean;
  sources: number;
  channels?: string[];
  slides: Slide[];
}

interface PreviewData {
  blocks: number;
  topics: PreviewTopic[];
  /** Playlists from the catalog (`lemuse serve`, `lemuse preview-data`). */
  playlists?: { id: number; name: string; slides: Slide[] }[];
  vocabulary?: Vocabulary;
}

/**
 * The dashboard token from the page address (`#token=…`, ADR-0019). The
 * fragment never leaves the browser; the token goes only in an
 * Authorization header to the same origin.
 */
function dashboardToken(): string | null {
  if (typeof location === "undefined") return null;
  const t = new URLSearchParams(location.hash.slice(1)).get("token");
  return t && /^[A-Za-z0-9_-]{32,128}$/.test(t) ? t : null;
}

/** How often the dashboard checks for new images (ms). */
const DASHBOARD_POLL_MS = 5 * 60 * 1000;

const SETTINGS_KEY = "lemuse.ui-settings";

/** Only https links ever leave the app (ADR-0012). */
export function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** Sites the desktop app may open in the browser; mirrors the opener scope
 * in src-tauri/capabilities/default.json (ADR-0015). */
const OPEN_HOSTS = new Set(["www.are.na", "are.na", "clevelandart.org", "www.clevelandart.org", "www.artic.edu"]);

export function isOpenable(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password || u.port) return false;
    // GitHub only for LeMuse's own pages (About, Report a problem; ADR-0024).
    if (u.hostname === "github.com") return u.pathname === "/OopsieLazy/LeMuse" || u.pathname.startsWith("/OopsieLazy/LeMuse/");
    return OPEN_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Mini player sizes (logical px). MAIN_MIN mirrors tauri.conf.json. */
const MINI_DEFAULT = { width: 360, height: 225 };
const MINI_MIN = { width: 200, height: 125 };
const MAIN_MIN = { width: 720, height: 480 };
let restore: (MiniBounds & { maximized: boolean }) | null = null;

function tauriBackend(): Backend {
  // Lazy imports keep @tauri-apps/api out of the preview's critical path.
  // Commands reject with `{ code, message }` (ADR-0024); turn that into an
  // AppError so callers get a message and a code.
  const invoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
    const core = await import("@tauri-apps/api/core");
    try {
      return await core.invoke<T>(cmd, args);
    } catch (e) {
      if (e && typeof e === "object" && "message" in e) {
        const o = e as { code?: unknown; message?: unknown };
        throw new AppError(typeof o.code === "string" ? o.code : "internal", String(o.message));
      }
      throw new AppError("internal", String(e));
    }
  };
  return {
    kind: "app",
    libraryStatus: () => invoke<LibraryStatus>("library_status"),
    topics: () => invoke<TopicInfo[]>("topics"),
    allCount: () => invoke<number>("all_count"),
    slides: (source, filter = NO_FILTER, limit = PAGE_SIZE, offset = 0) =>
      invoke<Slide[]>("slides", { source, filter, limit, offset }),
    slideCount: (source, filter = NO_FILTER) => invoke<number>("slide_count", { source, filter }),
    categoryCounts: (source, filter = NO_FILTER) => invoke<CategoryCount[]>("category_counts", { source, filter }),
    vocabulary: () => invoke<Vocabulary>("vocabulary"),
    previewChannel: (link) => invoke<ChannelPreview>("preview_channel", { link }),
    relatedChannels: (blockId, page) => invoke<RelatedChannels>("related_channels", { blockId, page }),
    addChannel: (link, topic, createTopic) => invoke<AddedChannel>("add_channel", { link, topic, createTopic }),
    removeChannel: (topic, channel) => invoke<boolean>("remove_channel", { topic, channel }),
    playlists: () => invoke<Playlist[]>("playlists"),
    createPlaylist: (name) => invoke<Playlist>("create_playlist", { name }),
    renamePlaylist: (id, name) => invoke<boolean>("rename_playlist", { id, name }),
    deletePlaylist: (id) => invoke<boolean>("delete_playlist", { id }),
    setInPlaylist: (playlistId, blockId, present) =>
      invoke<void>("set_in_playlist", { playlistId, blockId, present }),
    playlistsWith: (blockId) => invoke<number[]>("playlists_with", { blockId }),
    refreshNow: () => invoke<void>("refresh_now"),
    loadSettings: () => invoke<unknown>("get_ui_settings"),
    saveSettings: (settings) => invoke<void>("set_ui_settings", { settings }),
    async toggleFullscreen() {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const w = getCurrentWindow();
      const next = !(await w.isFullscreen());
      await w.setFullscreen(next);
      return next;
    },
    async setMini(on, saved) {
      const { getCurrentWindow, availableMonitors, LogicalSize, PhysicalPosition, PhysicalSize } = await import(
        "@tauri-apps/api/window"
      );
      const w = getCurrentWindow();
      if (on) {
        if (await w.isFullscreen()) await w.setFullscreen(false);
        const pos = await w.outerPosition();
        const size = await w.innerSize();
        restore = { x: pos.x, y: pos.y, width: size.width, height: size.height, maximized: await w.isMaximized() };
        if (restore.maximized) await w.unmaximize();
        await w.setDecorations(false);
        await w.setAlwaysOnTop(true);
        await w.setMinSize(new LogicalSize(MINI_MIN.width, MINI_MIN.height));
        // Saved bounds only if their centre is still on a connected screen.
        const screens = await availableMonitors();
        const onScreen =
          saved &&
          screens.some((m) => {
            const cx = saved.x + saved.width / 2;
            const cy = saved.y + saved.height / 2;
            return (
              cx >= m.position.x && cx < m.position.x + m.size.width && cy >= m.position.y && cy < m.position.y + m.size.height
            );
          });
        if (saved && onScreen) {
          await w.setSize(new PhysicalSize(saved.width, saved.height));
          await w.setPosition(new PhysicalPosition(saved.x, saved.y));
        } else {
          await w.setSize(new LogicalSize(MINI_DEFAULT.width, MINI_DEFAULT.height));
        }
        return null;
      }
      const pos = await w.outerPosition();
      const size = await w.innerSize();
      const now = { x: pos.x, y: pos.y, width: size.width, height: size.height };
      await w.setAlwaysOnTop(false);
      await w.setDecorations(true);
      await w.setMinSize(new LogicalSize(MAIN_MIN.width, MAIN_MIN.height));
      if (restore) {
        await w.setSize(new PhysicalSize(restore.width, restore.height));
        await w.setPosition(new PhysicalPosition(restore.x, restore.y));
        if (restore.maximized) await w.maximize();
      }
      restore = null;
      return now;
    },
    copyText: (text) => navigator.clipboard.writeText(text),
    saveImage: (blockId, source) => invoke<Saved>("save_image", { blockId, source }),
    arenaTokenStatus: () => invoke<TokenStatus>("arena_token_status"),
    setArenaToken: (token) => invoke<ArenaAccount>("set_arena_token", { token }),
    clearArenaToken: () => invoke<boolean>("clear_arena_token"),
    followedChannels: (page) => invoke<RelatedChannels>("followed_channels", { page }),
    about: () => invoke<About>("about"),
    async openExternal(url) {
      if (!isOpenable(url)) throw new Error("LeMuse only opens Are.na and museum pages.");
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
    },
    onRefresh(cb) {
      let unlisten: (() => void) | undefined;
      let cancelled = false;
      import("@tauri-apps/api/event").then(({ listen }) =>
        listen<RefreshEvent>("refresh://status", (e) => cb(e.payload)).then((u) => {
          if (cancelled) u();
          else unlisten = u;
        }),
      );
      return () => {
        cancelled = true;
        unlisten?.();
      };
    },
  };
}

/** Preview data: inline `<script id="preview-data">` (artifact) or a JSON file next to the page. */
export function previewBackend(load?: () => Promise<PreviewData>): Backend {
  const token = load ? null : dashboardToken();
  const auth = token ? { Authorization: `Bearer ${token}` } : undefined;
  // Preview playlists live in memory for this page view; they start from the
  // catalog's when the data carries them (the desktop app keeps the real ones).
  const lists = new Map<number, { name: string; ids: number[] }>();
  let nextId = 1;
  let cache: Promise<PreviewData> | undefined;
  const fetchData = async (): Promise<PreviewData> => {
    if (load) return load();
    if (token) {
      const r = await fetch("./api/v1/preview-data?per_topic=300", { headers: auth });
      if (!r.ok) throw new Error(r.status === 401 ? "The dashboard address has an old token: copy the new one from lemuse serve." : `Dashboard error ${r.status}`);
      return (await r.json()) as PreviewData;
    }
    const inline = document.getElementById("preview-data");
    if (inline?.textContent) return JSON.parse(inline.textContent) as PreviewData;
    const r = await fetch("./preview-data.json");
    if (!r.ok) throw new Error("No preview data. Run `npm run preview:data` first.");
    return (await r.json()) as PreviewData;
  };
  const data = () =>
    (cache ??= fetchData().then((d) => {
      lists.clear();
      for (const p of d.playlists ?? []) {
        lists.set(p.id, { name: p.name, ids: p.slides.map((s) => s.block_id) });
        nextId = Math.max(nextId, p.id + 1);
      }
      return d;
    }));
  const allSlides = async () => {
    const seen = new Set<number>();
    return (await data()).topics
      .flatMap((t) => t.slides)
      .filter((s) => !seen.has(s.block_id) && Boolean(seen.add(s.block_id)));
  };
  const inView = async (source: SlideSource, filter: CategoryFilter) => {
    let list: Slide[];
    if (source.kind === "all") list = await allSlides();
    else if (source.kind === "topic") list = (await data()).topics.find((t) => t.name === source.name)?.slides ?? [];
    else {
      const d = await data();
      const known = [...(await allSlides()), ...(d.playlists ?? []).flatMap((p) => p.slides)];
      const byId = new Map(known.map((s) => [s.block_id, s]));
      list = (lists.get(source.id)?.ids ?? []).flatMap((id) => byId.get(id) ?? []);
    }
    return list.filter((s) => {
      const cats = s.categories ?? [];
      return filter.include.every((c) => cats.includes(c)) && !filter.exclude.some((c) => cats.includes(c));
    });
  };
  const checkName = (name: string, except?: number) => {
    const problem = nameProblem("playlist", name);
    if (problem) throw new Error(problem);
    for (const [id, l] of lists) {
      if (id !== except && l.name.toLowerCase() === name.toLowerCase())
        throw new Error(`There's already a playlist named ${name}.`);
    }
  };
  return {
    kind: "preview",
    libraryStatus: async () => ({
      root: token ? "Dashboard (live from lemuse serve)" : "Preview (exported catalog metadata)",
      blocks: (await data()).blocks,
      schema_version: 2,
      refreshing: false,
    }),
    topics: async () =>
      (await data()).topics.map(({ slides, channels, ...t }) => ({
        ...t,
        channels: channels ?? [],
        slides: slides.length,
      })),
    allCount: async () => (await allSlides()).length,
    slides: async (source, filter = NO_FILTER, limit = PAGE_SIZE, offset = 0) =>
      (await inView(source, filter)).slice(offset, offset + limit),
    slideCount: async (source, filter = NO_FILTER) => (await inView(source, filter)).length,
    categoryCounts: async (source, filter = NO_FILTER) => {
      const counts = new Map<string, number>();
      for (const s of await inView(source, filter))
        for (const c of s.categories ?? []) counts.set(c, (counts.get(c) ?? 0) + 1);
      return [...counts].map(([id, count]) => ({ id, count }));
    },
    vocabulary: async () => (await data()).vocabulary ?? { groups: [], discover: [] },
    previewChannel: async () => {
      throw new Error("Channel previews work in the desktop app; the preview is a saved snapshot.");
    },
    relatedChannels: async () => {
      throw new Error("Related channels work in the desktop app.");
    },
    addChannel: async () => {
      throw new Error("Adding channels works in the desktop app; the preview is a saved snapshot.");
    },
    removeChannel: async () => {
      throw new Error("Removing channels works in the desktop app.");
    },
    playlists: async () =>
      (await data()) &&
      [...lists]
        .map(([id, l]) => ({ id, name: l.name, items: l.ids.length }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    createPlaylist: async (name) => {
      checkName(name);
      const id = nextId++;
      lists.set(id, { name, ids: [] });
      return { id, name, items: 0 };
    },
    renamePlaylist: async (id, name) => {
      checkName(name, id);
      const l = lists.get(id);
      if (l) l.name = name;
      return Boolean(l);
    },
    deletePlaylist: async (id) => lists.delete(id),
    setInPlaylist: async (playlistId, blockId, present) => {
      const l = lists.get(playlistId);
      if (!l) throw new Error("That playlist no longer exists.");
      l.ids = l.ids.filter((x) => x !== blockId);
      if (present) l.ids.unshift(blockId);
    },
    playlistsWith: async (blockId) =>
      (await data()) &&
      [...lists].filter(([, l]) => l.ids.includes(blockId)).map(([id]) => id),
    refreshNow: async () => {
      throw new Error("Refresh runs in the desktop app; the preview shows a saved snapshot.");
    },
    // Browser storage is a per-viewer convenience here; it can be missing or
    // throw (private windows), so every access is guarded.
    loadSettings: async () => {
      try {
        return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
      } catch {
        return {};
      }
    },
    saveSettings: async (settings) => {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        /* not persisted in this browser */
      }
    },
    async toggleFullscreen() {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        /* the host page may refuse fullscreen */
      }
      return Boolean(document.fullscreenElement);
    },
    openExternal: async (url) => {
      if (isHttps(url)) window.open(url, "_blank", "noopener,noreferrer");
    },
    saveImage: async () => {
      throw new Error("Saving works in the desktop app; it writes into your LeMuse folder.");
    },
    // The browser has no Credential Manager: the token is desktop-only.
    arenaTokenStatus: async () => ({ saved: false, account: null }),
    setArenaToken: async () => {
      throw new Error("The Are.na token is saved by the desktop app, in Windows Credential Manager.");
    },
    clearArenaToken: async () => false,
    followedChannels: async () => {
      throw new AppError("unsupported", "Channels you follow need the desktop app and your Are.na token.");
    },
    about: async () => ({ version: "preview", licence: "MIT", repository: PROJECT_URL }),
    // The browser can't resize itself: the preview shows the mini layout only.
    setMini: async () => null,
    copyText: async (text) => {
      await navigator.clipboard.writeText(text);
    },
    // The dashboard checks the image count now and then; when it changes it
    // drops the cached data and reports a finished refresh, so the page
    // reloads what's playing.
    onRefresh(cb) {
      if (!token) return () => {};
      let last = -1;
      const tick = async () => {
        try {
          const r = await fetch("./api/v1/status", { headers: auth });
          const blocks = ((await r.json()) as { data?: { blocks?: number } }).data?.blocks ?? -1;
          if (last >= 0 && blocks !== last) {
            cache = undefined;
            cb({ state: "done", trigger: "dashboard", blocks_upserted: Math.abs(blocks - last), errors: 0 });
          }
          last = blocks;
        } catch {
          /* offline for a moment; try again next time */
        }
      };
      tick();
      const id = window.setInterval(tick, DASHBOARD_POLL_MS);
      return () => window.clearInterval(id);
    },
  };
}

export const api: Backend = inTauri ? tauriBackend() : previewBackend();
