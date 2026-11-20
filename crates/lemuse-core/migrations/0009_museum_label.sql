-- LeMuse catalog schema v9 (ADR-0029): a museum-style label. Remote state,
-- filled by connectors that know these fields (Cleveland), kept by the
-- archive policy (an update never blanks a known value).
ALTER TABLE blocks ADD COLUMN date_text TEXT;
ALTER TABLE blocks ADD COLUMN medium TEXT;
ALTER TABLE blocks ADD COLUMN dimensions TEXT;
ALTER TABLE blocks ADD COLUMN credit_line TEXT;

-- Museum records stored before v9 have none of these. Forget when they were
-- last seen so the next refresh reads them once more (one page per search,
-- inside the museum's weekly budget). Nothing else changes.
UPDATE blocks SET remote_updated_at = NULL WHERE connector = 'cleveland';
UPDATE collections SET last_synced_at = NULL WHERE connector = 'cleveland';
