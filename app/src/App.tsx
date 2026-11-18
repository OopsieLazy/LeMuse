import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { api, type LibraryStatus, type RefreshEvent, type Slide, type TopicInfo } from "./api";
import { SettingsPanel } from "./SettingsPanel";
import { applyToDocument, DEFAULTS, sanitize, type UiSettings } from "./settings";
import { SlideshowView, type RefreshState } from "./SlideshowView";

/** Debounce for saving settings while a slider is dragged. */
const SAVE_DELAY_MS = 300;

/** How many upcoming images to warm in memory (CLAUDE.md: at most 2). */
const PRELOAD_AHEAD = 2;

function shuffled<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function refreshLabel(e: RefreshEvent): RefreshState {
  switch (e.state) {
    case "running":
      return { label: "Refreshing topics", busy: true, tone: "idle" };
    case "done":
      return {
        label:
          e.errors > 0
            ? `Updated ${e.blocks_upserted} images, ${e.errors} source${e.errors === 1 ? "" : "s"} failed`
            : `Up to date · ${e.blocks_upserted} new or changed`,
        busy: false,
        tone: e.errors > 0 ? "error" : "ok",
      };
    case "error":
      return { label: `Refresh failed: ${e.message}`, busy: false, tone: "error" };
  }
}

export function App() {
  const [status, setStatus] = useState<LibraryStatus | null>(null);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [source, setSource] = useState<Slide[]>([]);
  const [shuffle, setShuffle] = useState(true);
  const [index, setIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<string | undefined>();
  const [settings, setSettings] = useState<UiSettings>(DEFAULTS);
  const [fullscreen, setFullscreen] = useState(false);
  const [idle, setIdle] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const settingsRef = useRef<HTMLDialogElement>(null);
  const loaded = useRef(false);
  const [refresh, setRefresh] = useState<RefreshState>({
    label: api.kind === "preview" ? "Snapshot of the catalog" : "Waiting for refresh",
    busy: false,
    tone: "idle",
  });

  const loadLibrary = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([api.libraryStatus(), api.topics()]);
      setStatus(s);
      setTopics(t);
      if (s.refreshing) setRefresh({ label: "Refreshing topics", busy: true, tone: "idle" });
      setActive((cur) => cur ?? t.find((x) => x.slides > 0)?.name ?? t[0]?.name ?? null);
    } catch (e) {
      setNotice(String(e));
    }
  }, []);

  useEffect(() => {
    loadLibrary();
    return api.onRefresh((e) => {
      setRefresh(refreshLabel(e));
      if (e.state !== "running") loadLibrary();
    });
  }, [loadLibrary]);

  const topic = topics.find((t) => t.name === active);

  // ---- Settings: load once, apply live, save debounced ----
  useEffect(() => {
    api
      .loadSettings()
      .then((raw) => setSettings(sanitize(raw)))
      .catch(() => setSettings(DEFAULTS))
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    applyToDocument(settings, { fullscreen, idle });
  }, [settings, fullscreen, idle]);

  useEffect(() => {
    if (!loaded.current) return;
    const id = window.setTimeout(() => {
      api.saveSettings(settings).catch((e) => setNotice(`Settings not saved: ${String(e)}`));
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [settings]);

  const patch = useCallback((p: Partial<UiSettings>) => setSettings((s) => sanitize({ ...s, ...p })), []);

  // ---- Fullscreen ----
  const toggleFullscreen = useCallback(() => {
    api.toggleFullscreen().then(setFullscreen).catch(() => {});
  }, []);
  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  // ---- Auto-hide the control bar when the pointer rests ----
  useEffect(() => {
    if (!settings.autoHide) {
      setIdle(false);
      return;
    }
    let id = 0;
    const wake = () => {
      setIdle(false);
      window.clearTimeout(id);
      id = window.setTimeout(() => setIdle(true), settings.autoHideSeconds * 1000);
    };
    wake();
    const events = ["mousemove", "mousedown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    return () => {
      window.clearTimeout(id);
      events.forEach((e) => window.removeEventListener(e, wake));
    };
  }, [settings.autoHide, settings.autoHideSeconds]);

  const openSettings = useCallback(() => {
    const d = settingsRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Load the active topic's slides; reload when a refresh finishes.
  useEffect(() => {
    if (!active) return;
    let stale = false;
    api
      .slides(active)
      .then((s) => {
        if (stale) return;
        setSource(s);
        setIndex(0);
        setTick((n) => n + 1);
      })
      .catch((e) => setNotice(String(e)));
    return () => {
      stale = true;
    };
  }, [active, topic?.slides]);

  useEffect(() => {
    if (topic) setShuffle(topic.shuffle);
  }, [topic?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shuffle once per load/toggle; a failed image must not reshuffle the order.
  const slides = useMemo(() => (shuffle ? shuffled(source) : source), [source, shuffle]);
  const visible = useMemo(() => slides.filter((s) => !failed.has(s.block_id)), [slides, failed]);
  const safeIndex = visible.length ? index % visible.length : 0;

  const go = useCallback(
    (delta: number) => {
      if (!visible.length) return;
      setIndex((i) => (i + delta + visible.length) % visible.length);
      setTick((n) => n + 1);
    },
    [visible.length],
  );

  // Auto-advance.
  const seconds = settings.slideSeconds ?? topic?.slide_seconds ?? 8;
  useEffect(() => {
    if (!playing || visible.length < 2) return;
    const id = window.setTimeout(() => go(1), seconds * 1000);
    return () => window.clearTimeout(id);
  }, [playing, seconds, tick, go, visible.length]);

  // Warm the next images in memory only. In the desktop app the WebView runs
  // InPrivate, so nothing reaches a disk cache (ADR-0009).
  const warm = useRef<HTMLImageElement[]>([]);
  useEffect(() => {
    warm.current = [];
    for (let k = 1; k <= PRELOAD_AHEAD && k < visible.length; k++) {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.src = visible[(safeIndex + k) % visible.length].display_url;
      warm.current.push(img);
    }
  }, [safeIndex, visible]);

  // Keyboard: ← → Space S F H T , Esc. Ignored while typing or in Settings.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, dialog")) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === "ArrowRight") go(1);
      else if (k === "ArrowLeft") go(-1);
      else if (k === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (k === "s") setShuffle((s) => !s);
      else if (k === "f") toggleFullscreen();
      else if (k === "h") patch({ controlsHidden: !settings.controlsHidden });
      else if (k === "t") setRailOpen((o) => !o);
      else if (k === ",") openSettings();
      else if (k === "Escape" && fullscreen && api.kind === "app") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggleFullscreen, patch, settings.controlsHidden, openSettings, fullscreen]);

  // Links leave the app through the system browser (https only).
  const onOpenLink = (e: MouseEvent<HTMLAnchorElement>, url: string) => {
    if (api.kind !== "app") return; // the browser handles target=_blank itself
    e.preventDefault();
    api.openExternal(url).catch((err) => setNotice(String(err)));
  };

  const onRefresh = () => {
    setRefresh({ label: "Refreshing topics", busy: true, tone: "idle" });
    api.refreshNow().catch((e) => setRefresh({ label: String(e), busy: false, tone: "error" }));
  };

  return (
    <>
    <SlideshowView
      mode={api.kind}
      topics={topics}
      active={active}
      slides={visible}
      index={safeIndex}
      playing={playing}
      shuffle={shuffle}
      slideSeconds={seconds}
      tick={tick}
      status={status}
      refresh={refresh}
      notice={notice}
      fullscreen={fullscreen}
      controlsHidden={settings.controlsHidden}
      railOpen={railOpen}
      onSelectTopic={(name) => {
        setFailed(new Set());
        setActive(name);
        setRailOpen(false);
      }}
      onToggleFullscreen={toggleFullscreen}
      onToggleControls={() => patch({ controlsHidden: !settings.controlsHidden })}
      onToggleRail={() => setRailOpen((o) => !o)}
      onOpenSettings={openSettings}
      onOpenLink={onOpenLink}
      onPrev={() => go(-1)}
      onNext={() => go(1)}
      onTogglePlay={() => setPlaying((p) => !p)}
      onToggleShuffle={() => setShuffle((s) => !s)}
      onRefresh={onRefresh}
      onImageError={(id) => setFailed((f) => new Set(f).add(id))}
    />
    <SettingsPanel ref={settingsRef} settings={settings} onChange={patch} onReset={() => setSettings(DEFAULTS)} />
    </>
  );
}
