# ServeNSurf

A Windows app that plays a **stream or slideshow of reference images on a topic**: drawing, industrial design,
CAD, anything you collect on [Are.na](https://www.are.na). Pick the channels that make up a topic, hit play,
and save the images you want to keep as local files.

> Status: **M0, architecture skeleton.** The core logic is implemented and tested. The first playable slideshow
> lands in M1. See [docs/PLAN.md](docs/PLAN.md).

## How it works

1. In `servensurf.toml` (in your library folder), define topics and the Are.na channels that feed them.
2. On launch, ServeNSurf refreshes each topic's metadata. It's incremental and cheap: at most 2 API pages per
   channel.
3. The slideshow streams images straight from Are.na's image servers. Nothing is downloaded unless you ask.
4. Click **Save** on any image to store the full-resolution original in `views/<topic>/`, ready for Explorer,
   PureRef or your CAD tool.

```toml
# %USERPROFILE%\Pictures\ServeNSurf\servensurf.toml
[library]
root = "C:/Users/you/Pictures/ServeNSurf"

[sync]
contact = "you@example.com"   # sent in the User-Agent, as Are.na asks

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
cargo run -p servensurf-cli -- --library ./library init
cargo run -p servensurf-cli -- --library ./library topics
cd app && npm install && npm run tauri dev   # desktop app
```

More commands are in [CLAUDE.md](CLAUDE.md#commands). How it's built and why is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/adr/](docs/adr/). Contribution rules are in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Respecting sources

ServeNSurf only uses channels you choose. It streams them the way Are.na's API is meant to be used, never crawls
or bulk-downloads, and always shows who saved each image with a link back to Are.na. Content belongs to its
creators, and saved images are for personal reference. See [ADR-0004](docs/adr/0004-arena-compliance-and-sources.md)
and [ADR-0007](docs/adr/0007-stream-first-topics.md).

## License

[MIT](LICENSE)
