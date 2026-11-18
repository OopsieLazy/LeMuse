import { useEffect, useState } from "react";
import { api, type LibraryStatus, type TopicInfo } from "./api";

// Skeleton shell: lists topics. M1 adds the slideshow view (full-window
// image, auto-advance every `slide_seconds`, ←/→/space keys, attribution
// overlay, preload next 2, Save button). See docs/PLAN.md.
export function App() {
  const [status, setStatus] = useState<LibraryStatus | null>(null);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    api.libraryStatus().then(setStatus).catch((e) => setMessage(String(e)));
    api.topics().then(setTopics).catch((e) => setMessage(String(e)));
  }, []);

  const refresh = () => {
    setMessage("Refreshing…");
    api
      .refreshNow()
      .then(() => setMessage("Up to date"))
      .catch((e) => setMessage(String(e)));
  };

  return (
    <main className="shell">
      <header className="toolbar">
        <h1>ServeNSurf</h1>
        <button onClick={refresh}>Refresh</button>
      </header>
      <section className="status">
        {status ? (
          <p>
            {status.blocks} blocks · {status.root} · schema v{status.schema_version}
          </p>
        ) : (
          <p>Loading library…</p>
        )}
        {message && <p className="message">{message}</p>}
      </section>
      <section className="topics">
        {topics.length === 0 ? (
          <p className="empty">
            No topics yet. Add a <code>[[topic]]</code> to <code>servensurf.toml</code> in your library
            folder.
          </p>
        ) : (
          <ul>
            {topics.map((t) => (
              <li key={t.name}>
                <strong>{t.name}</strong> · {t.sources} source{t.sources === 1 ? "" : "s"} ·{" "}
                {t.slide_seconds}s{t.shuffle ? " · shuffled" : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
