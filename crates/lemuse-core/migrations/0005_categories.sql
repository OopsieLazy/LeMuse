-- LeMuse catalog schema v5 (ADR-0015): categories LeMuse assigns itself.
-- Derived data, like thumbs/: rebuilt from blocks and the built-in vocabulary
-- (assets/categories.toml) after every refresh and when the vocabulary
-- changes. Not local state; nothing here is typed by the user.

CREATE TABLE block_categories (
    block_id INTEGER NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    PRIMARY KEY (block_id, category)
) WITHOUT ROWID;

CREATE INDEX block_categories_by_category ON block_categories (category, block_id);

-- Rebuilding reads each block's channel names; without this, every block
-- scanned all of collection_blocks.
CREATE INDEX collection_blocks_by_block ON collection_blocks (block_id);

-- Bookkeeping for derived tables (e.g. which vocabulary built them).
CREATE TABLE derived_state (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
