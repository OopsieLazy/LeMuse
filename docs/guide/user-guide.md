# LeMuse user guide

LeMuse plays reference images on a topic, from free museum collections and the Are.na channels you choose, and
helps you practise drawing from them. Press **?** in the app for every shortcut.

## First steps

1. **Install** with `LeMuse_<version>_x64-setup.exe`. The installer isn't code-signed: if Windows says "Windows
   protected your PC", choose More info → Run anyway. To check the download, compare it with the release's
   `SHA256SUMS` (docs/release.md).
2. **Open LeMuse.** The starter topics fill on the first refresh; images appear as they arrive.
3. **Pick a topic** in the list on the left (or ☰ in a small window).

## Your Are.na channels

- **Add one:** press **+** (or **A**), paste a channel link, pick a topic.
- **Find more:** press **D** for Find channels. Search Are.na in your browser, preview a channel, or list
  **Channels you follow**.
- **Channels you follow:** after you save your Are.na token (Settings → Are.na account), each followed channel
  shows "in Objects" or "new: becomes its own topic". Press **Add**, or **Add all** to bring in every new one.
  - Each becomes **its own topic, named after the channel**, listed under **Following on Are.na** in the topic
    list.
  - You can instead put each into the existing topic that fits it best, or all into one topic.
  - Big channels keep loading over the next refreshes.
- **From the command line:** `lemuse import-following --dry-run`, then `lemuse import-following`. Tidy up with
  `lemuse remove-channel <slug> --topic T` and `lemuse remove-topic NAME` (empty topics only).

## Practise

- **Timed session (N):** pick a plan, from Gesture warm-up (10 × 30 s) to Long class (about 1 h), or build your
  own. Each pose starts when its image has loaded.
  - Keys: Space pause, → skip, ← back (restarts the pose), Esc end.
  - Soft beeps count down the last 3 seconds; you can switch them off.
  - At the end you see what you drew, ♥ the ones you liked, keep them as a playlist, or Resume if you ended by
    mistake.
- **Your practice:** the planner shows this week's drawings and eight weekly bars. There are no streaks: any week
  you draw counts. Hide it there, or clear it in Settings → Practice.
- **Study aids (the half-circle button):** all on screen only; the image itself is never changed.
  - **X** mirror · **U** upside down · **G** greyscale · **B** squint · **O** grids · **0** all off.
  - **V values:** 2 (notan), 3, 4, 5, 7 or 9 tones. Move the Darker/Lighter slider to shift where the tones
    split.
  - **I which values:** all, **darks only** (find the absolute darks), **lights only**, or **darks + lights**.
  - **E drawing effect:** lines, strokes ↕ (grass, hair, rain), strokes ↔ (water, wood grain) or cross-hatch.
    Marks follow the picture's values, so you see how to draw the effect rather than every blade. Try strokes
    with 4 values and squint.
  - A badge on the image always says which aids are on.

## Keep and organise

- **♥ (K):** adds the image to Favourites.
- **Playlist (P):** add to any playlist.
- **Save:** the full-size original goes into your LeMuse folder.
- **Right-click** an image: Save original, Copy link, Open source page, **Hide this image**, **Mark as nudity**.

## Content

Images that may contain nudity are hidden by default. LeMuse spots them from titles, descriptions, museum types
and channel names, so some slip through: right-click → Mark as nudity. To show them, or to bring back hidden
images, go to Settings → Content.

## Updates

Settings → About looks for a newer LeMuse on GitHub (once a day at most; you can switch it off) and links to the
release page. Download the new installer and run it; your library stays as it is.

## Privacy

No accounts, no tracking. See [privacy.md](../privacy.md).
