//! SQLite catalog: metadata, collections, tags, file links and FTS5 search.

use std::path::Path;

use rusqlite::types::Value;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension};

use serde::Serialize;

use crate::categories::{self, Matcher, Vocabulary};
use crate::model::{Block, Collection};
use crate::{Error, Result};

/// Ordered migrations; index + 1 == schema version (`PRAGMA user_version`).
const MIGRATIONS: &[&str] = &[
    include_str!("../../migrations/0001_init.sql"),
    include_str!("../../migrations/0002_stream_media.sql"),
    include_str!("../../migrations/0003_playlists.sql"),
    include_str!("../../migrations/0004_playlist_block_index.sql"),
    include_str!("../../migrations/0005_categories.sql"),
    include_str!("../../migrations/0006_resume_cursor.sql"),
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
    /// Category ids LeMuse assigned (ADR-0015), sorted.
    pub categories: Vec<String>,
    /// Connector id (`arena`, `cleveland`): Are.na images offer
    /// "Related channels".
    pub connector: String,
    /// Full-size image link, if the source gave one (Copy link, Save).
    pub original_url: Option<String>,
    /// The block's other stored image sizes, best first: tried in turn when
    /// `display_url` fails before the slide is skipped (ADR-0016).
    pub fallback_urls: Vec<String>,
}

/// Every stored link of one image, for `lemuse export-links` (ADR-0016).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct LinkRow {
    pub block_id: i64,
    pub connector: String,
    pub title: Option<String>,
    pub creator: Option<String>,
    /// The image's page on its source (Are.na block, museum object).
    pub page_url: Option<String>,
    /// Where the item was originally saved from (Are.na `source.url`).
    pub origin_url: Option<String>,
    /// `(role, url)` for every stored size: original, large, medium, small.
    pub images: Vec<(String, String)>,
}

/// Which images a query covers: some collections (a topic, or "All"), or
/// one playlist.
#[derive(Debug, Clone)]
pub enum Scope<'a> {
    Collections(Vec<(&'a str, &'a str)>),
    Playlist(i64),
}

impl<'a> Scope<'a> {
    pub fn collections<S: AsRef<str>>(keys: &'a [(S, S)]) -> Self {
        Scope::Collections(keys.iter().map(|(c, k)| (c.as_ref(), k.as_ref())).collect())
    }

    fn is_empty_collections(&self) -> bool {
        matches!(self, Scope::Collections(k) if k.is_empty())
    }
}

/// Most categories one filter may name on each side.
pub const MAX_FILTER_CATEGORIES: usize = 24;

/// A genre-style filter (ADR-0015): images must be in every `include`
/// category and in none of the `exclude` ones. Ids are checked against the
/// built-in vocabulary before they reach SQL, where they are bound values.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, serde::Deserialize)]
pub struct CategoryFilter {
    #[serde(default)]
    pub include: Vec<String>,
    #[serde(default)]
    pub exclude: Vec<String>,
}

impl CategoryFilter {
    pub fn check(&self) -> Result<()> {
        if self.include.len() > MAX_FILTER_CATEGORIES || self.exclude.len() > MAX_FILTER_CATEGORIES
        {
            return Err(Error::Config(format!(
                "a filter names at most {MAX_FILTER_CATEGORIES} categories on each side"
            )));
        }
        if !self
            .include
            .iter()
            .chain(&self.exclude)
            .all(|id| categories::is_known(id))
        {
            return Err(Error::Config("unknown category in filter".into()));
        }
        if self.include.iter().any(|i| self.exclude.contains(i)) {
            return Err(Error::Config(
                "a category can't be both included and excluded".into(),
            ));
        }
        Ok(())
    }

    pub fn is_empty(&self) -> bool {
        self.include.is_empty() && self.exclude.is_empty()
    }
}

/// How many images of a scope (after the filter) are in one category.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct CategoryCount {
    pub id: String,
    pub count: u64,
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
            EXISTS (SELECT 1 FROM block_files f WHERE f.block_id = b.id) AS saved,
            (SELECT group_concat(bc.category, ',') FROM block_categories bc
             WHERE bc.block_id = b.id) AS cats,
            b.connector,
            (SELECT o.url FROM block_media o WHERE o.block_id = b.id AND o.role = 'original') AS original,
            (SELECT group_concat(f.url, char(10)) FROM
                (SELECT m.url FROM block_media m
                 WHERE m.block_id = b.id AND m.url <> d.url
                   AND m.role IN ('large', 'medium', 'original', 'small')
                 ORDER BY CASE m.role WHEN 'large' THEN 0 WHEN 'medium' THEN 1
                                      WHEN 'original' THEN 2 ELSE 3 END) f) AS fallbacks
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

/// CTE body for blocks in `n` collections; parameters start at `?first`.
fn collection_blocks(n: usize, first: usize) -> String {
    let keys = (0..n)
        .map(|i| format!("(?{}, ?{})", first + i * 2, first + i * 2 + 1))
        .collect::<Vec<_>>()
        .join(", ");
    format!(
        "SELECT DISTINCT cb.block_id, NULL AS ord FROM collection_blocks cb
         JOIN collections c ON c.id = cb.collection_id
         WHERE (c.connector, c.remote_key) IN (VALUES {keys})"
    )
}

/// The `topic_blocks` CTE body for a scope and filter, plus its bound
/// values (numbered from `?3`; `?1`/`?2` are LIMIT and OFFSET). Only fixed
/// SQL from this file is spliced; every id and key is a bound value.
fn scope_sql(scope: &Scope<'_>, filter: &CategoryFilter) -> (String, Vec<Value>) {
    let mut values: Vec<Value> = Vec::new();
    let base = match scope {
        Scope::Collections(keys) => {
            for (c, k) in keys {
                values.push(Value::Text((*c).to_string()));
                values.push(Value::Text((*k).to_string()));
            }
            collection_blocks(keys.len(), 3)
        }
        Scope::Playlist(id) => {
            values.push(Value::Integer(*id));
            PLAYLIST_BLOCKS.to_string()
        }
    };
    let mut conds = Vec::new();
    for (ids, negate) in [(&filter.include, ""), (&filter.exclude, "NOT ")] {
        for id in ids {
            values.push(Value::Text(id.clone()));
            conds.push(format!(
                "{negate}EXISTS (SELECT 1 FROM block_categories bc
                 WHERE bc.block_id = s.block_id AND bc.category = ?{})",
                values.len() + 2
            ));
        }
    }
    let cond = if conds.is_empty() {
        "1".to_string()
    } else {
        conds.join(" AND ")
    };
    (
        format!("SELECT s.block_id, s.ord FROM ({base}) s WHERE {cond}"),
        values,
    )
}

fn map_slide(r: &rusqlite::Row<'_>) -> rusqlite::Result<Slide> {
    let cats: Option<String> = r.get(9)?;
    let mut categories: Vec<String> = cats
        .as_deref()
        .unwrap_or("")
        .split(',')
        .filter(|c| !c.is_empty())
        .map(str::to_string)
        .collect();
    categories.sort();
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
        categories,
        connector: r.get(10)?,
        original_url: r.get(11)?,
        fallback_urls: r
            .get::<_, Option<String>>(12)?
            .unwrap_or_default()
            .lines()
            .filter(|u| !u.is_empty())
            .map(str::to_string)
            .collect(),
    })
}

impl Catalog {
    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        // The app, its refresh thread and the CLI share this file; wait for
        // a writer instead of failing (rusqlite's default, made explicit).
        conn.busy_timeout(std::time::Duration::from_secs(5))?;
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
    /// Where an unfinished pass over a collection stopped: the next page's
    /// cursor and the newest `updated_at` that pass saw (ADR-0017).
    pub fn resume_state(&self, collection_id: i64) -> Result<Option<(String, Option<String>)>> {
        Ok(self
            .conn
            .query_row(
                "SELECT resume_cursor, pass_newest FROM collections
                 WHERE id = ?1 AND resume_cursor IS NOT NULL",
                params![collection_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()?)
    }

    pub fn set_resume(
        &self,
        collection_id: i64,
        cursor: &str,
        pass_newest: Option<&str>,
    ) -> Result<()> {
        self.conn.execute(
            "UPDATE collections SET resume_cursor = ?2, pass_newest = ?3,
                 last_synced_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
             WHERE id = ?1",
            params![collection_id, cursor, pass_newest],
        )?;
        Ok(())
    }

    pub fn clear_resume(&self, collection_id: i64) -> Result<()> {
        self.conn.execute(
            "UPDATE collections SET resume_cursor = NULL, pass_newest = NULL WHERE id = ?1",
            params![collection_id],
        )?;
        Ok(())
    }

    /// Collections with an unfinished pass, and how many items they hold
    /// locally so far (for `lemuse status`).
    pub fn unfinished(&self) -> Result<Vec<(String, u64)>> {
        let mut stmt = self.conn.prepare(
            "SELECT c.title, (SELECT COUNT(*) FROM collection_blocks cb WHERE cb.collection_id = c.id)
             FROM collections c WHERE c.resume_cursor IS NOT NULL ORDER BY c.title",
        )?;
        let rows = stmt
            .query_map([], |r| Ok((r.get(0)?, r.get::<_, i64>(1)? as u64)))?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

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
        self.slides_in(
            &Scope::collections(collections),
            &CategoryFilter::default(),
            limit,
            offset,
        )
    }

    /// One page of a scope's slides, filtered by category. Collections are
    /// newest-updated first; playlists most-recently-added first.
    pub fn slides_in(
        &self,
        scope: &Scope<'_>,
        filter: &CategoryFilter,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<Slide>> {
        filter.check()?;
        if scope.is_empty_collections() {
            return Ok(Vec::new());
        }
        let (blocks, values) = scope_sql(scope, filter);
        let order = match scope {
            Scope::Collections(_) => BY_UPDATED,
            Scope::Playlist(_) => BY_ADDED,
        };
        let sql = SLIDES_SQL
            .replace("{blocks}", &blocks)
            .replace("{order}", order);
        let args = [Value::Integer(limit.into()), Value::Integer(offset.into())]
            .into_iter()
            .chain(values);
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt
            .query_map(params_from_iter(args), map_slide)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    /// How many slides [`Catalog::slides`] would return, without loading
    /// them (review 0003 D-19).
    pub fn count_slides<S: AsRef<str>>(&self, collections: &[(S, S)]) -> Result<u64> {
        self.count_in(&Scope::collections(collections), &CategoryFilter::default())
    }

    /// How many slides [`Catalog::slides_in`] would return over all pages.
    pub fn count_in(&self, scope: &Scope<'_>, filter: &CategoryFilter) -> Result<u64> {
        filter.check()?;
        if scope.is_empty_collections() {
            return Ok(0);
        }
        let (blocks, values) = scope_sql(scope, filter);
        let sql = COUNT_SQL.replace("{blocks}", &blocks);
        let args = [Value::Integer(0), Value::Integer(0)]
            .into_iter()
            .chain(values);
        Ok(self
            .conn
            .query_row(&sql, params_from_iter(args), |r| r.get::<_, i64>(0))? as u64)
    }

    /// For each category, how many of the scope's slides (after `filter`)
    /// are in it: the numbers on the filter's chips.
    pub fn category_counts(
        &self,
        scope: &Scope<'_>,
        filter: &CategoryFilter,
    ) -> Result<Vec<CategoryCount>> {
        filter.check()?;
        if scope.is_empty_collections() {
            return Ok(Vec::new());
        }
        let (blocks, values) = scope_sql(scope, filter);
        let sql = format!(
            "WITH topic_blocks AS ({blocks})
             SELECT bc.category, COUNT(*) FROM topic_blocks tb
             JOIN block_categories bc ON bc.block_id = tb.block_id
             WHERE EXISTS (SELECT 1 FROM block_media m WHERE m.block_id = tb.block_id
                           AND m.role IN ('large', 'medium', 'original'))
               AND ?1 IS NOT NULL AND ?2 IS NOT NULL
             GROUP BY bc.category ORDER BY bc.category"
        );
        let args = [Value::Integer(0), Value::Integer(0)]
            .into_iter()
            .chain(values);
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt
            .query_map(params_from_iter(args), |r| {
                Ok(CategoryCount {
                    id: r.get(0)?,
                    count: r.get::<_, i64>(1)? as u64,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    /// Every stored link of every image in a scope, oldest first. No limit:
    /// this feeds exports, not the slideshow.
    pub fn links(&self, scope: &Scope<'_>) -> Result<Vec<LinkRow>> {
        if scope.is_empty_collections() {
            return Ok(Vec::new());
        }
        let (blocks, values) = scope_sql(scope, &CategoryFilter::default());
        let sql = format!(
            "WITH topic_blocks AS ({blocks})
             SELECT b.id, b.connector, b.title, b.creator, b.page_url, b.origin_url,
                    (SELECT group_concat(m.role || ' ' || m.url, char(10)) FROM block_media m
                     WHERE m.block_id = b.id AND m.role IN ('original', 'large', 'medium', 'small'))
             FROM topic_blocks tb JOIN blocks b ON b.id = tb.block_id
             WHERE ?1 IS NOT NULL AND ?2 IS NOT NULL
             ORDER BY b.id"
        );
        let args = [Value::Integer(0), Value::Integer(0)]
            .into_iter()
            .chain(values);
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt
            .query_map(params_from_iter(args), |r| {
                let media: Option<String> = r.get(6)?;
                let mut images: Vec<(String, String)> = media
                    .unwrap_or_default()
                    .lines()
                    .filter_map(|l| l.split_once(' '))
                    .map(|(role, url)| (role.to_string(), url.to_string()))
                    .collect();
                let rank = |role: &str| match role {
                    "original" => 0,
                    "large" => 1,
                    "medium" => 2,
                    _ => 3,
                };
                images.sort_by_key(|(role, _)| rank(role));
                Ok(LinkRow {
                    block_id: r.get(0)?,
                    connector: r.get(1)?,
                    title: r.get(2)?,
                    creator: r.get(3)?,
                    page_url: r.get(4)?,
                    origin_url: r.get(5)?,
                    images,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    /// A playlist's id by name (ignoring case), for the CLI.
    pub fn playlist_id(&self, name: &str) -> Result<Option<i64>> {
        Ok(self
            .playlists()?
            .into_iter()
            .find(|p| p.name.eq_ignore_ascii_case(name.trim()))
            .map(|p| p.id))
    }

    // ── Categories: derived (ADR-0015) ───────────────────────────────────

    /// Re-sort every block into categories. Runs after each refresh; one
    /// transaction, so readers see the old or the new sorting, never half.
    pub fn rebuild_categories(&mut self, v: &Vocabulary) -> Result<usize> {
        let matcher = Matcher::new(v);
        let tx = self.conn.transaction()?;
        let mut rows = 0usize;
        {
            let mut read = tx.prepare(
                "SELECT b.id, b.kind, b.title, b.description, b.content,
                        group_concat(c.title, char(10))
                 FROM blocks b
                 LEFT JOIN collection_blocks cb ON cb.block_id = b.id
                 LEFT JOIN collections c ON c.id = cb.collection_id
                 GROUP BY b.id",
            )?;
            type Texts = [Option<String>; 4];
            let blocks = read
                .query_map([], |r| {
                    let texts: Texts = [r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?];
                    Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, texts))
                })?
                .collect::<std::result::Result<Vec<_>, _>>()?;
            tx.execute("DELETE FROM block_categories", [])?;
            let mut write =
                tx.prepare("INSERT INTO block_categories (block_id, category) VALUES (?1, ?2)")?;
            for (id, kind, texts) in &blocks {
                let found = matcher.categorize(kind, texts.iter().flatten().map(String::as_str));
                for c in found {
                    write.execute(params![id, c])?;
                    rows += 1;
                }
            }
        }
        tx.execute(
            "INSERT INTO derived_state (key, value) VALUES ('categories', ?1)
             ON CONFLICT (key) DO UPDATE SET value = excluded.value",
            params![v.fingerprint],
        )?;
        tx.commit()?;
        Ok(rows)
    }

    /// Rebuild categories only if this vocabulary hasn't built them yet
    /// (first launch after an update). Cheap when nothing changed.
    pub fn ensure_categories(&mut self, v: &Vocabulary) -> Result<bool> {
        let built: Option<String> = self
            .conn
            .query_row(
                "SELECT value FROM derived_state WHERE key = 'categories'",
                [],
                |r| r.get(0),
            )
            .optional()?;
        if built.as_deref() == Some(v.fingerprint.as_str()) {
            return Ok(false);
        }
        self.rebuild_categories(v)?;
        Ok(true)
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
        self.slides_in(
            &Scope::Playlist(playlist_id),
            &CategoryFilter::default(),
            limit,
            offset,
        )
    }

    /// The Are.na block id behind a local block, if it came from Are.na.
    pub fn arena_block_id(&self, block_id: i64) -> Result<Option<String>> {
        Ok(self
            .conn
            .query_row(
                "SELECT remote_id FROM blocks WHERE id = ?1 AND connector = 'arena'",
                params![block_id],
                |r| r.get(0),
            )
            .optional()?)
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

    fn categorized(c: &mut Catalog, remote_id: &str, title: &str, coll: i64) -> i64 {
        let mut b = sample(remote_id, title);
        b.media = vec![media(
            "large",
            &format!("https://images.are.na/{remote_id}.jpg"),
        )];
        let id = c.upsert_block(&b).unwrap();
        c.link_block(coll, id, None).unwrap();
        id
    }

    #[test]
    fn categories_filter_pages_and_counts() {
        let mut c = Catalog::open_in_memory().unwrap();
        let refs = collection(&c, "refs");
        let oak = categorized(&mut c, "1", "Oak chair", refs);
        let steel = categorized(&mut c, "2", "Steel chair", refs);
        let _vase = categorized(&mut c, "3", "Rubber vase", refs);
        let v = crate::categories::vocabulary();
        assert!(c.ensure_categories(v).unwrap());
        assert!(
            !c.ensure_categories(v).unwrap(),
            "same vocabulary: no rebuild"
        );

        let keys = [("arena", "refs")];
        let scope = Scope::collections(&keys);
        let f = |inc: &[&str], exc: &[&str]| CategoryFilter {
            include: inc.iter().map(|s| s.to_string()).collect(),
            exclude: exc.iter().map(|s| s.to_string()).collect(),
        };
        let ids = |filter: &CategoryFilter| {
            c.slides_in(&scope, filter, 10, 0)
                .unwrap()
                .iter()
                .map(|s| s.block_id)
                .collect::<Vec<_>>()
        };
        let chairs = f(&["furniture"], &[]);
        let mut got = ids(&chairs);
        got.sort();
        assert_eq!(got, vec![oak, steel]);
        assert_eq!(ids(&f(&["furniture"], &["wood"])), vec![steel]);
        assert_eq!(c.count_in(&scope, &f(&["rubber"], &[])).unwrap(), 1);
        // Pages: offset walks the same order.
        let all: Vec<i64> = ids(&CategoryFilter::default());
        let page2 = c
            .slides_in(&scope, &CategoryFilter::default(), 1, 1)
            .unwrap();
        assert_eq!(page2[0].block_id, all[1]);
        // Counts within the current filter.
        let counts = c.category_counts(&scope, &chairs).unwrap();
        let n = |id: &str| counts.iter().find(|x| x.id == id).map_or(0, |x| x.count);
        assert_eq!(
            (n("furniture"), n("wood"), n("metal"), n("rubber")),
            (2, 1, 1, 0)
        );
        // Slides carry their categories.
        let s = c.slides_in(&scope, &f(&["wood"], &[]), 10, 0).unwrap();
        assert_eq!(
            s[0].categories,
            vec!["cad-3d", "furniture", "image", "wood"]
        );
        // Playlist scope uses the same filter.
        let p = c.create_playlist("Mix").unwrap();
        c.set_in_playlist(p.id, oak, true).unwrap();
        c.set_in_playlist(p.id, steel, true).unwrap();
        let pl = c
            .slides_in(&Scope::Playlist(p.id), &f(&[], &["metal"]), 10, 0)
            .unwrap();
        assert_eq!(pl.iter().map(|s| s.block_id).collect::<Vec<_>>(), vec![oak]);
    }

    #[test]
    fn filters_are_checked_before_sql() {
        let c = Catalog::open_in_memory().unwrap();
        let keys = [("arena", "refs")];
        let scope = Scope::collections(&keys);
        let bad = CategoryFilter {
            include: vec!["wood' OR 1=1 --".into()],
            exclude: vec![],
        };
        assert!(c.slides_in(&scope, &bad, 10, 0).is_err());
        let both = CategoryFilter {
            include: vec!["wood".into()],
            exclude: vec!["wood".into()],
        };
        assert!(c.count_in(&scope, &both).is_err());
        let many = CategoryFilter {
            include: vec!["wood".into(); MAX_FILTER_CATEGORIES + 1],
            exclude: vec![],
        };
        assert!(c.category_counts(&scope, &many).is_err());
    }

    #[test]
    fn channel_names_label_their_images() {
        let mut c = Catalog::open_in_memory().unwrap();
        let id = c
            .upsert_collection(&Collection {
                id: None,
                connector: "arena".into(),
                remote_key: "metal-things".into(),
                title: "Metal".into(),
            })
            .unwrap();
        let b = categorized(&mut c, "9", "IMG_2041.jpg", id);
        c.rebuild_categories(crate::categories::vocabulary())
            .unwrap();
        let keys = [("arena", "metal-things")];
        let s = c
            .slides_in(&Scope::collections(&keys), &CategoryFilter::default(), 5, 0)
            .unwrap();
        assert_eq!(s[0].block_id, b);
        assert!(s[0].categories.contains(&"metal".to_string()));
    }

    #[test]
    fn slides_carry_fallbacks_and_links_export_everything() {
        let mut c = Catalog::open_in_memory().unwrap();
        let refs = collection(&c, "refs");
        let mut b = sample("7", "Gate");
        b.media = vec![
            media("original", "https://cdn.invalid/o.jpg"),
            media("medium", "https://images.invalid/m.jpg"),
            media("large", "https://images.invalid/l.jpg"),
        ];
        b.source.page_url = Some("https://www.are.na/block/7".into());
        b.source.origin_url = Some("https://example.invalid/gate".into());
        let id = c.upsert_block(&b).unwrap();
        c.link_block(refs, id, None).unwrap();
        let keys = [("arena", "refs")];
        let s = &c.slides(&keys, 5, 0).unwrap()[0];
        assert_eq!(s.display_url, "https://images.invalid/l.jpg");
        assert_eq!(
            s.fallback_urls,
            ["https://images.invalid/m.jpg", "https://cdn.invalid/o.jpg"]
        );
        assert_eq!(s.original_url.as_deref(), Some("https://cdn.invalid/o.jpg"));
        let rows = c.links(&Scope::collections(&keys)).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(
            rows[0].images[0],
            ("original".into(), "https://cdn.invalid/o.jpg".into())
        );
        assert_eq!(
            rows[0].origin_url.as_deref(),
            Some("https://example.invalid/gate")
        );
        let p = c.create_playlist("Gates").unwrap();
        c.set_in_playlist(p.id, id, true).unwrap();
        assert_eq!(c.playlist_id("gates").unwrap(), Some(p.id));
        assert_eq!(c.links(&Scope::Playlist(p.id)).unwrap().len(), 1);
    }
}
