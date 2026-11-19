import { forwardRef } from "react";

// "Refresh details" (ADR-0024): which sources failed in the last refresh
// and why, as plain text. Native <dialog>, like Settings.

export interface RefreshDetailsProps {
  failed: string[];
  /** How many failed in all (the list shows the first 20). */
  total: number;
  /** Render with the `open` attribute (W3C/layout snapshots). */
  staticOpen?: boolean;
  onRetry?: () => void;
  onClose?: () => void;
}

export const RefreshDetails = forwardRef<HTMLDialogElement, RefreshDetailsProps>(function RefreshDetails(p, ref) {
  return (
    <dialog
      ref={ref}
      className="settings refresh-details"
      aria-labelledby="refresh-details-title"
      open={p.staticOpen || undefined}
      onClose={p.onClose}
    >
      <form method="dialog" className="settings-form">
        <header className="settings-head">
          <h2 id="refresh-details-title">Refresh details</h2>
          <button type="submit" className="settings-close" aria-label="Close refresh details">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="settings-body">
          <section className="settings-section" aria-labelledby="sec-failed">
            <h3 id="sec-failed">
              {p.total === 1 ? "1 source failed" : `${p.total.toLocaleString("en-US")} sources failed`}
            </h3>
            <p className="settings-note">
              The other sources refreshed normally. A failed one keeps the images it already had and tries again at the
              next refresh.
            </p>
            <ul className="failed-list">
              {p.failed.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
            {p.total > p.failed.length && (
              <p className="settings-note">…and {(p.total - p.failed.length).toLocaleString("en-US")} more.</p>
            )}
          </section>
        </div>
        <footer className="settings-foot">
          <button type="button" className="text-btn" onClick={p.onRetry}>
            Refresh again
          </button>
          <button type="submit" className="primary-btn">
            Done
          </button>
        </footer>
      </form>
    </dialog>
  );
});
