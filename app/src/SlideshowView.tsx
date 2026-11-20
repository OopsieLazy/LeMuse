import type { FormEvent, MouseEvent } from "react";
import {
  isHttps,
  labelLine,
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
import { createElement } from "react";
import {
  clock,
  EFFECT_LABELS,
  FAVOURITES,
  filterGraph,
  FILTER_REGION,
  FOCUS_LABELS,
  gridLines,
  NO_STUDY,
  studyActive,
  studyFilter,
  usesStudyFilter,
  valueStrip,
  VALUES_FILTER_ID,
  type FilterNode,
  type SessionView,
  type StudyAids,
} from "./practice";
import { StudyMenu } from "./StudyMenu";

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
  /** Some sources failed: offer Refresh details (ADR-0024). */
  details?: boolean;
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
  /** The PC is offline (navigator.onLine). */
  offline?: boolean;
  /** Images in this view that couldn't load from any stored size. */
  imagesFailed?: number;
  onRetryImages?: () => void;
  onShowRefreshDetails?: () => void;
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
  /** Compact windows: whether the tapped-open bottom bar is showing. */
  compactBarOpen?: boolean;
  onToggleCompactBar?: () => void;
  /** Mini player: bottom bar (tap the image) and the ☰ menu. */
  miniBarOpen?: boolean;
  miniMenuOpen?: boolean;
  onToggleMiniBar?: () => void;
  onToggleMiniMenu?: () => void;
  /** Copy the current image's links. */
  onCopyLink?: () => void;
  /** Save the current image's original (desktop app): Save as (ADR-0031). */
  onSave?: () => void;
  saving?: boolean;
  /** Where the last save went; stays until its × is pressed. */
  savedNote?: { folder: string; file: string } | null;
  onDismissSavedNote?: () => void;
  /** Right-click menu on the image, at window coordinates (ADR-0022). */
  /** The image menu: at the pointer (right-click) or above the bar's ⋯ button. */
  contextMenu?: { x: number; y: number; above?: boolean } | null;
  onContextMenu?: (x: number, y: number, above?: boolean) => void;
  onCloseContextMenu?: () => void;
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
  /** The image finished loading (a session's pose clock starts then). */
  onImageLoad?: (blockId: number, width: number, height: number) => void;
  /** Size of the current image when the catalog doesn't know it. */
  imageSize?: { width: number; height: number };
  /** Study aids drawn over the image (ADR-0025). */
  study?: StudyAids;
  studyMenuOpen?: boolean;
  onToggleStudyMenu?: () => void;
  onStudy?: (patch: Partial<StudyAids>) => void;
  onResetStudy?: () => void;
  /** A timed session is running. */
  session?: SessionView | null;
  /** Open the session planner, or end the running session. */
  onSession?: () => void;
  /** The image fills the frame (settings: fit = cover); the grid follows. */
  cover?: boolean;
  /** Images you saved, for the Saved entry (ADR-0029). */
  savedCount?: number;
  /** Search the catalog (titles, descriptions, creators). */
  onSearch?: (query: string) => void;
  /** The grid view of the current view (ADR-0029). */
  grid?: boolean;
  onToggleGrid?: () => void;
  /** Play from this image (its index in `slides`). */
  onPickSlide?: (index: number) => void;
  /** The current image has loaded: fade it in (no blank flash). */
  imageReady?: boolean;
  /** Pose clock style and a counter that flashes the frame on each new pose. */
  clockStyle?: "ring" | "small" | "hidden";
  flashKey?: number;
  /** Undo for the last toast (hide, mark, un-♥). */
  onUndo?: () => void;
  /** Right-click: never show this image again / mark nudity the sensor missed (ADR-0027). */
  onHideImage?: () => void;
  onMarkNudity?: () => void;
  /** A newer LeMuse is published (ADR-0028). */
  update?: { version: string; url: string } | null;
  /** ♥: the current image is in Favourites. */
  favourite?: boolean;
  onToggleFavourite?: () => void;
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

/** Alt text like a short museum label: title, creator, date (WCAG 1.1.1). */
export function altText(slide: Pick<Slide, "title" | "creator"> & { date?: string | null }): string {
  return [slide.title?.trim() || "Untitled reference image", slide.creator?.trim(), slide.date?.trim()]
    .filter(Boolean)
    .join(", ");
}

/** "Mirrored · Upside down · 3 values · Grid": shown on the image while an aid is on. */
function studyBadge(s: StudyAids): string {
  return [
    s.mirror && "Mirrored",
    s.upside && "Upside down",
    s.tones === 2 ? "Notan" : s.tones > 0 ? `${s.tones} values` : s.grey && "Greyscale",
    s.tones > 2 && s.focus !== "all" && FOCUS_LABELS[s.focus].toLowerCase(),
    s.effect !== "off" && EFFECT_LABELS[s.effect],
    s.squint && "Squint",
    s.grid !== "off" && "Grid",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** One filter primitive from practice.ts's graph, as an SVG element (fixed tags only). */
function renderNode(n: FilterNode, i: number): ReturnType<typeof createElement> {
  return createElement(n.tag, { key: i, ...n.attrs }, n.children?.map(renderNode));
}

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
  more: "M6.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM13.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM20.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
  mini: "M3 5h18v14H3ZM12 12h7v5h-7Z",
  expand: "M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z",
  study: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 3.5v17M12 7h5M12 11h7.5M12 15h7M12 19h4",
  grid: "M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4ZM13 13h7v7h-7Z",
  timer: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 9v4l2.5 2.5M9.5 2.5h5",
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

/** Topics with a heading (e.g. "Following on Are.na"), in order of first appearance. */
function topicGroups(topics: TopicInfo[]): [string, TopicInfo[]][] {
  const groups = new Map<string, TopicInfo[]>();
  for (const t of topics) if (t.group) groups.set(t.group, [...(groups.get(t.group) ?? []), t]);
  return [...groups];
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
  if (p.offline)
    return [
      "You're offline",
      "Images stream from their sources, so they come back when you're online again. Your topics, playlists and saved images are safe.",
    ];
  if (p.notice) return [`No images for ${p.activeLabel} yet`, p.notice];
  if (p.imagesFailed)
    return [
      "These images can't load right now",
      "Their source didn't answer. Try again, or pick another topic.",
    ];
  const f = p.filter ?? NO_FILTER;
  if (f.include.length || f.exclude.length)
    return ["No images match this filter", "Change or clear the category filter to see more."];
  if (!p.active) return ["No topic selected", "Pick a topic, or add an Are.na channel with the + button."];
  if (p.active.kind === "saved")
    return [
      "Nothing saved yet",
      "Right-click an image and choose Save original as… (or press Q): it goes to the folder you choose, and shows here.",
    ];
  if (p.active.kind === "search")
    return [
      `Nothing found for “${p.active.query}”`,
      "Search looks in titles, descriptions and creators. Try a shorter word, or the start of one.",
    ];
  if (p.active.kind === "playlist" && p.activeLabel === FAVOURITES)
    return [
      "No favourites yet",
      "Press ♥ (or K) on any image to keep it here. Like playlists, Favourites keeps links only, never image files.",
    ];
  if (p.active.kind === "playlist")
    return [
      `${p.activeLabel} is empty`,
      "Add images to it with the playlist button under any image. A playlist keeps links only, never image files.",
    ];
  return [
    `No images for ${p.activeLabel} yet`,
    "Images appear here as soon as a refresh brings in their details. Nothing is downloaded; each one streams from its source. If it stays empty, its channel may hold only other channels: preview it in Find channels to add those.",
  ];
}

export function SlideshowView(p: SlideshowViewProps) {
  const slide = p.slides[p.index] as Slide | undefined;
  const width = String(Math.max(p.slides.length, 1)).length;
  const current = sourceKey(p.active);
  const inLists = new Set(p.inPlaylists ?? []);
  const [emptyTitle, emptyBody] = emptyText(p);
  const study = p.study ?? NO_STUDY;
  const studying = studyActive(study);
  const session = p.session ?? null;
  // The grid is drawn in the shown image's own proportions (its loaded size
  // first: that's what object-fit uses), so it lines up and squares stay square.
  const iw = p.imageSize?.width || slide?.width || 1000;
  const ih = p.imageSize?.height || slide?.height || 1000;
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
          <form
            className="rail-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("rail-search");
              if (input instanceof HTMLInputElement && input.value.trim()) p.onSearch?.(input.value.trim());
            }}
          >
            <label htmlFor="rail-search" className="visually-hidden">
              Search your library: titles, descriptions and creators
            </label>
            <input
              id="rail-search"
              name="rail-search"
              type="search"
              maxLength={200}
              placeholder="Search your library"
              autoComplete="off"
              defaultValue={p.active?.kind === "search" ? p.active.query : ""}
            />
          </form>
          <ul className="topic-list" aria-label="Everything">
            <RailItem
              label="All"
              count={p.allCount}
              current={current === "all"}
              onClick={() => p.onSelect?.({ kind: "all" })}
            />
            <RailItem
              label="Saved"
              count={p.savedCount ?? 0}
              current={current === "saved"}
              onClick={() => p.onSelect?.({ kind: "saved" })}
            />
          </ul>
          <h2 className="rail-heading" id="rail-topics">
            Topics
          </h2>
          <ul className="topic-list" aria-labelledby="rail-topics">
            {p.topics
              .filter((t) => !t.group)
              .map((t) => (
                <RailItem
                  key={t.name}
                  label={t.name}
                  count={t.slides}
                  current={current === sourceKey({ kind: "topic", name: t.name })}
                  onClick={() => p.onSelect?.({ kind: "topic", name: t.name })}
                />
              ))}
          </ul>
          {topicGroups(p.topics).map(([group, list], gi) => (
            <div key={group}>
              <h2 className="rail-heading" id={`rail-group-${gi}`}>
                {group}
              </h2>
              <ul className="topic-list" aria-labelledby={`rail-group-${gi}`}>
                {list.map((t) => (
                  <RailItem
                    key={t.name}
                    label={t.name}
                    count={t.slides}
                    current={current === sourceKey({ kind: "topic", name: t.name })}
                    onClick={() => p.onSelect?.({ kind: "topic", name: t.name })}
                  />
                ))}
              </ul>
            </div>
          ))}
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
            {p.refresh.details && p.onShowRefreshDetails && (
              <>
                {" "}
                <button type="button" className="inline-btn" onClick={p.onShowRefreshDetails}>
                  Details
                </button>
              </>
            )}
          </p>
          {p.update && (
            <p className="update-line">
              <a
                className="text-link"
                href={p.update.url}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(e) => p.update && p.onOpenLink?.(e, p.update.url)}
              >
                LeMuse {p.update.version} is available
              </a>
            </p>
          )}
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
          <div
            className="frame"
            data-mirror={study.mirror ? "true" : "false"}
            data-upside={study.upside ? "true" : "false"}
            data-grid={slide && study.grid !== "off" ? "true" : "false"}
            onContextMenu={(e) => {
              if (!slide || (e.target instanceof HTMLButtonElement && !e.target.matches(".compact-tap, .mini-tap"))) return;
              e.preventDefault();
              p.onContextMenu?.(e.clientX, e.clientY);
            }}
          >
            {p.grid && p.slides.length > 0 ? (
              // Grid view (ADR-0029): every image in this view (this page), small
              // sizes, loaded as they scroll into view. Pick one to play from it.
              <ul className="grid-view" aria-label={`${p.activeLabel}: ${p.slides.length} images`}>
                {p.slides.map((s, i) => (
                  <li key={s.block_id} className="grid-item">
                    <button
                      type="button"
                      className="grid-pick"
                      aria-current={i === p.index ? "true" : undefined}
                      onClick={() => p.onPickSlide?.(i)}
                      title={s.title || "Untitled"}
                    >
                      <img src={s.thumb_url || s.display_url} alt={altText(s)} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : slide ? (
              // With a grid on, the image fills its cell (object-fit contain or
              // cover) and the grid is an SVG in the same cell with the image's
              // own viewBox and the same fit, so the lines sit on the image.
              <>
                <img
                  key={slide.block_id}
                  data-ready={p.imageReady ? "true" : "false"}
                  src={slide.display_url}
                  alt={altText(slide)}
                  width={slide.width ?? undefined}
                  height={slide.height ?? undefined}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  style={studying ? { filter: studyFilter(study) } : undefined}
                  onLoad={(e) => p.onImageLoad?.(slide.block_id, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                  onError={() => p.onImageError?.(slide.block_id)}
                />
                {study.grid !== "off" && (
                  <svg
                    className="grid-overlay"
                    viewBox={`0 0 ${iw} ${ih}`}
                    preserveAspectRatio={p.cover ? "xMidYMid slice" : "xMidYMid meet"}
                    aria-hidden="true"
                  >
                    {gridLines(study.grid, iw, ih).map(([x1, y1, x2, y2], i) => (
                      <g key={i}>
                        <line className="grid-shade" x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" />
                        <line className="grid-line" x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" />
                      </g>
                    ))}
                  </svg>
                )}
              </>
            ) : (
              <div className="empty">
                <p className="empty-title">{emptyTitle}</p>
                <p className="empty-body">{emptyBody}</p>
                {!p.offline && !p.notice && Boolean(p.imagesFailed) && p.onRetryImages && (
                  <button type="button" className="primary-btn" onClick={p.onRetryImages}>
                    Try again
                  </button>
                )}
              </div>
            )}
            {usesStudyFilter(study) && (
              // Values and drawing effects: one SVG filter built by practice.ts
              // (luma in sRGB → balance → tones → marks), drawn by the GPU.
              <svg className="study-defs" width="0" height="0" aria-hidden="true" focusable="false">
                <filter id={VALUES_FILTER_ID} colorInterpolationFilters="sRGB" {...FILTER_REGION}>
                  {filterGraph(study).map(renderNode)}
                </filter>
              </svg>
            )}
            {slide && studying > 0 && (
              // Never forget a flip: the reference is shown changed (research: art review).
              <p className="study-badge">
                {study.tones > 0 && (
                  <span className="value-strip" aria-hidden="true">
                    {valueStrip(study.tones, study.focus).map((v, i) => (
                      <span key={i} className="value-swatch" data-tone={Math.round(v * 8)} />
                    ))}
                  </span>
                )}
                {studyBadge(study)}
              </p>
            )}
            {session && Boolean(p.flashKey) && (
              // A quiet cue on each new pose (off with reduced motion or in Settings).
              <span key={p.flashKey} className="pose-flash" aria-hidden="true" />
            )}
            {session && p.clockStyle !== "hidden" && (
              <p
                className="session-clock"
                role="timer"
                data-style={p.clockStyle ?? "ring"}
                data-paused={session.paused ? "true" : "false"}
                data-warn={!session.paused && session.left <= 5 ? "true" : "false"}
              >
                {(p.clockStyle ?? "ring") === "ring" && (
                  <svg className="clock-ring" viewBox="0 0 36 36" aria-hidden="true">
                    {/* r = 100 / 2π, so the circumference is 100 and the dash is a percentage. */}
                    <circle className="clock-track" cx="18" cy="18" r="15.9155" />
                    <circle
                      className="clock-left"
                      cx="18"
                      cy="18"
                      r="15.9155"
                      strokeDasharray={`${Math.round((session.left / Math.max(1, session.total)) * 1000) / 10} 100`}
                    />
                  </svg>
                )}
                <span className="session-time">{clock(session.left)}</span>
                <span className="session-pose">
                  {session.paused ? "Paused · " : ""}
                  {session.pose} / {session.poses}
                </span>
              </p>
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
            {/* Compact windows (CSS decides when): tap the image for the bar,
                ☰ for topics, and a small credit while the bar is hidden. */}
            {!p.mini && (
              <>
                {!p.grid && (
                <button
                  type="button"
                  className="compact-tap"
                  onClick={p.onToggleCompactBar}
                  aria-expanded={Boolean(p.compactBarOpen)}
                  aria-label={p.compactBarOpen ? "Hide controls" : "Show controls"}
                />
                )}
                <button
                  type="button"
                  className="icon-btn compact-burger"
                  onClick={p.onToggleRail}
                  aria-expanded={Boolean(p.railOpen)}
                  aria-controls="topic-rail"
                  aria-label="Topics and playlists"
                  title="Topics and playlists (T)"
                >
                  <Icon d={ICONS.topics} />
                </button>
              </>
            )}
            {slide && !(p.mini && p.miniBarOpen) && (
              <p className="compact-credit">
                {slide.creator && <span className="credit-creator">{slide.creator}</span>}
                <span className="credit-source">
                  {slide.creator ? " · " : ""}
                  {sourceName(slide)}
                </span>
              </p>
            )}
            {p.contextMenu && slide && (
              <div
                className="context-menu"
                role="menu"
                aria-label="Image"
                // Opens at the pointer, kept inside the window by the clamps.
                style={{
                  left: `max(var(--space-3), min(${p.contextMenu.x}px, calc(100vw - var(--context-menu-width) - var(--space-3))))`,
                  top: p.contextMenu.above
                    ? `max(var(--space-3), min(calc(${p.contextMenu.y}px - var(--context-menu-height) - var(--space-2)), calc(100vh - var(--context-menu-height) - var(--space-3))))`
                    : `min(${p.contextMenu.y}px, calc(100vh - var(--context-menu-height)))`,
                }}
                onKeyDown={(e) => e.key === "Escape" && p.onCloseContextMenu?.()}
              >
                {p.mode === "app" ? (
                  <button
                    type="button"
                    role="menuitem"
                    autoFocus
                    disabled={p.saving}
                    onClick={() => {
                      p.onCloseContextMenu?.();
                      p.onSave?.();
                    }}
                  >
                    {slide.saved ? "Save original as… (again)" : "Save original as…"}
                  </button>
                ) : (
                  isHttps(slide.original_url ?? slide.display_url) && (
                    <a
                      role="menuitem"
                      href={slide.original_url ?? slide.display_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={() => p.onCloseContextMenu?.()}
                    >
                      Open full-size image
                    </a>
                  )
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    p.onCloseContextMenu?.();
                    p.onCopyLink?.();
                  }}
                >
                  Copy link
                </button>
                {canRelate && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      p.onCloseContextMenu?.();
                      p.onRelated?.();
                    }}
                  >
                    Related Are.na channels
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    p.onCloseContextMenu?.();
                    p.onHideImage?.();
                  }}
                >
                  Hide this image
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    p.onCloseContextMenu?.();
                    p.onMarkNudity?.();
                  }}
                >
                  Mark as nudity
                </button>
                {slide.page_url && isHttps(slide.page_url) && (
                  <a
                    role="menuitem"
                    href={slide.page_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={(e) => {
                      p.onCloseContextMenu?.();
                      if (slide.page_url) p.onOpenLink?.(e, slide.page_url);
                    }}
                  >
                    Open source page
                  </a>
                )}
              </div>
            )}
            {p.savedNote && (
              <div className="save-note" role="status">
                <p className="save-note-text" title={`${p.savedNote.folder}\\${p.savedNote.file}`}>
                  <span className="save-note-title">Saved to {p.savedNote.folder}</span>
                  <span className="save-note-file">{p.savedNote.file}</span>
                </p>
                <button
                  type="button"
                  className="save-note-close"
                  onClick={p.onDismissSavedNote}
                  aria-label="Dismiss the saved note"
                  title="Dismiss"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
            )}
            {p.toast && (
              <div className="toast" role="status">
                <span>{p.toast}</span>
                {p.onUndo && (
                  <button type="button" className="toast-undo" onClick={p.onUndo}>
                    Undo
                  </button>
                )}
              </div>
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
                    {slide.license_id === "CC0-1.0" ? (
                      <span className="rights-badge" title="Public domain: free to use for anything">
                        CC0
                      </span>
                    ) : (
                      <span className="rights-badge" data-rights="creator" title="Rights belong to the creator: for personal reference">
                        © creator
                      </span>
                    )}
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
                {slide && labelLine(slide) && <p className="label-line">{labelLine(slide)}</p>}
                {slide?.credit && <p className="credit-line">{slide.credit}</p>}
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
              {session ? (
                <dl className="specs session-specs">
                  <div>
                    <dt>Pose</dt>
                    <dd>
                      {session.pose} / {session.poses}
                    </dd>
                  </div>
                  <div>
                    <dt>Round</dt>
                    <dd>
                      {session.round} / {session.rounds}
                    </dd>
                  </div>
                  <div>
                    <dt>{session.paused ? "Paused" : "Left"}</dt>
                    <dd>{clock(session.left)}</dd>
                  </div>
                </dl>
              ) : (
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
              )}
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
                {/* Practice (owner, session 20: "art parts together"): one menu for the
                    timed session, the grid view and the study aids. While a session
                    runs, its timer swaps into the bar to end it in one click. */}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={p.onToggleStudyMenu}
                  disabled={!slide && !p.slides.length}
                  aria-expanded={Boolean(p.studyMenuOpen)}
                  aria-controls="study-menu"
                  data-active={studying || p.grid ? "true" : "false"}
                  aria-label={studying ? `Practice (${studying} study aid${studying === 1 ? "" : "s"} on)` : "Practice"}
                  title="Practice: timed session (N), grid (W), study aids"
                >
                  <Icon d={ICONS.study} />
                </button>
                {session && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={p.onSession}
                    data-active="true"
                    aria-label="End the session"
                    title="End the session and see what you drew (Esc)"
                  >
                    <Icon d={ICONS.timer} />
                  </button>
                )}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={p.onToggleFavourite}
                  disabled={!slide}
                  aria-pressed={Boolean(p.favourite)}
                  data-favourite={p.favourite ? "true" : "false"}
                  aria-label="Favourite"
                  title="♥ Favourite (K)"
                >
                  <Icon d={ICONS.heart} />
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
                  onClick={p.onSave}
                  disabled={!slide || p.mode !== "app" || p.saving}
                  data-saved={slide?.saved ? "true" : "false"}
                  aria-label={slide?.saved ? "Saved: save original as… again" : "Save original as…"}
                  title={
                    p.mode === "app"
                      ? "Save the full-size original to a folder you choose"
                      : "Saving works in the desktop app"
                  }
                >
                  <Icon d={ICONS.save} />
                </button>
                {/* Everything else for this image: the right-click menu, above the bar. */}
                <button
                  type="button"
                  className="icon-btn more-btn"
                  disabled={!slide}
                  aria-haspopup="menu"
                  aria-expanded={Boolean(p.contextMenu)}
                  aria-label="More for this image"
                  title="More: copy link (L), related channels (R), source page, hide"
                  onClick={(e) => {
                    if (p.contextMenu) return p.onCloseContextMenu?.();
                    const r = e.currentTarget.getBoundingClientRect();
                    p.onContextMenu?.(r.left, r.top, true);
                  }}
                >
                  <Icon d={ICONS.more} />
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
            {p.studyMenuOpen && slide && (
              <StudyMenu
                study={study}
                onChange={p.onStudy}
                onReset={p.onResetStudy}
                onClose={p.onToggleStudyMenu}
                session={Boolean(session)}
                canSession={Boolean(slide) || Boolean(session)}
                onSession={p.onSession}
                grid={Boolean(p.grid)}
                canGrid={p.slides.length > 0}
                onToggleGrid={p.onToggleGrid}
              />
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
