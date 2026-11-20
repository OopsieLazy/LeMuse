import { forwardRef, useState, type KeyboardEvent } from "react";
import { ACTIONS, actionLabel, bind, DEFAULT_KEYS, GROUPS, isCharacterKey, keyLabel, keyOf, type ActionId, type KeyMap } from "./keys";

// The ? sheet: every key LeMuse answers to, and where you change them
// (owner, session 20). The list comes from keys.ts, which the key handler in
// App.tsx also reads, so the sheet can't disagree with the keys.

export interface ShortcutsPanelProps {
  keys?: KeyMap;
  /** Single-key shortcuts are off (Settings → Keyboard): letters don't work. */
  lettersOff?: boolean;
  onChangeKeys?: (keys: KeyMap) => void;
  staticOpen?: boolean;
  /** Snapshot: show one row waiting for a key. */
  staticCapturing?: ActionId;
  onClose?: () => void;
}

export const ShortcutsPanel = forwardRef<HTMLDialogElement, ShortcutsPanelProps>(function ShortcutsPanel(p, ref) {
  const keys = p.keys ?? DEFAULT_KEYS;
  const [capturing, setCapturing] = useState<ActionId | null>(p.staticCapturing ?? null);
  const [note, setNote] = useState("");
  const editable = Boolean(p.onChangeKeys) || Boolean(p.staticCapturing);

  const apply = (id: ActionId, key: string) => {
    const r = bind(keys, id, key);
    p.onChangeKeys?.(r.map);
    setCapturing(null);
    setNote(
      !key
        ? `${actionLabel(id)} has no key now.`
        : r.moved
          ? `${keyLabel(key)} now does ${actionLabel(id)}. ${actionLabel(r.moved)} has no key now; give it another one.`
          : `${keyLabel(key)} now does ${actionLabel(id)}.`,
    );
  };

  const onCapture = (id: ActionId) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Tab" || e.ctrlKey || e.metaKey || e.altKey) return;
    // Every other key is taken here, Esc included (it cancels, not closes).
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      setCapturing(null);
      setNote("Unchanged.");
      return;
    }
    const k = keyOf(e.key);
    if (!k) return setNote(`${e.key} can't be a shortcut. Try a letter, a digit, an arrow or F1–F11.`);
    apply(id, k);
  };

  return (
    <dialog
      ref={ref}
      className="settings shortcuts"
      aria-labelledby="shortcuts-title"
      open={p.staticOpen || undefined}
      // While waiting for a key, Esc cancels the change, not the sheet.
      onCancel={(e) => {
        if (capturing) e.preventDefault();
      }}
      onClose={() => {
        setCapturing(null);
        setNote("");
        p.onClose?.();
      }}
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
          {editable && (
            <p className="settings-note">
              Choose Change, then press the key you want. Esc cancels. A key can do one thing: taking one that's in use
              frees it from the other action.
              {p.lettersOff && " Single-key shortcuts are off in Settings → Keyboard, so letter keys do nothing until you turn them on."}
            </p>
          )}
          {GROUPS.map((g) => (
            <section key={g} className="settings-section" aria-label={g}>
              <h3>{g}</h3>
              <dl className="shortcut-list">
                {ACTIONS.filter((a) => a.group === g).map((a) => {
                  const k = keys[a.id];
                  const off = p.lettersOff && isCharacterKey(k);
                  return (
                    <div key={a.id} className={editable ? "shortcut editable" : "shortcut"}>
                      <dt>
                        <kbd className={k ? (off ? "key-off" : undefined) : "key-none"}>{keyLabel(k)}</kbd>
                      </dt>
                      <dd>{a.label}</dd>
                      {editable && (
                        <dd className="row-actions">
                          {capturing === a.id ? (
                            <button
                              type="button"
                              className="primary-btn key-capture"
                              autoFocus
                              onKeyDown={onCapture(a.id)}
                              onBlur={() => setCapturing(null)}
                              aria-label={`Press a key for ${a.label}. Esc cancels.`}
                            >
                              Press a key
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="text-btn"
                              onClick={() => {
                                setCapturing(a.id);
                                setNote(`Press a key for ${a.label}. Esc cancels.`);
                              }}
                              aria-label={`Change the key for ${a.label}`}
                            >
                              Change
                            </button>
                          )}
                          {k !== "" && capturing !== a.id && (
                            <button
                              type="button"
                              className="text-btn"
                              onClick={() => apply(a.id, "")}
                              aria-label={`No key for ${a.label}`}
                            >
                              None
                            </button>
                          )}
                        </dd>
                      )}
                    </div>
                  );
                })}
                {g === GROUPS[0] && (
                  <div className="shortcut">
                    <dt>
                      <kbd>Esc</kbd>
                    </dt>
                    <dd>Close a menu, end a session, leave fullscreen (always Esc)</dd>
                  </div>
                )}
              </dl>
            </section>
          ))}
        </div>
        <footer className="settings-foot">
          <p className="list-label shortcut-note" role="status">
            {note}
          </p>
          {editable && (
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                p.onChangeKeys?.({ ...DEFAULT_KEYS });
                setCapturing(null);
                setNote("Every shortcut is back to its usual key.");
              }}
            >
              Reset all
            </button>
          )}
          <button type="submit" className="primary-btn">
            Done
          </button>
        </footer>
      </form>
    </dialog>
  );
});
