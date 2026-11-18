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
  | { state: "done"; trigger: string; blocks_upserted: number; errors: number }
  | { state: "error"; trigger: string; message: string };

export interface Backend {
  kind: "app" | "preview";
  /** Saved look-and-feel settings; untrusted, run them through `sanitize`. */
  loadSettings(): Promise<unknown>;
  saveSettings(settings: unknown): Promise<void>;
  /** Toggle fullscreen; resolves to the new state. */
  toggleFullscreen(): Promise<boolean>;
  /** Open an https link outside the app (system browser). */
  openExternal(url: string): Promise<void>;
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
  vocabulary?: Vocabulary;
}

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
    return u.protocol === "https:" && !u.username && !u.password && !u.port && OPEN_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function tauriBackend(): Backend {
  // Lazy imports keep @tauri-apps/api out of the preview's critical path.
  const invoke = async <T,>(cmd: string, args?: Record<string, unknown>) =>
    (await import("@tauri-apps/api/core")).invoke<T>(cmd, args);
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
  let cache: Promise<PreviewData> | undefined;
  const data = () =>
    (cache ??= load
      ? load()
      : (async () => {
          const inline = document.getElementById("preview-data");
          if (inline?.textContent) return JSON.parse(inline.textContent) as PreviewData;
          const r = await fetch("./preview-data.json");
          if (!r.ok) throw new Error("No preview data. Run `npm run preview:data` first.");
          return (await r.json()) as PreviewData;
        })());
  // Preview playlists live in memory for this page view only; the desktop
  // app keeps them in the catalog.
  const lists = new Map<number, { name: string; ids: number[] }>();
  let nextId = 1;
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
      const byId = new Map((await allSlides()).map((s) => [s.block_id, s]));
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
      root: "Preview (exported catalog metadata)",
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
    onRefresh: () => () => {},
  };
}

export const api: Backend = inTauri ? tauriBackend() : previewBackend();
