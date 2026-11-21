import { useState, type KeyboardEvent } from "react";
import { LABELS, PRESETS, type Preset, type UiSettings } from "./settings";
import {
  cleanName,
  MAX_THEME_NAME,
  MAX_THEMES,
  NEW_THEME,
  newThemeId,
  parseHex,
  themeProblems,
  themeTokens,
  type CustomTheme,
} from "./themes";

// Settings → Look → Theme (ADR-0032): the built-in themes and your own, side by
// side, and an editor that makes a theme from four hex colours. Pure view: the
// panel's onChange saves into ui.json, where `sanitize` checks it again.

type Colours = Omit<CustomTheme, "id" | "name">;
const FIELDS: { key: keyof Colours; label: string; hint: string }[] = [
  { key: "bg", label: "Background", hint: "Behind the topic list and around the bar" },
  { key: "panel", label: "Panel", hint: "The bar, menus and dialogs" },
  { key: "text", label: "Text", hint: "Titles and body text" },
  { key: "accent", label: "Accent", hint: "Buttons that are on, the play button, focus rings" },
];

export interface ThemeEditorProps {
  settings: UiSettings;
  onChange?: (patch: Partial<UiSettings>) => void;
  /** Snapshots: open the editor on this draft. */
  staticDraft?: { name: string } & Colours;
}

/** Enter in a field mustn't submit (and close) the Settings dialog. */
const noSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") e.preventDefault();
};

export function ThemeEditor(p: ThemeEditorProps) {
  const s = p.settings;
  const themes = s.customThemes;
  const [editing, setEditing] = useState<string | null>(p.staticDraft ? "new" : null); // id, "new", or null
  const [draft, setDraft] = useState<{ name: string } & Colours>(p.staticDraft ?? { name: "", ...NEW_THEME });
  const [typed, setTyped] = useState<Partial<Record<keyof Colours, string>>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const current = s.preset === "custom" ? s.customTheme : null;
  const problems = themeProblems(draft);
  const name = cleanName(draft.name);
  const nameTaken = themes.some((t) => t.id !== editing && name !== null && t.name.toLowerCase() === name.toLowerCase());
  const canSave = problems.length === 0 && name !== null && !nameTaken;
  const tokens = themeTokens({ id: "draft", ...draft, name: name ?? "Draft" });

  const startNew = () => {
    setEditing("new");
    setDraft({ name: "", ...NEW_THEME });
    setTyped({});
    setNote("");
  };
  const startEdit = (t: CustomTheme) => {
    setEditing(t.id);
    setDraft({ name: t.name, bg: t.bg, panel: t.panel, text: t.text, accent: t.accent });
    setTyped({});
    setNote("");
  };
  const save = () => {
    if (!canSave || !name) return;
    const colours: Colours = { bg: draft.bg, panel: draft.panel, text: draft.text, accent: draft.accent };
    if (editing && editing !== "new") {
      p.onChange?.({ customThemes: themes.map((t) => (t.id === editing ? { ...t, name, ...colours } : t)) });
      setNote(`Saved “${name}”.`);
    } else {
      const id = newThemeId(themes);
      p.onChange?.({ customThemes: [...themes, { id, name, ...colours }], preset: "custom", customTheme: id });
      setNote(`“${name}” is your theme now.`);
    }
    setEditing(null);
  };
  const remove = (t: CustomTheme) => {
    const patch: Partial<UiSettings> = { customThemes: themes.filter((x) => x.id !== t.id) };
    // The theme in use is gone: back to Studio.
    if (current === t.id) Object.assign(patch, { preset: "studio" as Preset, customTheme: null });
    p.onChange?.(patch);
    setConfirmDelete(null);
    setNote(`Deleted “${t.name}”.`);
  };
  const setColour = (key: keyof Colours, raw: string, fromPicker: boolean) => {
    const hex = parseHex(raw);
    setTyped((m) => ({ ...m, [key]: fromPicker ? undefined : raw }));
    if (hex) setDraft((d) => ({ ...d, [key]: hex }));
  };

  const builtIn = PRESETS.filter((x) => x !== "custom");
  return (
    <div className="theme-editor">
      <fieldset className="choice">
        <legend>Theme</legend>
        <div className="choice-options">
          {builtIn.map((o) => (
            <label key={o} className="choice-option" data-option={o}>
              <input
                type="radio"
                name="set-preset"
                value={o}
                checked={s.preset === o}
                onChange={() => p.onChange?.({ preset: o })}
              />
              <span>{LABELS[o]}</span>
            </label>
          ))}
          {themes.map((t) => (
            <label key={t.id} className="choice-option theme-option">
              <input
                type="radio"
                name="set-preset"
                value={`custom-${t.id}`}
                checked={current === t.id}
                onChange={() => p.onChange?.({ preset: "custom", customTheme: t.id })}
              />
              <span>
                <svg className="theme-dots" viewBox="0 0 44 10" aria-hidden="true">
                  {[t.bg, t.panel, t.text, t.accent].map((c, i) => (
                    <circle key={i} cx={5 + i * 11} cy={5} r={4.5} fill={c} />
                  ))}
                </svg>
                {t.name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {themes.length > 0 && (
        <ul className="theme-list" aria-label="Your themes">
          {themes.map((t) => (
            <li key={t.id} className="theme-row">
              <span className="theme-row-name">{t.name}</span>
              {confirmDelete === t.id ? (
                <span className="row-actions">
                  <span className="list-label">Delete it?</span>
                  <button type="button" className="text-btn danger" onClick={() => remove(t)}>
                    Delete
                  </button>
                  <button type="button" className="text-btn" onClick={() => setConfirmDelete(null)}>
                    Keep
                  </button>
                </span>
              ) : (
                <span className="row-actions">
                  <button type="button" className="text-btn" onClick={() => startEdit(t)} aria-label={`Edit ${t.name}`}>
                    Edit
                  </button>
                  <button type="button" className="text-btn" onClick={() => setConfirmDelete(t.id)} aria-label={`Delete ${t.name}`}>
                    Delete
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing === null ? (
        <div className="form-row">
          <button type="button" className="text-btn" onClick={startNew} disabled={themes.length >= MAX_THEMES}>
            New theme from colours…
          </button>
          {themes.length >= MAX_THEMES && <span className="list-label">{MAX_THEMES} themes is the most; delete one first.</span>}
        </div>
      ) : (
        <div className="theme-form" role="group" aria-labelledby="theme-form-title">
          <p className="menu-title" id="theme-form-title">
            {editing === "new" ? "New theme" : "Edit theme"}
          </p>
          <div className="field text-field">
            <label htmlFor="theme-name">Name</label>
            <input
              id="theme-name"
              type="text"
              value={draft.name}
              maxLength={MAX_THEME_NAME}
              autoComplete="off"
              onKeyDown={noSubmit}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          {FIELDS.map((f) => {
            const shown = typed[f.key] ?? draft[f.key];
            const bad = typed[f.key] !== undefined && parseHex(typed[f.key] ?? "") === null;
            return (
              <div key={f.key} className="field theme-colour">
                <label htmlFor={`theme-${f.key}-hex`}>{f.label}</label>
                <input
                  type="color"
                  aria-label={`${f.label}: pick a colour`}
                  value={draft[f.key]}
                  onChange={(e) => setColour(f.key, e.target.value, true)}
                />
                <input
                  id={`theme-${f.key}-hex`}
                  type="text"
                  className="hex-input"
                  value={shown}
                  maxLength={7}
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={bad || undefined}
                  aria-describedby={`theme-${f.key}-hint`}
                  onKeyDown={noSubmit}
                  onChange={(e) => setColour(f.key, e.target.value, false)}
                  onBlur={() => setTyped((m) => ({ ...m, [f.key]: undefined }))}
                />
                <span className="list-label" id={`theme-${f.key}-hint`}>
                  {bad ? "Type 6 hex digits, like #ffb000." : f.hint}
                </span>
              </div>
            );
          })}
          <div
            className="theme-preview"
            aria-label="Preview"
            role="img"
            style={{ background: tokens["--bg"], color: tokens["--fg"] }}
          >
            <div className="theme-preview-panel" style={{ background: tokens["--panel"], borderColor: tokens["--line"] }}>
              <span className="theme-preview-title">Incense Burner</span>
              <span style={{ color: tokens["--muted"] }}>Cleveland Museum of Art</span>
              <span style={{ color: tokens["--link"] }}>Open source page</span>
              <span className="theme-preview-button" style={{ background: tokens["--accent"], color: tokens["--accent-ink"] }}>
                Play
              </span>
            </div>
            <div className="theme-preview-stage" style={{ background: tokens["--stage"] }} />
          </div>
          {problems.map((x) => (
            <p key={x} className="form-status tone-error">
              {x}
            </p>
          ))}
          {draft.name.trim() !== "" && name === null && (
            <p className="form-status tone-error">Use one line of up to {MAX_THEME_NAME} characters.</p>
          )}
          {nameTaken && <p className="form-status tone-error">You already have a theme called that.</p>}
          <p className="settings-note">
            Muted text and links are adjusted so they stay readable, and the area behind the image stays a neutral
            grey, so colours and values in the picture read true.
          </p>
          <div className="form-row">
            <button type="button" className="primary-btn" onClick={save} disabled={!canSave}>
              {editing === "new" ? "Save and use" : "Save"}
            </button>
            <button type="button" className="text-btn" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <p className="list-label" role="status">
        {note}
      </p>
    </div>
  );
}
