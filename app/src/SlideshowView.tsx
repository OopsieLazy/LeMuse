import type { LibraryStatus, Slide, TopicInfo } from "./api";

// Pure view: everything it shows comes in through props, so the same markup
// renders in the desktop app, the browser preview, the design artifact and
// the W3C validation snapshot (scripts/snapshot.tsx).

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
  notice?: string;
  onSelectTopic?: (name: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onTogglePlay?: () => void;
  onToggleShuffle?: () => void;
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
  return SOURCES.find(([re]) => re.test(url))?.[1] ?? new URL(url).hostname;
}

const pad = (n: number, width: number) => String(n).padStart(width, "0");

export function SlideshowView(p: SlideshowViewProps) {
  const slide = p.slides[p.index] as Slide | undefined;
  const width = String(Math.max(p.slides.length, 1)).length;
  return (
    <div className="app">
      <nav className="rail" aria-label="Topics">
        <div className="brand">
          <span className="brand-name">ServeNSurf</span>
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
          <button
            type="button"
            className="refresh"
            onClick={p.onRefresh}
            disabled={p.refresh.busy || p.mode === "preview"}
            title={p.mode === "preview" ? "Refresh runs in the desktop app" : "Fetch new images for every topic"}
          >
            {p.refresh.busy ? "Refreshing" : "Refresh"}
          </button>
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
                <h1 className="slide-title">{slide ? slide.title || "Untitled" : (p.active ?? "ServeNSurf")}</h1>
                {slide && (
                  <p className="byline">
                    {slide.creator && <span className="creator">{slide.creator}</span>}
                    <span className="source">{sourceName(slide)}</span>
                    {slide.page_url && (
                      <a href={slide.page_url} target="_blank" rel="noreferrer noopener" className="source-link">
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
                <button type="button" className="icon-btn" onClick={p.onPrev} disabled={!slide} aria-label="Previous image" title="Previous (←)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" /></svg>
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
                  {p.playing ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z" /></svg>
                  )}
                </button>
                <button type="button" className="icon-btn" onClick={p.onNext} disabled={!slide} aria-label="Next image" title="Next (→)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={p.onToggleShuffle}
                  aria-pressed={p.shuffle}
                  aria-label="Shuffle"
                  title="Shuffle (S)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3c5 0 5 10 10 10h3M4 17h3c2 0 3-1.5 4-3.5M13 9.5C14 8 15 7 17 7h3M17 4l3 3-3 3M17 14l3 3-3 3" /></svg>
                </button>
                <button type="button" className="icon-btn" disabled aria-label="Save original" title="Save arrives in the next build">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
                </button>
              </div>
            </div>
          </figcaption>
        </figure>
      </main>
    </div>
  );
}
