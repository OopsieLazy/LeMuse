import { forwardRef } from "react";
import type { TopicInfo } from "./api";

// First run (ADR-0029): one gentle question instead of setup. Art first:
// picking a topic starts it at once; everything else can wait. Native
// <dialog>, like Settings; pure view.

export interface WelcomePanelProps {
  topics: TopicInfo[];
  staticOpen?: boolean;
  onPick?: (topic: string) => void;
  onSurprise?: () => void;
  onClose?: () => void;
}

/** The topics worth offering first: the fullest ones, at most 12. */
export function welcomeTopics(topics: TopicInfo[]): TopicInfo[] {
  return [...topics]
    .filter((t) => t.slides > 0)
    .sort((a, b) => b.slides - a.slides)
    .slice(0, 12);
}

export const WelcomePanel = forwardRef<HTMLDialogElement, WelcomePanelProps>(function WelcomePanel(p, ref) {
  const offer = welcomeTopics(p.topics);
  return (
    <dialog ref={ref} className="settings welcome" aria-labelledby="welcome-title" open={p.staticOpen || undefined} onClose={p.onClose}>
      <form method="dialog" className="settings-form">
        <header className="settings-head">
          <h2 id="welcome-title">What are you drawing today?</h2>
          <button type="submit" className="settings-close" aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="settings-body">
          <section className="settings-section" aria-labelledby="welcome-topics">
            <p className="settings-note" id="welcome-topics">
              Real art, credited: free museum collections and the Are.na channels you choose. Pick a subject to start.
            </p>
            {offer.length ? (
              <ul className="chips welcome-topics">
                {offer.map((t) => (
                  <li key={t.name}>
                    <button type="button" className="chip" onClick={() => p.onPick?.(t.name)}>
                      <span className="chip-label">{t.name}</span>
                      <span className="chip-count">{t.slides.toLocaleString("en-US")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="settings-note">The first refresh is bringing images in; they appear as they arrive.</p>
            )}
            <p className="settings-note">
              Later: <kbd>N</kbd> for a timed session, <kbd>V</kbd> for values, <kbd>?</kbd> for every shortcut.
            </p>
          </section>
        </div>
        <footer className="settings-foot">
          <button type="button" className="text-btn" onClick={p.onSurprise}>
            Surprise me
          </button>
          <button type="submit" className="primary-btn">
            Just look around
          </button>
        </footer>
      </form>
    </dialog>
  );
});
