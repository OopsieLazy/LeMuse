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
  slides(source: SlideSource, limit?: number, offset?: number): Promise<Slide[]>;
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
    slides: (source, limit = 500, offset = 0) => invoke<Slide[]>("slides", { source, limit, offset }),
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
      if (!isHttps(url)) return;
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
    slides: async (source, limit = 500, offset = 0) => {
      let list: Slide[];
      if (source.kind === "all") list = await allSlides();
      else if (source.kind === "topic")
        list = (await data()).topics.find((t) => t.name === source.name)?.slides ?? [];
      else {
        const byId = new Map((await allSlides()).map((s) => [s.block_id, s]));
        list = (lists.get(source.id)?.ids ?? []).flatMap((id) => byId.get(id) ?? []);
      }
      return list.slice(offset, offset + limit);
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
