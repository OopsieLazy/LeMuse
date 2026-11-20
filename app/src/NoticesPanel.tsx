import { forwardRef } from "react";

// Third-party licences (ADR-0030): the plain-text notices the installer
// carries, shown as text (never HTML). Native <dialog>, like Settings.

export interface NoticesPanelProps {
  /** null while loading. */
  text: string | null;
  staticOpen?: boolean;
  onClose?: () => void;
}

export const NoticesPanel = forwardRef<HTMLDialogElement, NoticesPanelProps>(function NoticesPanel(p, ref) {
  return (
    <dialog ref={ref} className="settings notices" aria-labelledby="notices-title" open={p.staticOpen || undefined} onClose={p.onClose}>
      <form method="dialog" className="settings-form">
        <header className="settings-head">
          <h2 id="notices-title">Third-party licences</h2>
          <button type="submit" className="settings-close" aria-label="Close third-party licences">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="settings-body">
          <p className="settings-note">
            LeMuse is MIT-licensed and built with the open-source packages below, each under its own licence. Thank you
            to everyone who made them.
          </p>
          <pre className="notices-text">{p.text ?? "Loading"}</pre>
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
