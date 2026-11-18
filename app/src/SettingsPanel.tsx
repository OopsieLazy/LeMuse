import { forwardRef } from "react";
import {
  FITS,
  FONTS,
  LABELS,
  LAYOUTS,
  MODES,
  PRESETS,
  RANGES,
  type UiSettings,
} from "./settings";

// Pure view of the Settings panel (ADR-0012). Every control writes one field
// of UiSettings through onChange; changes apply live. Rendered inside a
// native <dialog> so focus, Escape and the backdrop come from the platform.

export interface SettingsPanelProps {
  settings: UiSettings;
  /** Render with the `open` attribute (W3C/layout snapshots). The app opens it with showModal(). */
  staticOpen?: boolean;
  onChange?: (patch: Partial<UiSettings>) => void;
  onReset?: () => void;
  onClose?: () => void;
}

type RangeKey = keyof typeof RANGES;

const UNITS: Record<RangeKey, (v: number) => string> = {
  uiScale: (v) => `${Math.round(v * 100)}%`,
  radius: (v) => `${v} px`,
  railWidth: (v) => `${v} px`,
  stagePadding: (v) => `${v} px`,
  imageShadow: (v) => `${Math.round(v * 100)}%`,
  slideSeconds: (v) => `${v} s`,
  autoHideSeconds: (v) => `${v} s`,
};

export const SettingsPanel = forwardRef<HTMLDialogElement, SettingsPanelProps>(function SettingsPanel(p, ref) {
  const s = p.settings;
  const set = (patch: Partial<UiSettings>) => p.onChange?.(patch);

  const slider = (key: RangeKey, label: string, value: number, disabled = false) => {
    const [min, max, step] = RANGES[key];
    const id = `set-${key}`;
    return (
      <div className="field range-field">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => set({ [key]: Number(e.target.value) } as Partial<UiSettings>)}
        />
        <output htmlFor={id}>{UNITS[key](value)}</output>
      </div>
    );
  };

  const toggle = (key: keyof UiSettings, label: string) => (
    <div className="field check-field">
      <input
        id={`set-${key}`}
        type="checkbox"
        checked={Boolean(s[key])}
        onChange={(e) => set({ [key]: e.target.checked } as Partial<UiSettings>)}
      />
      <label htmlFor={`set-${key}`}>{label}</label>
    </div>
  );

  const choice = <T extends string>(name: keyof UiSettings, legend: string, options: readonly T[], value: T) => (
    <fieldset className="choice">
      <legend>{legend}</legend>
      <div className="choice-options">
        {options.map((o) => (
          <label key={o} className="choice-option" data-option={o}>
            <input
              type="radio"
              name={`set-${name}`}
              value={o}
              checked={value === o}
              onChange={() => set({ [name]: o } as Partial<UiSettings>)}
            />
            <span>{LABELS[o as keyof typeof LABELS] ?? o}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <dialog
      ref={ref}
      className="settings"
      aria-labelledby="settings-title"
      open={p.staticOpen || undefined}
      onClose={p.onClose}
    >
      <form method="dialog" className="settings-form">
        <header className="settings-head">
          <h2 id="settings-title">Settings</h2>
          <button type="submit" className="settings-close" aria-label="Close settings">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="settings-body">
          <section className="settings-section" aria-labelledby="sec-look">
            <h3 id="sec-look">Look</h3>
            {choice("preset", "Theme", PRESETS, s.preset)}
            {choice("mode", "Light or dark (Studio)", MODES, s.mode)}
            {choice("font", "Typeface", FONTS, s.font)}
            <div className="field color-field">
              <label htmlFor="set-accent">Accent colour</label>
              <input
                id="set-accent"
                type="color"
                value={s.accent ?? "#3150c2"}
                onChange={(e) => set({ accent: e.target.value })}
              />
              <button type="button" className="text-btn" onClick={() => set({ accent: null })} disabled={!s.accent}>
                Use theme colour
              </button>
            </div>
            {slider("uiScale", "Interface size", s.uiScale)}
            {slider("radius", "Corner rounding", s.radius)}
          </section>

          <section className="settings-section" aria-labelledby="sec-layout">
            <h3 id="sec-layout">Layout</h3>
            {choice("layout", "Arrangement", LAYOUTS, s.layout)}
            {slider("railWidth", "Topic list width", s.railWidth)}
            {toggle("fullscreenImmersive", "Hide the topic list in fullscreen")}
          </section>

          <section className="settings-section" aria-labelledby="sec-image">
            <h3 id="sec-image">Image</h3>
            {choice("fit", "Fit", FITS, s.fit)}
            {slider("stagePadding", "Space around the image", s.stagePadding)}
            {slider("imageShadow", "Image shadow", s.imageShadow)}
          </section>

          <section className="settings-section" aria-labelledby="sec-show">
            <h3 id="sec-show">Slideshow and controls</h3>
            <div className="field check-field">
              <input
                id="set-slideSeconds-topic"
                type="checkbox"
                checked={s.slideSeconds === null}
                onChange={(e) => set({ slideSeconds: e.target.checked ? null : 8 })}
              />
              <label htmlFor="set-slideSeconds-topic">Use each topic's own timing</label>
            </div>
            {slider("slideSeconds", "Seconds per image", s.slideSeconds ?? 8, s.slideSeconds === null)}
            {toggle("showTimer", "Show the timer bar")}
            {toggle("showSpecs", "Show slide number and size")}
            {toggle("showCreator", "Show the creator")}
            {toggle("controlsHidden", "Hide the control bar (H)")}
            {toggle("autoHide", "Hide the control bar when the mouse rests")}
            {slider("autoHideSeconds", "Hide after", s.autoHideSeconds, !s.autoHide)}
          </section>
        </div>

        <footer className="settings-foot">
          <button type="button" className="text-btn" onClick={p.onReset}>
            Reset to defaults
          </button>
          <button type="submit" className="primary-btn">
            Done
          </button>
        </footer>
      </form>
    </dialog>
  );
});
