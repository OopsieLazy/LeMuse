//! One version everywhere (work item 26): the workspace `Cargo.toml`, the
//! app's `package.json` and `package-lock.json`, and `tauri.conf.json` (the
//! installer's version) must agree, so a build never reports an old number.

use std::path::PathBuf;

fn repo() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn json_version(rel: &str) -> String {
    let text = std::fs::read_to_string(repo().join(rel)).unwrap_or_else(|e| panic!("{rel}: {e}"));
    let v: serde_json::Value = serde_json::from_str(&text).unwrap_or_else(|e| panic!("{rel}: {e}"));
    v["version"]
        .as_str()
        .unwrap_or_else(|| panic!("{rel}: no version"))
        .to_string()
}

#[test]
fn every_version_file_matches_the_workspace() {
    let ours = env!("CARGO_PKG_VERSION");
    for rel in [
        "app/package.json",
        "app/package-lock.json",
        "app/src-tauri/tauri.conf.json",
    ] {
        assert_eq!(
            json_version(rel),
            ours,
            "{rel} says a different version than Cargo.toml"
        );
    }
    let lock =
        std::fs::read_to_string(repo().join("app/package-lock.json")).expect("package-lock.json");
    let lock: serde_json::Value = serde_json::from_str(&lock).expect("package-lock.json is JSON");
    assert_eq!(
        lock["packages"][""]["version"].as_str(),
        Some(ours),
        "package-lock.json root package"
    );
}
