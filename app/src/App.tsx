import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type LibraryStatus, type RefreshEvent, type Slide, type TopicInfo } from "./api";
import { SlideshowView, type RefreshState } from "./SlideshowView";

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
  const seconds = topic?.slide_seconds ?? 8;
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

  // Keyboard: ← → Space S.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key.toLowerCase() === "s") setShuffle((s) => !s);
      else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const onRefresh = () => {
    setRefresh({ label: "Refreshing topics", busy: true, tone: "idle" });
    api.refreshNow().catch((e) => setRefresh({ label: String(e), busy: false, tone: "error" }));
  };

  return (
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
      onSelectTopic={(name) => {
        setFailed(new Set());
        setActive(name);
      }}
      onPrev={() => go(-1)}
      onNext={() => go(1)}
      onTogglePlay={() => setPlaying((p) => !p)}
      onToggleShuffle={() => setShuffle((s) => !s)}
      onRefresh={onRefresh}
      onImageError={(id) => setFailed((f) => new Set(f).add(id))}
    />
  );
}
