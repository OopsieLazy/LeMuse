import { forwardRef, useEffect, useMemo, useState, type FormEvent } from "react";
import type { ChannelPreview, FollowedPage, FollowedPick, RelatedChannels, TopicInfo, Vocabulary } from "./api";
import type { PanelStatus } from "./LibraryPanel";

// "Find channels" (ADR-0015), a native <dialog> like Settings.
//
// Are.na's search API is Premium-only, so LeMuse never searches by itself:
// - a word opens Are.na's own search page in the system browser;
// - a pasted link (or a related channel) is previewed with two reads
//   before anything is added;
// - "Related channels" lists the public channels the current image is
//   also in, one read per click.
// Every action goes out through a callback; the core checks links, slugs
// and ids again. Remote titles and names render as React text, never HTML.

export interface RelatedState {
  /** Title of the image the channels were found for. */
  imageTitle: string;
  result: RelatedChannels | null;
}

/** "Channels you follow" (ADR-0024): null until asked for. */
export interface FollowingState {
  result: FollowedPage | null;
}

export interface DiscoverPanelProps {
  mode: "app" | "preview";
  vocabulary: Vocabulary | null;
  topics: TopicInfo[];
  defaultTopic?: string;
  preview?: ChannelPreview | null;
  /** The link or slug the preview is for (what Add uses). */
  previewLink?: string;
  related?: RelatedState | null;
  /** A token is saved, so the followed channels can be listed. */
  canFollow?: boolean;
  following?: FollowingState | null;
  onShowFollowing?: () => void;
  onMoreFollowing?: () => void;
  /** Add followed channels to topics (one, or all the new ones). */
  onAddFollowed?: (picks: FollowedPick[]) => void;
  busy?: boolean;
  status?: PanelStatus;
  /** Render with the `open` attribute (W3C/layout snapshots). */
  staticOpen?: boolean;
  onSearch?: (word: string) => void;
  onPreview?: (link: string) => void;
  onAdd?: (link: string, topic: string, createTopic: boolean) => void;
  onMoreRelated?: () => void;
  onClose?: () => void;
}

const NEW_TOPIC = "__new__";
/** "Add all" option: each followed channel into its best-matching topic. */
const MATCH = "__match__";
const fmt = (n: number) => n.toLocaleString("en-US");

export const DiscoverPanel = forwardRef<HTMLDialogElement, DiscoverPanelProps>(function DiscoverPanel(p, ref) {
  const [word, setWord] = useState("");
  const [list, setList] = useState("");
  const [link, setLink] = useState(p.previewLink ?? "");
  const [topic, setTopic] = useState(p.defaultTopic ?? p.topics[0]?.name ?? NEW_TOPIC);
  const [newTopic, setNewTopic] = useState("");
  /** "Add all new" target: "" = each one's suggested topic. */
  const [followTarget, setFollowTarget] = useState("");
  useEffect(() => {
    if (p.previewLink !== undefined) setLink(p.previewLink);
  }, [p.previewLink]);
  useEffect(() => {
    if (p.defaultTopic) setTopic(p.defaultTopic);
  }, [p.defaultTopic]);
  useEffect(() => {
    if (topic !== NEW_TOPIC && p.topics.length && !p.topics.some((t) => t.name === topic)) setTopic(p.topics[0].name);
  }, [p.topics, topic]);

  const lists = p.vocabulary?.discover ?? [];
  const allWords = useMemo(() => [...new Set(lists.flatMap((l) => l.words))].sort(), [lists]);
  const chosen = lists.find((l) => l.label === list);
  const app = p.mode === "app";
  const newFollowed = (p.following?.result?.channels ?? []).filter((c) => c.in_topics.length === 0);

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (word.trim()) p.onSearch?.(word.trim());
  };
  const onPreview = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (link.trim()) p.onPreview?.(link.trim());
  };
  const onAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const creating = topic === NEW_TOPIC;
    p.onAdd?.(p.previewLink ?? link.trim(), (creating ? newTopic : topic).trim(), creating);
  };

  return (
    <dialog
      ref={ref}
      className="settings library discover"
      aria-labelledby="discover-title"
      open={p.staticOpen || undefined}
      onClose={p.onClose}
    >
      <div className="settings-form">
        <header className="settings-head">
          <h2 id="discover-title">Find channels</h2>
          <form method="dialog">
            <button type="submit" className="settings-close" aria-label="Close">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </form>
        </header>

        <div className="settings-body">
          <p className={`form-status tone-${p.status?.tone ?? "idle"}`} role="status">
            {p.status?.text ??
              (app
                ? "Search on Are.na, then paste a channel's link to preview it here before adding it."
                : "Searching, previews and adding work in the desktop app.")}
          </p>

          <section className="settings-section" aria-labelledby="sec-search">
            <h3 id="sec-search">1. Search Are.na</h3>
            <p className="list-label">
              Pick a word or type your own. Are.na&apos;s search opens in your browser (searching inside the app
              needs an Are.na Premium plan).
            </p>
            <form className="stack-form" onSubmit={onSearch}>
              <div className="field text-field">
                <label htmlFor="word-list">Word list</label>
                <select id="word-list" value={list} onChange={(e) => setList(e.target.value)}>
                  <option value="">All lists ({fmt(allWords.length)} words)</option>
                  {lists.map((l) => (
                    <option key={l.label} value={l.label}>
                      {l.label} ({l.words.length})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field text-field">
                <label htmlFor="word-pick">Word</label>
                <select id="word-pick" value="" onChange={(e) => e.target.value && setWord(e.target.value)}>
                  <option value="">Choose a word…</option>
                  {(chosen ? chosen.words : allWords).map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="search-word" className="visually-hidden">
                  Search word
                </label>
                <input
                  id="search-word"
                  name="word"
                  type="search"
                  list="discover-words"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  maxLength={200}
                  autoComplete="off"
                  placeholder="e.g. rubber, joinery, exploded view"
                  required
                />
                <datalist id="discover-words">
                  {allWords.map((w) => (
                    <option key={w} value={w} />
                  ))}
                </datalist>
                <button type="submit" className="primary-btn">
                  Search on Are.na
                </button>
              </div>
            </form>
          </section>

          {p.related && (
            <section className="settings-section" aria-labelledby="sec-related">
              <h3 id="sec-related">Channels with this image</h3>
              <p className="list-label">
                Public channels that also hold “{p.related.imageTitle}”
                {p.related.result?.total != null ? ` (${fmt(p.related.result.total)} in all)` : ""}.
              </p>
              {p.related.result ? (
                p.related.result.channels.length ? (
                  <ul className="channel-list related-list">
                    {p.related.result.channels.map((c) => (
                      <li key={c.slug}>
                        <span className="channel-slug">
                          <span className="related-title">{c.title}</span>
                          <span className="related-meta">
                            {c.owner ?? "Are.na"}
                            {c.contents != null ? ` · ${fmt(c.contents)} items` : ""}
                          </span>
                        </span>
                        <button
                          type="button"
                          className="text-btn"
                          disabled={p.busy}
                          onClick={() => p.onPreview?.(c.slug)}
                          aria-label={`Preview ${c.title}`}
                        >
                          Preview
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="list-label">No other public channels hold this image.</p>
                )
              ) : (
                <p className="list-label">Asking Are.na</p>
              )}
              {p.related.result?.next_page != null && (
                <button type="button" className="text-btn" disabled={p.busy} onClick={p.onMoreRelated}>
                  Show more channels
                </button>
              )}
            </section>
          )}

          {app && (
            <section className="settings-section" aria-labelledby="sec-following">
              <h3 id="sec-following">Channels you follow</h3>
              {!p.canFollow ? (
                <p className="list-label">Save your Are.na token in Settings to list the channels you follow.</p>
              ) : !p.following ? (
                <div className="form-row">
                  <button type="button" className="text-btn" disabled={p.busy} onClick={p.onShowFollowing}>
                    Show the channels I follow
                  </button>
                  <p className="list-label">One read of your Are.na account, only when you ask.</p>
                </div>
              ) : p.following.result ? (
                p.following.result.channels.length ? (
                  <>
                    <ul className="channel-list related-list">
                      {p.following.result.channels.map((c) => (
                        <li key={c.slug}>
                          <span className="channel-slug">
                            <span className="related-title">{c.title}</span>
                            <span className="related-meta">
                              {c.owner ?? "Are.na"}
                              {c.contents != null ? ` · ${fmt(c.contents)} items` : ""}
                              {c.in_topics.length ? ` · in ${c.in_topics.join(", ")}` : ` · new: becomes its own topic “${c.own_topic}”`}
                            </span>
                          </span>
                          <span className="row-actions">
                            <button
                              type="button"
                              className="text-btn"
                              disabled={p.busy}
                              onClick={() => p.onPreview?.(c.slug)}
                              aria-label={`Preview ${c.title}`}
                            >
                              Preview
                            </button>
                            {c.in_topics.length === 0 && (
                              <button
                                type="button"
                                className="text-btn"
                                disabled={p.busy}
                                onClick={() => p.onAddFollowed?.([{ slug: c.slug, title: c.title, owner: c.owner, topic: null }])}
                                aria-label={`Add ${c.title} as its own topic`}
                              >
                                Add
                              </button>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {newFollowed.length > 0 && (
                      <div className="form-row follow-all">
                        <label htmlFor="follow-target">
                          {newFollowed.length === 1 ? "1 isn't" : `${newFollowed.length} aren't`} in a topic yet. Add them:
                        </label>
                        <select id="follow-target" value={followTarget} onChange={(e) => setFollowTarget(e.target.value)}>
                          <option value="">Each as its own topic, named after the channel</option>
                          <option value={MATCH}>Each into the existing topic that fits it best</option>
                          {p.topics.map((t) => (
                            <option key={t.name} value={t.name}>
                              All into {t.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="primary-btn"
                          disabled={p.busy}
                          onClick={() =>
                            p.onAddFollowed?.(
                              newFollowed.map((c) => ({
                                slug: c.slug,
                                title: c.title,
                                owner: c.owner,
                                topic: followTarget === MATCH ? c.suggested : followTarget || null,
                              })),
                            )
                          }
                        >
                          Add {newFollowed.length === 1 ? "it" : `all ${newFollowed.length}`}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="list-label">You don't follow any channels on Are.na yet.</p>
                )
              ) : (
                <p className="list-label">Asking Are.na</p>
              )}
              {p.following?.result?.next_page != null && (
                <button type="button" className="text-btn" disabled={p.busy} onClick={p.onMoreFollowing}>
                  Show more channels
                </button>
              )}
            </section>
          )}

          <section className="settings-section" aria-labelledby="sec-preview">
            <h3 id="sec-preview">2. Preview a channel</h3>
            <form className="form-row" onSubmit={onPreview}>
              <label htmlFor="preview-link" className="visually-hidden">
                Channel link or name
              </label>
              <input
                id="preview-link"
                name="preview-link"
                type="text"
                inputMode="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                maxLength={2048}
                autoComplete="off"
                spellCheck={false}
                placeholder="https://www.are.na/someone/channel-name"
                required
              />
              <button type="submit" className="primary-btn" disabled={p.busy || !app}>
                {p.busy ? "Loading" : "Preview"}
              </button>
            </form>

            {p.preview && (
              <div className="preview">
                <p className="preview-head">
                  <span className="related-title">{p.preview.channel.title}</span>
                  <span className="related-meta">
                    {p.preview.channel.contents != null ? `${fmt(p.preview.channel.contents)} items` : "Are.na channel"}
                    {` · first ${p.preview.items.length} shown`}
                  </span>
                </p>
                {p.preview.items.length ? (
                  <ul className="preview-grid">
                    {p.preview.items.map((it, i) => (
                      <li key={`${i}-${it.image_url}`}>
                        <img
                          src={it.image_url}
                          alt={it.title ?? `Image ${i + 1} from ${p.preview?.channel.title}`}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="list-label">This channel has no images on its first page.</p>
                )}
                <form className="stack-form" onSubmit={onAdd}>
                  <div className="field text-field">
                    <label htmlFor="discover-topic">Add to topic</label>
                    <select id="discover-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
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
                      <label htmlFor="discover-new-topic">New topic name</label>
                      <input
                        id="discover-new-topic"
                        type="text"
                        maxLength={60}
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        autoComplete="off"
                        required
                      />
                    </div>
                  )}
                  <div className="form-row">
                    <button type="submit" className="primary-btn" disabled={p.busy || !app}>
                      Add channel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      </div>
    </dialog>
  );
});
