import { Component, useState, type ErrorInfo, type MouseEvent, type ReactNode } from "react";
import { api, redact, reportUrl } from "./api";

// What LeMuse shows when its own page fails (ADR-0024): instead of a blank
// window, a page with the error's code, what it means for the library, and
// a way to carry on. The message renders as text, never HTML.

export interface ErrorScreenProps {
  code: string;
  message: string;
  onReload?: () => void;
  onCopy?: () => void;
  copied?: boolean;
  onReport?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

/** Pure view of the crash page (also rendered for the W3C check). */
export function ErrorScreen(p: ErrorScreenProps) {
  return (
    <main className="error-screen" aria-labelledby="error-title">
      <div className="error-card" role="alert">
        <p className="error-code">{p.code}</p>
        <h1 id="error-title">LeMuse hit a problem</h1>
        <p className="settings-note">
          Your library is safe: topics, playlists and saved images are untouched. Reload to carry on.
        </p>
        <pre className="error-detail">{p.message}</pre>
        <p className="settings-note">
          Copy details leaves out your Windows user name and anything that looks like a token. A report on GitHub is
          public: check what you paste.
        </p>
        <div className="form-row">
          <button type="button" className="primary-btn" onClick={p.onReload}>
            Reload
          </button>
          <button type="button" className="text-btn" onClick={p.onCopy}>
            {p.copied ? "Copied" : "Copy details"}
          </button>
          <a
            className="text-link"
            href={reportUrl()}
            target="_blank"
            rel="noreferrer noopener"
            onClick={p.onReport}
          >
            Report a problem
          </a>
        </div>
      </div>
    </main>
  );
}

function CrashPage({ error }: { error: Error }) {
  const [copied, setCopied] = useState(false);
  const code = "ui_crash";
  return (
    <ErrorScreen
      code={code}
      message={error.message || String(error)}
      copied={copied}
      onReload={() => window.location.reload()}
      onCopy={() => {
        // Copied only when asked; it stays on this PC unless pasted somewhere.
        api
          .copyText(redact(`LeMuse ${code}: ${error.message}`))
          .then(() => setCopied(true))
          .catch(() => setCopied(false));
      }}
      onReport={(e) => {
        if (api.kind !== "app") return;
        e.preventDefault();
        api.openExternal(reportUrl()).catch(() => undefined);
      }}
    />
  );
}

/** Catches render errors anywhere below it and shows the crash page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("LeMuse UI error", error, info.componentStack);
  }

  render() {
    return this.state.error ? <CrashPage error={this.state.error} /> : this.props.children;
  }
}
