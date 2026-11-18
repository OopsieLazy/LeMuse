//! SQLite catalog: metadata, collections, tags, file links and FTS5 search.

use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};

use serde::Serialize;

use crate::model::{Block, Collection};
use crate::{Error, Result};

/// Ordered migrations; index + 1 == schema version (`PRAGMA user_version`).
const MIGRATIONS: &[&str] = &[
    include_str!("../../migrations/0001_init.sql"),
    include_str!("../../migrations/0002_stream_media.sql"),
    include_str!("../../migrations/0003_playlists.sql"),
    include_str!("../../migrations/0004_playlist_block_index.sql"),
];

/// Caps that keep a scripted or runaway UI from growing local state without
/// limit (review 0008).
pub const MAX_PLAYLISTS: i64 = 500;
pub const MAX_PLAYLIST_ITEMS: i64 = 20_000;
/// Across all playlists (review 0008 A-33).
pub const MAX_TOTAL_PLAYLIST_ITEMS: i64 = 200_000;

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

/// A playlist as the rail shows it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Playlist {
    pub id: i64,
    pub name: String,
    pub items: u64,
}

pub struct Catalog {
    conn: Connection,
}

/// Picks the best display image per block (large → medium → original) and
/// selects one [`Slide`] row per block. `{blocks}` is a CTE body yielding
/// `(block_id, ord)`; `{order}` the ORDER BY. Both are fixed strings from
/// this file, never user input; all values are bound parameters.
const SLIDES_SQL: &str = "WITH topic_blocks AS ({blocks}),
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
     ORDER BY {order}
     LIMIT ?1 OFFSET ?2";

/// Same selection as [`SLIDES_SQL`], counted. `?1`/`?2` are unused
/// placeholders so collection parameters keep their `?3..` numbering.
const COUNT_SQL: &str = "WITH topic_blocks AS ({blocks})
     SELECT COUNT(*) FROM topic_blocks tb
     WHERE EXISTS (SELECT 1 FROM block_media m WHERE m.block_id = tb.block_id
                   AND m.role IN ('large', 'medium', 'original'))
       AND ?1 IS NOT NULL AND ?2 IS NOT NULL";

const BY_UPDATED: &str = "b.remote_updated_at DESC, b.id DESC";
const BY_ADDED: &str = "tb.ord DESC";
const PLAYLIST_BLOCKS: &str =
    "SELECT block_id, seq AS ord FROM playlist_items WHERE playlist_id = ?3";

/// CTE body for blocks in `n` collections; parameters start at `?3`.
fn collection_blocks(n: usize) -> String {
    let keys = (0..n)
        .map(|i| format!("(?{}, ?{})", i * 2 + 3, i * 2 + 4))
        .collect::<Vec<_>>()
        .join(", ");
    format!(
        "SELECT DISTINCT cb.block_id, NULL AS ord FROM collection_blocks cb
         JOIN collections c ON c.id = cb.collection_id
         WHERE (c.connector, c.remote_key) IN (VALUES {keys})"
    )
}

fn map_slide(r: &rusqlite::Row<'_>) -> rusqlite::Result<Slide> {
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
                 kind = excluded.kind,
                 -- Archive policy (ADR-0013, review 0007 A-29): an update
                 -- never blanks a known title, link or attribution.
                 title = COALESCE(excluded.title, blocks.title),
                 description = COALESCE(excluded.description, blocks.description),
                 content = COALESCE(excluded.content, blocks.content),
                 page_url = COALESCE(excluded.page_url, blocks.page_url),
                 origin_url = COALESCE(excluded.origin_url, blocks.origin_url),
                 license_id = COALESCE(excluded.license_id, blocks.license_id),
                 creator = COALESCE(excluded.creator, blocks.creator),
                 attribution_text = COALESCE(excluded.attribution_text, blocks.attribution_text),
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

        // Media URLs are remote state: replace them when the source sends a
        // new set, but keep the last known set if it sends none (A-29).
        if !b.media.is_empty() {
            tx.execute("DELETE FROM block_media WHERE block_id = ?1", [id])?;
        }
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
        let sql = SLIDES_SQL
            .replace("{blocks}", &collection_blocks(collections.len()))
            .replace("{order}", BY_UPDATED);
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
            .query_map(args.as_slice(), map_slide)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    /// How many slides [`Catalog::slides`] would return, without loading
    /// them (review 0003 D-19).
    pub fn count_slides<S: AsRef<str>>(&self, collections: &[(S, S)]) -> Result<u64> {
        if collections.is_empty() {
            return Ok(0);
        }
        let sql = COUNT_SQL.replace("{blocks}", &collection_blocks(collections.len()));
        let flat: Vec<&str> = collections
            .iter()
            .flat_map(|(connector, key)| [connector.as_ref(), key.as_ref()])
            .collect();
        let mut args: Vec<&dyn rusqlite::ToSql> = vec![&0, &0];
        for s in &flat {
            args.push(s);
        }
        Ok(self
            .conn
            .query_row(&sql, args.as_slice(), |r| r.get::<_, i64>(0))? as u64)
    }

    // ── Playlists: local state (ADR-0014) ───────────────────────────────

    pub fn playlists(&self) -> Result<Vec<Playlist>> {
        let mut stmt = self.conn.prepare(
            "SELECT p.id, p.name,
                    (SELECT COUNT(*) FROM playlist_items i WHERE i.playlist_id = p.id)
             FROM playlists p ORDER BY p.name COLLATE NOCASE, p.id",
        )?;
        let rows = stmt
            .query_map([], |r| {
                Ok(Playlist {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    items: r.get::<_, i64>(2)? as u64,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    fn check_playlist_name(&self, name: &str, except: Option<i64>) -> Result<()> {
        crate::config::check_name("playlist", name)?;
        let taken: bool = self.conn.query_row(
            "SELECT EXISTS (SELECT 1 FROM playlists
                            WHERE name = ?1 COLLATE NOCASE AND id IS NOT ?2)",
            params![name, except],
            |r| r.get(0),
        )?;
        if taken {
            return Err(Error::Config(format!(
                "there's already a playlist named `{name}`"
            )));
        }
        Ok(())
    }

    pub fn create_playlist(&self, name: &str) -> Result<Playlist> {
        self.check_playlist_name(name, None)?;
        let n: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM playlists", [], |r| r.get(0))?;
        if n >= MAX_PLAYLISTS {
            return Err(Error::Config(format!("at most {MAX_PLAYLISTS} playlists")));
        }
        self.conn
            .execute("INSERT INTO playlists (name) VALUES (?1)", [name])?;
        Ok(Playlist {
            id: self.conn.last_insert_rowid(),
            name: name.to_string(),
            items: 0,
        })
    }

    pub fn rename_playlist(&self, id: i64, name: &str) -> Result<bool> {
        self.check_playlist_name(name, Some(id))?;
        Ok(self.conn.execute(
            "UPDATE playlists SET name = ?2 WHERE id = ?1",
            params![id, name],
        )? > 0)
    }

    /// Delete a playlist and its item rows. The images stay in the catalog.
    pub fn delete_playlist(&self, id: i64) -> Result<bool> {
        Ok(self
            .conn
            .execute("DELETE FROM playlists WHERE id = ?1", [id])?
            > 0)
    }

    /// Put a block in a playlist (it goes to the front) or take it out.
    /// Idempotent. Unknown playlist or block ids are refused by foreign keys.
    pub fn set_in_playlist(&self, playlist_id: i64, block_id: i64, present: bool) -> Result<()> {
        if !present {
            self.conn.execute(
                "DELETE FROM playlist_items WHERE playlist_id = ?1 AND block_id = ?2",
                params![playlist_id, block_id],
            )?;
            return Ok(());
        }
        let (count, next): (i64, i64) = self.conn.query_row(
            "SELECT COUNT(*), COALESCE(MAX(seq), 0) + 1 FROM playlist_items
             WHERE playlist_id = ?1",
            [playlist_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;
        let total: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM playlist_items", [], |r| r.get(0))?;
        if total >= MAX_TOTAL_PLAYLIST_ITEMS {
            return Err(Error::Config(format!(
                "playlists hold at most {MAX_TOTAL_PLAYLIST_ITEMS} images in all"
            )));
        }
        if count >= MAX_PLAYLIST_ITEMS {
            return Err(Error::Config(format!(
                "a playlist holds at most {MAX_PLAYLIST_ITEMS} images"
            )));
        }
        self.conn.execute(
            "INSERT OR IGNORE INTO playlist_items (playlist_id, block_id, seq)
             VALUES (?1, ?2, ?3)",
            params![playlist_id, block_id, next],
        )?;
        Ok(())
    }

    /// Ids of the playlists that contain `block_id`.
    pub fn playlists_with(&self, block_id: i64) -> Result<Vec<i64>> {
        let mut stmt = self.conn.prepare(
            "SELECT playlist_id FROM playlist_items WHERE block_id = ?1 ORDER BY playlist_id",
        )?;
        let ids = stmt
            .query_map([block_id], |r| r.get(0))?
            .collect::<std::result::Result<Vec<i64>, _>>()?;
        Ok(ids)
    }

    /// A playlist's slides, most recently added first.
    pub fn playlist_slides(&self, playlist_id: i64, limit: u32, offset: u32) -> Result<Vec<Slide>> {
        let sql = SLIDES_SQL
            .replace("{blocks}", PLAYLIST_BLOCKS)
            .replace("{order}", BY_ADDED);
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt
            .query_map(params![limit, offset, playlist_id], map_slide)?
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

    /// Review 0007 A-29: an update that arrives without an image or
    /// attribution must not erase what the catalog already knows.
    #[test]
    fn update_without_media_or_creator_keeps_last_known_values() {
        let mut c = Catalog::open_in_memory().unwrap();
        let mut first = sample("7", "Lamp");
        first.license.creator = Some("A. Maker".into());
        first.source.page_url = Some("https://www.are.na/block/7".into());
        let id = c.upsert_block(&first).unwrap();
        let mut sparse = sample("7", "Lamp");
        sparse.media.clear();
        sparse.license.creator = None;
        sparse.source.page_url = None;
        sparse.title = None;
        c.upsert_block(&sparse).unwrap();
        let (creator, page, title): (Option<String>, Option<String>, Option<String>) = c
            .conn
            .query_row(
                "SELECT creator, page_url, title FROM blocks WHERE id = ?1",
                [id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .unwrap();
        assert_eq!(creator.as_deref(), Some("A. Maker"));
        assert_eq!(page.as_deref(), Some("https://www.are.na/block/7"));
        assert_eq!(title.as_deref(), Some("Lamp"));
        let media: i64 = c
            .conn
            .query_row(
                "SELECT COUNT(*) FROM block_media WHERE block_id = ?1",
                [id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(media, 2);
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

    /// Review 0008: the bundled SQLite must include the 2026 fixes
    /// (FTS5 CVE-2026-11822/11824 in 3.53.2; RUSTSEC-2026-0459 in 3.54.0).
    #[test]
    fn bundled_sqlite_has_the_2026_fixes() {
        let c = Catalog::open_in_memory().unwrap();
        let v: String = c
            .conn
            .query_row("SELECT sqlite_version()", [], |r| r.get(0))
            .unwrap();
        let parts: Vec<u32> = v.split('.').map(|p| p.parse().unwrap()).collect();
        assert!(parts >= vec![3, 54, 0], "bundled SQLite {v} is too old");
    }

    #[test]
    fn counts_match_slides() {
        let mut c = Catalog::open_in_memory().unwrap();
        let a = collection(&c, "a");
        let mut text = sample("3", "Text block");
        text.media.clear();
        for b in [sample("1", "x"), sample("2", "y"), text] {
            let id = c.upsert_block(&b).unwrap();
            c.link_block(a, id, None).unwrap();
        }
        assert_eq!(c.count_slides(&[("arena", "a")]).unwrap(), 2);
        assert_eq!(c.slides(&[("arena", "a")], 100, 0).unwrap().len(), 2);
        assert_eq!(c.count_slides::<&str>(&[]).unwrap(), 0);
    }

    #[test]
    fn playlists_keep_order_and_survive_refresh() {
        let mut c = Catalog::open_in_memory().unwrap();
        let id1 = c.upsert_block(&sample("1", "Chair")).unwrap();
        let id2 = c.upsert_block(&sample("2", "Lamp")).unwrap();
        let p = c.create_playlist("Studio picks").unwrap();
        c.set_in_playlist(p.id, id1, true).unwrap();
        c.set_in_playlist(p.id, id2, true).unwrap();
        c.set_in_playlist(p.id, id1, true).unwrap(); // idempotent
        let order: Vec<i64> = c
            .playlist_slides(p.id, 10, 0)
            .unwrap()
            .iter()
            .map(|s| s.block_id)
            .collect();
        assert_eq!(order, [id2, id1]); // newest addition first
                                       // A refresh rewrites the block's remote state; the playlist is untouched.
        let mut refreshed = sample("1", "Chair, retitled");
        refreshed.files.clear();
        c.upsert_block(&refreshed).unwrap();
        assert_eq!(c.playlist_slides(p.id, 10, 0).unwrap().len(), 2);
        assert_eq!(c.playlists_with(id1).unwrap(), [p.id]);
        assert_eq!(c.playlists().unwrap()[0].items, 2);
        c.set_in_playlist(p.id, id1, false).unwrap();
        assert_eq!(c.playlists_with(id1).unwrap(), Vec::<i64>::new());
        assert!(c.delete_playlist(p.id).unwrap());
        assert!(c.playlists().unwrap().is_empty());
        assert_eq!(c.block_count().unwrap(), 2); // images stay in the catalog
    }

    #[test]
    fn playlist_names_and_ids_are_validated() {
        let mut c = Catalog::open_in_memory().unwrap();
        let p = c.create_playlist("Lamps").unwrap();
        assert!(c.create_playlist("lamps").is_err()); // case-insensitive unique
        for bad in ["", " Lamps", "a\nb", &"n".repeat(61)] {
            assert!(c.create_playlist(bad).is_err(), "{bad:?}");
        }
        // Markup is just a name; the UI renders it as text.
        assert!(c
            .create_playlist("<b>bold</b>'; DROP TABLE blocks;--")
            .is_ok());
        assert!(c.rename_playlist(p.id, "Lights").unwrap());
        assert!(!c.rename_playlist(9999, "Other").unwrap());
        // Unknown ids are refused by foreign keys, not silently stored.
        assert!(c.set_in_playlist(p.id, 424242, true).is_err());
        let id = c.upsert_block(&sample("1", "x")).unwrap();
        assert!(c.set_in_playlist(9999, id, true).is_err());
        assert_eq!(c.block_count().unwrap(), 1);
    }
}
