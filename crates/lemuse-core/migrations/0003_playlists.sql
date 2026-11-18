-- Playlists: the user's own lists of images, made inside the app (ADR-0014).
-- Local state, like block_files: a refresh never reads or changes these
-- tables, and blocks are never deleted (archive policy, ADR-0013), so a
-- playlist keeps its images even after a channel drops them. Rows hold
-- references only; no image bytes.
CREATE TABLE playlists (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL COLLATE NOCASE UNIQUE
               CHECK (length(name) BETWEEN 1 AND 60),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE playlist_items (
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    block_id    INTEGER NOT NULL REFERENCES blocks(id),
    added_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    seq         INTEGER NOT NULL,
    PRIMARY KEY (playlist_id, block_id)
);
CREATE INDEX playlist_items_by_seq ON playlist_items (playlist_id, seq DESC);
