import { forwardRef } from "react";
import {
  duration,
  MAX_POSES,
  MAX_ROUNDS,
  planSeconds,
  planText,
  poseCount,
  POSE_SECONDS,
  SESSION_PLANS,
  type PlanId,
  type Round,
  type SessionPlan,
  type LogWeek,
  type SessionResult,
} from "./practice";
import { altText } from "./SlideshowView";

// Timed sessions (ADR-0025): pick a plan before, see what you drew after.
// Native <dialog>, like Settings. Pure view; the app runs the clock. Titles
// and names from sources render as React text, never HTML.

export interface PracticePanelProps {
  /** "plan" before a session, "summary" after one. */
  view: "plan" | "summary";
  planId: PlanId;
  customRounds: Round[];
  sound: boolean;
  /** What the session draws from ("Chairs", "All") and how many images it has. */
  from: string;
  images: number;
  result?: SessionResult | null;
  /** Block ids already in Favourites. */
  favourites?: number[];
  /** A short note after "Keep as a playlist". */
  kept?: string;
  busy?: boolean;
  /** The practice log: the last 8 weeks, oldest first (ADR-0027); null while hidden. */
  log?: LogWeek[] | null;
  onHideLog?: () => void;
  /** Render with the `open` attribute (W3C/layout snapshots). */
  staticOpen?: boolean;
  onPlan?: (id: PlanId) => void;
  onCustom?: (rounds: Round[]) => void;
  onSound?: (on: boolean) => void;
  onStart?: () => void;
  onToggleFavourite?: (blockId: number) => void;
  onKeep?: () => void;
  onAgain?: () => void;
  /** Ended early: carry on where it stopped (an undo, not a warning). */
  onResume?: () => void;
  onClose?: () => void;
}

const CUSTOM_PLAN = (rounds: Round[]): SessionPlan => ({ id: "custom", name: "Your plan", rounds });

function PlanOption(p: { plan: SessionPlan; checked: boolean; onPick?: () => void }) {
  return (
    <label className="plan-option">
      <input type="radio" name="practice-plan" checked={p.checked} onChange={p.onPick} />
      <span className="plan-card">
        <span className="plan-name">{p.plan.name}</span>
        <span className="plan-rounds">{planText(p.plan)}</span>
        <span className="plan-total">
          {poseCount(p.plan)} poses · {duration(planSeconds(p.plan))}
        </span>
      </span>
    </label>
  );
}

function CustomRounds(p: { rounds: Round[]; onChange?: (r: Round[]) => void }) {
  const set = (i: number, patch: Partial<Round>) =>
    p.onChange?.(p.rounds.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="custom-rounds">
      <ol className="round-list">
        {p.rounds.map((r, i) => (
          <li key={i} className="round-row">
            <label htmlFor={`round-count-${i}`} className="visually-hidden">
              Round {i + 1}: poses
            </label>
            <input
              id={`round-count-${i}`}
              type="number"
              min={1}
              max={MAX_POSES}
              value={r.count}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value));
                if (Number.isFinite(n)) set(i, { count: Math.min(MAX_POSES, Math.max(1, n)) });
              }}
            />
            <span aria-hidden="true">×</span>
            <label htmlFor={`round-seconds-${i}`} className="visually-hidden">
              Round {i + 1}: time per pose
            </label>
            <select
              id={`round-seconds-${i}`}
              value={r.seconds}
              onChange={(e) => set(i, { seconds: Number(e.target.value) })}
            >
              {POSE_SECONDS.map((s) => (
                <option key={s} value={s}>
                  {duration(s)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="text-btn"
              disabled={p.rounds.length < 2}
              onClick={() => p.onChange?.(p.rounds.filter((_, j) => j !== i))}
              aria-label={`Remove round ${i + 1}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="text-btn"
        disabled={p.rounds.length >= MAX_ROUNDS}
        onClick={() => p.onChange?.([...p.rounds, { count: 5, seconds: 60 }])}
      >
        Add a round
      </button>
    </div>
  );
}

function Summary(p: PracticePanelProps & { result: SessionResult }) {
  const r = p.result;
  const fav = new Set(p.favourites ?? []);
  return (
    <>
      <section className="settings-section" aria-labelledby="sec-drawn">
        <h3 id="sec-drawn">{r.finished ? "Session complete" : "Session ended"}</h3>
        <p className="session-stats">
          <span>
            <strong>{r.drawn.length}</strong> {r.drawn.length === 1 ? "drawing" : "drawings"}
          </span>
          <span>
            <strong>{duration(r.seconds)}</strong> drawing
          </span>
          {r.skipped > 0 && (
            <span>
              <strong>{r.skipped}</strong> skipped
            </span>
          )}
        </p>
        <p className="settings-note">
          {r.planName} from {r.from}. Look back over them: what improved from the first to the last?
        </p>
        {r.drawn.length > 0 ? (
          <ul className="drawn-grid">
            {r.drawn.map((d, i) => (
              <li key={`${d.block_id}-${i}`} className="drawn-item">
                <img src={d.display_url} alt={altText(d)} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                <span className="drawn-caption">
                  <span className="drawn-title">{d.title || "Untitled"}</span>
                  <span className="drawn-meta">
                    {d.creator ? `${d.creator} · ` : ""}
                    {duration(d.seconds)}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-btn drawn-fav"
                  aria-pressed={fav.has(d.block_id)}
                  data-favourite={fav.has(d.block_id) ? "true" : "false"}
                  aria-label={`Favourite: ${d.title || "Untitled"}`}
                  onClick={() => p.onToggleFavourite?.(d.block_id)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="settings-note">No pose ran long enough to count. Next time, give it a few poses.</p>
        )}
        {p.kept && (
          <p className="settings-note tone-ok" role="status">
            {p.kept}
          </p>
        )}
      </section>
    </>
  );
}

/** "This week: 14 drawings · 9 min · 2 sessions", then 8 weekly bars. Never a streak. */
function PracticeLog(p: { log: LogWeek[]; onHide?: () => void }) {
  const week = p.log[p.log.length - 1];
  const most = Math.max(1, ...p.log.map((w) => w.drawings));
  const day = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <section className="settings-section" aria-labelledby="sec-log">
      <div className="menu-head">
        <h3 id="sec-log">Your practice</h3>
        <button type="button" className="text-btn" onClick={p.onHide}>
          Hide
        </button>
      </div>
      <p className="session-stats">
        <span>
          This week <strong>{week.drawings}</strong> {week.drawings === 1 ? "drawing" : "drawings"}
        </span>
        <span>
          <strong>{duration(week.seconds)}</strong>
        </span>
        <span>
          <strong>{week.sessions}</strong> {week.sessions === 1 ? "session" : "sessions"}
        </span>
      </p>
      <ol className="log-bars" aria-label="Drawings per week, the last 8 weeks">
        {p.log.map((w) => (
          <li key={w.start} className="log-week" title={`Week of ${day(w.start)}: ${w.drawings} drawings, ${duration(w.seconds)}`}>
            <span className="log-bar" data-level={Math.ceil((w.drawings / most) * 8)} />
            <span className="visually-hidden">
              Week of {day(w.start)}: {w.drawings} drawings, {duration(w.seconds)}
            </span>
          </li>
        ))}
      </ol>
      <p className="settings-note">Any week you draw counts. Missed weeks are fine; they're just short bars.</p>
    </section>
  );
}

export const PracticePanel = forwardRef<HTMLDialogElement, PracticePanelProps>(function PracticePanel(p, ref) {
  const summary = p.view === "summary" && p.result;
  return (
    <dialog
      ref={ref}
      className="settings practice"
      aria-labelledby="practice-title"
      open={p.staticOpen || undefined}
      onClose={p.onClose}
    >
      <form method="dialog" className="settings-form">
        <header className="settings-head">
          <h2 id="practice-title">{summary ? "What you drew" : "Timed session"}</h2>
          <button type="submit" className="settings-close" aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="settings-body">
          {summary ? (
            <Summary {...p} result={summary} />
          ) : (
            <>
              {p.log && <PracticeLog log={p.log} onHide={p.onHideLog} />}
              <section className="settings-section" aria-labelledby="sec-plan">
                <h3 id="sec-plan">Plan</h3>
                <p className="settings-note">
                  Fast poses first to loosen up, then longer ones. Take the first few seconds of each pose just to look.
                </p>
                <fieldset className="plan-options">
                  <legend className="visually-hidden">Session plan</legend>
                  {SESSION_PLANS.map((plan) => (
                    <PlanOption key={plan.id} plan={plan} checked={p.planId === plan.id} onPick={() => p.onPlan?.(plan.id as PlanId)} />
                  ))}
                  <PlanOption plan={CUSTOM_PLAN(p.customRounds)} checked={p.planId === "custom"} onPick={() => p.onPlan?.("custom")} />
                </fieldset>
                {p.planId === "custom" && <CustomRounds rounds={p.customRounds} onChange={p.onCustom} />}
              </section>
              <section className="settings-section" aria-labelledby="sec-session">
                <h3 id="sec-session">During the session</h3>
                <p className="settings-note">
                  Draws from <strong>{p.from}</strong> ({p.images.toLocaleString("en-US")} images, in the slideshow's
                  order). Each pose starts when its image has loaded.
                </p>
                <div className="field check-field">
                  <label>
                    <input type="checkbox" checked={p.sound} onChange={(e) => p.onSound?.(e.target.checked)} />
                    Sound: three short beeps before a pose ends, a tone when it changes
                  </label>
                </div>
                <p className="settings-note">
                  <kbd>Space</kbd> pause · <kbd>→</kbd> skip · <kbd>←</kbd> back · <kbd>Esc</kbd> end. Study aids keep
                  working.
                </p>
              </section>
            </>
          )}
        </div>
        <footer className="settings-foot">
          {summary ? (
            <>
              <button type="button" className="text-btn" onClick={p.onKeep} disabled={p.busy || !summary.drawn.length}>
                Keep as a playlist
              </button>
              <button type="button" className="text-btn" onClick={p.onAgain}>
                Another session
              </button>
              {p.onResume && !summary.finished && (
                <button type="button" className="text-btn" onClick={p.onResume}>
                  Resume
                </button>
              )}
              <button type="submit" className="primary-btn">
                Done
              </button>
            </>
          ) : (
            <>
              <button type="submit" className="text-btn">
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={p.onStart} disabled={!p.images}>
                Start
              </button>
            </>
          )}
        </footer>
      </form>
    </dialog>
  );
});
