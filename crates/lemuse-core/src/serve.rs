//! `lemuse serve`: the read-only dashboard server (ADR-0019).
//!
//! A deliberately small HTTP/1.1 server on the standard library (no web
//! framework, so nothing new in the supply chain). It answers GET and HEAD
//! only, closes every connection after one response, and never changes the
//! library: every handler only reads the catalog and the config.
//!
//! - Binds `127.0.0.1` by default; LAN access is an explicit opt-in.
//! - Every `/api/*` request needs `Authorization: Bearer <token>` (random per
//!   run unless `LEMUSE_SERVE_TOKEN` is set); compared in constant time.
//! - On loopback the `Host` header must name the bound address (DNS
//!   rebinding).
//! - Static files come from an allow-list built at start-up from the
//!   dashboard bundle: request paths are looked up in a map, never joined to
//!   a filesystem path, so there is no traversal.
//! - Images are never proxied or cached: the page streams them from the
//!   source CDNs, exactly like the app (ADR-0009).

use std::collections::BTreeMap;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Duration;

use serde_json::{json, Value};

use crate::config::Config;
use crate::store::catalog::{Catalog, CategoryFilter, Scope};
use crate::store::LibraryPaths;
use crate::{Error, Result};

pub const DEFAULT_PORT: u16 = 47555;
/// Version of the JSON envelope, shared with `lemuse --json`.
pub const JSON_VERSION: u32 = 1;
/// Image hosts the dashboard page may load (same list as the app's CSP).
pub const IMAGE_HOSTS: &[&str] = &[
    "https://images.are.na",
    "https://d2w9rnfcy7mm78.cloudfront.net",
    "https://www.artic.edu",
    "https://openaccess-cdn.clevelandart.org",
];

const MAX_HEAD: usize = 16 * 1024;
const MAX_TARGET: usize = 2048;
const MAX_HEADERS: usize = 64;
const MAX_CONNECTIONS: usize = 32;
const MAX_UI_FILES: usize = 300;
const MAX_UI_BYTES: u64 = 32 * 1024 * 1024;
/// Slides per API page and the most per topic in `/api/v1/preview-data`.
const PAGE_SIZE: u32 = 500;
const MAX_PAGE: u32 = 10_000;

/// One file of the dashboard bundle, held in memory.
pub struct UiFile {
    pub body: Vec<u8>,
    pub content_type: &'static str,
}

#[derive(Debug, Default, PartialEq, Eq)]
pub struct Request {
    pub head_only: bool,
    pub path: String,
    pub query: Vec<(String, String)>,
    pub host: Option<String>,
    pub authorization: Option<String>,
}

impl Request {
    fn param(&self, key: &str) -> Option<&str> {
        self.query
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.as_str())
    }
}

#[derive(Debug)]
pub struct Response {
    pub status: u16,
    pub content_type: &'static str,
    pub body: Vec<u8>,
    /// Only on HTML: the page's Content-Security-Policy.
    pub csp: Option<String>,
    /// Headers a status needs (RFC 9110/6750): `Allow` on 405,
    /// `WWW-Authenticate` on 401, `Retry-After` on 503.
    pub headers: Vec<(&'static str, String)>,
}

impl Response {
    fn json(status: u16, v: &Value) -> Self {
        Self {
            status,
            content_type: "application/json; charset=utf-8",
            body: serde_json::to_vec_pretty(v).unwrap_or_default(),
            csp: None,
            headers: Vec::new(),
        }
        .with_status_headers()
    }

    /// An API error in the JSON envelope, with its stable code (ADR-0024).
    fn api_error(status: u16, command: &str, code: &str, msg: &str) -> Self {
        Self::json(
            status,
            &json!({ "lemuse": JSON_VERSION, "command": command, "ok": false,
                     "code": code, "error": msg }),
        )
    }

    /// A small HTML error page for people (ADR-0024): the status, what it
    /// means, and a way back. Fixed text only; nothing from the request is
    /// echoed, so there is nothing to inject.
    pub fn error_page(status: u16) -> Self {
        let (title, body) = match status {
            400 => ("Bad request", "LeMuse couldn't read that request."),
            401 => ("Token needed", "Open the dashboard from the address <code>lemuse serve</code> printed; it carries the token."),
            404 => ("Page not found", "There is no page at this address."),
            405 => ("Method not allowed", "The dashboard only reads: it answers GET and HEAD."),
            414 => ("Address too long", "That address is longer than LeMuse accepts."),
            421 => ("Wrong address", "Use <code>http://127.0.0.1</code> with the port <code>lemuse serve</code> printed."),
            431 => ("Request too large", "The request's headers are larger than LeMuse accepts."),
            503 => ("Busy", "The dashboard is answering many requests. Try again in a moment."),
            _ => ("Something went wrong", "LeMuse hit a problem answering this. Details are in the <code>lemuse serve</code> window."),
        };
        let html = format!(
            "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">\
             <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\
             <title>{status} {title} · LeMuse</title><style>{ERROR_PAGE_CSS}</style></head>\
             <body><main><p class=\"code\">{status}</p><h1>{title}</h1><p>{body}</p>\
             <p><a href=\"/\">Back to the dashboard</a></p></main></body></html>\n"
        );
        Self {
            status,
            content_type: "text/html; charset=utf-8",
            body: html.into_bytes(),
            csp: Some(ERROR_PAGE_CSP.into()),
            headers: Vec::new(),
        }
        .with_status_headers()
    }

    fn with_status_headers(mut self) -> Self {
        match self.status {
            401 => self
                .headers
                .push(("WWW-Authenticate", "Bearer realm=\"lemuse\"".into())),
            405 => self.headers.push(("Allow", "GET, HEAD".into())),
            503 => self.headers.push(("Retry-After", "2".into())),
            _ => {}
        }
        self
    }
}

/// Styles of the error page: light and dark, no external files.
const ERROR_PAGE_CSS: &str = "html{color-scheme:light dark;font-family:system-ui,sans-serif}\
body{margin:0;min-height:100vh;display:grid;place-items:center;background:Canvas;color:CanvasText}\
main{max-width:34rem;padding:2rem 1rem}.code{margin:0;font-size:3rem;font-weight:700;opacity:.35}\
h1{margin:.25rem 0 1rem;font-size:1.5rem}a{color:LinkText}";

/// The error page loads nothing and runs nothing; only its inline style.
const ERROR_PAGE_CSP: &str = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; \
form-action 'none'; frame-ancestors 'none'";

fn reason(status: u16) -> &'static str {
    match status {
        200 => "OK",
        304 => "Not Modified",
        400 => "Bad Request",
        401 => "Unauthorized",
        404 => "Not Found",
        405 => "Method Not Allowed",
        414 => "URI Too Long",
        421 => "Misdirected Request",
        431 => "Request Header Fields Too Large",
        503 => "Service Unavailable",
        _ => "Internal Server Error",
    }
}

/// Parse a request head (everything before the blank line). Errors are the
/// HTTP status to answer with.
pub fn parse_head(head: &[u8]) -> std::result::Result<Request, u16> {
    let text = std::str::from_utf8(head).map_err(|_| 400u16)?;
    let mut lines = text.split("\r\n");
    let line = lines.next().ok_or(400u16)?;
    let mut parts = line.split(' ');
    let (Some(method), Some(target), Some(version), None) =
        (parts.next(), parts.next(), parts.next(), parts.next())
    else {
        return Err(400);
    };
    if !version.starts_with("HTTP/1.") {
        return Err(400);
    }
    let head_only = match method {
        "GET" => false,
        "HEAD" => true,
        _ => return Err(405),
    };
    if target.len() > MAX_TARGET {
        return Err(414);
    }
    if !target.starts_with('/') || target.chars().any(|c| c.is_control() || c == ' ') {
        return Err(400);
    }
    let (path, query) = target.split_once('?').unwrap_or((target, ""));
    let mut req = Request {
        head_only,
        path: path.to_string(),
        query: url::form_urlencoded::parse(query.as_bytes())
            .into_owned()
            .collect(),
        ..Default::default()
    };
    for (n, line) in lines.enumerate() {
        if line.is_empty() {
            continue;
        }
        if n >= MAX_HEADERS {
            return Err(431);
        }
        let (name, value) = line.split_once(':').ok_or(400u16)?;
        let value = value.trim().to_string();
        match name.trim().to_ascii_lowercase().as_str() {
            "host" if req.host.is_some() => return Err(400),
            "host" => req.host = Some(value),
            "authorization" => req.authorization = Some(value),
            _ => {}
        }
    }
    Ok(req)
}

/// Equal-length byte comparison that doesn't stop at the first difference.
pub fn token_ok(given: &str, want: &str) -> bool {
    let (a, b) = (given.as_bytes(), want.as_bytes());
    a.len() == b.len() && a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

/// A token the user may set (`LEMUSE_SERVE_TOKEN`): 32–128 URL-safe chars.
pub fn is_valid_token(t: &str) -> bool {
    (32..=128).contains(&t.len())
        && t.bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// 256 random bits from the OS, as hex.
pub fn new_token() -> Result<String> {
    let mut bytes = [0u8; 32];
    getrandom::getrandom(&mut bytes)
        .map_err(|e| Error::Config(format!("no OS randomness for the dashboard token: {e}")))?;
    Ok(hex::encode(bytes))
}

fn content_type(ext: &str) -> Option<&'static str> {
    Some(match ext {
        "html" => "text/html; charset=utf-8",
        "js" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        "txt" => "text/plain; charset=utf-8",
        _ => return None,
    })
}

/// Load the dashboard bundle (`npm run build:dashboard` → `app/dist-dashboard`)
/// into memory. Only plain file names of known types are kept; source maps
/// and any `preview-data.json` snapshot are skipped (the page asks the API).
pub fn load_ui(dir: &Path) -> Result<BTreeMap<String, UiFile>> {
    fn walk(
        root: &Path,
        dir: &Path,
        depth: u32,
        out: &mut BTreeMap<String, UiFile>,
        total: &mut u64,
    ) -> Result<()> {
        if depth > 4 {
            return Ok(());
        }
        for entry in std::fs::read_dir(dir).map_err(|e| Error::io(dir, e))? {
            let entry = entry.map_err(|e| Error::io(dir, e))?;
            let path = entry.path();
            let kind = entry.file_type().map_err(|e| Error::io(&path, e))?;
            if kind.is_symlink() {
                continue;
            }
            if kind.is_dir() {
                walk(root, &path, depth + 1, out, total)?;
                continue;
            }
            let Ok(rel) = path.strip_prefix(root) else {
                continue;
            };
            let key: String = rel
                .components()
                .map(|c| c.as_os_str().to_string_lossy().into_owned())
                .collect::<Vec<_>>()
                .join("/");
            let plain = key
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b"._-/".contains(&b));
            let ext = key.rsplit_once('.').map(|(_, e)| e).unwrap_or("");
            let Some(ct) = content_type(ext) else {
                continue;
            };
            if !plain || key.ends_with("preview-data.json") {
                continue;
            }
            let body = std::fs::read(&path).map_err(|e| Error::io(&path, e))?;
            *total += body.len() as u64;
            if out.len() >= MAX_UI_FILES || *total > MAX_UI_BYTES {
                return Err(Error::Config(
                    "the dashboard folder is too big; point --ui at app/dist-dashboard".into(),
                ));
            }
            out.insert(
                format!("/{key}"),
                UiFile {
                    body,
                    content_type: ct,
                },
            );
        }
        Ok(())
    }
    let mut out = BTreeMap::new();
    let mut total = 0;
    walk(dir, dir, 0, &mut out, &mut total)?;
    if !out.contains_key("/index.html") {
        return Err(Error::Config(format!(
            "no index.html in {}; build it with `npm run build:dashboard`",
            dir.display()
        )));
    }
    Ok(out)
}

/// The page's CSP: our own script and styles, images only from the sources.
pub fn page_csp() -> String {
    format!(
        "default-src 'self'; img-src 'self' data: {}; style-src 'self' 'unsafe-inline'; \
         script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'",
        IMAGE_HOSTS.join(" ")
    )
}

const FALLBACK_PAGE: &str = "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">\
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>LeMuse dashboard</title></head>\
<body><h1>LeMuse dashboard</h1><p>The JSON API is running (see docs/automation.md). The slideshow page isn't \
built yet: run <code>npm run build:dashboard</code> in <code>app/</code>, then start \
<code>lemuse serve --ui app/dist-dashboard</code>.</p></body></html>\n";

/// Everything the browser UI's preview backend reads, from the live catalog:
/// topics with their newest slides, playlists, and the category vocabulary.
/// The same shape `lemuse preview-data` writes.
pub fn preview_data(cfg: &Config, catalog: &Catalog, per_topic: u32) -> Result<Value> {
    let per_topic = per_topic.min(PAGE_SIZE);
    let mut topics = Vec::new();
    for t in &cfg.topics {
        let slides = catalog.slides(&t.collection_keys(), per_topic, 0)?;
        topics.push(json!({
            "name": t.name,
            "slide_seconds": t.slide_seconds,
            "shuffle": t.shuffle,
            "sources": t.resolved_sources().len(),
            "slides": slides,
        }));
    }
    let mut playlists = Vec::new();
    for p in catalog.playlists()?.into_iter().take(100) {
        let slides = catalog.playlist_slides(p.id, per_topic, 0)?;
        playlists.push(json!({ "id": p.id, "name": p.name, "slides": slides }));
    }
    Ok(json!({
        "generated_from": "lemuse preview-data",
        "blocks": catalog.block_count()?,
        "topics": topics,
        "playlists": playlists,
        "vocabulary": crate::categories::ui_vocabulary(crate::categories::vocabulary()),
    }))
}

pub struct Server {
    paths: LibraryPaths,
    token: String,
    ui: Option<BTreeMap<String, UiFile>>,
    port: u16,
    lan: bool,
    active: AtomicUsize,
}

impl Server {
    pub fn new(
        paths: LibraryPaths,
        token: String,
        ui: Option<BTreeMap<String, UiFile>>,
        port: u16,
        lan: bool,
    ) -> Self {
        Self {
            paths,
            token,
            ui,
            port,
            lan,
            active: AtomicUsize::new(0),
        }
    }

    /// Bind the listening socket. Port 0 picks a free port (tests).
    pub fn bind(&mut self) -> Result<TcpListener> {
        let ip = if self.lan {
            [0, 0, 0, 0]
        } else {
            [127, 0, 0, 1]
        };
        let addr = SocketAddr::from((ip, self.port));
        let listener = TcpListener::bind(addr).map_err(|e| {
            Error::Config(format!("can't listen on {addr} (in use or blocked): {e}"))
        })?;
        self.port = listener
            .local_addr()
            .map_err(|e| Error::Config(e.to_string()))?
            .port();
        Ok(listener)
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    /// Accept connections until the process ends; one thread each, capped.
    pub fn serve(self: Arc<Self>, listener: TcpListener) {
        for stream in listener.incoming().flatten() {
            if self.active.fetch_add(1, Ordering::SeqCst) >= MAX_CONNECTIONS {
                self.active.fetch_sub(1, Ordering::SeqCst);
                let mut s = stream;
                let _ = write_response(&mut s, &Response::error_page(503), false);
                continue;
            }
            let me = Arc::clone(&self);
            std::thread::spawn(move || {
                me.connection(stream);
                me.active.fetch_sub(1, Ordering::SeqCst);
            });
        }
    }

    fn connection(&self, mut stream: TcpStream) {
        let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
        let _ = stream.set_write_timeout(Some(Duration::from_secs(15)));
        let (resp, head_only) = match read_head(&mut stream).and_then(|h| parse_head(&h)) {
            Ok(req) => (self.handle(&req), req.head_only),
            Err(status) => (Response::error_page(status), false),
        };
        let _ = write_response(&mut stream, &resp, head_only);
    }

    fn host_ok(&self, host: Option<&str>) -> bool {
        if self.lan {
            return true; // the token guards every API call
        }
        let port = self.port;
        matches!(host, Some(h) if h == format!("127.0.0.1:{port}") || h == format!("localhost:{port}"))
    }

    /// Route one request. Reads only; never writes the library.
    pub fn handle(&self, req: &Request) -> Response {
        if !self.host_ok(req.host.as_deref()) {
            return Response::error_page(421);
        }
        if let Some(name) = req.path.strip_prefix("/api/v1/") {
            let authorised = req
                .authorization
                .as_deref()
                .and_then(|a| {
                    a.strip_prefix("Bearer ")
                        .or_else(|| a.strip_prefix("bearer "))
                })
                .is_some_and(|t| token_ok(t.trim(), &self.token));
            if !authorised {
                return Response::api_error(401, name, "unauthorized", "missing or wrong token");
            }
            return self.api(name, req);
        }
        let key = if req.path == "/" {
            "/index.html"
        } else {
            req.path.as_str()
        };
        match &self.ui {
            Some(ui) => match ui.get(key) {
                Some(f) => Response {
                    status: 200,
                    content_type: f.content_type,
                    body: f.body.clone(),
                    csp: f.content_type.starts_with("text/html").then(page_csp),
                    headers: Vec::new(),
                },
                None => Response::error_page(404),
            },
            None if key == "/index.html" => Response {
                status: 200,
                content_type: "text/html; charset=utf-8",
                body: FALLBACK_PAGE.as_bytes().to_vec(),
                csp: Some(page_csp()),
                headers: Vec::new(),
            },
            None => Response::error_page(404),
        }
    }

    fn api(&self, name: &str, req: &Request) -> Response {
        let result = match name {
            "status" => self.status(),
            "topics" => self.topics(),
            "playlists" => self.playlists(),
            "slides" => self.slides(req),
            "preview-data" => {
                let per = req
                    .param("per_topic")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(300);
                // The UI's own format, without the envelope.
                return match self.with(|cfg, c| preview_data(cfg, c, per)) {
                    Ok(v) => Response::json(200, &v),
                    Err(e) => error_response(name, &e),
                };
            }
            _ => return Response::api_error(404, name, "not_found", "no such endpoint"),
        };
        match result {
            Ok(data) => Response::json(
                200,
                &json!({ "lemuse": JSON_VERSION, "command": name, "ok": true, "data": data }),
            ),
            Err(e) => error_response(name, &e),
        }
    }

    fn with<T>(&self, f: impl FnOnce(&Config, &Catalog) -> Result<T>) -> Result<T> {
        let cfg = Config::load(&self.paths.config())?;
        let catalog = Catalog::open(&self.paths.catalog())?;
        f(&cfg, &catalog)
    }

    fn status(&self) -> Result<Value> {
        self.with(|_, c| {
            let loading: Vec<Value> = c
                .unfinished()?
                .into_iter()
                .map(|(t, n)| json!({ "collection": t, "images_so_far": n }))
                .collect();
            // No library path: it holds the Windows user name (review 0013 A-66).
            Ok(json!({ "schema": c.schema_version()?, "blocks": c.block_count()?, "loading": loading }))
        })
    }

    fn topics(&self) -> Result<Value> {
        self.with(|cfg, c| {
            let mut out = Vec::new();
            for t in &cfg.topics {
                out.push(json!({
                    "name": t.name,
                    "images": c.count_slides(&t.collection_keys())?,
                    "slide_seconds": t.slide_seconds,
                    "shuffle": t.shuffle,
                }));
            }
            Ok(Value::Array(out))
        })
    }

    fn playlists(&self) -> Result<Value> {
        self.with(|_, c| Ok(serde_json::to_value(c.playlists()?).unwrap_or(Value::Null)))
    }

    /// `/api/v1/slides?source=all|topic:<name>|playlist:<id>&page=0&include=a,b&exclude=c`
    fn slides(&self, req: &Request) -> Result<Value> {
        let list = |k: &str| -> Vec<String> {
            req.param(k)
                .map(|v| {
                    v.split(',')
                        .filter(|s| !s.is_empty())
                        .map(str::to_string)
                        .collect()
                })
                .unwrap_or_default()
        };
        let filter = CategoryFilter {
            include: list("include"),
            exclude: list("exclude"),
        };
        let page: u32 = req
            .param("page")
            .map(|p| p.parse().map_err(|_| bad("page must be a number")))
            .transpose()?
            .unwrap_or(0);
        if page > MAX_PAGE {
            return Err(bad("page is too large"));
        }
        let source = req.param("source").unwrap_or("all").to_string();
        self.with(|cfg, c| {
            let keys: Vec<(String, String)>;
            let scope = if let Some(id) = source.strip_prefix("playlist:") {
                Scope::Playlist(
                    id.parse()
                        .map_err(|_| bad("playlist id must be a number"))?,
                )
            } else {
                keys = if source == "all" {
                    cfg.topics
                        .iter()
                        .flat_map(|t| t.collection_keys())
                        .collect::<std::collections::BTreeSet<_>>()
                        .into_iter()
                        .collect()
                } else if let Some(name) = source.strip_prefix("topic:") {
                    cfg.topic(name)
                        .ok_or_else(|| bad("no topic with that name"))?
                        .collection_keys()
                } else {
                    return Err(bad("source must be all, topic:<name> or playlist:<id>"));
                };
                Scope::collections(&keys)
            };
            let total = c.count_in(&scope, &filter)?;
            let slides = c.slides_in(&scope, &filter, PAGE_SIZE, page * PAGE_SIZE)?;
            Ok(
                json!({ "source": source, "page": page, "page_size": PAGE_SIZE,
                       "total": total, "slides": slides }),
            )
        })
    }
}

fn bad(msg: &str) -> Error {
    Error::Config(msg.to_string())
}

/// 400 with the message for bad input; 500 with no details otherwise, so
/// paths (which hold the Windows user name) never reach a LAN client.
fn error_response(name: &str, e: &Error) -> Response {
    use crate::error::code;
    let status = match e.code() {
        code::INVALID => 400,
        code::NOT_FOUND => 404,
        code::BUSY => 503,
        _ => 500,
    };
    if status == 500 {
        eprintln!("lemuse serve: {name}: {e}");
        return Response::api_error(
            500,
            name,
            "internal",
            "internal error (see the lemuse serve window)",
        );
    }
    Response::api_error(status, name, e.code(), &e.to_string())
}

fn read_head(stream: &mut TcpStream) -> std::result::Result<Vec<u8>, u16> {
    let mut buf = Vec::with_capacity(1024);
    let mut chunk = [0u8; 1024];
    loop {
        let n = stream.read(&mut chunk).map_err(|_| 400u16)?;
        if n == 0 {
            return Err(400);
        }
        buf.extend_from_slice(&chunk[..n]);
        if let Some(end) = buf.windows(4).position(|w| w == b"\r\n\r\n") {
            buf.truncate(end);
            return Ok(buf);
        }
        if buf.len() > MAX_HEAD {
            return Err(431);
        }
    }
}

fn write_response(stream: &mut TcpStream, r: &Response, head_only: bool) -> std::io::Result<()> {
    let mut head = format!(
        "HTTP/1.1 {} {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n\
         Cache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nReferrer-Policy: no-referrer\r\n\
         Cross-Origin-Resource-Policy: same-origin\r\n",
        r.status,
        reason(r.status),
        r.content_type,
        r.body.len()
    );
    if let Some(csp) = &r.csp {
        head.push_str(&format!("Content-Security-Policy: {csp}\r\n"));
    }
    for (k, v) in &r.headers {
        head.push_str(&format!("{k}: {v}\r\n"));
    }
    head.push_str("\r\n");
    stream.write_all(head.as_bytes())?;
    if !head_only {
        stream.write_all(&r.body)?;
    }
    stream.flush()
}

#[cfg(test)]
mod tests {
    use super::*;

    const TOKEN: &str = "0123456789abcdef0123456789abcdef";

    fn head(s: &str) -> std::result::Result<Request, u16> {
        parse_head(s.as_bytes())
    }

    #[test]
    fn parses_get_and_refuses_the_rest() {
        let r = head("GET /api/v1/slides?source=topic%3AWood+objects&page=2 HTTP/1.1\r\nHost: 127.0.0.1:47555\r\nAuthorization: Bearer x").unwrap();
        assert_eq!(r.path, "/api/v1/slides");
        assert_eq!(r.param("source"), Some("topic:Wood objects"));
        assert_eq!(r.param("page"), Some("2"));
        assert_eq!(r.host.as_deref(), Some("127.0.0.1:47555"));
        assert!(head("HEAD / HTTP/1.1\r\nHost: a").unwrap().head_only);
        assert_eq!(head("POST / HTTP/1.1"), Err(405));
        assert_eq!(head("DELETE /api/v1/status HTTP/1.1"), Err(405));
        assert_eq!(head("GET  / HTTP/1.1"), Err(400));
        assert_eq!(head("GET relative HTTP/1.1"), Err(400));
        assert_eq!(head("GET / SPDY/3"), Err(400));
        assert_eq!(
            head(&format!("GET /{} HTTP/1.1", "a".repeat(3000))),
            Err(414)
        );
        assert_eq!(head("GET / HTTP/1.1\r\nHost: a\r\nHost: b"), Err(400));
        assert_eq!(parse_head(b"GET /\xff HTTP/1.1"), Err(400));
        let many = (0..70)
            .map(|i| format!("X-{i}: y"))
            .collect::<Vec<_>>()
            .join("\r\n");
        assert_eq!(head(&format!("GET / HTTP/1.1\r\n{many}")), Err(431));
    }

    #[test]
    fn tokens() {
        assert!(token_ok(TOKEN, TOKEN));
        assert!(!token_ok("0123456789abcdef0123456789abcdeX", TOKEN));
        assert!(!token_ok("short", TOKEN));
        assert!(
            is_valid_token(TOKEN) && !is_valid_token("short") && !is_valid_token(&"a b".repeat(20))
        );
        let t = new_token().unwrap();
        assert_eq!(t.len(), 64);
        assert_ne!(t, new_token().unwrap());
    }

    fn server(dir: &Path) -> Server {
        let paths = LibraryPaths::new(dir);
        crate::config::ensure_library(&paths).unwrap();
        let mut ui = BTreeMap::new();
        ui.insert(
            "/index.html".to_string(),
            UiFile {
                body: b"<!doctype html><title>x</title>".to_vec(),
                content_type: "text/html; charset=utf-8",
            },
        );
        Server::new(paths, TOKEN.into(), Some(ui), 47555, false)
    }

    fn get(path: &str, auth: Option<&str>) -> Request {
        let (p, q) = path.split_once('?').unwrap_or((path, ""));
        Request {
            path: p.into(),
            query: url::form_urlencoded::parse(q.as_bytes())
                .into_owned()
                .collect(),
            host: Some("127.0.0.1:47555".into()),
            authorization: auth.map(|t| format!("Bearer {t}")),
            ..Default::default()
        }
    }

    #[test]
    fn api_needs_the_token_and_the_right_host() {
        let dir = tempfile::tempdir().unwrap();
        let s = server(dir.path());
        assert_eq!(s.handle(&get("/api/v1/status", None)).status, 401);
        assert_eq!(s.handle(&get("/api/v1/status", Some("wrong"))).status, 401);
        let ok = s.handle(&get("/api/v1/status", Some(TOKEN)));
        assert_eq!(ok.status, 200);
        let v: Value = serde_json::from_slice(&ok.body).unwrap();
        assert_eq!(
            (v["ok"].as_bool(), v["lemuse"].as_u64()),
            (Some(true), Some(1))
        );
        assert!(v["data"].get("root").is_none(), "no library path over HTTP");
        let mut rebound = get("/api/v1/status", Some(TOKEN));
        rebound.host = Some("evil.example:47555".into());
        assert_eq!(s.handle(&rebound).status, 421);
    }

    #[test]
    fn errors_have_pages_codes_and_the_headers_their_status_needs() {
        let dir = tempfile::tempdir().unwrap();
        let s = server(dir.path());
        let header = |r: &Response, k: &str| {
            r.headers
                .iter()
                .find(|(n, _)| *n == k)
                .map(|(_, v)| v.clone())
        };
        // A missing page is an HTML page with a strict CSP, not plain text.
        let missing = s.handle(&get("/nope", None));
        assert_eq!(missing.status, 404);
        assert!(missing.content_type.starts_with("text/html"));
        let html = String::from_utf8(missing.body.clone()).unwrap();
        assert!(html.starts_with("<!doctype html>") && html.contains("<title>404 Page not found"));
        assert!(missing
            .csp
            .as_deref()
            .unwrap()
            .starts_with("default-src 'none'"));
        // API errors stay JSON, with a stable code.
        let unauth = s.handle(&get("/api/v1/status", None));
        assert_eq!(
            header(&unauth, "WWW-Authenticate").as_deref(),
            Some("Bearer realm=\"lemuse\"")
        );
        let v: Value = serde_json::from_slice(&unauth.body).unwrap();
        assert_eq!(v["code"], "unauthorized");
        let v: Value =
            serde_json::from_slice(&s.handle(&get("/api/v1/nope", Some(TOKEN))).body).unwrap();
        assert_eq!(v["code"], "not_found");
        let bad = s.handle(&get("/api/v1/slides?source=topic:Nope", Some(TOKEN)));
        assert_eq!(bad.status, 404);
        let v: Value = serde_json::from_slice(&bad.body).unwrap();
        assert_eq!(v["code"], "not_found");
        let bad = s.handle(&get("/api/v1/slides?page=x", Some(TOKEN)));
        assert_eq!(bad.status, 400);
        // Every status the server sends has a page and the right headers.
        for status in [400, 401, 404, 405, 414, 421, 431, 500, 503] {
            let r = Response::error_page(status);
            assert_eq!(r.status, status);
            assert!(String::from_utf8(r.body.clone())
                .unwrap()
                .contains(&format!(">{status}<")));
        }
        assert_eq!(
            header(&Response::error_page(405), "Allow").as_deref(),
            Some("GET, HEAD")
        );
        assert_eq!(
            header(&Response::error_page(503), "Retry-After").as_deref(),
            Some("2")
        );
    }

    #[test]
    fn static_files_come_only_from_the_bundle() {
        let dir = tempfile::tempdir().unwrap();
        let s = server(dir.path());
        let page = s.handle(&get("/", None));
        assert_eq!(page.status, 200);
        assert!(page.csp.as_deref().unwrap().contains("script-src 'self'"));
        for p in [
            "/../lemuse.toml",
            "/catalog.db",
            "/..%2Flemuse.toml",
            "/index.html/",
        ] {
            assert_eq!(s.handle(&get(p, None)).status, 404, "{p}");
        }
    }

    #[test]
    fn slides_api_checks_its_input() {
        let dir = tempfile::tempdir().unwrap();
        let s = server(dir.path());
        let code = |q: &str| {
            s.handle(&get(&format!("/api/v1/slides?{q}"), Some(TOKEN)))
                .status
        };
        assert_eq!(code("source=all"), 200);
        assert_eq!(code("source=playlist:abc"), 400);
        assert_eq!(code("source=../x"), 400);
        assert_eq!(code("source=all&page=99999999"), 400);
        assert_eq!(code("source=all&include=wood' OR 1=1"), 400);
        assert_eq!(code("source=topic:Nope"), 404);
        assert_eq!(s.handle(&get("/api/v1/nope", Some(TOKEN))).status, 404);
        let v: Value =
            serde_json::from_slice(&s.handle(&get("/api/v1/preview-data", Some(TOKEN))).body)
                .unwrap();
        assert!(v["topics"].is_array() && v["vocabulary"]["groups"].is_array());
    }

    #[test]
    fn real_socket_round_trip() {
        let dir = tempfile::tempdir().unwrap();
        let mut s = server(dir.path());
        s.port = 0;
        let listener = s.bind().unwrap();
        let port = s.port();
        let s = Arc::new(s);
        std::thread::spawn(move || s.serve(listener));
        let mut c = TcpStream::connect(("127.0.0.1", port)).unwrap();
        write!(
            c,
            "GET /api/v1/topics HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nAuthorization: Bearer {TOKEN}\r\n\r\n"
        )
        .unwrap();
        let mut text = String::new();
        c.read_to_string(&mut text).unwrap();
        assert!(text.starts_with("HTTP/1.1 200 OK\r\n"), "{text}");
        assert!(text.contains("X-Content-Type-Options: nosniff"));
        assert!(text.contains("\"ok\": true"));
    }
}
