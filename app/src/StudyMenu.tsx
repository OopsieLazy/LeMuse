import { GRID_LABELS, GRIDS, studyActive, TONES, type StudyAids } from "./practice";

// Study aids menu (ADR-0025): a popover above the controls, like the filter
// menu. Pure view; the app owns the state. Each aid also has a key.

export interface StudyMenuProps {
  study: StudyAids;
  onChange?: (patch: Partial<StudyAids>) => void;
  onReset?: () => void;
  onClose?: () => void;
}

function Toggle(p: { label: string; hint: string; on: boolean; onClick?: () => void }) {
  return (
    <button type="button" className="chip study-toggle" aria-pressed={p.on} onClick={p.onClick} title={p.hint}>
      <span className="chip-mark" aria-hidden="true" />
      <span className="chip-label">{p.label}</span>
    </button>
  );
}

export function StudyMenu(p: StudyMenuProps) {
  const s = p.study;
  const set = (patch: Partial<StudyAids>) => p.onChange?.(patch);
  return (
    <div className="playlist-menu study-menu" id="study-menu" role="group" aria-labelledby="study-menu-title">
      <div className="menu-head">
        <p className="menu-title" id="study-menu-title">
          Study aids
        </p>
        <span className="row-actions">
          <button type="button" className="text-btn" onClick={p.onReset} disabled={!studyActive(s)}>
            Reset (0)
          </button>
          <button type="button" className="text-btn" onClick={p.onClose}>
            Done
          </button>
        </span>
      </div>
      <p className="menu-empty">
        On screen only: the image itself is never changed or saved. Greyscale and values use luma, close to how light a
        colour looks but not exact for strong reds and blues.
      </p>
      <div className="study-row">
        <Toggle label="Mirror" hint="Flip left to right to see errors fresh (X)" on={s.mirror} onClick={() => set({ mirror: !s.mirror })} />
        <Toggle label="Upside down" hint="Draw the shapes you see, not the thing you know (U)" on={s.upside} onClick={() => set({ upside: !s.upside })} />
        <Toggle label="Greyscale" hint="Luma greyscale: close to value, not exact for strong colours (G)" on={s.grey || s.tones > 0} onClick={() => set({ grey: !s.grey, tones: 0 })} />
        <Toggle label="Squint" hint="Blur away detail to see the big shapes (B)" on={s.squint} onClick={() => set({ squint: !s.squint })} />
      </div>
      <fieldset className="choice study-set">
        <legend>Values (V)</legend>
        <div className="choice-options">
          {TONES.map((t) => (
            <label key={t} className="choice-option">
              <input type="radio" name="study-tones" checked={s.tones === t} onChange={() => set({ tones: t })} />
              <span>{t === 0 ? "Off" : t === 2 ? "2 · notan" : String(t)}</span>
            </label>
          ))}
        </div>
        {s.tones > 0 && (
          <label className="study-balance">
            <span>Darker</span>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.1}
              value={s.balance}
              onChange={(e) => set({ balance: Number(e.target.value) })}
              aria-label="Value balance: darker or lighter"
            />
            <span>Lighter</span>
          </label>
        )}
      </fieldset>
      <fieldset className="choice study-set">
        <legend>Grid (O)</legend>
        <div className="choice-options">
          {GRIDS.map((g) => (
            <label key={g} className="choice-option">
              <input type="radio" name="study-grid" checked={s.grid === g} onChange={() => set({ grid: g })} />
              <span>{GRID_LABELS[g]}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
