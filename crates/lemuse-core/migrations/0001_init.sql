-- servensurf catalog schema v1. Applied by store::catalog::Catalog::migrate().
-- Rule: never edit a shipped migration; add 000N_*.sql instead.

PRAGMA foreign_keys = ON;

CREATE TABLE collections (
    id              INTEGER PRIMARY KEY,
    connector       TEXT NOT NULL,
    remote_key      TEXT NOT NULL,
    title           TEXT NOT NULL,
    -- High-water mark of remote updated_at seen in the last complete pass.
    watermark       TEXT,
    last_synced_at  TEXT,
    UNIQUE (connector, remote_key)
);

CREATE TABLE blocks (
    id                INTEGER PRIMARY KEY,
    connector         TEXT NOT NULL,
    remote_id         TEXT NOT NULL,
    kind              TEXT NOT NULL,
    title             TEXT,
    description       TEXT,
    content           TEXT,
    page_url          TEXT,
    origin_url        TEXT,
    license_id        TEXT,
    creator           TEXT,
    attribution_text  TEXT,
    non_commercial    INTEGER NOT NULL DEFAULT 0,
    no_ai             INTEGER NOT NULL DEFAULT 0,
    remote_updated_at TEXT,
    fetched_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE (connector, remote_id)
);

CREATE TABLE collection_blocks (
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    block_id      INTEGER NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    position      INTEGER,
    PRIMARY KEY (collection_id, block_id)
);

-- Content-addressed: one row per unique file, shared across blocks.
CREATE TABLE files (
    sha256     TEXT PRIMARY KEY,
    ext        TEXT NOT NULL,
    size_bytes INTEGER NOT NULL
);

CREATE TABLE block_files (
    block_id INTEGER NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    sha256   TEXT NOT NULL REFERENCES files(sha256),
    role     TEXT NOT NULL,
    PRIMARY KEY (block_id, sha256, role)
);

CREATE TABLE tags (
    block_id INTEGER NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    tag      TEXT NOT NULL,
    PRIMARY KEY (block_id, tag)
);

CREATE TABLE sync_runs (
    id           INTEGER PRIMARY KEY,
    started_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    finished_at  TEXT,
    trigger      TEXT NOT NULL,          -- launch | schedule | manual | cli
    status       TEXT NOT NULL,          -- running | ok | partial | failed
    summary_json TEXT
);

-- Full-text search over block text. unicode61 rather than trigram: trigram is
-- still marked experimental and has a reported bug with external-content tables.
CREATE VIRTUAL TABLE blocks_fts USING fts5(
    title, description, content, creator,
    content = 'blocks',
    content_rowid = 'id',
    tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER blocks_ai AFTER INSERT ON blocks BEGIN
    INSERT INTO blocks_fts(rowid, title, description, content, creator)
    VALUES (new.id, new.title, new.description, new.content, new.creator);
END;

CREATE TRIGGER blocks_ad AFTER DELETE ON blocks BEGIN
    INSERT INTO blocks_fts(blocks_fts, rowid, title, description, content, creator)
    VALUES ('delete', old.id, old.title, old.description, old.content, old.creator);
END;

CREATE TRIGGER blocks_au AFTER UPDATE ON blocks BEGIN
    INSERT INTO blocks_fts(blocks_fts, rowid, title, description, content, creator)
    VALUES ('delete', old.id, old.title, old.description, old.content, old.creator);
    INSERT INTO blocks_fts(rowid, title, description, content, creator)
    VALUES (new.id, new.title, new.description, new.content, new.creator);
END;
