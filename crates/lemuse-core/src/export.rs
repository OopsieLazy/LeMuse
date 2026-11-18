//! Link exports (ADR-0016): every stored link of a topic, playlist or All as
//! CSV, JSON or plain text, for spreadsheets, scripts and backups. Links
//! only; no image bytes.
//!
//! Titles and names come from remote sources, so CSV cells are escaped
//! (RFC 4180) and cells a spreadsheet would run as a formula (`=`, `+`,
//! `-`, `@`, tab, CR) are prefixed with `'` (OWASP CSV injection).

use crate::store::catalog::{LinkRow, Slide};

const COLUMNS: [&str; 10] = [
    "block_id",
    "source",
    "title",
    "creator",
    "page_url",
    "origin_url",
    "original",
    "large",
    "medium",
    "small",
];

fn cell(v: &str) -> String {
    let guarded = if v.starts_with(['=', '+', '-', '@', '\t', '\r']) {
        format!("'{v}")
    } else {
        v.to_string()
    };
    if guarded.contains([',', '"', '\n', '\r']) {
        format!("\"{}\"", guarded.replace('"', "\"\""))
    } else {
        guarded
    }
}

fn image<'a>(row: &'a LinkRow, role: &str) -> &'a str {
    row.images
        .iter()
        .find(|(r, _)| r == role)
        .map_or("", |(_, u)| u.as_str())
}

/// One header line, then one line per image. CRLF line ends (spreadsheets on
/// Windows expect them).
pub fn to_csv(rows: &[LinkRow]) -> String {
    let mut out = COLUMNS.join(",");
    out.push_str("\r\n");
    for r in rows {
        let id = r.block_id.to_string();
        let fields = [
            id.as_str(),
            r.connector.as_str(),
            r.title.as_deref().unwrap_or(""),
            r.creator.as_deref().unwrap_or(""),
            r.page_url.as_deref().unwrap_or(""),
            r.origin_url.as_deref().unwrap_or(""),
            image(r, "original"),
            image(r, "large"),
            image(r, "medium"),
            image(r, "small"),
        ];
        let line: Vec<String> = fields.iter().map(|f| cell(f)).collect();
        out.push_str(&line.join(","));
        out.push_str("\r\n");
    }
    out
}

/// The best image link per line (original, else the largest size): ready for
/// a download manager or a script.
pub fn to_text(rows: &[LinkRow]) -> String {
    rows.iter()
        .filter_map(|r| r.images.first().map(|(_, u)| u.as_str()))
        .fold(String::new(), |mut out, u| {
            out.push_str(u);
            out.push('\n');
            out
        })
}

// ── Reference sheets (ADR-0021) ─────────────────────────────────────────

/// Today's date in UTC as `YYYY-MM-DD` (no time-zone crate needed).
pub fn today_utc() -> String {
    let days = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() / 86_400)
        .unwrap_or(0) as i64;
    let (y, m, d) = civil_from_days(days);
    format!("{y:04}-{m:02}-{d:02}")
}

/// Days since 1970-01-01 → (year, month, day). Howard Hinnant's algorithm.
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (yoe + era * 400 + i64::from(m <= 2), m, d)
}

/// `count` slides picked by a seed (e.g. today's date): the same seed gives
/// the same sheet, a new day a new one. FNV-1a seed, xorshift shuffle.
pub fn pick(slides: &[Slide], count: usize, seed: &str) -> Vec<Slide> {
    let mut state = seed.bytes().fold(0xcbf2_9ce4_8422_2325u64, |h, b| {
        (h ^ u64::from(b)).wrapping_mul(0x0100_0000_01b3)
    }) | 1;
    let mut next = move || {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        state
    };
    let mut idx: Vec<usize> = (0..slides.len()).collect();
    for i in (1..idx.len()).rev() {
        let j = (next() % (i as u64 + 1)) as usize;
        idx.swap(i, j);
    }
    idx.into_iter()
        .take(count)
        .map(|i| slides[i].clone())
        .collect()
}

/// Text for HTML: `& < > " '` escaped. Every remote string goes through this.
pub fn esc(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            c if c.is_control() => {}
            c => out.push(c),
        }
    }
    out
}

fn https(u: &str) -> Option<&str> {
    url::Url::parse(u)
        .ok()
        .filter(|p| p.scheme() == "https" && p.username().is_empty() && p.password().is_none())
        .map(|_| u)
}

/// A printable reference sheet: a grid of images with title and credit.
/// Self-contained HTML with no scripts; images are hotlinked from their
/// sources (only https, only the listed hosts by CSP). Print it to PDF from
/// any browser. Image files are never written by LeMuse.
pub fn to_sheet_html(heading: &str, date: &str, slides: &[Slide], image_hosts: &[&str]) -> String {
    let mut cells = String::new();
    for s in slides {
        let Some(img) = https(&s.display_url) else {
            continue;
        };
        let title = s
            .title
            .as_deref()
            .filter(|t| !t.is_empty())
            .unwrap_or("Untitled");
        let credit = s.creator.as_deref().unwrap_or("");
        let link = s
            .page_url
            .as_deref()
            .and_then(https)
            .map(|u| format!(r#" <a href="{}">source</a>"#, esc(u)))
            .unwrap_or_default();
        cells.push_str(&format!(
            "<figure><img src=\"{}\" alt=\"{}\"><figcaption><b>{}</b>{}{}</figcaption></figure>\n",
            esc(img),
            esc(title),
            esc(title),
            if credit.is_empty() {
                String::new()
            } else {
                format!("<br>{}", esc(credit))
            },
            link
        ));
    }
    let csp = format!(
        "default-src 'none'; img-src {}; style-src 'unsafe-inline'",
        image_hosts.join(" ")
    );
    format!(
        r#"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{csp}">
<meta name="referrer" content="no-referrer">
<title>{title}</title>
<style>
  @page {{ size: A4; margin: 12mm; }}
  body {{ font: 10pt/1.35 system-ui, sans-serif; margin: 0 auto; max-width: 190mm; color: #111; }}
  header {{ display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #999; margin-bottom: 4mm; }}
  h1 {{ font-size: 14pt; margin: 0 0 2mm; }}
  .grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }}
  figure {{ margin: 0; break-inside: avoid; }}
  img {{ display: block; width: 100%; height: 42mm; object-fit: contain; background: #eee; }}
  figcaption {{ font-size: 7.5pt; margin-top: 1mm; overflow-wrap: anywhere; }}
  a {{ color: inherit; }}
  footer {{ margin-top: 5mm; font-size: 7.5pt; color: #555; }}
</style>
</head>
<body>
<header><h1>{title}</h1><span>{date} · {n} images</span></header>
<div class="grid">
{cells}</div>
<footer>Made with LeMuse. Images belong to their creators and are shown from their sources for personal reference.</footer>
</body>
</html>
"#,
        title = esc(heading),
        date = esc(date),
        n = slides.len(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(title: &str) -> LinkRow {
        LinkRow {
            block_id: 7,
            connector: "arena".into(),
            title: Some(title.into()),
            creator: None,
            page_url: Some("https://www.are.na/block/7".into()),
            origin_url: None,
            images: vec![
                ("original".into(), "https://cdn.invalid/o.jpg".into()),
                ("large".into(), "https://images.invalid/l.jpg".into()),
            ],
        }
    }

    #[test]
    fn csv_escapes_and_defuses_formulas() {
        let csv = to_csv(&[
            row("=HYPERLINK(\"http://evil\")"),
            row("Chair, \"oak\"\nstudy"),
        ]);
        let lines: Vec<&str> = csv.split("\r\n").collect();
        assert!(lines[0].starts_with("block_id,source,title"));
        assert!(
            lines[1].contains("\"'=HYPERLINK(\"\"http://evil\"\")\""),
            "{}",
            lines[1]
        );
        assert!(csv.contains("\"Chair, \"\"oak\"\"\nstudy\""));
        assert!(lines[1].contains("https://cdn.invalid/o.jpg,https://images.invalid/l.jpg,,"));
    }

    #[test]
    fn text_lists_the_best_link_per_image() {
        assert_eq!(
            to_text(&[row("a"), row("b")]),
            "https://cdn.invalid/o.jpg\n".repeat(2)
        );
    }

    fn slide(id: i64, title: &str, url: &str) -> Slide {
        Slide {
            block_id: id,
            title: Some(title.into()),
            display_url: url.into(),
            width: None,
            height: None,
            page_url: Some("javascript:alert(1)".into()),
            creator: Some("A <b>creator</b>".into()),
            attribution: None,
            saved: false,
            categories: vec![],
            connector: "arena".into(),
            original_url: None,
            fallback_urls: vec![],
        }
    }

    #[test]
    fn sheet_escapes_remote_text_and_keeps_https_only() {
        let html = to_sheet_html(
            "Wood <script>",
            "2026-11-18",
            &[
                slide(
                    1,
                    "\"><img src=x onerror=alert(1)>",
                    "https://images.are.na/a.jpg",
                ),
                slide(2, "plain", "http://images.are.na/b.jpg"),
            ],
            &["https://images.are.na"],
        );
        assert!(!html.contains("<script>") && !html.contains("onerror=alert(1)>"));
        assert!(html.contains("&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"));
        assert!(
            html.contains("https://images.are.na/a.jpg")
                && !html.contains("http://images.are.na/b.jpg")
        );
        assert!(
            !html.contains("javascript:"),
            "non-https page links are dropped"
        );
        assert!(html.contains("A &lt;b&gt;creator&lt;/b&gt;"));
    }

    #[test]
    fn picks_are_stable_per_seed() {
        let all: Vec<Slide> = (0..50)
            .map(|i| slide(i, "t", "https://images.are.na/x.jpg"))
            .collect();
        let ids = |v: Vec<Slide>| v.iter().map(|s| s.block_id).collect::<Vec<_>>();
        let a = ids(pick(&all, 10, "2026-11-18"));
        assert_eq!(a, ids(pick(&all, 10, "2026-11-18")));
        assert_ne!(a, ids(pick(&all, 10, "2026-11-19")));
        assert_eq!(a.len(), 10);
        assert_eq!(pick(&all, 99, "x").len(), 50);
    }

    #[test]
    fn calendar() {
        assert_eq!(civil_from_days(0), (1970, 1, 1));
        assert_eq!(civil_from_days(20_775), (2026, 11, 18));
        assert_eq!(civil_from_days(11_016), (2000, 2, 29));
    }
}
