-- LeMuse catalog schema v7 (ADR-0022 addendum): re-saves shown once.
-- Are.na users often save the same picture again as a new block. Image
-- blocks from the same source image address with the same pixel size are one
-- group; topics and All show one block per group. Derived data, rebuilt
-- after every refresh like block_categories. Playlists show what you added.

CREATE TABLE block_dupes (
    block_id INTEGER PRIMARY KEY REFERENCES blocks(id) ON DELETE CASCADE,
    grp      INTEGER NOT NULL
);

CREATE INDEX block_dupes_by_grp ON block_dupes (grp);
