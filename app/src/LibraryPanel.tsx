import { forwardRef, useEffect, useState, type FormEvent } from "react";
import type { Playlist, TopicInfo } from "./api";

// "Add channel" and playlist management (ADR-0014), in a native <dialog>
// like Settings. A view with only form-field state: every action goes out
// through a callback, and the core validates every value again (links,
// names, ids), so this file is a convenience, not a security boundary.
// Remote titles and user names render as React text, never HTML.

export interface PanelStatus {
  tone: "idle" | "ok" | "error";
  text: string;
}

export interface LibraryPanelProps {
  topics: TopicInfo[];
  playlists: Playlist[];
  /** Topic preselected in "Add to topic" (the one playing, if any). */
  defaultTopic?: string;
  busy?: boolean;
  /** Result of the last add/remove. */
  status?: PanelStatus;
  /** Result of the last playlist action. */
  playlistStatus?: PanelStatus;
  /** Render with the `open` attribute (W3C/layout snapshots). */
  staticOpen?: boolean;
  mode: "app" | "preview";
  onAddChannel?: (link: string, topic: string, createTopic: boolean) => void;
  onRemoveChannel?: (topic: string, channel: string) => void;
  /** Rename or remove the selected topic (ADR-0029). */
  onRenameTopic?: (from: string, to: string) => void;
  onRemoveTopic?: (name: string) => void;
  onCreatePlaylist?: (name: string) => void;
  onRenamePlaylist?: (id: number, name: string) => void;
  onDeletePlaylist?: (id: number) => void;
  onClose?: () => void;
}

const NEW_TOPIC = "__new__";

function field(form: HTMLFormElement, name: string): string {
  const el = form.elements.namedItem(name);
  return el instanceof HTMLInputElement || el instanceof HTMLSelectElement ? el.value : "";
}

export const LibraryPanel = forwardRef<HTMLDialogElement, LibraryPanelProps>(function LibraryPanel(p, ref) {
  const first = p.defaultTopic ?? p.topics[0]?.name ?? NEW_TOPIC;
  const [topic, setTopic] = useState(first);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [topicConfirm, setTopicConfirm] = useState(false);
  // Follow the topic that's playing, and never point at a topic that's gone.
  useEffect(() => {
    if (p.defaultTopic) setTopic(p.defaultTopic);
  }, [p.defaultTopic]);
  useEffect(() => {
    if (topic !== NEW_TOPIC && p.topics.length && !p.topics.some((t) => t.name === topic)) setTopic(p.topics[0].name);
  }, [p.topics, topic]);
  const selected = topic === NEW_TOPIC ? undefined : p.topics.find((t) => t.name === topic);
  useEffect(() => setTopicConfirm(false), [topic]);
  const onRenameTopic = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const to = field(e.currentTarget, "topic-rename").trim();
    if (selected && to && to !== selected.name) {
      p.onRenameTopic?.(selected.name, to);
      setTopic(to);
    }
  };

  const onAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const link = field(form, "link").trim();
    const creating = topic === NEW_TOPIC;
    const name = (creating ? field(form, "new-topic") : topic).trim();
    p.onAddChannel?.(link, name, creating);
  };
  const onCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    p.onCreatePlaylist?.(field(form, "new-playlist").trim());
    form.reset();
  };
  const onRename = (e: FormEvent<HTMLFormElement>, id: number) => {
    e.preventDefault();
    p.onRenamePlaylist?.(id, field(e.currentTarget, "rename").trim());
    setEditing(null);
  };

  return (
    <dialog
      ref={ref}
      className="settings library"
      aria-labelledby="library-title"
      open={p.staticOpen || undefined}
      onClose={p.onClose}
    >
      <div className="settings-form">
        <header className="settings-head">
          <h2 id="library-title">Channels and playlists</h2>
          <form method="dialog">
            <button type="submit" className="settings-close" aria-label="Close">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </form>
        </header>

        <div className="settings-body">
          <section className="settings-section" aria-labelledby="sec-add">
            <h3 id="sec-add">Add an Are.na channel</h3>
            <form className="stack-form" onSubmit={onAdd}>
              <div className="field text-field">
                <label htmlFor="add-link">Channel link</label>
                <input
                  id="add-link"
                  name="link"
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={2048}
                  placeholder="https://www.are.na/someone/channel-name"
                  required
                />
              </div>
              <div className="field text-field">
                <label htmlFor="add-topic">Add to topic</label>
                <select id="add-topic" name="topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
                  {p.topics.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                  <option value={NEW_TOPIC}>New topic…</option>
                </select>
              </div>
              {topic === NEW_TOPIC && (
                <div className="field text-field">
                  <label htmlFor="new-topic">New topic name</label>
                  <input id="new-topic" name="new-topic" type="text" maxLength={60} autoComplete="off" required />
                </div>
              )}
              <div className="form-row">
                <button type="submit" className="primary-btn" disabled={p.busy || p.mode === "preview"}>
                  {p.busy ? "Checking" : "Add channel"}
                </button>
                <p className={`form-status tone-${p.status?.tone ?? "idle"}`} role="status">
                  {p.status?.text ??
                    (p.mode === "preview"
                      ? "Adding channels works in the desktop app."
                      : "LeMuse checks the link with Are.na once, then loads its images. Private channels need your Are.na token (Settings).")}
                </p>
              </div>
            </form>
            {selected && selected.channels.length > 0 && (
              <div className="channel-list">
                <p className="list-label">Are.na channels in {selected.name}</p>
                <ul>
                  {selected.channels.map((c) => (
                    <li key={c}>
                      <span className="channel-slug">{c}</span>
                      <button
                        type="button"
                        className="text-btn"
                        disabled={p.busy || p.mode === "preview"}
                        onClick={() => p.onRemoveChannel?.(selected.name, c)}
                        aria-label={`Remove ${c} from ${selected.name}`}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selected && (
              <div className="topic-manage">
                <p className="list-label">This topic</p>
                <form className="form-row" onSubmit={onRenameTopic}>
                  <label htmlFor="topic-rename" className="visually-hidden">
                    New name for {selected.name}
                  </label>
                  <input
                    key={selected.name}
                    id="topic-rename"
                    name="topic-rename"
                    type="text"
                    maxLength={60}
                    defaultValue={selected.name}
                    autoComplete="off"
                    required
                  />
                  <button type="submit" className="text-btn" disabled={p.busy || p.mode === "preview"}>
                    Rename
                  </button>
                  {topicConfirm ? (
                    <>
                      <button
                        type="button"
                        className="text-btn danger"
                        disabled={p.busy || p.mode === "preview"}
                        onClick={() => {
                          setTopicConfirm(false);
                          p.onRemoveTopic?.(selected.name);
                        }}
                      >
                        Remove {selected.name} and its channels
                      </button>
                      <button type="button" className="text-btn" onClick={() => setTopicConfirm(false)}>
                        Keep it
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="text-btn danger"
                      disabled={p.busy || p.mode === "preview"}
                      onClick={() => setTopicConfirm(true)}
                    >
                      Remove topic
                    </button>
                  )}
                </form>
                {topicConfirm && (
                  <p className="settings-note">
                    Images you put in playlists or saved stay where they are. Only the topic and its list of channels go.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="settings-section" aria-labelledby="sec-playlists">
            <h3 id="sec-playlists">Playlists</h3>
            <form className="form-row" onSubmit={onCreate}>
              <label htmlFor="new-playlist" className="visually-hidden">
                New playlist name
              </label>
              <input
                id="new-playlist"
                name="new-playlist"
                type="text"
                maxLength={60}
                placeholder="New playlist name"
                autoComplete="off"
                required
              />
              <button type="submit" className="primary-btn">
                Create
              </button>
            </form>
            {p.playlistStatus && (
              <p className={`form-status tone-${p.playlistStatus.tone}`} role="status">
                {p.playlistStatus.text}
              </p>
            )}
            {p.playlists.length ? (
              <ul className="channel-list playlist-admin">
                {p.playlists.map((l) => (
                  <li key={l.id}>
                    {editing === l.id ? (
                      <form className="form-row" onSubmit={(e) => onRename(e, l.id)}>
                        <label htmlFor={`rename-${l.id}`} className="visually-hidden">
                          New name for {l.name}
                        </label>
                        <input
                          id={`rename-${l.id}`}
                          name="rename"
                          type="text"
                          maxLength={60}
                          defaultValue={l.name}
                          autoComplete="off"
                          required
                        />
                        <button type="submit" className="primary-btn">
                          Save
                        </button>
                        <button type="button" className="text-btn" onClick={() => setEditing(null)}>
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="channel-slug">
                          {l.name} <span className="topic-count">{l.items.toLocaleString("en-US")}</span>
                        </span>
                        <span className="row-actions">
                          <button type="button" className="text-btn" onClick={() => setEditing(l.id)}>
                            Rename
                          </button>
                          {confirming === l.id ? (
                            <button
                              type="button"
                              className="text-btn danger"
                              onClick={() => {
                                setConfirming(null);
                                p.onDeletePlaylist?.(l.id);
                              }}
                            >
                              Delete {l.name}?
                            </button>
                          ) : (
                            <button type="button" className="text-btn" onClick={() => setConfirming(l.id)}>
                              Delete
                            </button>
                          )}
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="list-label">
                No playlists yet. A playlist is your own list of images from any topic; it keeps links only.
              </p>
            )}
          </section>
        </div>
      </div>
    </dialog>
  );
});
