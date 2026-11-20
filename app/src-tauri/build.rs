fn main() {
    // The installer bundles notices/THIRD-PARTY-NOTICES.txt (ADR-0030).
    // `npm run notices` writes the full list before every installer build
    // (beforeBuildCommand); a plain `cargo check`, clippy or dev build gets a
    // short placeholder, because Tauri refuses to build with a missing resource.
    let path = std::path::Path::new("notices/THIRD-PARTY-NOTICES.txt");
    if !path.exists() {
        std::fs::create_dir_all("notices").expect("create notices/");
        std::fs::write(
            path,
            "Third-party notices weren't generated for this build.\n\
             Run `npm run notices` in app/ (installer builds always do).\n",
        )
        .expect("write the notices placeholder");
    }
    println!("cargo:rerun-if-changed=notices/THIRD-PARTY-NOTICES.txt");
    tauri_build::build()
}
