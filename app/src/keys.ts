// Changeable keyboard shortcuts (owner, session 20). One list drives the key
// handler (App.tsx), the ? sheet and Settings → Keyboard, so they can't drift.
// Saved bindings are untrusted input (ui.json can be edited by hand):
// `sanitizeKeys` keeps only known actions and allowed keys, without clashes.
// Esc is fixed: it always closes menus, ends a session and leaves fullscreen.

export const ACTIONS = [
  // Slideshow
  { id: "prev", group: "Slideshow", label: "Previous image", key: "ArrowLeft" },
  { id: "next", group: "Slideshow", label: "Next image", key: "ArrowRight" },
  { id: "play", group: "Slideshow", label: "Play or pause", key: "Space" },
  { id: "shuffle", group: "Slideshow", label: "Shuffle", key: "s" },
  { id: "grid", group: "Slideshow", label: "Grid of this view (Esc to close)", key: "w" },
  { id: "search", group: "Slideshow", label: "Search", key: "/" },
  { id: "favourite", group: "Slideshow", label: "♥ Favourite", key: "k" },
  { id: "playlist", group: "Slideshow", label: "Add to a playlist", key: "p" },
  { id: "filter", group: "Slideshow", label: "Filter by category", key: "c" },
  { id: "save", group: "Slideshow", label: "Save the original (choose where)", key: "q" },
  { id: "copyLink", group: "Slideshow", label: "Copy the image and source links", key: "l" },
  // Zoom (ADR-0033): the wheel, a pinch or a double-click work too.
  { id: "zoomIn", group: "Zoom", label: "Zoom in (wheel, pinch or double-click too)", key: "=" },
  { id: "zoomOut", group: "Zoom", label: "Zoom out", key: "-" },
  { id: "zoomFit", group: "Zoom", label: "Fit the whole image", key: "z" },
  // Practice
  { id: "session", group: "Practice", label: "Timed session (Esc ends it)", key: "n" },
  { id: "mirror", group: "Practice", label: "Mirror", key: "x" },
  { id: "upside", group: "Practice", label: "Upside down", key: "u" },
  { id: "grey", group: "Practice", label: "Greyscale", key: "g" },
  { id: "values", group: "Practice", label: "Values: off, 2 (notan), 3, 4, 5, 7, 9", key: "v" },
  { id: "focus", group: "Practice", label: "Values shown: all, darks, lights, darks + lights", key: "i" },
  { id: "effect", group: "Practice", label: "Drawing effect: lines, strokes, cross-hatch", key: "e" },
  { id: "squint", group: "Practice", label: "Squint (blur)", key: "b" },
  { id: "studyGrid", group: "Practice", label: "Grid: thirds, 4 × 4, squares, diagonals", key: "o" },
  { id: "studyOff", group: "Practice", label: "All study aids off", key: "0" },
  // Window and library
  { id: "bar", group: "Window and library", label: "Show or hide the control bar (every window size)", key: "h" },
  { id: "fullscreen", group: "Window and library", label: "Fullscreen", key: "f" },
  { id: "mini", group: "Window and library", label: "Mini player", key: "m" },
  { id: "topics", group: "Window and library", label: "Topics and playlists", key: "t" },
  { id: "discover", group: "Window and library", label: "Find channels", key: "d" },
  { id: "related", group: "Window and library", label: "Related channels (Are.na images)", key: "r" },
  { id: "library", group: "Window and library", label: "Add a channel, playlists", key: "a" },
  { id: "settings", group: "Window and library", label: "Settings", key: "," },
  { id: "help", group: "Window and library", label: "Keyboard shortcuts (this list)", key: "?" },
] as const;

export type ActionId = (typeof ACTIONS)[number]["id"];
/** Every action's key; "" means no key. */
export type KeyMap = Record<ActionId, string>;

export const GROUPS = [...new Set(ACTIONS.map((a) => a.group))];
export const DEFAULT_KEYS = Object.fromEntries(ACTIONS.map((a) => [a.id, a.key])) as KeyMap;
const IDS = new Set<string>(ACTIONS.map((a) => a.id));

const NAMED = new Set([
  "Space",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Insert",
  "Delete",
  ...["F1", "F2", "F3", "F4", "F6", "F7", "F8", "F9", "F10", "F11"],
]);

/**
 * The key a keyboard event names, as stored: letters lower-case, Space as
 * "Space", allowed named keys as-is. Null for keys that can't be bound
 * (Esc, Tab, Enter, modifiers, F5 reload, F12 tools, dead keys).
 */
export function keyOf(key: string): string | null {
  if (key === " " || key === "Spacebar") return "Space";
  if (NAMED.has(key)) return key;
  // One visible character (a letter, digit or punctuation mark).
  if ([...key].length === 1 && /^\S$/u.test(key)) return key.toLowerCase();
  return null;
}

/** "ArrowLeft" → "←", "q" → "Q", "" → "None". */
export function keyLabel(key: string): string {
  const arrows: Record<string, string> = { ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓" };
  if (!key) return "None";
  if (arrows[key]) return arrows[key];
  if (key === "PageUp") return "Page Up";
  if (key === "PageDown") return "Page Down";
  return key.length === 1 ? key.toUpperCase() : key;
}

/** A single-character key (affected by "Single-key shortcuts" off, WCAG 2.1.4). */
export const isCharacterKey = (key: string) => key.length > 0 && keyOf(key) === key && !NAMED.has(key);

/**
 * Saved bindings → a full, clash-free map. Unknown actions and keys that
 * can't be bound are dropped (the default stays); a key claimed twice keeps
 * its first saved owner and the other action falls back to its default, or
 * to no key if that default is taken too.
 */
export function sanitizeKeys(raw: unknown): KeyMap {
  const out = { ...DEFAULT_KEYS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const saved = new Map<ActionId, string>();
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!IDS.has(id) || typeof v !== "string" || v.length > 16) continue;
    const k = v === "" ? "" : keyOf(v);
    if (k !== null) saved.set(id as ActionId, k);
  }
  const owner = new Map<string, ActionId>();
  for (const [id, k] of saved) {
    if (k && owner.has(k)) continue;
    out[id] = k;
    if (k) owner.set(k, id);
  }
  for (const a of ACTIONS) {
    if (saved.has(a.id) && (out[a.id] === "" || owner.get(out[a.id]) === a.id)) continue;
    out[a.id] = owner.has(a.key) ? "" : a.key;
    if (out[a.id]) owner.set(out[a.id], a.id);
  }
  return out;
}

/**
 * Bind `key` to `id`. If another action had it, that action loses it
 * (`moved` names it so the panel can say so).
 */
export function bind(map: KeyMap, id: ActionId, key: string): { map: KeyMap; moved: ActionId | null } {
  const next = { ...map };
  let moved: ActionId | null = null;
  if (key) {
    for (const a of ACTIONS) {
      if (a.id !== id && next[a.id] === key) {
        next[a.id] = "";
        moved = a.id;
      }
    }
  }
  next[id] = key;
  return { map: next, moved };
}

/** The action a key runs, if any. */
export function actionFor(map: KeyMap, key: string): ActionId | undefined {
  if (!key) return undefined;
  return ACTIONS.find((a) => map[a.id] === key)?.id;
}

export const actionLabel = (id: ActionId) => ACTIONS.find((a) => a.id === id)?.label ?? id;
