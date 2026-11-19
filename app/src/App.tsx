import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  api,
  arenaSearchUrl,
  cycleCategory,
  filterKey,
  nameProblem,
  NO_FILTER,
  PAGE_SIZE,
  sourceKey,
  type AddedChannel,
  type CategoryFilter,
  type ChannelPreview,
  type LibraryStatus,
  type Playlist,
  type RefreshEvent,
  type Slide,
  type SlideSource,
  type TokenStatus,
  type TopicInfo,
  type Vocabulary,
} from "./api";
import { DiscoverPanel, type RelatedState } from "./DiscoverPanel";
import { LibraryPanel, type PanelStatus } from "./LibraryPanel";
import { SettingsPanel, type ArenaTokenView } from "./SettingsPanel";
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
      if (e.note) return { label: e.note, busy: false, tone: "error" };
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
  // Mini player (ADR-0016) and the short "Link copied" note.
  const [mini, setMini] = useState(false);
  const [miniBarOpen, setMiniBarOpen] = useState(false);
  const [compactBarOpen, setCompactBarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [arenaToken, setArenaToken] = useState<TokenStatus | null>(null);
  const [arenaBusy, setArenaBusy] = useState(false);
  const [arenaMessage, setArenaMessage] = useState<ArenaTokenView["message"]>(undefined);
  const [miniMenuOpen, setMiniMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | undefined>();
  // Per image: how many stored fallback sizes have been tried.
  const [attempts, setAttempts] = useState<Map<number, number>>(new Map());
  const [idle, setIdle] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [inPlaylists, setInPlaylists] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuError, setMenuError] = useState<string | undefined>();
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState<PanelStatus | undefined>();
  const [playlistStatus, setPlaylistStatus] = useState<PanelStatus | undefined>();
  // Pages and categories (ADR-0015).
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<CategoryFilter>(NO_FILTER);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [vocabulary, setVocabulary] = useState<Vocabulary | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  // Find channels (ADR-0015).
  const [preview, setPreview] = useState<ChannelPreview | null>(null);
  const [previewLink, setPreviewLink] = useState<string | undefined>();
  const [related, setRelated] = useState<RelatedState | null>(null);
  const [relatedFor, setRelatedFor] = useState<{ blockId: number; page: number } | null>(null);
  const [discoverBusy, setDiscoverBusy] = useState(false);
  const [discoverStatus, setDiscoverStatus] = useState<PanelStatus | undefined>();
  const settingsRef = useRef<HTMLDialogElement>(null);
  const libraryRef = useRef<HTMLDialogElement>(null);
  const discoverRef = useRef<HTMLDialogElement>(null);
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
    api
      .vocabulary()
      .then(setVocabulary)
      .catch(() => setVocabulary(null));
  }, []);

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
    applyToDocument(settings, { fullscreen, idle, mini, compactBar: compactBarOpen });
  }, [settings, fullscreen, idle, mini, compactBarOpen]);

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
  const anyMenu = menuOpen || filterOpen;
  useEffect(() => {
    if (!settings.autoHide || anyMenu) {
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
  }, [settings.autoHide, settings.autoHideSeconds, anyMenu]);

  const openDialog = useCallback((d: HTMLDialogElement | null) => {
    if (d && !d.open) d.showModal();
  }, []);
  const openSettings = useCallback(() => openDialog(settingsRef.current), [openDialog]);
  const openLibrary = useCallback(() => {
    setLibraryStatus(undefined);
    setPlaylistStatus(undefined);
    openDialog(libraryRef.current);
  }, [openDialog]);
  const openDiscover = useCallback(() => {
    setDiscoverStatus(undefined);
    setRelated(null);
    setRelatedFor(null);
    openDialog(discoverRef.current);
  }, [openDialog]);

  // Load one page of what's playing, its total and the category counts;
  // reload when a refresh, a playlist edit, the page or the filter changes.
  const fKey = filterKey(filter);
  useEffect(() => {
    if (!active) return;
    let stale = false;
    Promise.all([
      api.slides(active, filter, PAGE_SIZE, page * PAGE_SIZE),
      api.slideCount(active, filter),
      api.categoryCounts(active, filter),
    ])
      .then(([s, n, c]) => {
        if (stale) return;
        // The view shrank under the current page (a refresh, a filter): go to its last page.
        const last = Math.max(0, Math.ceil(n / PAGE_SIZE) - 1);
        if (page > last) return setPage(last);
        setSource(s);
        setTotal(n);
        setCounts(Object.fromEntries(c.map((x) => [x.id, x.count])));
        setIndex((i) => (active.kind === "playlist" ? Math.min(i, Math.max(s.length - 1, 0)) : 0));
        setTick((t) => t + 1);
      })
      .catch((e) => setNotice(message(e)));
    return () => {
      stale = true;
    };
  }, [activeKey, activeCount, page, fKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (active?.kind === "topic") setShuffle(topic?.shuffle ?? true);
    else setShuffle(active?.kind !== "playlist");
  }, [activeKey, topic?.shuffle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shuffle once per load/toggle; a failed image must not reshuffle the order.
  const slides = useMemo(() => (shuffle ? shuffled(source) : source), [source, shuffle]);
  // A failed image first tries the block's other stored sizes (ADR-0016).
  const visible = useMemo(
    () =>
      slides
        .filter((s) => !failed.has(s.block_id))
        .map((s) => {
          const n = attempts.get(s.block_id) ?? 0;
          return n > 0 && s.fallback_urls?.[n - 1] ? { ...s, display_url: s.fallback_urls[n - 1] } : s;
        }),
    [slides, failed, attempts],
  );
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

  // At the last image of a page, move on to the next page instead of
  // starting the same 500 again.
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const go = useCallback(
    (delta: number) => {
      if (!visible.length) return;
      if (delta > 0 && safeIndex === visible.length - 1 && page < lastPage) {
        setPage(page + 1);
        return;
      }
      setIndex((i) => (i + delta + visible.length) % visible.length);
      setTick((n) => n + 1);
    },
    [visible.length, safeIndex, page, lastPage],
  );

  // The right-click menu closes on any click elsewhere, a key, a scroll or a
  // new image; it opens inside the window.
  useEffect(() => {
    if (!contextMenu) return;
    const close = (e: Event) => {
      if (e.target instanceof Element && e.target.closest(".context-menu")) return;
      setContextMenu(null);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setContextMenu(null);
    window.addEventListener("mousedown", close);
    window.addEventListener("wheel", close, { passive: true });
    window.addEventListener("resize", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("wheel", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", key);
    };
  }, [contextMenu]);
  useEffect(() => setContextMenu(null), [slide?.block_id]);

  // Auto-advance (paused while a menu is open).
  const seconds = settings.slideSeconds ?? topic?.slide_seconds ?? 8;
  useEffect(() => {
    if (!playing || anyMenu || visible.length < 2) return;
    const id = window.setTimeout(() => go(1), seconds * 1000);
    return () => window.clearTimeout(id);
  }, [playing, anyMenu, seconds, tick, go, visible.length]);

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
    setFilterOpen(false);
    setMenuOpen((o) => !o);
  }, []);
  const toggleFilter = useCallback(() => {
    setMenuOpen(false);
    setFilterOpen((o) => !o);
  }, []);

  // ---- Related channels for the current Are.na image (one read per page) ----
  // Answers for an image the user has moved away from are dropped.
  const relatedToken = useRef(0);
  const loadRelated = useCallback(async (blockId: number, nextPage: number) => {
    const token = nextPage === 1 ? ++relatedToken.current : relatedToken.current;
    setDiscoverBusy(true);
    try {
      const r = await api.relatedChannels(blockId, nextPage);
      if (token !== relatedToken.current) return;
      setRelated((prev) => ({
        imageTitle: prev?.imageTitle ?? "",
        result: {
          ...r,
          channels: nextPage > 1 && prev?.result ? [...prev.result.channels, ...r.channels] : r.channels,
        },
      }));
      setRelatedFor({ blockId, page: nextPage });
      setDiscoverStatus(undefined);
    } catch (e) {
      setDiscoverStatus({ tone: "error", text: message(e) });
    } finally {
      setDiscoverBusy(false);
    }
  }, []);
  const openRelated = useCallback(() => {
    if (!slide || slide.connector !== "arena" || api.kind !== "app") return;
    setDiscoverStatus(undefined);
    setRelated({ imageTitle: slide.title || "Untitled", result: null });
    openDialog(discoverRef.current);
    loadRelated(slide.block_id, 1);
  }, [slide, openDialog, loadRelated]);

  // ---- Mini player: small, borderless, always on top, any monitor ----
  const toggleMini = useCallback(() => {
    const next = !mini;
    api
      .setMini(next, settings.miniBounds)
      .then((left) => {
        setMini(next);
        setMenuOpen(false);
        setFilterOpen(false);
        setMiniBarOpen(false);
        setMiniMenuOpen(false);
        if (left) patch({ miniBounds: left });
      })
      .catch((e) => setNotice(`Mini player: ${message(e)}`));
  }, [mini, settings.miniBounds, patch]);

  // ---- Copy link: the source page and the full-size image ----
  const toastTimer = useRef(0);
  const say = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(undefined), 2500);
  }, []);
  const copyLink = useCallback(() => {
    if (!slide) return;
    const lines = [
      slide.title || "Untitled",
      slide.page_url ? `Page: ${slide.page_url}` : "",
      `Image: ${slide.original_url ?? slide.display_url}`,
    ].filter(Boolean);
    api
      .copyText(lines.join("\n"))
      .then(() => say("Link copied"))
      .catch(() => say("Couldn't reach the clipboard"));
  }, [slide, say]);

  // ---- Save the original (ADR-0022) ----
  const saveCurrent = useCallback(async () => {
    if (!slide || !active) return;
    const id = slide.block_id;
    setSaving(true);
    try {
      const r = await api.saveImage(id, active);
      setSource((list) => list.map((s) => (s.block_id === id ? { ...s, saved: true } : s)));
      const folder = r.view.split("/").slice(0, -1).join(" › ");
      say(`Saved to LeMuse › ${folder}`);
    } catch (e) {
      say(message(e));
    } finally {
      setSaving(false);
    }
  }, [slide, active, say]);

  // Keyboard: ← → Space S F H T P C R D M L A , Esc. Ignored while typing or in a dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape" && (menuOpen || filterOpen || miniMenuOpen)) {
        setMenuOpen(false);
        setFilterOpen(false);
        setMiniMenuOpen(false);
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
      else if (k === "c") toggleFilter();
      else if (k === "r") openRelated();
      else if (k === "m") toggleMini();
      else if (k === "l") copyLink();
      else if (k === "d") openDiscover();
      else if (k === "a") openLibrary();
      else if (k === ",") openSettings();
      else if (k === "Escape" && fullscreen && api.kind === "app") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggleFullscreen, patch, settings.controlsHidden, openSettings, openLibrary, openDiscover, openRelated, toggleMenu, toggleFilter, toggleMini, copyLink, menuOpen, filterOpen, miniMenuOpen, slide, fullscreen]);

  // Links leave the app through the system browser (https only).
  const onOpenLink = (e: MouseEvent<HTMLAnchorElement>, url: string) => {
    if (api.kind !== "app") return; // the browser handles target=_blank itself
    e.preventDefault();
    api.openExternal(url).catch((err) => setNotice(message(err)));
  };

  // ---- Are.na token (ADR-0023): checked by Are.na, kept in Credential Manager ----
  useEffect(() => {
    api.arenaTokenStatus().then(setArenaToken, () => setArenaToken(null));
  }, []);
  const saveArenaToken = async (token: string) => {
    setArenaBusy(true);
    setArenaMessage({ text: "Checking with Are.na", tone: "idle" });
    try {
      const a = await api.setArenaToken(token);
      setArenaToken({ saved: true, account: a.slug });
      setArenaMessage({ text: `Saved for ${a.slug} (${a.tier} account). The next refresh uses it.`, tone: "ok" });
    } catch (e) {
      setArenaMessage({ text: message(e), tone: "error" });
    } finally {
      setArenaBusy(false);
    }
  };
  const clearArenaToken = async () => {
    setArenaBusy(true);
    try {
      await api.clearArenaToken();
      setArenaToken({ saved: false, account: null });
      setArenaMessage({ text: "Removed. Refreshes run as a guest.", tone: "ok" });
    } catch (e) {
      setArenaMessage({ text: message(e), tone: "error" });
    } finally {
      setArenaBusy(false);
    }
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
  const addedText = (r: AddedChannel): string => {
    const count = r.channel.contents == null ? "" : ` (${r.channel.contents.toLocaleString("en-US")} items)`;
    return r.added
      ? `Added ${r.channel.title}${count} to ${r.topic}. Its images are loading now.`
      : `${r.channel.title} is already in ${r.topic}.`;
  };

  const runAdd = async (
    link: string,
    topicName: string,
    createTopic: boolean,
    setBusy: (b: boolean) => void,
    report: (s: PanelStatus) => void,
  ) => {
    if (!link) return report({ tone: "error", text: "Paste an Are.na channel link first." });
    const problem = nameProblem("topic", topicName);
    if (problem) return report({ tone: "error", text: problem });
    setBusy(true);
    report({ tone: "idle", text: "Checking the channel with Are.na" });
    try {
      report({ tone: "ok", text: addedText(await api.addChannel(link, topicName, createTopic)) });
      await loadLibrary();
    } catch (e) {
      report({ tone: "error", text: message(e) });
    } finally {
      setBusy(false);
    }
  };
  const addChannel = (link: string, topicName: string, createTopic: boolean) =>
    runAdd(link, topicName, createTopic, setLibraryBusy, setLibraryStatus);

  // ---- Find channels ----
  const searchArena = (word: string) => {
    api
      .openExternal(arenaSearchUrl(word))
      .then(() =>
        setDiscoverStatus({
          tone: "ok",
          text: `Opened Are.na's search for “${word}” in your browser. Copy a channel's link and paste it under Preview.`,
        }),
      )
      .catch((e) => setDiscoverStatus({ tone: "error", text: message(e) }));
  };

  const previewChannel = async (link: string) => {
    setDiscoverBusy(true);
    setDiscoverStatus({ tone: "idle", text: "Loading the channel's first images from Are.na" });
    try {
      const pv = await api.previewChannel(link);
      setPreview(pv);
      setPreviewLink(link);
      setDiscoverStatus({ tone: "ok", text: `Previewing ${pv.channel.title}. Add it to a topic below if you like it.` });
    } catch (e) {
      setDiscoverStatus({ tone: "error", text: message(e) });
    } finally {
      setDiscoverBusy(false);
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
        total={total}
        page={page}
        onPage={(n) => {
          setFailed(new Set());
          setPage(n);
        }}
        vocabulary={vocabulary}
        filter={filter}
        categoryCounts={counts}
        filterMenuOpen={filterOpen}
        onToggleFilterMenu={toggleFilter}
        onCycleCategory={(id) => {
          setFilter((f) => cycleCategory(f, id));
          setPage(0);
        }}
        onClearFilter={() => {
          setFilter(NO_FILTER);
          setPage(0);
        }}
        onOpenDiscover={openDiscover}
        onRelated={openRelated}
        mini={mini}
        onToggleMini={toggleMini}
        compactBarOpen={compactBarOpen}
        onToggleCompactBar={() => {
          // A tap with the drawer open just closes the drawer.
          if (railOpen) setRailOpen(false);
          else setCompactBarOpen((o) => !o);
        }}
        miniBarOpen={miniBarOpen}
        miniMenuOpen={miniMenuOpen}
        onToggleMiniBar={() => {
          setMiniMenuOpen(false);
          setMiniBarOpen((o) => !o);
        }}
        onToggleMiniMenu={() => setMiniMenuOpen((o) => !o)}
        onCopyLink={copyLink}
        onSave={saveCurrent}
        saving={saving}
        contextMenu={contextMenu}
        onContextMenu={(x, y) => setContextMenu({ x, y })}
        onCloseContextMenu={() => setContextMenu(null)}
        toast={toast}
        onSelect={(next) => {
          setFailed(new Set());
          setAttempts(new Map());
          setNotice(undefined);
          setMenuOpen(false);
          setMiniMenuOpen(false);
          setActive(next);
          setPage(0);
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
        onImageError={(id) => {
          const s = slides.find((x) => x.block_id === id);
          const n = attempts.get(id) ?? 0;
          if (s && n < (s.fallback_urls?.length ?? 0)) setAttempts((m) => new Map(m).set(id, n + 1));
          else setFailed((f) => new Set(f).add(id));
        }}
      />
      <DiscoverPanel
        ref={discoverRef}
        mode={api.kind}
        vocabulary={vocabulary}
        topics={topics}
        defaultTopic={topic?.name}
        preview={preview}
        previewLink={previewLink}
        related={related}
        busy={discoverBusy}
        status={discoverStatus}
        onSearch={searchArena}
        onPreview={previewChannel}
        onAdd={(link, topicName, createTopic) =>
          runAdd(link, topicName, createTopic, setDiscoverBusy, setDiscoverStatus)
        }
        onMoreRelated={() => {
          const next = related?.result?.next_page;
          if (relatedFor && next) loadRelated(relatedFor.blockId, next);
        }}
      />
      <SettingsPanel
        ref={settingsRef}
        settings={settings}
        onChange={patch}
        onReset={() => setSettings(DEFAULTS)}
        arena={{ mode: api.kind, status: arenaToken, busy: arenaBusy, message: arenaMessage }}
        onSaveArenaToken={saveArenaToken}
        onClearArenaToken={clearArenaToken}
        onOpenLink={onOpenLink}
      />
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
