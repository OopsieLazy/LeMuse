import type { MouseEvent } from "react";
import { isHttps, type LibraryStatus, type Slide, type TopicInfo } from "./api";

// Pure view: everything it shows comes in through props, so the same markup
// renders in the desktop app, the browser preview, the design artifact, the
// W3C snapshot and the layout test (scripts/snapshot.tsx). Look and layout
// come from attributes on <html> (settings.ts) and the tokens in
// theme/tokens.css, never from inline styles here.

export interface RefreshState {
  label: string;
  busy: boolean;
  tone: "idle" | "ok" | "error";
}

export interface SlideshowViewProps {
  mode: "app" | "preview";
  topics: TopicInfo[];
  active: string | null;
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
  onSelectTopic?: (name: string) => void;
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
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function SlideshowView(p: SlideshowViewProps) {
  const slide = p.slides[p.index] as Slide | undefined;
  const width = String(Math.max(p.slides.length, 1)).length;
  return (
    <div className="app" data-rail-open={p.railOpen ? "true" : "false"}>
      <nav className="rail" aria-label="Topics" id="topic-rail">
        <div className="brand">
          <span className="brand-name">LeMuse</span>
          {p.mode === "preview" && <span className="brand-mode">Preview</span>}
        </div>
        <ul className="topic-list">
          {p.topics.map((t) => (
            <li key={t.name}>
              <button
                type="button"
                className="topic"
                aria-current={t.name === p.active ? "true" : undefined}
                onClick={() => p.onSelectTopic?.(t.name)}
              >
                <span className="topic-name">{t.name}</span>
                <span className="topic-count">{t.slides}</span>
              </button>
            </li>
          ))}
        </ul>
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
                <p className="empty-title">{p.active ? `No images for ${p.active} yet` : "No topic selected"}</p>
                <p className="empty-body">
                  {p.notice ??
                    "Images appear here as soon as a refresh brings in their details. Nothing is downloaded; each one streams from its source."}
                </p>
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
                <h1 className="slide-title">{slide ? slide.title || "Untitled" : (p.active ?? "LeMuse")}</h1>
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
              </div>
              <dl className="specs">
                <div>
                  <dt>Slide</dt>
                  <dd>
                    {slide ? pad(p.index + 1, width) : pad(0, width)} / {pad(p.slides.length, width)}
                  </dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>{slide?.width && slide.height ? `${slide.width} × ${slide.height} px` : "Unknown"}</dd>
                </div>
              </dl>
              <div className="controls" role="group" aria-label="Slideshow controls">
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
                <button type="button" className="icon-btn" onClick={p.onToggleControls} aria-label="Hide controls" title="Hide controls (H)">
                  <Icon d={ICONS.chevronDown} />
                </button>
                <button type="button" className="icon-btn only-overlay caption-settings" onClick={p.onOpenSettings} aria-label="Settings" title="Settings (,)">
                  <Icon d={ICONS.settings} />
                </button>
              </div>
            </div>
          </figcaption>
        </figure>
      </main>
    </div>
  );
}
