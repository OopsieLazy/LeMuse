-- "Which playlists hold this image?" (the playlist menu) without a full
-- scan of playlist_items. Review 0008 A-33.
CREATE INDEX playlist_items_by_block ON playlist_items (block_id);
