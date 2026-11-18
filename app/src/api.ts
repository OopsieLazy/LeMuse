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
  slides(topic: string, limit?: number, offset?: number): Promise<Slide[]>;
  refreshNow(): Promise<void>;
  onRefresh(cb: (e: RefreshEvent) => void): () => void;
}

interface PreviewTopic {
  name: string;
  slide_seconds: number;
  shuffle: boolean;
  sources: number;
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
    slides: (topic, limit = 200, offset = 0) => invoke<Slide[]>("slides", { topic, limit, offset }),
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
  return {
    kind: "preview",
    libraryStatus: async () => ({
      root: "Preview (exported catalog metadata)",
      blocks: (await data()).blocks,
      schema_version: 2,
      refreshing: false,
    }),
    topics: async () =>
      (await data()).topics.map(({ slides, ...t }) => ({ ...t, slides: slides.length })),
    slides: async (topic, limit = 200, offset = 0) =>
      ((await data()).topics.find((t) => t.name === topic)?.slides ?? []).slice(offset, offset + limit),
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
