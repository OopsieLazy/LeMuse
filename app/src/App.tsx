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
  type About,
  type FollowedPage,
  type FollowedPick,
  type BlockFlag,
  withContentDefaults,
  parseSourceKey,
  sharpSlide,
  type TokenStatus,
  type TopicInfo,
  type Vocabulary,
} from "./api";
import { DiscoverPanel, type FollowingState, type RelatedState } from "./DiscoverPanel";
import { RefreshDetails } from "./RefreshDetails";
import { LibraryPanel, type PanelStatus } from "./LibraryPanel";
import { SettingsPanel, type ArenaTokenView, type UpdateView } from "./SettingsPanel";
import { applyToDocument, DEFAULTS, sanitize, type UiSettings } from "./settings";
import { SlideshowView, type RefreshState } from "./SlideshowView";
import { PracticePanel } from "./PracticePanel";
import { ShortcutsPanel } from "./ShortcutsPanel";
import { WelcomePanel } from "./WelcomePanel";
import { NoticesPanel } from "./NoticesPanel";
import {
  FAVOURITES,
  finishPose,
  EFFECTS,
  FOCI,
  GRIDS,
  nextOf,
  NO_STUDY,
  planFor,
  poseCount,
  poseMs,
  posesBefore,
  restartPose,
  logSince,
  sessionPlaylistName,
  weeklyLog,
  type LogWeek,
  startSession as firstPose,
  stopSession,
  tickSession,
  TONES,
  type Running,
  type SessionResult,
  type StudyAids,
} from "./practice";
import * as cue from "./sound";
import { stableOrder } from "./order";
import { actionFor, isCharacterKey, keyOf } from "./keys";

/** Matches styles.css: compact windows hide the bar until a tap. */
const COMPACT_QUERY = "(max-width: 1024px), (max-height: 560px)";

/** How often the pose clock steps (ms). */
const SESSION_TICK_MS = 200;

/** Debounce for saving settings while a slider is dragged. */
const SAVE_DELAY_MS = 300;

/** How often an empty view looks again during a refresh (catalog reads only). */
const FIRST_FILL_POLL_MS = 10_000;

/** How many upcoming images to warm in memory (CLAUDE.md: at most 2). */
const PRELOAD_AHEAD = 2;

/** Errors from the core arrive as strings; keep the readable part. */
function message(e: unknown): string {
  const s = e instanceof Error ? e.message : String(e);
  return s.replace(/^arena: /, "");
}

function refreshLabel(e: RefreshEvent): RefreshState {
  switch (e.state) {
    case "running":
      return { label: "Refreshing topics", busy: true, tone: "idle" };
    case "done":
      if (e.note) return { label: e.note, busy: false, tone: "error", details: e.errors > 0 };
      return {
        label:
          e.errors > 0
            ? `Updated ${e.blocks_upserted} images, ${e.errors} source${e.errors === 1 ? "" : "s"} failed`
            : `Up to date · ${e.blocks_upserted} new or changed`,
        busy: false,
        tone: e.errors > 0 ? "error" : "ok",
        details: e.errors > 0,
      };
    case "error":
      return { label: refreshFailure(e.code, e.message), busy: false, tone: "error" };
  }
}

/** A whole refresh that failed, in words that say what to do (ADR-0024). */
function refreshFailure(code: string | undefined, msg: string): string {
  switch (code) {
    case "network":
      return "Can't reach the sources right now. LeMuse tries again at the next refresh.";
    case "busy":
      return "Another refresh is already running (the command line or Task Scheduler).";
    case "rate_limited":
      return "Are.na asked LeMuse to slow down. The next refresh carries on.";
    default:
      return `Refresh failed: ${msg}`;
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
  const [savedNote, setSavedNote] = useState<{ folder: string; file: string } | null>(null);
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
  const [following, setFollowing] = useState<FollowingState | null>(null);
  const [followingPage, setFollowingPage] = useState(1);
  // Refresh details and the network state (ADR-0024).
  const [refreshFailed, setRefreshFailed] = useState<{ list: string[]; total: number }>({ list: [], total: 0 });
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [about, setAbout] = useState<About | null>(null);
  // Practice tools (ADR-0025).
  const [study, setStudy] = useState<StudyAids>(NO_STUDY);
  const [studyOpen, setStudyOpen] = useState(false);
  const [natural, setNatural] = useState<{ id: number; width: number; height: number } | null>(null);
  const [session, setSession] = useState<Running | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [practiceView, setPracticeView] = useState<"plan" | "summary">("plan");
  const [kept, setKept] = useState<string | undefined>();
  const [keeping, setKeeping] = useState(false);
  const [drawnFavs, setDrawnFavs] = useState<number[]>([]);
  const practiceRef = useRef<HTMLDialogElement>(null);
  // Content marks, the practice log and updates (ADR-0027, ADR-0028).
  const [marks, setMarks] = useState<{ hidden: number; nudity: number }>({ hidden: 0, nudity: 0 });
  const [contentNote, setContentNote] = useState<string | undefined>();
  const [log, setLog] = useState<LogWeek[] | null>(null);
  const [update, setUpdate] = useState<UpdateView>({ state: "idle" });
  const [settingsReady, setSettingsReady] = useState(false);
  // Finishing 1.0 (ADR-0029): Saved, grid, sharper museum images, undo, flash.
  const [savedCount, setSavedCount] = useState(0);
  const [grid, setGrid] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const [undoable, setUndoable] = useState(false);
  const undoRef = useRef<(() => void) | null>(null);
  const welcomeRef = useRef<HTMLDialogElement>(null);
  const noticesRef = useRef<HTMLDialogElement>(null);
  const [notices, setNotices] = useState<string | null>(null);
  const restored = useRef(false);
  /** The image to show again once its own view has loaded (remember where you were). */
  const pendingBlock = useRef<{ key: string; id: number } | null>(null);
  const bigNow = () =>
    typeof window !== "undefined" &&
    (window.innerWidth * (window.devicePixelRatio || 1) > 1200 || window.innerHeight * (window.devicePixelRatio || 1) > 1000);
  const [bigWindow, setBigWindow] = useState(bigNow);
  const shortcutsRef = useRef<HTMLDialogElement>(null);
  const refreshDetailsRef = useRef<HTMLDialogElement>(null);
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
      api
        .slideCount({ kind: "saved" }, withContentDefaults(NO_FILTER, false))
        .then(setSavedCount)
        .catch(() => undefined);
      if (s.refreshing)
        setRefresh({
          label: all === 0 ? "First refresh: images appear as they arrive" : "Refreshing topics",
          busy: true,
          tone: "idle",
        });
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
      if (e.state === "done") setRefreshFailed({ list: e.failed ?? [], total: e.errors });
      if (e.state !== "running") loadLibrary();
    });
  }, [loadLibrary]);

  const topic = active?.kind === "topic" ? topics.find((t) => t.name === active.name) : undefined;
  const playlist = active?.kind === "playlist" ? playlists.find((l) => l.id === active.id) : undefined;
  const activeLabel =
    active?.kind === "all"
      ? "All"
      : active?.kind === "saved"
        ? "Saved"
        : active?.kind === "search"
          ? `“${active.query}”`
          : (topic?.name ?? playlist?.name ?? "");
  // What changes when new images arrive, so the slideshow reloads.
  const activeCount =
    active?.kind === "all" || active?.kind === "search"
      ? allCount
      : active?.kind === "saved"
        ? savedCount
        : (topic?.slides ?? playlist?.items ?? 0);
  const activeKey = sourceKey(active);

  // While a refresh runs and this view is still empty (a new library's
  // first refresh, or a just-added topic), look again every 10 s so images
  // show as they arrive instead of zeros until the refresh ends. A view that
  // already has images isn't reloaded mid-slideshow.
  useEffect(() => {
    if (!refresh.busy || activeCount > 0) return;
    const t = window.setInterval(loadLibrary, FIRST_FILL_POLL_MS);
    return () => window.clearInterval(t);
  }, [refresh.busy, activeCount, loadLibrary]);

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
        setSettingsReady(true);
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
  const anyMenu = menuOpen || filterOpen || studyOpen;
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
  // What every view shows: your filter plus the content defaults (ADR-0027).
  const viewFilter = useMemo(() => withContentDefaults(filter, settings.showNudity), [filter, settings.showNudity]);
  const fKey = filterKey(viewFilter);
  useEffect(() => {
    if (!active) return;
    let stale = false;
    Promise.all([
      api.slides(active, viewFilter, PAGE_SIZE, page * PAGE_SIZE),
      api.slideCount(active, viewFilter),
      api.categoryCounts(active, viewFilter),
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
  }, [activeKey, activeCount, page, fKey, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (active?.kind === "topic") setShuffle(topic?.shuffle ?? true);
    // Playlists keep your order, search its best matches first, Saved the newest first.
    else setShuffle(active?.kind === "all");
  }, [activeKey, topic?.shuffle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shuffle once per view, page or toggle. Saving, marking or a failed image
  // changes slides, not the set of images, so the order (and the image on
  // screen) stays put (owner, session 20: "should still stay in the slide").
  const orderRef = useRef<{ key: string; ids: number[] } | null>(null);
  const slides = useMemo(() => {
    const key = `${activeKey}|${page}|${shuffle}`;
    const prev = orderRef.current;
    const ids = source.map((s) => s.block_id);
    const order = stableOrder(prev?.key === key ? prev.ids : null, ids, shuffle, prev?.key !== key);
    orderRef.current = { key, ids: order };
    const byId = new Map(source.map((s) => [s.block_id, s]));
    return order.map((id) => byId.get(id)).filter((s): s is Slide => s !== undefined);
  }, [source, shuffle, activeKey, page]);
  // A failed image first tries the block's other stored sizes (ADR-0016).
  const visible = useMemo(
    () =>
      slides
        .filter((s) => !failed.has(s.block_id))
        .map((raw) => {
          // Cleveland's print size on big windows (ADR-0029); the web size stays a fallback.
          const s = sharpSlide(raw, bigWindow);
          const n = attempts.get(s.block_id) ?? 0;
          return n > 0 && s.fallback_urls?.[n - 1] ? { ...s, display_url: s.fallback_urls[n - 1] } : s;
        }),
    [slides, failed, attempts, bigWindow],
  );
  useEffect(() => {
    const onResize = () => setBigWindow(bigNow());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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

  // Auto-advance (paused while a menu is open; a timed session drives itself).
  const seconds = settings.slideSeconds ?? topic?.slide_seconds ?? 8;
  useEffect(() => {
    if (!playing || anyMenu || visible.length < 2 || session) return;
    const id = window.setTimeout(() => go(1), seconds * 1000);
    return () => window.clearTimeout(id);
  }, [playing, anyMenu, seconds, tick, go, visible.length, session]);

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
    setStudyOpen(false);
    setMenuOpen((o) => !o);
  }, []);
  const toggleFilter = useCallback(() => {
    setMenuOpen(false);
    setStudyOpen(false);
    setFilterOpen((o) => !o);
  }, []);
  const toggleStudy = useCallback(() => {
    setMenuOpen(false);
    setFilterOpen(false);
    setStudyOpen((o) => !o);
  }, []);
  const changeStudy = useCallback((p: Partial<StudyAids>) => setStudy((s) => ({ ...s, ...p })), []);

  // ---- ♥ Favourites: a playlist made on the first ♥ (ADR-0025) ----
  const favId = playlists.find((l) => l.name === FAVOURITES)?.id;
  const favourite = favId !== undefined && inPlaylists.includes(favId);
  // One ♥ at a time, so a double press can't make Favourites twice (review 0020 D-118).
  const favBusy = useRef(false);
  const setFavourite = useCallback(
    async (blockId: number, present: boolean) => {
      if (favBusy.current) return;
      favBusy.current = true;
      try {
        let id = favId;
        if (id === undefined) {
          if (!present) return;
          id = (await api.createPlaylist(FAVOURITES)).id;
        }
        await api.setInPlaylist(id, blockId, present);
        await loadPlaylists();
      } finally {
        favBusy.current = false;
      }
    },
    [favId, loadPlaylists],
  );

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
  /** A short note; with `undo`, an Undo button for a few seconds (ADR-0029). */
  const say = useCallback((text: string, undo?: () => void) => {
    setToast(text);
    undoRef.current = undo ?? null;
    setUndoable(Boolean(undo));
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(
      () => {
        setToast(undefined);
        undoRef.current = null;
        setUndoable(false);
      },
      undo ? 6000 : 2500,
    );
  }, []);
  const runUndo = () => {
    const u = undoRef.current;
    undoRef.current = null;
    setUndoable(false);
    setToast(undefined);
    u?.();
  };
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
  // Save as (ADR-0031): the native dialog picks the file; the note says
  // where it went and stays until its × is pressed. The image stays on
  // screen (the slide order is stable, see order.ts).
  const saveCurrent = useCallback(async () => {
    if (!slide || !active || saving) return;
    const id = slide.block_id;
    setSaving(true);
    try {
      const r = await api.saveImageAs(id, active, settings.lastSaveDir);
      if (!r) return;
      setSource((list) => list.map((s) => (s.block_id === id ? { ...s, saved: true } : s)));
      if (!r.saved.already_stored) setSavedCount((n) => n + 1);
      patch({ lastSaveDir: r.folder });
      setSavedNote({ folder: r.folder, file: r.path.split(/[\\/]/).pop() ?? r.path });
    } catch (e) {
      say(message(e));
    } finally {
      setSaving(false);
    }
  }, [slide, active, saving, settings.lastSaveDir, patch, say]);

  // ---- Timed sessions (ADR-0025) ----
  // The session lives in state for the view and in a ref for the clock, so
  // the clock never works from a stale copy. `commit` updates both.
  const plan = planFor(settings.practicePlan, settings.customRounds);
  const sessionRef = useRef<Running | null>(null);
  const resumable = useRef<Running | null>(null);
  const slideRef = useRef(slide);
  slideRef.current = slide;
  const commit = useCallback((s: Running | null) => {
    sessionRef.current = s;
    setSession(s);
  }, []);

  const loadLog = useCallback(() => {
    if (!settings.showPracticeLog) return setLog(null);
    const now = Date.now();
    api
      .practiceSessions(logSince(now))
      .then((list) => setLog(weeklyLog(list, now)))
      .catch(() => setLog(null));
  }, [settings.showPracticeLog]);
  useEffect(loadLog, [loadLog]);

  const openPractice = useCallback(() => {
    setPracticeView("plan");
    setKept(undefined);
    loadLog();
    openDialog(practiceRef.current);
  }, [openDialog, loadLog]);

  /** Show the summary (the plan finished, or the session was stopped). */
  const showResult = useCallback(
    (r: SessionResult, before: Running | null) => {
      // Ended early by mistake? Resume puts it back exactly as it was.
      resumable.current = r.finished || !before ? null : { ...before, paused: true };
      commit(null);
      setResult(r);
      // The practice log keeps sessions that drew something (ADR-0027).
      api
        .recordPractice({
          started_at: Math.floor(r.startedAt / 1000),
          seconds: Math.round(r.seconds),
          skipped: r.skipped,
          plan: r.planName.slice(0, 80),
          source: r.from.slice(0, 120),
          finished: r.finished,
          drawn: r.drawn.map((d) => ({ block_id: d.block_id, seconds: d.seconds })),
        })
        .then(() => loadLog())
        .catch(() => undefined);
      setPracticeView("summary");
      setKept(undefined);
      if (r.finished && settings.practiceSound) cue.finish();
      openDialog(practiceRef.current);
    },
    [commit, openDialog, settings.practiceSound, loadLog],
  );
  const endSession = useCallback((s: Running) => showResult(stopSession(s, slideRef.current), s), [showResult]);

  const many = visible.length > 1;
  const startSession = useCallback(() => {
    practiceRef.current?.close();
    if (!visible.length) return;
    if (settings.practiceSound) {
      cue.primeSound();
      cue.change();
    }
    setPlaying(false);
    setResult(null);
    setStudyOpen(false);
    setGrid(false);
    resumable.current = null;
    commit(firstPose(plan, activeLabel, many, Date.now()));
    if (many) go(1);
  }, [visible.length, many, settings.practiceSound, plan, activeLabel, go, commit]);

  /** Finish this pose (its time ran out, or → skipped it) and move on. */
  const advancePose = useCallback(
    (kind: "done" | "skip") => {
      const s = sessionRef.current;
      if (!s) return;
      const step = finishPose(s, slideRef.current, kind, many, Date.now());
      if ("result" in step) return showResult(step.result, null);
      commit(step.next);
      if (many) go(1);
      if (settings.practiceSound) cue.change();
    },
    [commit, showResult, go, many, settings.practiceSound],
  );
  const advanceRef = useRef(advancePose);
  advanceRef.current = advancePose;

  /** ← in a session: the previous image, and this pose starts over. */
  const backPose = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    go(-1);
    commit(restartPose(s, many, Date.now()));
  }, [go, commit, many]);

  const togglePause = useCallback(() => {
    const s = sessionRef.current;
    if (s) commit({ ...s, paused: !s.paused });
  }, [commit]);

  // The pose clock (practice.ts tickSession): counts only while the image is
  // on screen, beeps in the last three seconds, starts a slow pose anyway.
  const running = session !== null && !session.paused;
  const sound = settings.practiceSound;
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      const s = sessionRef.current;
      if (!s) return;
      const step = tickSession(s, dt, Date.now());
      if (step.done) return advanceRef.current("done");
      if (step.beep && sound) cue.tick();
      if (step.s !== s) commit(step.s);
    }, SESSION_TICK_MS);
    return () => window.clearInterval(id);
  }, [running, sound, commit]);

  // Minimised or hidden: pause, so a pose isn't lost while you look away.
  useEffect(() => {
    const onHide = () => {
      const s = sessionRef.current;
      if (document.hidden && s && !s.paused) commit({ ...s, paused: true });
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [commit]);

  const onImageLoad = useCallback(
    (id: number, width: number, height: number) => {
      setNatural({ id, width, height });
      const s = sessionRef.current;
      if (s?.waiting && id === slideRef.current?.block_id) commit({ ...s, waiting: false });
    },
    [commit],
  );

  const sessionView = session
    ? {
        planName: session.plan.name,
        pose: posesBefore(session.plan, session.at) + 1,
        poses: poseCount(session.plan),
        round: session.at.round + 1,
        rounds: session.plan.rounds.length,
        left: Math.max(0, session.left / 1000),
        total: poseMs(session) / 1000,
        paused: session.paused,
      }
    : null;
  // A quiet flash on each new pose (Settings → Practice; CSS drops it for reduced motion).
  const poseId = session ? `${session.at.round}-${session.at.pose}` : "";
  useEffect(() => {
    if (poseId && settings.poseFlash) setFlashKey((k) => k + 1);
  }, [poseId, settings.poseFlash]);

  // The summary's ♥ marks: which drawn images are already favourites.
  useEffect(() => {
    if (!result || favId === undefined) {
      setDrawnFavs([]);
      return;
    }
    let stale = false;
    const ids = [...new Set(result.drawn.map((d) => d.block_id))];
    Promise.all(ids.map((id) => api.playlistsWith(id).then((l) => (l.includes(favId) ? id : null))))
      .then((x) => !stale && setDrawnFavs(x.filter((n): n is number => n !== null)))
      .catch(() => !stale && setDrawnFavs([]));
    return () => {
      stale = true;
    };
  }, [result, favId, playlists]);

  const keepSession = async () => {
    if (!result) return;
    setKeeping(true);
    try {
      const l = await api.createPlaylist(sessionPlaylistName(new Date()));
      const ids = [...new Set(result.drawn.map((d) => d.block_id))];
      for (const id of ids) await api.setInPlaylist(l.id, id, true);
      await loadPlaylists();
      setKept(`Kept as “${l.name}” (${ids.length} image${ids.length === 1 ? "" : "s"}). It's in Playlists.`);
    } catch (e) {
      setKept(message(e));
    } finally {
      setKeeping(false);
    }
  };

  const toggleFavourite = useCallback(() => {
    if (!slide) return;
    const id = slide.block_id;
    const removing = favourite;
    setFavourite(id, !removing)
      .then(() =>
        removing
          ? say("Removed from Favourites", () => setFavourite(id, true).catch((e) => say(message(e))))
          : say("♥ Added to Favourites"),
      )
      .catch((e) => say(message(e)));
  }, [slide, favourite, setFavourite, say]);

  // The control bar, in every window: the mini player's and compact
  // windows' bars open on a tap, so the bar key opens them too (owner,
  // session 20: "if no hotkey for bringing back the bar add one").
  const toggleBar = useCallback(() => {
    if (mini) {
      setMiniMenuOpen(false);
      setMiniBarOpen((o) => !o);
      return;
    }
    const compact = window.matchMedia(COMPACT_QUERY).matches;
    const shown = !settings.controlsHidden && (!compact || compactBarOpen);
    if (compact) setCompactBarOpen(!shown);
    patch({ controlsHidden: shown && !compact });
  }, [mini, settings.controlsHidden, compactBarOpen, patch]);

  // Keyboard: the keys in keys.ts (changeable in the ? sheet), plus Esc.
  // Ignored while typing or in a dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape" && (menuOpen || filterOpen || miniMenuOpen || studyOpen || grid)) {
        setMenuOpen(false);
        setFilterOpen(false);
        setMiniMenuOpen(false);
        setStudyOpen(false);
        setGrid(false);
        return;
      }
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, dialog")) return;
      const s = sessionRef.current;
      if (e.key === "Escape") {
        if (s) endSession(s);
        else if (fullscreen && api.kind === "app") toggleFullscreen();
        return;
      }
      const key = keyOf(e.key);
      if (!key) return;
      // Single-character shortcuts can be turned off (WCAG 2.1.4); named keys stay.
      if (!settings.singleKeys && isCharacterKey(key)) return;
      const action = actionFor(settings.keys, key);
      if (!action) return;
      // Space and / would also scroll or type; the arrows would move focus.
      e.preventDefault();
      switch (action) {
        case "next":
          return s ? advancePose("skip") : go(1);
        case "prev":
          return s ? backPose() : go(-1);
        case "play":
          return s ? togglePause() : setPlaying((p) => !p);
        case "session":
          return s ? undefined : openPractice();
        case "favourite":
          return toggleFavourite();
        case "save":
          return s ? undefined : void saveCurrent();
        case "mirror":
          return changeStudy({ mirror: !study.mirror });
        case "upside":
          return changeStudy({ upside: !study.upside });
        case "grey":
          return changeStudy({ grey: !study.grey, tones: 0 });
        case "values":
          return changeStudy({ tones: nextOf(TONES, study.tones) });
        case "squint":
          return changeStudy({ squint: !study.squint });
        case "effect":
          return changeStudy({ effect: nextOf(EFFECTS, study.effect) });
        case "focus":
          // Isolating darks or lights needs at least 3 values; start from 5.
          return changeStudy({ focus: nextOf(FOCI, study.focus), tones: study.tones > 2 ? study.tones : 5 });
        case "studyGrid":
          return changeStudy({ grid: nextOf(GRIDS, study.grid) });
        case "studyOff":
          return setStudy(NO_STUDY);
        case "grid":
          return s ? undefined : setGrid((g) => !g);
        case "search":
          setRailOpen(true);
          document.getElementById("rail-search")?.focus();
          return;
        case "help":
          return openDialog(shortcutsRef.current);
        case "shuffle":
          return setShuffle((v) => !v);
        case "fullscreen":
          return toggleFullscreen();
        case "bar":
          return toggleBar();
        case "topics":
          return setRailOpen((o) => !o);
        case "playlist":
          return slide ? toggleMenu() : undefined;
        case "filter":
          return toggleFilter();
        case "related":
          return openRelated();
        case "mini":
          return toggleMini();
        case "copyLink":
          return copyLink();
        case "discover":
          return openDiscover();
        case "library":
          return openLibrary();
        case "settings":
          return openSettings();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggleFullscreen, toggleBar, saveCurrent, settings.keys, openSettings, openLibrary, openDiscover, openRelated, toggleMenu, toggleFilter, toggleMini, copyLink, menuOpen, filterOpen, miniMenuOpen, studyOpen, grid, slide, fullscreen, settings.singleKeys, advancePose, backPose, togglePause, endSession, openPractice, toggleFavourite, changeStudy, study, openDialog]);

  // Links leave the app through the system browser (https only).
  const onOpenLink = (e: MouseEvent<HTMLAnchorElement>, url: string) => {
    if (api.kind !== "app") return; // the browser handles target=_blank itself
    e.preventDefault();
    api.openExternal(url).catch((err) => setNotice(message(err)));
  };

  // ---- Offline and back online: retry the images that failed (ADR-0024) ----
  useEffect(() => {
    const on = () => {
      setOnline(true);
      setFailed(new Set());
      setAttempts(new Map());
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  useEffect(() => {
    api.about().then(setAbout, () => setAbout(null));
  }, []);

  // ---- Channels you follow on Are.na (token; one read per page) ----
  const loadFollowing = useCallback(async (nextPage: number) => {
    setDiscoverBusy(true);
    try {
      const r: FollowedPage = await api.followedChannels(nextPage);
      setFollowing((prev) => ({
        result: {
          ...r,
          channels: nextPage > 1 && prev?.result ? [...prev.result.channels, ...r.channels] : r.channels,
        },
      }));
      setFollowingPage(nextPage);
      setDiscoverStatus(undefined);
    } catch (e) {
      setFollowing(null);
      setDiscoverStatus({ tone: "error", text: message(e) });
    } finally {
      setDiscoverBusy(false);
    }
  }, []);

  // "Add" / "Add all new" from Channels you follow (ADR-0026): no reads; one refresh after.
  const addFollowed = async (picks: FollowedPick[]) => {
    setDiscoverBusy(true);
    setDiscoverStatus({ tone: "idle", text: `Adding ${picks.length === 1 ? picks[0].title : `${picks.length} channels`}` });
    try {
      const done = await api.addFollowed(picks);
      const added = done.filter((a) => a.added);
      const where = new Map(done.map((a) => [a.slug, a.topic]));
      setFollowing((prev) =>
        prev?.result
          ? {
              result: {
                ...prev.result,
                channels: prev.result.channels.map((c) => {
                  const t = where.get(c.slug);
                  return t && !c.in_topics.includes(t) ? { ...c, in_topics: [...c.in_topics, t] } : c;
                }),
              },
            }
          : prev,
      );
      const topicsUsed = [...new Set(added.map((a) => a.topic))];
      setDiscoverStatus({
        tone: "ok",
        text: added.length
          ? `Added ${added.length === 1 ? added[0].title : `${added.length} channels`} to ${topicsUsed.join(", ")}. Their images are loading now.`
          : "They were already in those topics.",
      });
      if (added.length) setRefresh({ label: "Refreshing topics", busy: true, tone: "idle" });
      await loadLibrary();
    } catch (e) {
      setDiscoverStatus({ tone: "error", text: message(e) });
    } finally {
      setDiscoverBusy(false);
    }
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
      setFollowing(null);
      setArenaMessage({ text: "Removed. Refreshes run as a guest.", tone: "ok" });
    } catch (e) {
      setArenaMessage({ text: message(e), tone: "error" });
    } finally {
      setArenaBusy(false);
    }
  };

  // ---- Remember where you were (ADR-0029) ----
  // Restore once, when settings and the topic list are in; then keep the
  // place (view, page, image) and the study aids in ui.json.
  useEffect(() => {
    if (restored.current || !settingsReady) return;
    if (!topics.length && allCount === 0) return;
    restored.current = true;
    setStudy(settings.study);
    const last = settings.last;
    const src = parseSourceKey(last?.source);
    if (!src || !last) return;
    if (src.kind === "topic" && !topics.some((t) => t.name === src.name)) return;
    if (src.kind === "playlist" && !playlists.some((l) => l.id === src.id)) return;
    if (last.blockId !== null) pendingBlock.current = { key: sourceKey(src), id: last.blockId };
    setActive(src);
    setPage(last.page);
  }, [settingsReady, topics, playlists, allCount]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const want = pendingBlock.current;
    // Only in its own view; an earlier view's images may still be on screen.
    if (!want || want.key !== activeKey || !visible.length) return;
    const at = visible.findIndex((x) => x.block_id === want.id);
    if (at >= 0) {
      pendingBlock.current = null;
      setIndex(at);
      setTick((t) => t + 1);
    }
  }, [visible, activeKey]);
  useEffect(() => {
    if (!restored.current || !active) return;
    patch({ last: { source: sourceKey(active), page, blockId: slide?.block_id ?? null } });
  }, [activeKey, page, slide?.block_id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (restored.current) patch({ study });
  }, [study]); // eslint-disable-line react-hooks/exhaustive-deps

  // First run: one question instead of setup (ADR-0029).
  useEffect(() => {
    if (settingsReady && !settings.welcomed && topics.length && api.kind === "app") openDialog(welcomeRef.current);
  }, [settingsReady, settings.welcomed, topics.length, openDialog]);
  const chooseSource = (next: SlideSource) => {
    pendingBlock.current = null;
    setFailed(new Set());
    setAttempts(new Map());
    setNotice(undefined);
    setMenuOpen(false);
    setMiniMenuOpen(false);
    setGrid(false);
    setActive(next);
    setPage(0);
    setIndex(0);
    setRailOpen(false);
  };

  // ---- Topics: rename and remove (ADR-0029) ----
  const renameTopic = async (from: string, to: string) => {
    const problem = nameProblem("topic", to);
    if (problem) return setLibraryStatus({ tone: "error", text: problem });
    setLibraryBusy(true);
    try {
      const stored = await api.renameTopic(from, to);
      if (active?.kind === "topic" && active.name === from) setActive({ kind: "topic", name: stored });
      await loadLibrary();
      setLibraryStatus({ tone: "ok", text: `Renamed ${from} to ${stored}.` });
    } catch (e) {
      setLibraryStatus({ tone: "error", text: message(e) });
    } finally {
      setLibraryBusy(false);
    }
  };
  const removeTopic = async (name: string) => {
    setLibraryBusy(true);
    try {
      await api.removeTopic(name);
      if (active?.kind === "topic" && active.name === name) chooseSource({ kind: "all" });
      await loadLibrary();
      setLibraryStatus({ tone: "ok", text: `Removed ${name}. Images in your playlists and saved files stay.` });
    } catch (e) {
      setLibraryStatus({ tone: "error", text: message(e) });
    } finally {
      setLibraryBusy(false);
    }
  };

  // ---- Content marks (ADR-0027) ----
  const loadMarks = useCallback(() => {
    api
      .flagCounts()
      .then((rows) => {
        const n = Object.fromEntries(rows);
        setMarks({ hidden: n.hidden ?? 0, nudity: n.nudity ?? 0 });
      })
      .catch(() => undefined);
  }, []);
  useEffect(loadMarks, [loadMarks]);
  const markCurrent = async (flag: BlockFlag) => {
    if (!slide) return;
    const id = slide.block_id;
    try {
      await api.setBlockFlag(id, flag, true);
      // Gone from this view at once (unless nudity is shown).
      if (flag === "hidden" || !settings.showNudity) setSource((list) => list.filter((x) => x.block_id !== id));
      say(flag === "hidden" ? "Hidden. Settings → Content shows it again." : "Marked as nudity.", () => {
        api
          .setBlockFlag(id, flag, false)
          .then(() => {
            setReloadKey((k) => k + 1);
            loadMarks();
          })
          .catch((e) => say(message(e)));
      });
      loadMarks();
    } catch (e) {
      say(message(e));
    }
  };
  const clearMarks = async (flag: BlockFlag) => {
    try {
      const n = await api.clearBlockFlags(flag);
      setContentNote(flag === "hidden" ? `${n} hidden image${n === 1 ? " is" : "s are"} back.` : `Forgot ${n} nudity mark${n === 1 ? "" : "s"}.`);
      loadMarks();
      loadLibrary();
    } catch (e) {
      setContentNote(message(e));
    }
  };

  // ---- Updates (ADR-0028): at most once a day, only if switched on ----
  const checkUpdate = useCallback(() => {
    setUpdate({ state: "checking" });
    api
      .checkUpdate()
      .then((r) => {
        setUpdate({ state: !r ? "none" : r.newer ? "available" : "latest", release: r });
        patch({ lastUpdateCheck: Date.now() });
      })
      .catch((e) => setUpdate({ state: "error", text: `Couldn't reach GitHub: ${message(e)}` }));
  }, [patch]);
  const updateChecked = useRef(false);
  useEffect(() => {
    if (!settingsReady || updateChecked.current || api.kind !== "app" || !settings.checkUpdates) return;
    updateChecked.current = true;
    const last = settings.lastUpdateCheck ?? 0;
    if (Date.now() - last > 24 * 3600 * 1000) checkUpdate();
  }, [settingsReady, settings.checkUpdates, settings.lastUpdateCheck, checkUpdate]);

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
        playing={session ? !session.paused && !session.waiting : playing}
        shuffle={shuffle}
        slideSeconds={session ? poseMs(session) / 1000 : seconds}
        cover={settings.fit === "cover"}
        study={study}
        studyMenuOpen={studyOpen}
        onToggleStudyMenu={toggleStudy}
        onStudy={changeStudy}
        onResetStudy={() => setStudy(NO_STUDY)}
        session={sessionView}
        onSession={() => (session ? endSession(session) : openPractice())}
        favourite={favourite}
        onToggleFavourite={toggleFavourite}
        imageSize={natural && natural.id === slide?.block_id ? natural : undefined}
        onImageLoad={onImageLoad}
        tick={tick}
        status={status}
        refresh={refresh}
        notice={notice}
        offline={!online}
        imagesFailed={visible.length ? 0 : failed.size}
        onRetryImages={() => {
          setFailed(new Set());
          setAttempts(new Map());
        }}
        onShowRefreshDetails={() => openDialog(refreshDetailsRef.current)}
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
        onHideImage={() => markCurrent("hidden")}
        savedCount={savedCount}
        onSearch={(query) => chooseSource({ kind: "search", query })}
        grid={grid}
        onToggleGrid={() => setGrid((g) => !g)}
        onPickSlide={(i) => {
          setIndex(i);
          setTick((t) => t + 1);
          setGrid(false);
        }}
        imageReady={natural?.id === slide?.block_id}
        clockStyle={settings.sessionClock}
        flashKey={settings.poseFlash ? flashKey : 0}
        onUndo={undoable ? runUndo : undefined}
        onMarkNudity={() => markCurrent("nudity")}
        update={update.state === "available" && update.release ? update.release : null}
        toast={toast}
        savedNote={savedNote}
        onDismissSavedNote={() => setSavedNote(null)}
        onSelect={chooseSource}
        onOpenLibrary={openLibrary}
        onTogglePlaylistMenu={toggleMenu}
        onSetInPlaylist={setInPlaylist}
        onCreatePlaylist={(name) => createPlaylist(name, true)}
        onToggleFullscreen={toggleFullscreen}
        onToggleControls={() => patch({ controlsHidden: !settings.controlsHidden })}
        onToggleRail={() => setRailOpen((o) => !o)}
        onOpenSettings={openSettings}
        onOpenLink={onOpenLink}
        onPrev={() => (session ? backPose() : go(-1))}
        onNext={() => (session ? advancePose("skip") : go(1))}
        onTogglePlay={() => (session ? togglePause() : setPlaying((p) => !p))}
        onToggleShuffle={() => setShuffle((s) => !s)}
        onRefresh={onRefresh}
        onImageError={(id) => {
          const raw = slides.find((x) => x.block_id === id);
          const s = raw && sharpSlide(raw, bigWindow);
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
        canFollow={Boolean(arenaToken?.saved)}
        following={following}
        onShowFollowing={() => {
          setFollowing({ result: null });
          loadFollowing(1);
        }}
        onMoreFollowing={() => loadFollowing(followingPage + 1)}
        onAddFollowed={addFollowed}
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
        about={about}
        marks={marks}
        onShowHidden={() => clearMarks("hidden")}
        onForgetNudityMarks={() => clearMarks("nudity")}
        onClearPractice={() => {
          api
            .clearPractice()
            .then((n) => {
              setContentNote(`Cleared ${n} practice session${n === 1 ? "" : "s"}.`);
              loadLog();
            })
            .catch((e) => setContentNote(message(e)));
        }}
        contentNote={contentNote}
        update={update}
        onCheckUpdate={checkUpdate}
        onShowShortcuts={() => openDialog(shortcutsRef.current)}
        onShowNotices={() => {
          openDialog(noticesRef.current);
          if (notices === null)
            api
              .thirdPartyNotices()
              .then(setNotices)
              .catch((e) => setNotices(message(e)));
        }}
      />
      <PracticePanel
        ref={practiceRef}
        view={practiceView}
        log={settings.showPracticeLog ? log : null}
        onHideLog={() => patch({ showPracticeLog: false })}
        planId={settings.practicePlan}
        customRounds={settings.customRounds}
        sound={settings.practiceSound}
        from={activeLabel || "All"}
        images={visible.length}
        result={result}
        favourites={drawnFavs}
        kept={kept}
        busy={keeping}
        onPlan={(id) => patch({ practicePlan: id })}
        onCustom={(rounds) => patch({ customRounds: rounds })}
        onSound={(on) => patch({ practiceSound: on })}
        onStart={startSession}
        onToggleFavourite={(id) => {
          setFavourite(id, !drawnFavs.includes(id)).catch((e) => setKept(message(e)));
        }}
        onKeep={keepSession}
        onAgain={() => {
          resumable.current = null;
          setPracticeView("plan");
          setKept(undefined);
        }}
        onResume={
          resumable.current
            ? () => {
                const s = resumable.current;
                resumable.current = null;
                practiceRef.current?.close();
                setResult(null);
                if (s) commit({ ...s, paused: false });
              }
            : undefined
        }
      />
      <ShortcutsPanel
        ref={shortcutsRef}
        keys={settings.keys}
        lettersOff={!settings.singleKeys}
        onChangeKeys={(keys) => patch({ keys })}
      />
      <NoticesPanel ref={noticesRef} text={notices} />
      <WelcomePanel
        ref={welcomeRef}
        topics={topics}
        onPick={(name) => {
          welcomeRef.current?.close();
          chooseSource({ kind: "topic", name });
        }}
        onSurprise={() => {
          welcomeRef.current?.close();
          chooseSource({ kind: "all" });
          setShuffle(true);
          setPlaying(true);
        }}
        onClose={() => patch({ welcomed: true })}
      />
      <RefreshDetails
        ref={refreshDetailsRef}
        failed={refreshFailed.list}
        total={refreshFailed.total}
        onRetry={() => {
          refreshDetailsRef.current?.close();
          onRefresh();
        }}
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
        onRenameTopic={renameTopic}
        onRemoveTopic={removeTopic}
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
