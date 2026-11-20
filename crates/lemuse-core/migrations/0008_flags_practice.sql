-- LeMuse catalog schema v8 (ADR-0027). Local state: a refresh never touches
-- these tables, like playlists.

-- Marks the user puts on an image (right-click): "hidden" (never show it) and
-- "nudity" (the nudity sensor missed it). They feed block_categories when it
-- is rebuilt, so the normal category filter hides them.
CREATE TABLE block_flags (
    block_id INTEGER NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    flag     TEXT NOT NULL CHECK (flag IN ('hidden', 'nudity')),
    set_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (block_id, flag)
) WITHOUT ROWID;

-- The practice log (owner Q28): one row per timed session that drew at
-- least one image. Times are Unix seconds (UTC); the UI groups them into
-- local weeks. No streaks are stored or computed.
CREATE TABLE practice_sessions (
    id         INTEGER PRIMARY KEY,
    started_at INTEGER NOT NULL,
    seconds    INTEGER NOT NULL CHECK (seconds >= 0),
    drawings   INTEGER NOT NULL CHECK (drawings >= 0),
    skipped    INTEGER NOT NULL DEFAULT 0 CHECK (skipped >= 0),
    plan       TEXT NOT NULL,
    source     TEXT NOT NULL,
    finished   INTEGER NOT NULL DEFAULT 0 CHECK (finished IN (0, 1))
);

CREATE INDEX practice_sessions_by_time ON practice_sessions (started_at);

-- Which images a session drew (block ids stay valid: blocks are never
-- deleted by a refresh; a missing one is simply skipped when shown).
CREATE TABLE practice_drawn (
    session_id INTEGER NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL,
    block_id   INTEGER NOT NULL,
    seconds    INTEGER NOT NULL CHECK (seconds >= 0),
    PRIMARY KEY (session_id, position)
) WITHOUT ROWID;
