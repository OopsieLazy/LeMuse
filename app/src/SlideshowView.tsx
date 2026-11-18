import type { FormEvent, MouseEvent } from "react";
import {
  isHttps,
  NO_FILTER,
  PAGE_SIZE,
  sourceKey,
  type CategoryFilter,
  type LibraryStatus,
  type Playlist,
  type Slide,
  type SlideSource,
  type TopicInfo,
  type Vocabulary,
} from "./api";

// Pure view: everything it shows comes in through props, so the same markup
// renders in the desktop app, the browser preview, the design artifact, the
// W3C snapshot and the layout test (scripts/snapshot.tsx). Look and layout
// come from attributes on <html> (settings.ts) and the tokens in
// theme/tokens.css, never from inline styles here. Every string from a
// remote source or the user is rendered as React text, never as HTML.

export interface RefreshState {
  label: string;
  busy: boolean;
  tone: "idle" | "ok" | "error";
}

export interface SlideshowViewProps {
  mode: "app" | "preview";
  topics: TopicInfo[];
  /** Local playlists (ADR-0014). */
  playlists: Playlist[];
  /** Image count for "All". */
  allCount: number;
  active: SlideSource | null;
  /** Name of what's playing: "All", a topic or a playlist. */
  activeLabel: string;
  slides: Slide[];
  index: number;
  playing: boolean;
  shuffle: boolean;
  slideSeconds: number;
  /** Changes on every advance so the timer bar restarts. */
  tick: number;
  status: LibraryStatus | null;
  refresh: RefreshState;
  fullscreen?: boolean;
  controlsHidden?: boolean;
  /** Topic drawer open (only used by layouts without a docked topic list). */
  railOpen?: boolean;
  notice?: string;
  /** Playlists holding the current image. */
  inPlaylists?: number[];
  /** The add-to-playlist menu above the controls. */
  playlistMenuOpen?: boolean;
  playlistMenuError?: string;
  /** Images in the view after the filter, over all pages (ADR-0015). */
  total?: number;
  /** Which page of PAGE_SIZE images is loaded (0-based). */
  page?: number;
  onPage?: (page: number) => void;
  vocabulary?: Vocabulary | null;
  filter?: CategoryFilter;
  /** Category id → images in the current view (after the filter). */
  categoryCounts?: Record<string, number>;
  filterMenuOpen?: boolean;
  onToggleFilterMenu?: () => void;
  onCycleCategory?: (id: string) => void;
  onClearFilter?: () => void;
  onOpenDiscover?: () => void;
  /** Related channels for the current (Are.na) image. */
  onRelated?: () => void;
  /** The small always-on-top player (ADR-0016). */
  mini?: boolean;
  onToggleMini?: () => void;
  /** Mini player: bottom bar (tap the image) and the ☰ menu. */
  miniBarOpen?: boolean;
  miniMenuOpen?: boolean;
  onToggleMiniBar?: () => void;
  onToggleMiniMenu?: () => void;
  /** Copy the current image's links. */
  onCopyLink?: () => void;
  /** A short confirmation, e.g. "Link copied". */
  toast?: string;
  onSelect?: (source: SlideSource) => void;
  onOpenLibrary?: () => void;
  onTogglePlaylistMenu?: () => void;
  onSetInPlaylist?: (playlistId: number, present: boolean) => void;
  /** Create a playlist from the menu and put the current image in it. */
  onCreatePlaylist?: (name: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onTogglePlay?: () => void;
  onToggleShuffle?: () => void;
  onToggleFullscreen?: () => void;
  onToggleControls?: () => void;
  onToggleRail?: () => void;
  onOpenSettings?: () => void;
  onOpenLink?: (event: MouseEvent<HTMLAnchorElement>, url: string) => void;
  onRefresh?: () => void;
  onImageError?: (blockId: number) => void;
}

const SOURCES: [RegExp, string][] = [
  [/are\.na/, "Are.na"],
  [/clevelandart\.org/, "Cleveland Museum of Art"],
  [/artic\.edu/, "Art Institute of Chicago"],
];

export function sourceName(slide: Slide): string {
  const url = slide.page_url ?? slide.display_url;
  const known = SOURCES.find(([re]) => re.test(url))?.[1];
  if (known) return known;
  try {
    return new URL(url).hostname;
  } catch {
    return "Source";
  }
}

const pad = (n: number, width: number) => String(n).padStart(width, "0");

/** Inline icons: geometry, not style. Stroke and size come from tokens. */
const ICONS = {
  prev: "M15 5 8 12l7 7",
  next: "m9 5 7 7-7 7",
  play: "m8 5 11 7-11 7Z",
  pause: "M9 5v14M15 5v14",
  shuffle: "M4 7h3c5 0 5 10 10 10h3M4 17h3c2 0 3-1.5 4-3.5M13 9.5C14 8 15 7 17 7h3M17 4l3 3-3 3M17 14l3 3-3 3",
  save: "M12 4v11M7 10l5 5 5-5M5 20h14",
  fullscreen: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  exitFullscreen: "M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5",
  chevronUp: "M4 15l8-6 8 6",
  chevronDown: "M4 9l8 6 8-6",
  settings:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-2.1 1.2L14.7 21h-4l-.3-2.4a7.6 7.6 0 0 1-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7.5 7.5 0 0 1 0-2.4L4.4 9.9l2-3.4 1.9.7a7.6 7.6 0 0 1 2.1-1.2L10.7 3h4l.3 2.4a7.6 7.6 0 0 1 2.1 1.2l1.9-.7 2 3.4-1.6 1.2a7.5 7.5 0 0 1 0 2.4Z",
  topics: "M4 6h16M4 12h16M4 18h10",
  add: "M12 5v14M5 12h14",
  playlistAdd: "M4 6h11M4 11h11M4 16h7M18 13v7M14.5 16.5h7",
  filter: "M4 5h16l-6 7.5V19l-4-2v-4.5Z",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM15.5 15.5 20 20",
  related: "M8 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM22 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM22 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM7.6 10.6l8.8-3.2M7.6 13.4l8.8 3.2",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  mini: "M3 5h18v14H3ZM12 12h7v5h-7Z",
  expand: "M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7",
};

const fmt = (n: number) => n.toLocaleString("en-US");

/** "1–500", "501–1,000", … for the page menu. */
export function pageLabel(page: number, total: number): string {
  const start = page * PAGE_SIZE + 1;
  return `${fmt(start)}–${fmt(Math.min(total, start + PAGE_SIZE - 1))}`;
}

type ChipState = "include" | "exclude" | "off";

function chipState(f: CategoryFilter, id: string): ChipState {
  if (f.include.includes(id)) return "include";
  return f.exclude.includes(id) ? "exclude" : "off";
}

const CHIP_TEXT: Record<ChipState, string> = {
  off: "not filtered; select to show only these",
  include: "shown only; select to hide these",
  exclude: "hidden; select to clear",
};

export function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function RailItem(p: { label: string; count: number; current: boolean; onClick?: () => void }) {
  return (
    <li>
      <button type="button" className="topic" aria-current={p.current ? "true" : undefined} onClick={p.onClick}>
        <span className="topic-name">{p.label}</span>
        <span className="topic-count">{p.count.toLocaleString("en-US")}</span>
      </button>
    </li>
  );
}

function emptyText(p: SlideshowViewProps): [string, string] {
  if (p.notice) return [`No images for ${p.activeLabel} yet`, p.notice];
  const f = p.filter ?? NO_FILTER;
  if (f.include.length || f.exclude.length)
    return ["No images match this filter", "Change or clear the category filter to see more."];
  if (!p.active) return ["No topic selected", "Pick a topic, or add an Are.na channel with the + button."];
  if (p.active.kind === "playlist")
    return [
      `${p.activeLabel} is empty`,
      "Add images to it with the playlist button under any image. A playlist keeps links only, never image files.",
    ];
  return [
    `No images for ${p.activeLabel} yet`,
    "Images appear here as soon as a refresh brings in their details. Nothing is downloaded; each one streams from its source.",
  ];
}

export function SlideshowView(p: SlideshowViewProps) {
  const slide = p.slides[p.index] as Slide | undefined;
  const width = String(Math.max(p.slides.length, 1)).length;
  const current = sourceKey(p.active);
  const inLists = new Set(p.inPlaylists ?? []);
  const [emptyTitle, emptyBody] = emptyText(p);
  const filter = p.filter ?? NO_FILTER;
  const filtering = filter.include.length + filter.exclude.length;
  const total = p.total ?? p.slides.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(p.page ?? 0, pages - 1);
  const labels = new Map(
    (p.vocabulary?.groups ?? []).flatMap((g) => g.categories.map((c) => [c.id, c.label] as const)),
  );
  // Material, medium, object and style labels; the kind ("Image") adds little.
  const slideTags = (slide?.categories ?? [])
    .filter((c) => c !== "image" && labels.has(c))
    .map((c) => labels.get(c) as string)
    .slice(0, 5);
  const counts = p.categoryCounts ?? {};
  const canRelate = Boolean(slide && slide.connector === "arena" && p.mode === "app");
  const onNewPlaylist = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("playlist-name");
    if (input instanceof HTMLInputElement && input.value.trim()) {
      p.onCreatePlaylist?.(input.value.trim());
      input.value = "";
    }
  };
  return (
    <div className="app" data-rail-open={p.railOpen ? "true" : "false"}>
      <nav className="rail" aria-label="Topics and playlists" id="topic-rail">
        <div className="brand">
          <span className="brand-name">LeMuse</span>
          {p.mode === "preview" && <span className="brand-mode">Preview</span>}
          <button
            type="button"
            className="icon-btn brand-add"
            onClick={p.onOpenDiscover}
            aria-label="Find Are.na channels"
            title="Find channels (D)"
          >
            <Icon d={ICONS.search} />
          </button>
          <button
            type="button"
            className="icon-btn brand-btn"
            onClick={p.onOpenLibrary}
            aria-label="Add a channel or manage playlists"
            title="Add channel, playlists (A)"
          >
            <Icon d={ICONS.add} />
          </button>
        </div>
        <div className="rail-scroll">
          <ul className="topic-list" aria-label="Everything">
            <RailItem
              label="All"
              count={p.allCount}
              current={current === "all"}
              onClick={() => p.onSelect?.({ kind: "all" })}
            />
          </ul>
          <h2 className="rail-heading" id="rail-topics">
            Topics
          </h2>
          <ul className="topic-list" aria-labelledby="rail-topics">
            {p.topics.map((t) => (
              <RailItem
                key={t.name}
                label={t.name}
                count={t.slides}
                current={current === sourceKey({ kind: "topic", name: t.name })}
                onClick={() => p.onSelect?.({ kind: "topic", name: t.name })}
              />
            ))}
          </ul>
          <h2 className="rail-heading" id="rail-playlists">
            Playlists
          </h2>
          {p.playlists.length ? (
            <ul className="topic-list" aria-labelledby="rail-playlists">
              {p.playlists.map((l) => (
                <RailItem
                  key={l.id}
                  label={l.name}
                  count={l.items}
                  current={current === sourceKey({ kind: "playlist", id: l.id })}
                  onClick={() => p.onSelect?.({ kind: "playlist", id: l.id })}
                />
              ))}
            </ul>
          ) : (
            <p className="rail-hint">None yet. Use the playlist button under an image.</p>
          )}
        </div>
        <div className="rail-foot">
          <p className={`refresh-label tone-${p.refresh.tone}`} role="status">
            {p.refresh.label}
          </p>
          <p className="library-line">
            {p.status ? `${p.status.blocks.toLocaleString("en-US")} images in catalog` : "Opening library"}
          </p>
          <div className="rail-actions">
            <button
              type="button"
              className="refresh"
              onClick={p.onRefresh}
              disabled={p.refresh.busy || p.mode === "preview"}
              title={p.mode === "preview" ? "Refresh runs in the desktop app" : "Fetch new images for every topic"}
            >
              {p.refresh.busy ? "Refreshing" : "Refresh"}
            </button>
            <button type="button" className="icon-btn" onClick={p.onOpenSettings} aria-label="Settings" title="Settings (,)">
              <Icon d={ICONS.settings} />
            </button>
          </div>
        </div>
      </nav>

      <main className="viewer">
        <figure className="stage">
          <div className="frame">
            {slide ? (
              <img
                key={slide.block_id}
                src={slide.display_url}
                alt={slide.title ?? "Untitled reference image"}
                width={slide.width ?? undefined}
                height={slide.height ?? undefined}
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => p.onImageError?.(slide.block_id)}
              />
            ) : (
              <div className="empty">
                <p className="empty-title">{emptyTitle}</p>
                <p className="empty-body">{emptyBody}</p>
              </div>
            )}
            <button
              type="button"
              className="reveal"
              onClick={p.onToggleControls}
              aria-label="Show controls"
              title="Show controls (H)"
            >
              <Icon d={ICONS.chevronUp} />
            </button>
            {p.toast && (
              <p className="toast" role="status">
                {p.toast}
              </p>
            )}
            {p.mini && (
              <>
                {/* Tap the image to show or hide the bottom bar (ADR-0016, v2). */}
                <button
                  type="button"
                  className="mini-tap"
                  onClick={p.onToggleMiniBar}
                  aria-expanded={Boolean(p.miniBarOpen)}
                  aria-controls="mini-bar"
                  aria-label={p.miniBarOpen ? "Hide controls" : "Show controls"}
                />
                <button
                  type="button"
                  className="icon-btn mini-burger"
                  onClick={p.onToggleMiniMenu}
                  aria-expanded={Boolean(p.miniMenuOpen)}
                  aria-controls="mini-menu"
                  aria-label="Topics and playlists"
                  title="Topics and playlists"
                  data-shown={p.miniBarOpen || p.miniMenuOpen ? "true" : "false"}
                >
                  <Icon d={ICONS.topics} />
                </button>
                {p.miniMenuOpen && (
                  <nav className="mini-menu" id="mini-menu" aria-label="Topics and playlists">
                    <ul className="topic-list">
                      <RailItem
                        label="All"
                        count={p.allCount}
                        current={current === "all"}
                        onClick={() => p.onSelect?.({ kind: "all" })}
                      />
                      {p.topics.map((t) => (
                        <RailItem
                          key={t.name}
                          label={t.name}
                          count={t.slides}
                          current={current === sourceKey({ kind: "topic", name: t.name })}
                          onClick={() => p.onSelect?.({ kind: "topic", name: t.name })}
                        />
                      ))}
                      {p.playlists.map((l) => (
                        <RailItem
                          key={`p${l.id}`}
                          label={l.name}
                          count={l.items}
                          current={current === sourceKey({ kind: "playlist", id: l.id })}
                          onClick={() => p.onSelect?.({ kind: "playlist", id: l.id })}
                        />
                      ))}
                    </ul>
                  </nav>
                )}
                {p.miniBarOpen && (
                  // The bar's background drags the borderless window; buttons stay clickable.
                  <div className="mini-bar" id="mini-bar" data-tauri-drag-region="true" role="group" aria-label="Mini player">
                    <span className="mini-title" data-tauri-drag-region="true">
                      {slide ? slide.title || "Untitled" : p.activeLabel}
                    </span>
                    <button type="button" className="icon-btn" onClick={p.onPrev} disabled={!slide} aria-label="Previous image">
                      <Icon d={ICONS.prev} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={p.onTogglePlay}
                      disabled={!slide}
                      aria-pressed={p.playing}
                      aria-label={p.playing ? "Pause slideshow" : "Play slideshow"}
                    >
                      <Icon d={p.playing ? ICONS.pause : ICONS.play} />
                    </button>
                    <button type="button" className="icon-btn" onClick={p.onNext} disabled={!slide} aria-label="Next image">
                      <Icon d={ICONS.next} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={p.onToggleMini}
                      aria-label="Back to the full window"
                      title="Full window (M)"
                    >
                      <Icon d={ICONS.expand} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <figcaption className="caption">
            <div className="timer" aria-hidden="true">
              {slide && (
                <span
                  key={p.tick}
                  className={`timer-fill${p.playing ? "" : " paused"}`}
                  style={{ animationDuration: `${p.slideSeconds}s` }}
                />
              )}
            </div>
            <div className="caption-body">
              <div className="meta">
                <h1 className="slide-title">{slide ? slide.title || "Untitled" : p.activeLabel || "LeMuse"}</h1>
                {slide && (
                  <p className="byline">
                    {slide.creator && <span className="creator">{slide.creator}</span>}
                    <span className="source">{sourceName(slide)}</span>
                    {slide.page_url && isHttps(slide.page_url) && (
                      <a
                        href={slide.page_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="source-link"
                        onClick={(e) => slide.page_url && p.onOpenLink?.(e, slide.page_url)}
                      >
                        Open source page
                      </a>
                    )}
                  </p>
                )}
                {slideTags.length > 0 && (
                  <p className="slide-tags">
                    <span className="visually-hidden">Categories: </span>
                    {slideTags.map((t) => (
                      <span key={t} className="slide-tag">
                        {t}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <dl className="specs">
                <div>
                  <dt>Slide</dt>
                  <dd>
                    {slide ? pad(p.index + 1, width) : pad(0, width)} / {pad(p.slides.length, width)}
                  </dd>
                </div>
                <div>
                  <dt>Images</dt>
                  <dd>{fmt(total)}</dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>{slide?.width && slide.height ? `${slide.width} × ${slide.height} px` : "Unknown"}</dd>
                </div>
              </dl>
              <div className="controls" role="group" aria-label="Slideshow controls">
                {pages > 1 && (
                  <>
                    <label htmlFor="page-select" className="visually-hidden">
                      Page of {fmt(total)} images
                    </label>
                    <select
                      id="page-select"
                      className="page-select"
                      value={page}
                      onChange={(e) => p.onPage?.(Number(e.target.value))}
                      title={`Images ${pageLabel(page, total)} of ${fmt(total)}: pick another 500`}
                    >
                      {Array.from({ length: pages }, (_, i) => (
                        <option key={i} value={i}>
                          {pageLabel(i, total)}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <button type="button" className="icon-btn only-overlay" onClick={p.onToggleRail} aria-expanded={Boolean(p.railOpen)} aria-controls="topic-rail" aria-label="Topics" title="Topics (T)">
                  <Icon d={ICONS.topics} />
                </button>
                <button type="button" className="icon-btn" onClick={p.onPrev} disabled={!slide} aria-label="Previous image" title="Previous (←)">
                  <Icon d={ICONS.prev} />
                </button>
                <button
                  type="button"
                  className="icon-btn primary"
                  onClick={p.onTogglePlay}
                  disabled={!slide}
                  aria-pressed={p.playing}
                  aria-label={p.playing ? "Pause slideshow" : "Play slideshow"}
                  title="Play or pause (Space)"
                >
                  <Icon d={p.playing ? ICONS.pause : ICONS.play} />
                </button>
                <button type="button" className="icon-btn" onClick={p.onNext} disabled={!slide} aria-label="Next image" title="Next (→)">
                  <Icon d={ICONS.next} />
                </button>
                <button type="button" className="icon-btn" onClick={p.onToggleShuffle} aria-pressed={p.shuffle} aria-label="Shuffle" title="Shuffle (S)">
                  <Icon d={ICONS.shuffle} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={p.onTogglePlaylistMenu}
                  disabled={!slide}
                  aria-expanded={Boolean(p.playlistMenuOpen && slide)}
                  aria-controls="playlist-menu"
                  aria-label={inLists.size ? "In a playlist: change playlists" : "Add to playlist"}
                  data-in-playlist={inLists.size ? "true" : "false"}
                  title="Add to playlist (P)"
                >
                  <Icon d={ICONS.playlistAdd} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={p.onToggleFilterMenu}
                  aria-expanded={Boolean(p.filterMenuOpen)}
                  aria-controls="filter-menu"
                  aria-label={filtering ? `Filter by category (${filtering} active)` : "Filter by category"}
                  data-active={filtering ? "true" : "false"}
                  title="Filter by category (C)"
                >
                  <Icon d={ICONS.filter} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={p.onRelated}
                  disabled={!canRelate}
                  aria-label="Related Are.na channels"
                  title={canRelate ? "Channels this image is also in (R)" : "Related channels: Are.na images, desktop app"}
                >
                  <Icon d={ICONS.related} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={p.onCopyLink}
                  disabled={!slide}
                  aria-label="Copy image link"
                  title="Copy the image and source links (L)"
                >
                  <Icon d={ICONS.link} />
                </button>
                <button type="button" className="icon-btn" disabled aria-label="Save original" title="Save arrives in a later build">
                  <Icon d={ICONS.save} />
                </button>
                <span className="controls-sep" aria-hidden="true" />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={p.onToggleFullscreen}
                  aria-pressed={Boolean(p.fullscreen)}
                  aria-label={p.fullscreen ? "Exit fullscreen" : "Fullscreen"}
                  title="Fullscreen (F)"
                >
                  <Icon d={p.fullscreen ? ICONS.exitFullscreen : ICONS.fullscreen} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={p.onToggleMini}
                  aria-pressed={Boolean(p.mini)}
                  aria-label="Mini player"
                  title="Mini player: small, on top, any monitor (M)"
                >
                  <Icon d={ICONS.mini} />
                </button>
                <button type="button" className="icon-btn" onClick={p.onToggleControls} aria-label="Hide controls" title="Hide controls (H)">
                  <Icon d={ICONS.chevronDown} />
                </button>
                <button type="button" className="icon-btn only-overlay caption-settings" onClick={p.onOpenSettings} aria-label="Settings" title="Settings (,)">
                  <Icon d={ICONS.settings} />
                </button>
              </div>
            </div>
            {p.playlistMenuOpen && slide && (
              <div className="playlist-menu" id="playlist-menu" role="group" aria-labelledby="playlist-menu-title">
                <p className="menu-title" id="playlist-menu-title">
                  Add to playlist
                </p>
                {p.playlists.length ? (
                  <ul className="menu-list">
                    {p.playlists.map((l) => (
                      <li key={l.id}>
                        <label className="menu-check">
                          <input
                            type="checkbox"
                            checked={inLists.has(l.id)}
                            onChange={(e) => p.onSetInPlaylist?.(l.id, e.target.checked)}
                          />
                          <span className="menu-name">{l.name}</span>
                          <span className="topic-count">{l.items.toLocaleString("en-US")}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="menu-empty">No playlists yet. Name one to start.</p>
                )}
                <form className="menu-new" onSubmit={onNewPlaylist}>
                  <label htmlFor="playlist-name" className="visually-hidden">
                    New playlist name
                  </label>
                  <input
                    id="playlist-name"
                    name="playlist-name"
                    type="text"
                    maxLength={60}
                    placeholder="New playlist"
                    autoComplete="off"
                    required
                  />
                  <button type="submit" className="primary-btn">
                    Create
                  </button>
                </form>
                {p.playlistMenuError && (
                  <p className="menu-error" role="alert">
                    {p.playlistMenuError}
                  </p>
                )}
              </div>
            )}
            {p.filterMenuOpen && (
              <div className="playlist-menu filter-menu" id="filter-menu" role="group" aria-labelledby="filter-menu-title">
                <div className="menu-head">
                  <p className="menu-title" id="filter-menu-title">
                    Filter by category
                  </p>
                  <span className="row-actions">
                    <button type="button" className="text-btn" onClick={p.onClearFilter} disabled={!filtering}>
                      Clear
                    </button>
                    <button type="button" className="text-btn" onClick={p.onToggleFilterMenu}>
                      Done
                    </button>
                  </span>
                </div>
                <p className="menu-empty">
                  LeMuse sorts images itself from titles, channel names and museum details, so a few will be off.
                  Select once to show only, twice to hide.
                </p>
                <div className="filter-groups">
                  {(p.vocabulary?.groups ?? []).map((g) => {
                    const chips = g.categories.filter(
                      (c) => (counts[c.id] ?? 0) > 0 || chipState(filter, c.id) !== "off",
                    );
                    if (!chips.length) return null;
                    return (
                      <div key={g.id} className="filter-group" role="group" aria-labelledby={`filter-${g.id}`}>
                        <p className="filter-group-label" id={`filter-${g.id}`}>
                          {g.label}
                        </p>
                        <ul className="chips">
                          {chips.map((c) => {
                            const state = chipState(filter, c.id);
                            const n = counts[c.id] ?? 0;
                            return (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  className="chip"
                                  data-state={state}
                                  aria-label={`${c.label}, ${fmt(n)} images, ${CHIP_TEXT[state]}`}
                                  onClick={() => p.onCycleCategory?.(c.id)}
                                >
                                  <span className="chip-mark" aria-hidden="true" />
                                  <span className="chip-label">{c.label}</span>
                                  <span className="chip-count">{fmt(n)}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </figcaption>
        </figure>
      </main>
    </div>
  );
}
