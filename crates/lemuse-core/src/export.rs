//! Link exports (ADR-0016): every stored link of a topic, playlist or All as
//! CSV, JSON or plain text, for spreadsheets, scripts and backups. Links
//! only; no image bytes.
//!
//! Titles and names come from remote sources, so CSV cells are escaped
//! (RFC 4180) and cells a spreadsheet would run as a formula (`=`, `+`,
//! `-`, `@`, tab, CR) are prefixed with `'` (OWASP CSV injection).

use crate::store::catalog::LinkRow;

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
}
