import { forwardRef } from "react";

// The ? sheet: every key LeMuse answers to. App.tsx's key handler and this
// list must agree; the hands-on guide (docs/guide/hands-on.md) shows how to
// add one.

export const SHORTCUTS: { group: string; keys: [string, string][] }[] = [
  {
    group: "Slideshow",
    keys: [
      ["← →", "Previous, next image"],
      ["Space", "Play or pause"],
      ["S", "Shuffle"],
      ["K", "♥ Favourite"],
      ["P", "Add to a playlist"],
      ["C", "Filter by category"],
      ["L", "Copy the image and source links"],
    ],
  },
  {
    group: "Practice",
    keys: [
      ["N", "Timed session (Esc ends it)"],
      ["X", "Mirror"],
      ["U", "Upside down"],
      ["G", "Greyscale"],
      ["V", "Values: off, 2 (notan), 3, 4, 5, 7, 9"],
      ["I", "Values shown: all, darks only, lights only, darks + lights"],
      ["E", "Drawing effect: lines, strokes ↕, strokes ↔, cross-hatch"],
      ["B", "Squint (blur)"],
      ["O", "Grid: thirds, 4 × 4, squares, diagonals"],
      ["0", "All study aids off"],
    ],
  },
  {
    group: "Window and library",
    keys: [
      ["F", "Fullscreen"],
      ["M", "Mini player"],
      ["H", "Hide or show the controls"],
      ["T", "Topics and playlists"],
      ["D", "Find channels"],
      ["R", "Related channels (Are.na images)"],
      ["A", "Add a channel, playlists"],
      [",", "Settings"],
      ["?", "This sheet"],
    ],
  },
];

export interface ShortcutsPanelProps {
  staticOpen?: boolean;
  onClose?: () => void;
}

export const ShortcutsPanel = forwardRef<HTMLDialogElement, ShortcutsPanelProps>(function ShortcutsPanel(p, ref) {
  return (
    <dialog
      ref={ref}
      className="settings shortcuts"
      aria-labelledby="shortcuts-title"
      open={p.staticOpen || undefined}
      onClose={p.onClose}
    >
      <form method="dialog" className="settings-form">
        <header className="settings-head">
          <h2 id="shortcuts-title">Keyboard shortcuts</h2>
          <button type="submit" className="settings-close" aria-label="Close keyboard shortcuts">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="settings-body">
          {SHORTCUTS.map((g) => (
            <section key={g.group} className="settings-section" aria-label={g.group}>
              <h3>{g.group}</h3>
              <dl className="shortcut-list">
                {g.keys.map(([k, what]) => (
                  <div key={k} className="shortcut">
                    <dt>
                      <kbd>{k}</kbd>
                    </dt>
                    <dd>{what}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <footer className="settings-foot">
          <button type="submit" className="primary-btn">
            Done
          </button>
        </footer>
      </form>
    </dialog>
  );
});
