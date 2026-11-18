import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  api,
  nameProblem,
  sourceKey,
  type LibraryStatus,
  type Playlist,
  type RefreshEvent,
  type Slide,
  type SlideSource,
  type TopicInfo,
} from "./api";
import { LibraryPanel, type PanelStatus } from "./LibraryPanel";
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

/** Errors from the core arrive as strings; keep the readable part. */
function message(e: unknown): string {
  const s = e instanceof Error ? e.message : String(e);
  return s.replace(/^(invalid config|arena): /, "");
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
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [allCount, setAllCount] = useState(0);
  const [active, setActive] = useState<SlideSource | null>({ kind: "all" });
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
  const [inPlaylists, setInPlaylists] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuError, setMenuError] = useState<string | undefined>();
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState<PanelStatus | undefined>();
  const [playlistStatus, setPlaylistStatus] = useState<PanelStatus | undefined>();
  const settingsRef = useRef<HTMLDialogElement>(null);
  const libraryRef = useRef<HTMLDialogElement>(null);
  const loaded = useRef(false);
  const [refresh, setRefresh] = useState<RefreshState>({
    label: api.kind === "preview" ? "Snapshot of the catalog" : "Waiting for refresh",
    busy: false,
    tone: "idle",
  });

  const loadPlaylists = useCallback(async () => {
    try {
      setPlaylists(await api.playlists());
    } catch (e) {
      setNotice(message(e));
    }
  }, []);

  const loadLibrary = useCallback(async () => {
    try {
      const [s, t, all] = await Promise.all([api.libraryStatus(), api.topics(), api.allCount()]);
      setStatus(s);
      setTopics(t);
      setAllCount(all);
      if (s.refreshing) setRefresh({ label: "Refreshing topics", busy: true, tone: "idle" });
    } catch (e) {
      setNotice(message(e));
    }
    loadPlaylists();
  }, [loadPlaylists]);

  useEffect(() => {
    loadLibrary();
    return api.onRefresh((e) => {
      setRefresh(refreshLabel(e));
      if (e.state !== "running") loadLibrary();
    });
  }, [loadLibrary]);

  const topic = active?.kind === "topic" ? topics.find((t) => t.name === active.name) : undefined;
  const playlist = active?.kind === "playlist" ? playlists.find((l) => l.id === active.id) : undefined;
  const activeLabel = active?.kind === "all" ? "All" : (topic?.name ?? playlist?.name ?? "");
  // What changes when new images arrive, so the slideshow reloads.
  const activeCount = active?.kind === "all" ? allCount : (topic?.slides ?? playlist?.items ?? 0);
  const activeKey = sourceKey(active);

  // A deleted playlist or removed topic falls back to All.
  useEffect(() => {
    if (active?.kind === "playlist" && !playlist) setActive({ kind: "all" });
  }, [active, playlist, playlists.length]);

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
      api.saveSettings(settings).catch((e) => setNotice(`Settings not saved: ${message(e)}`));
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
    if (!settings.autoHide || menuOpen) {
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
  }, [settings.autoHide, settings.autoHideSeconds, menuOpen]);

  const openDialog = useCallback((d: HTMLDialogElement | null) => {
    if (d && !d.open) d.showModal();
  }, []);
  const openSettings = useCallback(() => openDialog(settingsRef.current), [openDialog]);
  const openLibrary = useCallback(() => {
    setLibraryStatus(undefined);
    setPlaylistStatus(undefined);
    openDialog(libraryRef.current);
  }, [openDialog]);

  // Load what's playing; reload when a refresh or a playlist edit changes it.
  useEffect(() => {
    if (!active) return;
    let stale = false;
    api
      .slides(active)
      .then((s) => {
        if (stale) return;
        setSource(s);
        setIndex((i) => (active.kind === "playlist" ? Math.min(i, Math.max(s.length - 1, 0)) : 0));
        setTick((n) => n + 1);
      })
      .catch((e) => setNotice(message(e)));
    return () => {
      stale = true;
    };
  }, [activeKey, activeCount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (active?.kind === "topic") setShuffle(topic?.shuffle ?? true);
    else setShuffle(active?.kind !== "playlist");
  }, [activeKey, topic?.shuffle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shuffle once per load/toggle; a failed image must not reshuffle the order.
  const slides = useMemo(() => (shuffle ? shuffled(source) : source), [source, shuffle]);
  const visible = useMemo(() => slides.filter((s) => !failed.has(s.block_id)), [slides, failed]);
  const safeIndex = visible.length ? index % visible.length : 0;
  const slide = visible[safeIndex] as Slide | undefined;

  // Which playlists hold the current image (for the menu's checkboxes).
  useEffect(() => {
    if (!slide) {
      setInPlaylists([]);
      return;
    }
    let stale = false;
    api
      .playlistsWith(slide.block_id)
      .then((ids) => !stale && setInPlaylists(ids))
      .catch(() => !stale && setInPlaylists([]));
    return () => {
      stale = true;
    };
  }, [slide?.block_id, playlists]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback(
    (delta: number) => {
      if (!visible.length) return;
      setIndex((i) => (i + delta + visible.length) % visible.length);
      setTick((n) => n + 1);
    },
    [visible.length],
  );

  // Auto-advance (paused while the playlist menu is open).
  const seconds = settings.slideSeconds ?? topic?.slide_seconds ?? 8;
  useEffect(() => {
    if (!playing || menuOpen || visible.length < 2) return;
    const id = window.setTimeout(() => go(1), seconds * 1000);
    return () => window.clearTimeout(id);
  }, [playing, menuOpen, seconds, tick, go, visible.length]);

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

  const toggleMenu = useCallback(() => {
    setMenuError(undefined);
    setMenuOpen((o) => !o);
  }, []);

  // Keyboard: ← → Space S F H T P A , Esc. Ignored while typing or in a dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        return;
      }
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
      else if (k === "p" && slide) toggleMenu();
      else if (k === "a") openLibrary();
      else if (k === ",") openSettings();
      else if (k === "Escape" && fullscreen && api.kind === "app") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggleFullscreen, patch, settings.controlsHidden, openSettings, openLibrary, toggleMenu, menuOpen, slide, fullscreen]);

  // Links leave the app through the system browser (https only).
  const onOpenLink = (e: MouseEvent<HTMLAnchorElement>, url: string) => {
    if (api.kind !== "app") return; // the browser handles target=_blank itself
    e.preventDefault();
    api.openExternal(url).catch((err) => setNotice(message(err)));
  };

  const onRefresh = () => {
    setRefresh({ label: "Refreshing topics", busy: true, tone: "idle" });
    api.refreshNow().catch((e) => setRefresh({ label: message(e), busy: false, tone: "error" }));
  };

  // ---- Playlists ----
  const setInPlaylist = async (playlistId: number, present: boolean) => {
    if (!slide) return;
    setMenuError(undefined);
    try {
      await api.setInPlaylist(playlistId, slide.block_id, present);
      await loadPlaylists();
    } catch (e) {
      setMenuError(message(e));
    }
  };

  const createPlaylist = async (name: string, withImage: boolean) => {
    const problem = nameProblem("playlist", name);
    const report = withImage ? setMenuError : (text?: string) => setPlaylistStatus(text ? { tone: "error", text } : undefined);
    if (problem) return report(problem);
    try {
      const l = await api.createPlaylist(name);
      if (withImage && slide) await api.setInPlaylist(l.id, slide.block_id, true);
      await loadPlaylists();
      if (withImage) setMenuError(undefined);
      else setPlaylistStatus({ tone: "ok", text: `Created ${l.name}.` });
    } catch (e) {
      report(message(e));
    }
  };

  const playlistAction = async (run: () => Promise<unknown>, done: string) => {
    try {
      await run();
      await loadPlaylists();
      setPlaylistStatus({ tone: "ok", text: done });
    } catch (e) {
      setPlaylistStatus({ tone: "error", text: message(e) });
    }
  };

  // ---- Channels ----
  const addChannel = async (link: string, topicName: string, createTopic: boolean) => {
    if (!link) return setLibraryStatus({ tone: "error", text: "Paste an Are.na channel link first." });
    const problem = nameProblem("topic", topicName);
    if (problem) return setLibraryStatus({ tone: "error", text: problem });
    setLibraryBusy(true);
    setLibraryStatus({ tone: "idle", text: "Checking the channel with Are.na" });
    try {
      const r = await api.addChannel(link, topicName, createTopic);
      const count = r.channel.contents == null ? "" : ` (${r.channel.contents.toLocaleString("en-US")} items)`;
      setLibraryStatus(
        r.added
          ? { tone: "ok", text: `Added ${r.channel.title}${count} to ${r.topic}. Its images are loading now.` }
          : { tone: "ok", text: `${r.channel.title} is already in ${r.topic}.` },
      );
      await loadLibrary();
    } catch (e) {
      setLibraryStatus({ tone: "error", text: message(e) });
    } finally {
      setLibraryBusy(false);
    }
  };

  const removeChannel = async (topicName: string, channel: string) => {
    setLibraryBusy(true);
    try {
      const removed = await api.removeChannel(topicName, channel);
      setLibraryStatus({
        tone: "ok",
        text: removed
          ? `Removed ${channel} from ${topicName}. Images in your playlists stay there.`
          : `${channel} wasn't in ${topicName}.`,
      });
      await loadLibrary();
    } catch (e) {
      setLibraryStatus({ tone: "error", text: message(e) });
    } finally {
      setLibraryBusy(false);
    }
  };

  return (
    <>
      <SlideshowView
        mode={api.kind}
        topics={topics}
        playlists={playlists}
        allCount={allCount}
        active={active}
        activeLabel={activeLabel}
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
        inPlaylists={inPlaylists}
        playlistMenuOpen={menuOpen}
        playlistMenuError={menuError}
        onSelect={(next) => {
          setFailed(new Set());
          setNotice(undefined);
          setMenuOpen(false);
          setActive(next);
          setIndex(0);
          setRailOpen(false);
        }}
        onOpenLibrary={openLibrary}
        onTogglePlaylistMenu={toggleMenu}
        onSetInPlaylist={setInPlaylist}
        onCreatePlaylist={(name) => createPlaylist(name, true)}
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
      <LibraryPanel
        ref={libraryRef}
        mode={api.kind}
        topics={topics}
        playlists={playlists}
        defaultTopic={topic?.name}
        busy={libraryBusy}
        status={libraryStatus}
        playlistStatus={playlistStatus}
        onAddChannel={addChannel}
        onRemoveChannel={removeChannel}
        onCreatePlaylist={(name) => createPlaylist(name, false)}
        onRenamePlaylist={(id, name) => {
          const problem = nameProblem("playlist", name);
          if (problem) return setPlaylistStatus({ tone: "error", text: problem });
          playlistAction(() => api.renamePlaylist(id, name), `Renamed to ${name}.`);
        }}
        onDeletePlaylist={(id) =>
          playlistAction(() => api.deletePlaylist(id), "Playlist deleted. Its images are still in their topics.")
        }
      />
    </>
  );
}
