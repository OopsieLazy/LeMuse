# LeMuse

A Windows app that plays a **stream or slideshow of reference images on a topic**: drawing, industrial design,
CAD, anything you collect on [Are.na](https://www.are.na). Pick the channels that make up a topic, hit play,
and save the images you want to keep as local files.

> Status: **playable preview.** Real refresh, real slideshow, test installer per PR. Save and settings are next.
> See [docs/PLAN.md](docs/PLAN.md). Repo: <https://github.com/OopsieLazy/LeMuse> · Licence: [MIT](LICENSE).

## How it works

1. In `lemuse.toml` (in your library folder), define topics and the Are.na channels that feed them.
2. On launch, LeMuse refreshes each topic's metadata. It's incremental and cheap: at most 2 API pages per
   channel.
3. The slideshow streams images straight from Are.na's image servers. Nothing is downloaded unless you ask.
4. Click **Save** on any image to store the full-resolution original in `views/<topic>/`, ready for Explorer,
   PureRef or your CAD tool.

```toml
# %USERPROFILE%\Pictures\LeMuse\lemuse.toml
[library]
root = "C:/Users/you/Pictures/LeMuse"

[sync]
contact = "https://github.com/you"   # optional; sent in the User-Agent (default: the LeMuse repo URL)

[[topic]]
name = "Industrial design"
slide_seconds = 8
shuffle = true

[[topic.source]]
source = "arena"
channel = "your-channel-slug"   # from are.na/<user>/<channel-slug>
```

## Develop

Requirements: Windows 10/11, Rust (MSVC toolchain), Node 20+, WebView2 (preinstalled on Windows 11).

```sh
cargo test                                   # core + CLI tests
cargo run -p lemuse-cli -- --library ./library init
cargo run -p lemuse-cli -- --library ./library topics
cd app && npm install && npm run tauri dev   # desktop app
```

More commands are in [CLAUDE.md](CLAUDE.md#commands). How it's built and why is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/adr/](docs/adr/). Contribution rules are in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Respecting sources

LeMuse only uses channels you choose. It streams them the way Are.na's API is meant to be used, never crawls
or bulk-downloads, and always shows who saved each image with a link back to Are.na. Content belongs to its
creators, and saved images are for personal reference. See [ADR-0004](docs/adr/0004-arena-compliance-and-sources.md)
and [ADR-0007](docs/adr/0007-stream-first-topics.md).

## License

[MIT](LICENSE)
