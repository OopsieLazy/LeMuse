-- ServeNSurf catalog schema v2 (ADR-0007): streamable media URLs per block.
-- The slideshow displays these straight from the source CDN; files are only
-- stored locally (block_files) when the user saves or in download mode.

CREATE TABLE block_media (
    block_id INTEGER NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    role     TEXT NOT NULL,       -- original | large | medium | small | attachment
    url      TEXT NOT NULL,
    width    INTEGER,
    height   INTEGER,
    PRIMARY KEY (block_id, role)
);
