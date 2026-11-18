-- LeMuse catalog schema v6 (ADR-0017): whole channels over several refreshes.
-- When a refresh's page budget stops a pass early, the next page's cursor and
-- the newest updated_at that pass saw are kept here; the next refresh resumes.
-- Remote sync state, like the watermark; cleared when the pass completes.

ALTER TABLE collections ADD COLUMN resume_cursor TEXT;
ALTER TABLE collections ADD COLUMN pass_newest TEXT;
