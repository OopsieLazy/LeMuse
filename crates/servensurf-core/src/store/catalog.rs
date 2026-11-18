//! SQLite catalog: metadata, collections, tags, file links and FTS5 search.

use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};

use serde::Serialize;

use crate::model::{Block, Collection};
use crate::Result;

/// Ordered migrations; index + 1 == schema version (`PRAGMA user_version`).
const MIGRATIONS: &[&str] = &[
    include_str!("../../migrations/0001_init.sql"),
    include_str!("../../migrations/0002_stream_media.sql"),
];

/// One slideshow frame (ADR-0007). `display_url` is streamed from the source
/// CDN; `saved` says whether an original is already in the local store.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Slide {
    pub block_id: i64,
    pub title: Option<String>,
    pub display_url: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub page_url: Option<String>,
    pub creator: Option<String>,
    pub attribution: Option<String>,
    pub saved: bool,
}

pub struct Catalog {
    conn: Connection,
}

impl Catalog {
    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        let mut c = Self { conn };
        c.migrate()?;
        Ok(c)
    }

    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        let mut c = Self { conn };
        c.migrate()?;
        Ok(c)
    }

    pub fn schema_version(&self) -> Result<u32> {
        Ok(self
            .conn
            .pragma_query_value(None, "user_version", |r| r.get(0))?)
    }

    fn migrate(&mut self) -> Result<()> {
        let current = self.schema_version()? as usize;
        for (i, sql) in MIGRATIONS.iter().enumerate().skip(current) {
            let tx = self.conn.transaction()?;
            tx.execute_batch(sql)?;
            tx.pragma_update(None, "user_version", (i + 1) as u32)?;
            tx.commit()?;
        }
        Ok(())
    }

    pub fn upsert_collection(&self, c: &Collection) -> Result<i64> {
        self.conn.execute(
            "INSERT INTO collections (connector, remote_key, title) VALUES (?1, ?2, ?3)
             ON CONFLICT (connector, remote_key) DO UPDATE SET title = excluded.title",
            params![c.connector, c.remote_key, c.title],
        )?;
        Ok(self.conn.query_row(
            "SELECT id FROM collections WHERE connector = ?1 AND remote_key = ?2",
            params![c.connector, c.remote_key],
            |r| r.get(0),
        )?)
    }

    /// An already-known collection, so a refresh can skip the remote lookup.
    pub fn find_collection(&self, connector: &str, remote_key: &str) -> Result<Option<Collection>> {
        Ok(self
            .conn
            .query_row(
                "SELECT id, title FROM collections WHERE connector = ?1 AND remote_key = ?2",
                params![connector, remote_key],
                |r| {
                    Ok(Collection {
                        id: Some(r.get(0)?),
                        connector: connector.to_string(),
                        remote_key: remote_key.to_string(),
                        title: r.get(1)?,
                    })
                },
            )
            .optional()?)
    }

    /// Was this collection refreshed within the last `hours` hours?
    pub fn synced_within(&self, connector: &str, remote_key: &str, hours: u32) -> Result<bool> {
        Ok(self.conn.query_row(
            "SELECT COUNT(*) FROM collections
                 WHERE connector = ?1 AND remote_key = ?2 AND last_synced_at IS NOT NULL
                   AND last_synced_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?3)",
            params![connector, remote_key, format!("-{hours} hours")],
            |r| r.get::<_, i64>(0),
        )? > 0)
    }

    /// Mark a collection refreshed now without touching its watermark
    /// (relevance-ordered sources have no watermark).
    pub fn touch_synced(&self, collection_id: i64) -> Result<()> {
        self.conn.execute(
            "UPDATE collections SET last_synced_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
             WHERE id = ?1",
            [collection_id],
        )?;
        Ok(())
    }

    pub fn watermark(&self, collection_id: i64) -> Result<Option<String>> {
        Ok(self
            .conn
            .query_row(
                "SELECT watermark FROM collections WHERE id = ?1",
                [collection_id],
                |r| r.get(0),
            )
            .optional()?
            .flatten())
    }

    pub fn set_watermark(&self, collection_id: i64, watermark: Option<&str>) -> Result<()> {
        self.conn.execute(
            "UPDATE collections SET watermark = ?2,
                 last_synced_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
             WHERE id = ?1",
            params![collection_id, watermark],
        )?;
        Ok(())
    }

    /// The stored remote `updated_at` for a block, if we have it.
    pub fn remote_updated_at(&self, connector: &str, remote_id: &str) -> Result<Option<String>> {
        Ok(self
            .conn
            .query_row(
                "SELECT remote_updated_at FROM blocks WHERE connector = ?1 AND remote_id = ?2",
                params![connector, remote_id],
                |r| r.get(0),
            )
            .optional()?
            .flatten())
    }

    /// Insert or update a block (idempotent on `(connector, remote_id)`),
    /// replacing its tags and file links. Returns the local id.
    pub fn upsert_block(&mut self, b: &Block) -> Result<i64> {
        let tx = self.conn.transaction()?;
        tx.execute(
            "INSERT INTO blocks (connector, remote_id, kind, title, description, content,
                 page_url, origin_url, license_id, creator, attribution_text,
                 non_commercial, no_ai, remote_updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
             ON CONFLICT (connector, remote_id) DO UPDATE SET
                 kind = excluded.kind, title = excluded.title,
                 description = excluded.description, content = excluded.content,
                 page_url = excluded.page_url, origin_url = excluded.origin_url,
                 license_id = excluded.license_id, creator = excluded.creator,
                 attribution_text = excluded.attribution_text,
                 non_commercial = excluded.non_commercial, no_ai = excluded.no_ai,
                 remote_updated_at = excluded.remote_updated_at,
                 fetched_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')",
            params![
                b.source.connector,
                b.source.remote_id,
                b.kind.as_str(),
                b.title,
                b.description,
                b.content,
                b.source.page_url,
                b.source.origin_url,
                b.license.license_id,
                b.license.creator,
                b.license.attribution_text,
                b.license.non_commercial,
                b.license.no_ai,
                b.remote_updated_at,
            ],
        )?;
        let id: i64 = tx.query_row(
            "SELECT id FROM blocks WHERE connector = ?1 AND remote_id = ?2",
            params![b.source.connector, b.source.remote_id],
            |r| r.get(0),
        )?;

        tx.execute("DELETE FROM tags WHERE block_id = ?1", [id])?;
        for tag in &b.tags {
            tx.execute(
                "INSERT OR IGNORE INTO tags (block_id, tag) VALUES (?1, ?2)",
                params![id, tag],
            )?;
        }

        // Media URLs are remote state: replace them on every update.
        tx.execute("DELETE FROM block_media WHERE block_id = ?1", [id])?;
        for m in &b.media {
            tx.execute(
                "INSERT OR REPLACE INTO block_media (block_id, role, url, width, height)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, m.role, m.url, m.width, m.height],
            )?;
        }

        // Saved files are local state: only ever added here, never removed,
        // so a stream-mode refresh (empty `files`) can't unlink a file the
        // user saved (review D-9).
        for f in &b.files {
            tx.execute(
                "INSERT OR IGNORE INTO files (sha256, ext, size_bytes) VALUES (?1, ?2, ?3)",
                params![f.sha256, f.ext, f.size_bytes as i64],
            )?;
            tx.execute(
                "INSERT OR IGNORE INTO block_files (block_id, sha256, role) VALUES (?1, ?2, ?3)",
                params![id, f.sha256, f.role],
            )?;
        }
        tx.commit()?;
        Ok(id)
    }

    pub fn link_block(
        &self,
        collection_id: i64,
        block_id: i64,
        position: Option<i64>,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO collection_blocks (collection_id, block_id, position) VALUES (?1, ?2, ?3)
             ON CONFLICT (collection_id, block_id) DO UPDATE SET position = excluded.position",
            params![collection_id, block_id, position],
        )?;
        Ok(())
    }

    /// Full-text search; returns matching local block ids, best first.
    /// User input is treated as plain words (see [`fts_query`]), never as
    /// FTS5 syntax, so stray quotes or dashes can't cause query errors.
    pub fn search(&self, query: &str, limit: u32) -> Result<Vec<i64>> {
        let query = fts_query(query);
        if query.is_empty() {
            return Ok(Vec::new());
        }
        let mut stmt = self.conn.prepare(
            "SELECT rowid FROM blocks_fts WHERE blocks_fts MATCH ?1 ORDER BY rank LIMIT ?2",
        )?;
        let ids = stmt
            .query_map(params![query, limit], |r| r.get(0))?
            .collect::<std::result::Result<Vec<i64>, _>>()?;
        Ok(ids)
    }

    /// Slides for a topic: displayable blocks from the given collections,
    /// newest-updated first (the UI shuffles if the topic asks for it).
    /// `collections` are `(connector, remote_key)` pairs from the topic's
    /// sources. Display image preference: large → medium → original.
    pub fn slides<S: AsRef<str>>(
        &self,
        collections: &[(S, S)],
        limit: u32,
        offset: u32,
    ) -> Result<Vec<Slide>> {
        if collections.is_empty() {
            return Ok(Vec::new());
        }
        let keys = (0..collections.len())
            .map(|i| format!("(?{}, ?{})", i * 2 + 3, i * 2 + 4))
            .collect::<Vec<_>>()
            .join(", ");
        let sql = format!(
            "WITH topic_blocks AS (
                 SELECT DISTINCT cb.block_id FROM collection_blocks cb
                 JOIN collections c ON c.id = cb.collection_id
                 WHERE (c.connector, c.remote_key) IN (VALUES {keys})
             ),
             display AS (
                 SELECT block_id, url, width, height,
                        ROW_NUMBER() OVER (PARTITION BY block_id ORDER BY
                            CASE role WHEN 'large' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END) AS pick
                 FROM block_media WHERE role IN ('large', 'medium', 'original')
             )
             SELECT b.id, b.title, d.url, d.width, d.height, b.page_url, b.creator,
                    b.attribution_text,
                    EXISTS (SELECT 1 FROM block_files f WHERE f.block_id = b.id) AS saved
             FROM topic_blocks tb
             JOIN blocks b ON b.id = tb.block_id
             JOIN display d ON d.block_id = b.id AND d.pick = 1
             ORDER BY b.remote_updated_at DESC, b.id DESC
             LIMIT ?1 OFFSET ?2"
        );
        let flat: Vec<&str> = collections
            .iter()
            .flat_map(|(connector, key)| [connector.as_ref(), key.as_ref()])
            .collect();
        let mut args: Vec<&dyn rusqlite::ToSql> = vec![&limit, &offset];
        for s in &flat {
            args.push(s);
        }
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt
            .query_map(args.as_slice(), |r| {
                Ok(Slide {
                    block_id: r.get(0)?,
                    title: r.get(1)?,
                    display_url: r.get(2)?,
                    width: r.get(3)?,
                    height: r.get(4)?,
                    page_url: r.get(5)?,
                    creator: r.get(6)?,
                    attribution: r.get(7)?,
                    saved: r.get(8)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn block_count(&self) -> Result<u64> {
        Ok(self
            .conn
            .query_row("SELECT COUNT(*) FROM blocks", [], |r| r.get::<_, i64>(0))?
            as u64)
    }

    /// Record a new run. Callers hold the sync lock, so any row still
    /// `running` belongs to a process that died mid-run (e.g. the app was
    /// closed during a refresh); mark it `interrupted` (review 0003 D-26).
    pub fn start_run(&self, trigger: &str) -> Result<i64> {
        self.conn.execute(
            "UPDATE sync_runs SET status = 'interrupted' WHERE status = 'running'",
            [],
        )?;
        self.conn.execute(
            "INSERT INTO sync_runs (trigger, status) VALUES (?1, 'running')",
            [trigger],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn finish_run(&self, run_id: i64, status: &str, summary_json: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE sync_runs SET status = ?2, summary_json = ?3,
                 finished_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
             WHERE id = ?1",
            params![run_id, status, summary_json],
        )?;
        Ok(())
    }
}

/// Turn free text into a safe FTS5 query: each whitespace-separated word
/// becomes a quoted prefix term (`"gear"*`), ANDed together (review D-7).
pub fn fts_query(input: &str) -> String {
    input
        .split_whitespace()
        .map(|w| format!("\"{}\"*", w.replace('"', "\"\"")))
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{BlockKind, LicenseInfo, MediaRef, SourceRef, StoredFile};

    #[test]
    fn search_tolerates_fts_syntax_in_user_input() {
        let mut c = Catalog::open_in_memory().unwrap();
        let id = c.upsert_block(&sample("1", "Gearbox housing")).unwrap();
        assert_eq!(c.search("gear", 10).unwrap(), vec![id]); // prefix match
        assert!(c.search("\"unbalanced -NOT (", 10).unwrap().is_empty());
        assert!(c.search("   ", 10).unwrap().is_empty());
        assert_eq!(fts_query("a \"b"), "\"a\"* \"\"\"b\"*");
    }

    fn sample(remote_id: &str, title: &str) -> Block {
        Block {
            id: None,
            source: SourceRef {
                connector: "arena".into(),
                remote_id: remote_id.into(),
                page_url: None,
                origin_url: None,
            },
            kind: BlockKind::Image,
            title: Some(title.into()),
            description: Some("isometric exploded view".into()),
            content: None,
            tags: vec!["cad".into()],
            license: LicenseInfo::default(),
            media: vec![
                media("original", "https://cdn.invalid/o.jpg"),
                media("large", "https://images.invalid/l.jpg"),
            ],
            files: vec![StoredFile {
                sha256: "ab".repeat(32),
                ext: "jpg".into(),
                size_bytes: 10,
                role: "original".into(),
            }],
            remote_updated_at: Some("2026-11-01T00:00:00Z".into()),
        }
    }

    fn media(role: &str, url: &str) -> MediaRef {
        MediaRef {
            role: role.into(),
            url: url.into(),
            width: Some(100),
            height: None,
        }
    }

    fn collection(c: &Catalog, key: &str) -> i64 {
        c.upsert_collection(&Collection {
            id: None,
            connector: "arena".into(),
            remote_key: key.into(),
            title: key.into(),
        })
        .unwrap()
    }

    #[test]
    fn slides_prefer_large_and_scope_to_topic_collections() {
        let mut c = Catalog::open_in_memory().unwrap();
        let a = collection(&c, "a");
        let b = collection(&c, "b");

        let mut only_original = sample("2", "Original only");
        only_original.media = vec![media("original", "https://cdn.invalid/2.jpg")];
        only_original.files.clear();
        only_original.remote_updated_at = Some("2026-11-02T00:00:00Z".into());
        let mut text = sample("3", "Text block");
        text.media.clear();

        let id1 = c.upsert_block(&sample("1", "Gearbox")).unwrap();
        let id2 = c.upsert_block(&only_original).unwrap();
        let id3 = c.upsert_block(&text).unwrap();
        let id4 = c.upsert_block(&sample("4", "Other topic")).unwrap();
        for id in [id1, id2, id3] {
            c.link_block(a, id, None).unwrap();
        }
        c.link_block(b, id4, None).unwrap();

        let slides = c.slides(&[("arena", "a")], 10, 0).unwrap();
        // Text block has no image → excluded; newest first.
        assert_eq!(
            slides.iter().map(|s| s.block_id).collect::<Vec<_>>(),
            [id2, id1]
        );
        assert_eq!(slides[0].display_url, "https://cdn.invalid/2.jpg");
        assert!(!slides[0].saved);
        assert_eq!(slides[1].display_url, "https://images.invalid/l.jpg");
        assert!(slides[1].saved);

        assert_eq!(
            c.slides(&[("arena", "a"), ("arena", "b")], 10, 0)
                .unwrap()
                .len(),
            3
        );
        assert_eq!(c.slides(&[("arena", "a")], 1, 1).unwrap()[0].block_id, id1);
        assert!(c.slides::<&str>(&[], 10, 0).unwrap().is_empty());
    }

    #[test]
    fn stream_refresh_keeps_saved_files() {
        let mut c = Catalog::open_in_memory().unwrap();
        let id = c.upsert_block(&sample("1", "Saved")).unwrap();
        let mut refreshed = sample("1", "Saved, retitled remotely");
        refreshed.files.clear(); // stream mode brings no files
        c.upsert_block(&refreshed).unwrap();
        let a = collection(&c, "a");
        c.link_block(a, id, None).unwrap();
        assert!(c.slides(&[("arena", "a")], 10, 0).unwrap()[0].saved);
    }

    #[test]
    fn migrates_to_latest_version() {
        let c = Catalog::open_in_memory().unwrap();
        assert_eq!(c.schema_version().unwrap() as usize, MIGRATIONS.len());
    }

    #[test]
    fn upsert_is_idempotent_and_searchable() {
        let mut c = Catalog::open_in_memory().unwrap();
        let id1 = c.upsert_block(&sample("1", "Gearbox housing")).unwrap();
        let id2 = c.upsert_block(&sample("1", "Gearbox housing v2")).unwrap();
        assert_eq!(id1, id2);
        assert_eq!(c.block_count().unwrap(), 1);
        assert_eq!(c.search("gearbox", 10).unwrap(), vec![id1]);
        assert_eq!(c.search("exploded", 10).unwrap(), vec![id1]);
        assert!(c.search("chair", 10).unwrap().is_empty());
    }

    #[test]
    fn watermark_round_trips() {
        let c = Catalog::open_in_memory().unwrap();
        let col = c
            .upsert_collection(&Collection {
                id: None,
                connector: "arena".into(),
                remote_key: "refs".into(),
                title: "Refs".into(),
            })
            .unwrap();
        assert_eq!(c.watermark(col).unwrap(), None);
        c.set_watermark(col, Some("2026-11-16T00:00:00Z")).unwrap();
        assert_eq!(
            c.watermark(col).unwrap().as_deref(),
            Some("2026-11-16T00:00:00Z")
        );
    }

    #[test]
    fn start_run_marks_orphaned_runs_interrupted() {
        let cat = Catalog::open_in_memory().unwrap();
        let orphan = cat.start_run("launch").unwrap(); // process "killed" here
        let next = cat.start_run("manual").unwrap();
        let status = |id: i64| -> String {
            cat.conn
                .query_row("SELECT status FROM sync_runs WHERE id = ?1", [id], |r| {
                    r.get(0)
                })
                .unwrap()
        };
        assert_eq!(status(orphan), "interrupted");
        assert_eq!(status(next), "running");
    }
}
