# LeMuse

**Real art, credited.** A Windows app for drawing practice that plays a **stream or slideshow of reference
images on a topic**: figure, objects, architecture, industrial design, CAD. Images come from free museum
collections (CC0 open access) and the [Are.na](https://www.are.na) channels you choose. No ads, no algorithm,
no AI feed.

- **Practise:** timed sessions (gesture warm-ups, classes, long studies, or your own plan) that end with a sheet
  of what you drew, and a practice log without streaks; mirror, upside down, greyscale, values (2–9, or just the
  darks or lights), drawing effects (lines, strokes, cross-hatch), squint and grids, all on screen only.
- **Collect:** ♥ favourites and playlists; Save keeps the full-size original as a local file for Explorer,
  PureRef, Krita or your CAD tool.
- **Calm by design:** each image shows who made it and links back to its source.

> Status: **1.0.** See [docs/PLAN.md](docs/PLAN.md). Repo:
> <https://github.com/OopsieLazy/LeMuse> · Licence: [MIT](LICENSE).

## How it works

1. Topics live in `lemuse.toml` in your library folder (`%USERPROFILE%\Pictures\LeMuse`). Each topic is fed by
   museum keyword searches and the Are.na channels you add (**+** in the app, or `lemuse add-channel`).
2. On launch, LeMuse refreshes each topic's details. It's incremental and polite: a few API pages per channel.
3. The slideshow streams images straight from the sources' image servers. Nothing is downloaded unless you
   press Save.
4. Press **N** for a timed session, **?** for every keyboard shortcut.

```toml
# %USERPROFILE%\Pictures\LeMuse\lemuse.toml
[[topic]]
name = "Industrial design"
slide_seconds = 8
shuffle = true

[[topic.source]]
source = "arena"
channel = "your-channel-slug"   # from are.na/<user>/<channel-slug>
```

## Develop

Requirements: Windows 10/11, Rust (MSVC toolchain), Node 20+, Java 11+ (W3C check), WebView2 (preinstalled on
Windows 11).

```sh
cargo test                                   # core + CLI tests
cargo run -p lemuse-cli -- --library ./library init
cd app && npm ci --ignore-scripts && npm run tauri dev   # desktop app
```

Using it: [docs/guide/user-guide.md](docs/guide/user-guide.md). New to the code? Start with the hands-on map: [docs/guide/hands-on.md](docs/guide/hands-on.md) (where things live, the
guardrails, first exercises). More commands are in [CLAUDE.md](CLAUDE.md#commands); how it's built and why is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/adr/](docs/adr/). Contribution rules are in
[CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Privacy

LeMuse has no accounts and no tracking. It talks only to the sources whose images you see (Are.na and the
Cleveland Museum of Art's open-access API and image servers), and, once a day if you leave it on, to GitHub to
see whether a newer LeMuse exists. Details: [docs/privacy.md](docs/privacy.md). Your Are.na token is kept in Windows Credential
Manager, never in a file. Everything else (topics, playlists, favourites, settings, saved images) stays in your
library folder on your PC.

## Respecting sources

LeMuse only uses channels you choose. It streams them the way Are.na's API is meant to be used, never crawls
or bulk-downloads, and always shows who made or saved each image with a link back. Museum images are CC0 (LeMuse
keeps only open-access records). Are.na images belong to their creators; saved copies are for personal
reference. See [ADR-0004](docs/adr/0004-arena-compliance-and-sources.md) and
[ADR-0007](docs/adr/0007-stream-first-topics.md).

LeMuse isn't affiliated with Are.na or any museum; their names only say where images come from.

**Takedown:** LeMuse hosts no images; it shows them from their source. To have an image removed, ask the
source: Are.na's [terms](https://www.are.na/terms) name its copyright agent, and museums list a contact on each
object page. If LeMuse itself should stop showing something (for example a starter channel), open an issue.

## License

[MIT](LICENSE)
