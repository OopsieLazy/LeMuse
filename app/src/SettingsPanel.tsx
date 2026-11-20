import { forwardRef, useRef, type MouseEvent } from "react";
import { ARENA_TOKEN_PAGE, reportUrl, type About, type Release, type TokenStatus } from "./api";
import {
  CLOCK_LABELS,
  CLOCKS,
  SURROUND_LABELS,
  SURROUNDS,
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

/** The Are.na account section (ADR-0023). The token never comes back to the page. */
export interface ArenaTokenView {
  mode: "app" | "preview";
  status: TokenStatus | null;
  busy?: boolean;
  message?: { text: string; tone: "idle" | "ok" | "error" };
}

/** Settings → Updates (ADR-0028). */
export interface UpdateView {
  state: "idle" | "checking" | "none" | "latest" | "available" | "error";
  release?: Release | null;
  /** When the check failed: what happened. */
  text?: string;
}

export interface SettingsPanelProps {
  settings: UiSettings;
  /** How many images you hid or marked (Settings → Content, ADR-0027). */
  marks?: { hidden: number; nudity: number };
  onShowHidden?: () => void;
  onForgetNudityMarks?: () => void;
  onClearPractice?: () => void;
  /** A short note after a Content or Practice action. */
  contentNote?: string;
  update?: UpdateView;
  onCheckUpdate?: () => void;
  /** Open the third-party licences (ADR-0030). */
  onShowNotices?: () => void;
  /** Open the ? sheet, where shortcuts are changed (ADR-0031). */
  onShowShortcuts?: () => void;
  arena?: ArenaTokenView;
  about?: About | null;
  onSaveArenaToken?: (token: string) => void;
  onClearArenaToken?: () => void;
  onOpenLink?: (e: MouseEvent<HTMLAnchorElement>, url: string) => void;
  /** Render with the `open` attribute (W3C/layout snapshots). The app opens it with showModal(). */
  staticOpen?: boolean;
  onChange?: (patch: Partial<UiSettings>) => void;
  onReset?: () => void;
  onClose?: () => void;
}

type RangeKey = keyof typeof RANGES;

function updateText(u?: UpdateView): string {
  switch (u?.state) {
    case "checking":
      return "Asking GitHub";
    case "none":
      return "No release is published yet.";
    case "latest":
      return "You have the latest version.";
    case "available":
      return u.release ? `LeMuse ${u.release.version} is available.` : "";
    case "error":
      return u.text ?? "Couldn't reach GitHub just now.";
    default:
      return "";
  }
}

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
  const tokenRef = useRef<HTMLInputElement>(null);
  // The pasted token leaves the field as soon as it's handed on.
  const saveToken = () => {
    const input = tokenRef.current;
    if (!input || !input.value.trim()) return;
    const token = input.value;
    input.value = "";
    p.onSaveArenaToken?.(token);
  };

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

  const labelled = <T extends string>(
    name: keyof UiSettings,
    legend: string,
    options: readonly T[],
    labels: Record<T, string>,
    value: T,
  ) => (
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
            <span>{labels[o]}</span>
          </label>
        ))}
      </div>
    </fieldset>
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
            {labelled("surround", "Behind the image", SURROUNDS, SURROUND_LABELS, s.surround)}
            <p className="settings-note">
              A neutral grey behind the image keeps colours and values honest: a tinted or very dark surround changes
              how light a picture looks.
            </p>
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

          {p.arena && (
            <section className="settings-section" aria-labelledby="sec-arena">
              <h3 id="sec-arena">Are.na account</h3>
              {p.arena.status?.saved ? (
                <p className="settings-note">
                  Token saved{p.arena.status.account ? ` for ${p.arena.status.account}` : ""}, in Windows Credential
                  Manager. Refreshes use your account's read limit and can open your private channels.
                </p>
              ) : (
                <>
                  <p className="settings-note">
                    Without a token LeMuse reads public channels as a guest (30 reads a minute). A free account's token
                    gives 120 a minute and your private channels. It's kept in Windows Credential Manager, never in a
                    file.
                  </p>
                  <div className="field text-field">
                    <label htmlFor="set-arena-token">Personal access token</label>
                    <input
                      id="set-arena-token"
                      ref={tokenRef}
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={600}
                      disabled={p.arena.busy || p.arena.mode === "preview"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveToken();
                        }
                      }}
                    />
                  </div>
                </>
              )}
              <div className="form-row">
                {p.arena.status?.saved ? (
                  <button type="button" className="text-btn danger" disabled={p.arena.busy} onClick={p.onClearArenaToken}>
                    Remove token
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={p.arena.busy || p.arena.mode === "preview"}
                    onClick={saveToken}
                  >
                    {p.arena.busy ? "Checking" : "Check and save"}
                  </button>
                )}
                <a
                  className="text-link"
                  href={ARENA_TOKEN_PAGE}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={(e) => p.onOpenLink?.(e, ARENA_TOKEN_PAGE)}
                >
                  Make a token on Are.na
                </a>
                <p className={`form-status tone-${p.arena.message?.tone ?? "idle"}`} role="status">
                  {p.arena.message?.text ??
                    (p.arena.mode === "preview" ? "Saving the token works in the desktop app." : "")}
                </p>
              </div>
            </section>
          )}

          <section className="settings-section" aria-labelledby="sec-content">
            <h3 id="sec-content">Content</h3>
            {toggle("showNudity", "Show images that may contain nudity")}
            <p className="settings-note">
              Off by default. LeMuse's nudity sensor reads titles, descriptions, museum object types and channel names, so
              it catches what is labelled, not every image. Right-click an image to hide it, or to mark nudity it
              missed.
            </p>
            <div className="form-row">
              <span className="list-label">
                {(p.marks?.hidden ?? 0).toLocaleString("en-US")} hidden by you ·{" "}
                {(p.marks?.nudity ?? 0).toLocaleString("en-US")} marked as nudity
              </span>
              <button type="button" className="text-btn" onClick={p.onShowHidden} disabled={!p.marks?.hidden}>
                Show hidden images again
              </button>
              <button type="button" className="text-btn" onClick={p.onForgetNudityMarks} disabled={!p.marks?.nudity}>
                Forget my nudity marks
              </button>
            </div>
          </section>

          <section className="settings-section" aria-labelledby="sec-practice">
            <h3 id="sec-practice">Practice</h3>
            {toggle("showPracticeLog", "Show my practice log in the session planner")}
            <p className="settings-note">
              The log keeps each timed session that drew something (when, how long, how many drawings), on this PC
              only. It shows weeks, never streaks.
            </p>
            <div className="form-row">
              <button type="button" className="text-btn danger" onClick={p.onClearPractice}>
                Clear my practice history
              </button>
            </div>
            {labelled("sessionClock", "Pose clock", CLOCKS, CLOCK_LABELS, s.sessionClock)}
            {toggle("poseFlash", "Flash around the image when a pose changes (for quiet rooms)")}
            {toggle("singleKeys", "Single-key shortcuts (letters such as N, V, K)")}
            <p className="settings-note">
              Turn these off if you use speech input or press keys by accident. Arrows, Space and Esc always work.
            </p>
            <div className="form-row">
              <button type="button" className="text-btn" onClick={p.onShowShortcuts}>
                Change keyboard shortcuts…
              </button>
            </div>
            {p.contentNote && (
              <p className="settings-note" role="status">
                {p.contentNote}
              </p>
            )}
          </section>

          {p.about && (
            <section className="settings-section" aria-labelledby="sec-about">
              <h3 id="sec-about">About</h3>
              <p className="settings-note">
                <strong>Real art, credited.</strong> Free museum collections and the Are.na channels you choose: no ads,
                no algorithm, no AI feed. Warm up, study values, and see what you drew.
              </p>
              {toggle("checkUpdates", "Look for a newer LeMuse when it starts (at most once a day)")}
              <div className="form-row">
                <button type="button" className="text-btn" onClick={p.onCheckUpdate} disabled={p.update?.state === "checking"}>
                  {p.update?.state === "checking" ? "Checking" : "Check for updates now"}
                </button>
                <span className="list-label" role="status">
                  {updateText(p.update)}
                </span>
                {p.update?.state === "available" && p.update.release && (
                  <a
                    className="text-link"
                    href={p.update.release.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={(e) => p.update?.release && p.onOpenLink?.(e, p.update.release.url)}
                  >
                    Get LeMuse {p.update.release.version}
                  </a>
                )}
              </div>
              <p className="settings-note">
                The check asks GitHub for the newest release (no account, no Are.na token). Nothing is downloaded until
                you choose to.
              </p>
              <p className="settings-note">
                LeMuse {p.about.version} · open source under the {p.about.licence} licence. Images stream from their
                sources and belong to their creators; each one shows its credit and a link back. No tracking: LeMuse
                talks only to the sources whose images you see, and your Are.na token stays in Windows Credential
                Manager. It isn't affiliated with Are.na or any museum. Press <kbd>?</kbd> for keyboard shortcuts.
              </p>
              <div className="form-row">
                <a
                  className="text-link"
                  href={p.about.repository}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={(e) => p.about && p.onOpenLink?.(e, p.about.repository)}
                >
                  Source code
                </a>
                <a
                  className="text-link"
                  href={reportUrl(p.about.version)}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={(e) => p.about && p.onOpenLink?.(e, reportUrl(p.about.version))}
                >
                  Report a problem
                </a>
                <button type="button" className="text-btn" onClick={p.onShowNotices}>
                  Third-party licences
                </button>
              </div>
            </section>
          )}
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
