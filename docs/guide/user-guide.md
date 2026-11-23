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

The **Practice** button (the half-circle) holds the timed session, the grid view and the study aids. While a
session runs, a ⏱ button appears next to it to end the session.

- **Timed session (N):** pick a plan, from Gesture warm-up (10 × 30 s) to Long class (about 1 h), or build your
  own. Each pose starts when its image has loaded.
  - Keys: Space pause, → skip, ← back (restarts the pose), Esc end.
  - Soft beeps count down the last 3 seconds; you can switch them off.
  - At the end you see what you drew, ♥ the ones you liked, keep them as a playlist, or Resume if you ended by
    mistake.
- **Your practice:** the planner shows this week's drawings and eight weekly bars. There are no streaks: any week
  you draw counts. Hide it there, or clear it in Settings → Practice.
- **Study aids (in Practice):** all on screen only; the image itself is never changed.
  - **X** mirror · **U** upside down · **G** greyscale · **B** squint · **O** grids · **0** all off.
  - **V values:** 2 (notan), 3, 4, 5, 7 or 9 tones. Move the Darker/Lighter slider to shift where the tones
    split.
  - **I which values:** all, **darks only** (find the absolute darks), **lights only**, or **darks + lights**.
  - **E drawing effect:** lines, strokes ↕ (grass, hair, rain), strokes ↔ (water, wood grain) or cross-hatch.
    Marks follow the picture's values, so you see how to draw the effect rather than every blade. Try strokes
    with 4 values and squint.
  - A badge on the image always says which aids are on.
- **The session clock** is a large ring by default; choose small or hidden in Settings → Practice, where you can
  also turn off the flash around the image on each new pose.
- **Behind the image** (Settings → Image): a neutral grey keeps values honest; pick white, light, mid, dark or
  black.
- **Museum images** show a label like a gallery wall: who made it, a CC0 badge (public domain), date, medium,
  size and credit line. On a big screen they load at full museum resolution.

## Find and browse

- **Shortcuts:** press **?** for the list. Choose **Change** next to any of them and press the key you want
  (Settings → Keyboard has a link too). **H** shows or hides the control bar in every window size, the mini
  player included.
- **A channel that shows nothing** may hold other channels instead of images. Open Find channels, preview it,
  and add the channels inside that you want; each becomes its own topic.
- **Search (/):** the box at the top of the topic list searches titles, descriptions and creators across your
  whole library.
- **Zoom:** turn the mouse wheel (or pinch on a touchpad or screen) over the image to zoom toward the pointer;
  drag to look around; double-click to zoom in, and again to see the whole image. Keys: **=** (or **+**) in,
  **-** out, **Z** fits. The level shows at the top with a **Fit** button. Grid lines and mirror zoom with the
  image, and LeMuse loads the sharpest size it has while you look closer. The next image starts whole.
- **Grid (W):** the whole view as a contact sheet. It keeps going as you scroll, past 500 images; it opens at the
  image you were on; **Small / Medium / Large** at the top change the thumbnails. Arrow keys move, Enter (or a
  click) plays from there; Esc goes back.
- **Saved:** every image you saved, newest first (in the topic list under All).
- **Rename or remove a topic:** press **+**, pick the topic, and use **This topic**. Removing asks once more;
  your playlists and saved files stay.
- LeMuse **remembers where you were**: it opens on the same view and image next time.

## Keep and organise

- **♥ (K):** adds the image to Favourites.
- **Playlist (P):** add to any playlist.
- **Save (Q):** the Save dialog opens; pick a folder and a name. The full-size original goes there (and into
  Saved in the app). A note at the top says which folder it went to; it stays until you press its **×**. The
  next save starts in the same folder. The image stays on screen.
- **Right-click** an image, or press **⋯** in the bar: Save original as…, Copy link, Related Are.na channels, Open
  source page, **Hide this image**, **Mark as nudity**.
  Changed your mind? Press **Undo** on the note that appears.

## Make it yours

- **Themes:** Settings → Look → Theme. Built in: Studio (light or dark), Gallery, Blueprint, Paper, Millennium
  and **Pine & coral** (pine green, cream text, a coral accent).
- **Your own themes:** Settings → Look → **New theme from colours…**
  - Give it a name and four colours: background, panel, text and accent. Pick each one, or type its hex code
    (`#ffb000` or `ffb000`).
  - The preview shows the result as you go.
  - Press **Save and use**.
  - Make as many as you like (up to 24), and use **Edit** or **Delete** on any of them.
- **Readable by design:** if your text would be hard to read on your background or panel, the editor says so and
  waits. Muted text and links are adjusted for you. The area behind the image always stays a neutral grey, so
  the picture's colours and values read true.

## LeMuse on the desktop

- **The tray:** LeMuse has an icon by the clock (it may be under the ^ arrow). Click it to show or hide LeMuse;
  right-click for Next image, Play or pause, Mini player, Refresh now and Quit.
- **Start with Windows:** Settings → Windows. LeMuse then starts in the tray, out of the way. Moved your
  portable folder? LeMuse fixes the start-up entry the next time you open it from the new place.
- **Keep running in the tray when I close the window:** Settings → Windows. Closing then hides the window and
  the slideshow keeps going; Quit from the tray ends it. Off by default.
- **Which build is this?** Settings → About shows the version and build (for example `1.1.0 · build abc1234`).
  The portable folder's README.txt names the same build, so you can tell an old copy from a new one.

## Content

Images that may contain nudity are hidden by default. LeMuse spots them from titles, descriptions, museum types
and channel names, so some slip through: right-click → Mark as nudity. To show them, or to bring back hidden
images, go to Settings → Content.

## Updates

Settings → About looks for a newer LeMuse on GitHub (once a day at most; you can switch it off) and links to the
release page. Download the new installer and run it; your library stays as it is.

## Privacy

No accounts, no tracking. See [privacy.md](../privacy.md).
