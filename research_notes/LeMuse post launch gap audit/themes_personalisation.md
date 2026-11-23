# Themes and visual personalisation for LeMuse (post-launch gap audit)

Research date 2026-11-21. Scope: built-in theme candidates, theme features expected in 2026 desktop apps, what must never be themed in an art viewer, and licensing of borrowed palettes. This extends `research_notes/LeMuse design and art review/art_viewing_design.md` (2026-11-19), which already covers simultaneous contrast, ISO 12608/3664/12646 surround figures, Lightroom's fill colours and Lights Out, and the zero-chroma stage rule. Those findings aren't repeated here. Licence and star data for GitHub repos came from the GitHub REST API on 2026-11-21. Where I cite a repo page, the licence comes from that API call.

## 1. Community palettes: which are popular, their licences, and whether their names can be used

### Takeaway
Every major community palette checked is permissively licensed. All are MIT except tokyonight.nvim (Apache-2.0). So LeMuse, which is MIT, can ship their hex values as long as it keeps the copyright notice. None has a published trademark policy, but Pantone-style risk is absent. The two real cautions are naming and colour. Name the theme after the palette and credit it ("Mocha — Catppuccin palette, MIT"), but don't use the project's logo or imply endorsement. And these are code-editor palettes, so their chroma belongs in chrome and accent only, never on the stage.

### Cited Findings
**Popularity and licences** (GitHub stars, 2026-11-21, a rough popularity signal):

| Palette | Repo | Stars | Licence | Last push |
|---|---|---|---|---|
| Dracula | [dracula/dracula-theme](https://github.com/dracula/dracula-theme) | 23.6k | MIT | Nov 2026 |
| Catppuccin | [catppuccin/catppuccin](https://github.com/catppuccin/catppuccin) | 20.0k | MIT | Jul 2026 |
| Solarized | [altercation/solarized](https://github.com/altercation/solarized) | 16.0k | MIT | 2024 |
| Gruvbox | [morhetz/gruvbox](https://github.com/morhetz/gruvbox) | 15.8k | MIT/X11 (in the README; no LICENSE file, so the GitHub API reports none) | 2026 |
| Tokyo Night | [folke/tokyonight.nvim](https://github.com/folke/tokyonight.nvim) | 8.3k | **Apache-2.0** | 2026 |
| Catppuccin (Neovim port) | [catppuccin/nvim](https://github.com/catppuccin/nvim) | 7.7k | MIT | 2026 |
| Nord | [nordtheme/nord](https://github.com/nordtheme/nord) | 6.9k | MIT (© Sven Greb) | Oct 2023, little activity since |
| Kanagawa | [rebelot/kanagawa.nvim](https://github.com/rebelot/kanagawa.nvim) | 6.5k | MIT | 2026 |
| Everforest | [sainnhe/everforest](https://github.com/sainnhe/everforest) | 4.3k | MIT | 2026 |
| One Dark | [joshdick/onedark.vim](https://github.com/joshdick/onedark.vim) | 4.0k | MIT | 2026 |
| One Dark (Atom original) | [atom/one-dark-syntax](https://github.com/atom/one-dark-syntax) | — | MIT | archived 2018 |
| Rosé Pine | [rose-pine/neovim](https://github.com/rose-pine/neovim) / [rose-pine/rose-pine-theme](https://github.com/rose-pine/rose-pine-theme) | 3.1k / 1.6k | MIT | 2026 |
| Ayu | [ayu-theme/ayu-colors](https://github.com/ayu-theme/ayu-colors) | 0.9k | MIT | Nov 2026 |

**Catppuccin:**
- Its four flavours are Latte (light), Frappé, Macchiato and Mocha. The palette is MIT, and the repo points to a style guide for applying it — [catppuccin/catppuccin](https://github.com/catppuccin/catppuccin). The licence reads "MIT License, Copyright (c) 2021 Catppuccin" ([LICENSE](https://raw.githubusercontent.com/catppuccin/catppuccin/main/LICENSE)).
- The port-creation guide says ports inside the org are published under MIT. It names repos after the target app and asks for a "Thanks to" section. It doesn't say whether outside apps may ship the flavours, and it has no logo or brand rules — [port-creation.md](https://github.com/catppuccin/catppuccin/blob/main/docs/port-creation.md)
- Staff "reserve the right to remove and reject showcase additions" — [catppuccin/catppuccin](https://github.com/catppuccin/catppuccin)

**Dracula:**
- The free theme is MIT (© Dracula Theme). A separate **paid** product, Dracula PRO, launched on 11 Feb 2020 — [Wikipedia, Dracula (color scheme)](https://en.wikipedia.com/wiki/Dracula_(color_scheme)); [draculatheme.com/pro](https://draculatheme.com/pro)
- A third-party Sublime Merge port states it is "not affiliated with Dracula Pro" — [facelessuser/merge-dracula-theme](https://github.com/facelessuser/merge-dracula-theme)

**Obsidian signal:** a Catppuccin derivative, AnuPpuccin, is among the most-downloaded Obsidian themes (about 1.24M all-time, October 2026). The source is a third-party list that says some placements are paid partnerships — [lilachbullock.com](https://www.lilachbullock.com/best-obsidian-themes/)

### Inferences
- **Licensing.** Hex values are arguably uncopyrightable facts. Even so, the clean route is to include each palette's MIT or Apache notice in `THIRD-PARTY-NOTICES` or the About screen and credit it in the theme picker. Apache-2.0 (Tokyo Night via folke) also asks you to keep the NOTICE file if there is one. Use the VS Code enkia version (not checked here) or folke's version, and record which.
- **Names.** None of these projects publishes a trademark policy (gap, below). Naming the theme "Catppuccin Mocha", with a credit and no logo, follows how thousands of third-party ports already work. Avoid "Dracula PRO" colours: those are a paid product, and their values sit on its sales site.
- **Fit for an art viewer.** These palettes were tuned for syntax highlighting: up to 16 saturated colours on a tinted background. For LeMuse, map each one onto the four-colour custom-theme model (background, panel, text, accent). Keep the stage neutral as before. Pick the palette's lowest-chroma background, and its accent used sparingly. Catppuccin's Mocha base #1e1e2e is a blue-violet tint (from memory, not verified here). That's fine for chrome, never for the surround.
- **Recommended "community pack"** (opt-in section of the picker), chosen for recognisability, active maintenance and MIT licence: **Catppuccin (Latte + Mocha)**, **Rosé Pine (Dawn + Main)**, **Nord**, **Gruvbox (light + dark)**, **Solarized (light + dark)**, **Everforest**, **Kanagawa**. Skip Dracula: it's saturated purple and pink with a paid-PRO conflation risk. Skip One Dark: the original is archived and it's generic. Skip Tokyo Night: it adds Apache NOTICE overhead and duplicates Catppuccin/Nord. Solarized is notable for being designed around CIELAB lightness, a good story for artists (not re-verified in this session).

### Gaps
- I found no published trademark or brand-use policy for Catppuccin, Dracula, Nord, Rosé Pine or Gruvbox. Whether "Dracula" or "Nord" are registered marks wasn't checked on USPTO or EUIPO.
- No reliable cross-ecosystem popularity ranking for 2025–2026 (e.g. VS Code Marketplace install counts) was retrieved. Stars are a proxy.
- The licence of the VS Code Tokyo Night (enkia) repo wasn't returned by the API call (repo name likely changed).

## 2. Art- and craft-inspired palettes with real provenance, and Pantone

### Takeaway
The strongest candidates have documented, nameable origins that artists recognise. Examples:
- a museum "grey gallery" (Rijksmuseum 2013, Wilmotte);
- darkroom safelight amber and red (defined by wavelength cut-offs);
- risograph inks (named spot inks, with community hex approximations);
- traditional Japanese colours (named colours from a published colour book);
- cyanotype (Prussian blue);
- Bauhaus primaries.

Pantone is the one source to avoid by name. Pantone asserts trademark and copyright over its colour names and numbers and requires written permission for cross-referencing. A theme may use a similar hex, but it must not say "Pantone", "Cloud Dancer", "Mocha Mousse" or a PMS number.

### Cited Findings
**Museum grey (Rijksmuseum)**
- At the 2013 reopening, interior designer Jean-Michel Wilmotte replaced bright white walls with grey: "pale gray" with indirect and spot lighting — [Architect Magazine](https://www.architectmagazine.com/design/buildings/rijksmuseum-renovation_o/).
- Other descriptions: "intense grey, deep wall colours" ([The Low Countries](https://the-low-countries.com/wp-content/uploads/2024/08/TLC_21_VisualArts_TimZeedijk.pdf)), "gunmetal surroundings" ([Monocle](https://monocle.com/culture/rijksmuseum-reopening-amsterdam-art/)), and "blue-grey" hangings, with Wilmotte called "obsessively anti-white" ([The Spectator](https://spectator.co.uk/article/an-artistic-rebirth-reopening-the-rijksmuseum)).
- The museum's own Bulletin calls it "a subdued colour scheme conceived by the interior designer" — [Rijksmuseum Bulletin](https://bulletin.rijksmuseum.nl/article/download/9856/10352).
- Sources disagree on whether the grey is "pale" or "deep", and none gives a paint code.

**Darkroom safelight**
- Ilford's 902 (light brown) filter is listed for Multigrade RC/FB, Ilfobrom and Ilfospeed papers. Ilford warns that "the apparent colour of a safelight filter is not always a good enough guide to the wavelength" — [Ilford technical information](https://www.ilfordphoto.com/amfile/file/download/file/605/product/613).
- A forum post quoting Ilford's fact sheet says the 902 transmits only from about 560 nm upward — [Photrio](https://www.photrio.com/forum/threads/wavelength-of-ilfords-902-safelight.27551).
- A typical amber safelight (Kodak OC) is about 590 nm, and a red one (Kodak 1) passes light above about 600 nm — [Lensnotes](https://lensnotes.com/?p=543); see also [Kodak, A Guide to Darkroom Illumination (K-4)](https://www.kodak.com/content/products-brochures/Film/KODAK-A-Guide-to-Darkroom-Illumination-K-4.pdf).

**Risograph**
- RISO publishes ink safety data sheets by name and code, but no official hex values — [RISO UK SDS](https://www.riso.co.uk/support/safety-data-sheets/).
- Community values: Fluorescent Pink #FF48B0 and Blue #0078BF, taken from stencil.wiki — [halfcadence Riso recipes](https://halfcadence.github.io/recipes/colors); [risoinks R package](https://rdrr.io/github/anfederico/risoinks/src/R/color.R); [UT Print wiki, Riso Ink Colors](https://cloud.wikis.utexas.edu/wiki/spaces/utprint/pages/53086355).
- Printed riso ink is semi-translucent, so hex values vary between sources (same sources).

**Traditional Japanese colours**
- The Nippon Colors dataset traces back to the book *日本の伝統色 The Traditional Colors of Japan* (PIE Books, 2007) — [Qotes/Colors](https://github.com/Qotes/Colors); [Nippon Colors app](https://apps.apple.com/app/id1389937356).
- *Kasane no irome* (Heian-period layered colour combinations) lists "more than 100" patterns — [Government of Japan, Highlighting Japan](https://gov-online.go.jp/eng/publicity/book/hlj/html/202010/202010_06_en.html).

**Pantone Colour of the Year**
- 2025 was Mocha Mousse; 2026 is **PANTONE 11-4201 Cloud Dancer**, an off-white announced on 4 Dec 2025. It is the first white since 1999 — [Pantone press release](https://www.pantone.com/articles/press-releases/pantone-announces-color-of-the-year-2026-cloud-dancer); [Dezeen](https://www.dezeen.com/2025/12/04/lofty-white-cloud-dancer-pantone-colour-of-the-year-2026/).

**Pantone trademark and licensing**
- Pantone's trademark guidelines say "the trademark PANTONE must always precede each PANTONE Color name and/or number". They require written permission to claim a match to a Pantone colour or to cross-reference any Pantone system — [Pantone general trademark guidelines (PDF)](https://pantone.com.br/mur_general_trademark.pdf).
- Pantone's terms say its trademarks may not be used "for any color-related products or services" without permission — [Pantone Color Services Terms (PDF)](https://pantone-web-assets-dev.s3.us-east-2.amazonaws.com/magento/media/downloads/customer-service/Pantone_Color_Services_Terms_and_Conditions.pdf).
- Adobe's notices say Pantone colour data is licensed to Adobe "for use only in combination with" its products — [Adobe Photoshop Elements copyright notice](https://helpx.adobe.com/ru/photoshop-elements/copyright.html).
- Secondary commentary says the colours themselves can be used without a licence as long as no affiliation is implied — [Aganta Foundry](https://agantafoundry.com/blog/pantone-for-beginners/). This is not a legal source.

### Inferences
**Proposed built-in "studio" pack.** Every theme keeps the neutral stage, and provenance goes in a one-line note in the picker.

| Theme | Chrome | Accent | Provenance note |
|---|---|---|---|
| **Museum grey** | Deep cool-neutral grey | Off-white | "After the Rijksmuseum's 2013 grey galleries" |
| **Safelight** | Near-black | Amber about #FFB000, or red about #C00000 | A dark-room mode for night sessions. Must still pass 4.5:1, and its whole point is minimal light at night |
| **Graphite & newsprint** | Warm-grey newsprint (light) | Graphite (no colour accent) | A greyscale-first theme for value study |
| **Sumi & washi** | Washi off-white with sumi-ink text (light), or the inverse (dark) | Shu (vermilion) | Named colours from the traditional-colour set |
| **Riso** | Paper white | Fluorescent Pink + Blue duo | Spot-ink look, credited as approximations |
| **Cyanotype** | Prussian-blue chrome | Paper white | — |
| **Terracotta / studio pottery** | Clay-warm chrome | — | — |
| **Bauhaus** | Off-white | Red, yellow, blue as state colours | Never all three near the image |

- **Pantone.** Don't name any theme "Cloud Dancer", "Mocha Mousse" or "Colour of the Year". A generic name like "Mocha" or "Cloud" with a similar hex is fine, as long as the app says nothing about Pantone. Pantone's 2027 colour, normally announced in early December, isn't out as of 2026-11-21, so don't speculate.
- **Risograph.** Credit stencil.wiki-style hex values as approximations of RISO inks, and don't use RISO's logo.

### Gaps
- No museum publishes paint codes for its walls in what I found. The Guggenheim, Carnegie and Sherwin-Williams material is in the earlier note. Hex values for "Museum grey" would be an informed approximation, not documented provenance.
- I didn't fetch Ilford's 902 fact sheet itself. The 560 nm figure is second-hand.
- No authoritative hex source for traditional Japanese colours. They're defined by physical dye references, and online hex sets differ.
- I didn't fetch sources for cyanotype (Prussian blue) or Bauhaus primaries in this session. Those rely on general knowledge.

## 3. Theme features users expect in 2026 desktop apps (Windows / WebView2 / Tauri 2)

### Takeaway
The table stakes are:
- follow Windows light/dark;
- respect Windows contrast themes (`forced-colors`);
- respect reduced transparency and reduced motion;
- a custom theme maker, which LeMuse already has.

What's missing in LeMuse:
- **theme import/export/share as a file or string**;
- **following the Windows accent colour**;
- an optional **Mica** backdrop on the chrome only, Windows 11;
- **a proper forced-colors mode**;
- **scheduled or sunset switching**.

Two expected-sounding features should be refused: ambient colour sampled from the current image, and a dyslexia font as an "accessibility" claim. Evidence shows dyslexia fonts give no reading benefit, so offer readable fonts and spacing instead.

### Cited Findings
**Window effects (Tauri 2)**
- Tauri 2's window `Effect` enum offers `Mica`, `Tabbed`, `TabbedDark` and `TabbedLight` (Windows 11 only), `Acrylic` (Windows 10/11) and `Blur` — [Tauri 2 JS API, window](https://v2.tauri.app/reference/javascript/api/namespacewindow/).
  - Acrylic "has bad performance when resizing/dragging the window on Windows 10 v1903+ and Windows 11 build 22000", and Blur has the same problem on build 22621.
  - `setEffects` and `clearEffects` need the `core:window:allow-set-effects` permission (a new capability, which counts as a guardrail change).

**Windows contrast themes (`forced-colors`)**
- These map to CSS `@media (forced-colors: active)`. In that mode, colours "are reduced to a limited color palette chosen by the user", exposed as CSS system colours — [Microsoft Learn, Fluent UI Web Components: Windows High contrast mode](https://learn.microsoft.com/en-us/fluent-ui/web-components/design-system/high-contrast) (doc dated 2021, updated 2024).
- Keyword mapping:

  | CSS system colour | Windows setting |
  |---|---|
  | CanvasText | Text |
  | LinkText | Hyperlinks |
  | GrayText | Disabled Text |
  | Highlight / HighlightText | Selected Text |
  | ButtonText / ButtonFace | Button Text |
  | Canvas | Background |

- `forced-color-adjust: none` opts an element out of the override, and should be used sparingly. The doc links Microsoft Edge's guide, [Styling for Windows high contrast with new standards for forced colors](https://blogs.windows.com/msedgedev/2020/09/17/styling-for-windows-high-contrast-with-new-standards-for-forced-colors/) (2020, not fetched).

**System accent colour and reduced transparency**
- A Chromium Intent to Ship (April 2026) exposes `AccentColor` and `AccentColorText` system colours. Because of fingerprinting concerns, they're limited to installed web-app contexts. The planned milestones were Chrome 149/150, not confirmed shipped — [blink-dev, Intent to Ship: AccentColor and AccentColorText](https://groups.google.com/a/chromium.org/g/blink-dev/c/knAC85FErrE).
- `prefers-reduced-transparency` has been supported since Chrome 118 (2023 article) — [Chrome for Developers](https://developer.chrome.com/blog/css-prefers-reduced-transparency).

**Dyslexia fonts**
- OpenDyslexic gave "no improvement in reading rate or accuracy", and no participant preferred it (n=12, single-subject design, 2017) — [Wery & Diliberto, Annals of Dyslexia (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5629233/).
- A 2026 meta-analysis found that dyslexia-friendly fonts have no consistent or reliable effect on reading speed or accuracy — [Azzarello et al. 2026 (Strathclyde)](https://strathprints.strath.ac.uk/97732/1/Azzarello-etal-AD-2026-Does-font-improve-reading-in-dyslexic-children-meta-analysis.pdf).
- Coverage disagrees: Edutopia says the font *reduced* speed and accuracy, which the paper's abstract doesn't support — [Edutopia](https://www.edutopia.org/article/do-dyslexia-fonts-actually-work/); [Reading Rockets / Shanahan](https://www.readingrockets.org/blogs/shanahan-on-literacy/what-about-special-fonts-kids-dyslexia-or-other-reading-problems).

**Theme sharing in other apps**
- Blender's Themes preferences can **Install** an XML theme file (added to presets), save the current theme as XML to `scripts/presets/interface_theme/`, and **Reset** — [Blender Manual, Themes](https://docs.blender.org/manual/de/4.5/editors/preferences/themes.html).
- Krita has no easy way to create and share themes: users copy `.colors` files into the resource folder and restart — [Krita docs, Settings Menu](https://docs.krita.org/Settings_Menu); [krita-artists.org](https://krita-artists.org/t/documentation-for-color-files-in-the-folder-color-shemes/115853).

### Inferences
**Recommended features, in priority order:**
1. **Theme share string and file.** Export a custom theme as a `.lemuse-theme.json` file, plus a short copyable string such as `lemuse-theme:v1:<base64url of 4 hex + name>`; import from either. Validate strictly: four `#rrggbb` values, a name length cap, rendered as text only, the same WCAG check as custom themes. Never run or load CSS from it. This is cheap, low-risk and the most "ecosystem-like" feature (see section 5). Keep it out of git; it's user data.
2. **System mode, done properly.** "Auto" follows Windows light/dark (`prefers-color-scheme`). The user picks which light theme and which dark theme Auto uses, as VS Code does with preferred light and dark themes (convention, not cited here). Optional scheduled switching (fixed times, or sunset from a manually entered city or latitude). Never use geolocation, which would need a permission and a network call.
3. **Follow the Windows accent colour (optional toggle).** WebView2's `AccentColor` support isn't confirmed (gap), so read it in Rust (WinRT `UISettings.GetColorValue(Accent)`) and pass it as a token. Clamp it through the existing WCAG derivation. Apply it to chrome and focus only.
4. **Forced-colors mode.** Under `forced-colors: active`, let the system palette drive the chrome (Canvas, CanvasText, ButtonFace, Highlight). Keep the image untouched: the CSS Color Adjust spec exempts replaced content such as `<img>` from forced colours (spec not re-fetched). Make sure focus rings use `Highlight`. Add a forced-colors render to `app/scripts/snapshot.tsx` so it's validated.
5. **Mica (Windows 11, optional, off by default).** Put it on the title bar or side panels only, never behind the stage, because Mica tints with the desktop wallpaper's colour. That is exactly the chromatic surround LeMuse forbids. Turn it off under `prefers-reduced-transparency`. Don't use Acrylic or Blur, given the documented resize lag. It needs a transparent window, the `allow-set-effects` capability, and an ADR.
6. **Reduced transparency and contrast.** Honour `prefers-reduced-transparency` (no translucent overlays) and `prefers-contrast: more` (push text and borders to 7:1).
7. **Fonts.** Add an "Atkinson Hyperlegible"-style high-legibility option (licence and age to be checked before bundling) and a letter-spacing or line-height control, rather than marketing a "dyslexia font". If OpenDyslexic is offered at all (SIL OFL, not verified here), present it as a preference, not an accessibility fix.
8. **Colour-blind-safe accents.** Check the built-in accent palette under deuteranopia and protanopia simulation. State never relies on hue alone; the earlier note covers icon and label pairing. A test can assert that every state token has an icon or label.

**Refuse, with reasons recorded in the ADR:**
- **Ambient or dynamic colour from the current image** (YouTube "ambient mode"-style glow, Material You-style theme from the image). It tints the surround with the image's own dominant hue. Through chromatic simultaneous contrast this shifts the perceived hue of the image away from that colour, and it lowers apparent saturation exactly where the artist is judging. It also needs pixel reads, which run into canvas CORS and the "no image bytes" constraint. The surround findings are in the earlier note.
- **A theme generated from an image.** Acceptable only as a one-off "suggest a chrome accent from this image" action on the chrome, never on the stage. It also needs CORS-readable pixels. Low priority.
- **Per-topic themes.** A plausible "delight" feature: each topic remembers a chrome theme. It risks inconsistency and preference sprawl. If built, limit it to chrome theme choice, never the surround.
- **Seasonal themes.** Novelty with no artistic value. Skip, or ship as plain themes without automatic switching.

### Gaps
- Not verified whether WebView2 (Evergreen, late 2026) exposes `AccentColor` to non-installed-app content, or whether a Tauri WebView counts as an "installed web app" context.
- No primary Microsoft Learn page on Mica in WebView2/Tauri (transparent window requirements) was fetched.
- The MDN/CSSWG text on how forced colours treat `<img>` wasn't fetched in this session.
- No 2025–2026 survey data on which theme features desktop users expect; the list above draws on product convention.

## 4. What art tools offer, and what must never be themed in an art viewer

### Takeaway
Professional tools offer a **few neutral interface greys** (Photoshop: 4; Krita: Darker, Dark, Blender, Bright, Neutral; Lightroom: fixed panels plus a selectable fill behind the image) and keep the canvas surround separately adjustable. Theme richness comes from community files (Blender XML, Krita `.colors`), not from colourful built-ins. The "never theme" list for LeMuse is the image itself, the stage behind it, and anything that sits on top of the image.

### Cited Findings
- **Photoshop:**
  - It has four interface colour themes from darkest to lightest; the default is the second darkest.
  - There's a separate "Highlight Color" for selected items, which by default is a grey matching the theme.
  - Shift+F1 and Shift+F2 step the theme darker or lighter.

  Source: [How-To Geek](https://www.howtogeek.com/724883/how-to-switch-between-light-and-dark-themes-in-photoshop/); [Photoshop Essentials](https://www.photoshopessentials.com/?p=17779). These guides are from older CC versions. Photoshop on the web offers Dark, Light or "Use system setting" — [Adobe Help](https://helpx.adobe.com/photoshop/using/manage-app-settings-web.html).
- **Krita** ships Darker, Dark (default), Blender, Bright and Neutral "looks" under Settings → Themes — [Krita docs](https://docs.krita.org/Settings_Menu); [David Revoy, Krita alternate themes](https://davidrevoy.com/article343/krita-alternate-themes). Community sharing exists (e.g. "Krita QSS themes collection") but is poorly documented — [krita-artists.org](https://krita-artists.org/t/krita-qss-themes-collection-customize-your-interface/152790/1).
- **Blender** bundles "a small selection of themes" and installs and saves XML themes — [Blender Manual](https://docs.blender.org/manual/de/4.5/editors/preferences/themes.html).
- **Lightroom Classic:** panel colours are fixed; only the fill behind the image is selectable. See the earlier note — [Adobe Help, Lightroom Classic preferences](https://helpx.adobe.com/lightroom/help/setting-preferences-lightroom.html).
- **A dark gallery wall lightens how a painting reads.** That's why the Rijksmuseum moved away from white — [Architect Magazine](https://www.architectmagazine.com/design/buildings/rijksmuseum-renovation_o/). The surround science is in the earlier note.

### Inferences
**Never themeable in LeMuse.** Make these rules a token test, so "every miss becomes a check":
1. **The image pixels.** No tint, filter, opacity, vignette, gradient or blend-mode from a theme. Study filters (greyscale, notan) are explicit, user-toggled view modes, not theme properties.
2. **The stage or surround.** Always zero chroma (a ≈ b ≈ 0 in OKLab). The level comes from the 5-step picker. The theme must not set it. That includes no Mica or Acrylic behind the stage, and no gradient or texture such as "paper grain".
3. **Anything that overlaps or borders the image.** Image frame or border, letterbox bars, grid overlays and the mirror indicator stay neutral or two-tone. A saturated accent ring touching the image edge acts as a coloured surround.
4. **Saturated accent area near the stage.** Limit accent to small marks (focus ring, active state, progress). No accent-filled panels or bars next to the image. A practical rule is an accent area cap of a few percent of the window, or no accent fill within the control bar region adjacent to the stage (convention, not standard).
5. **Attribution legibility.** Creator and source text must pass 4.5:1 in every theme, including community and imported ones. ADR-0004 requires attribution always to be visible.
6. **Image-related state signals** (saved, mirrored, greyscale on) must not depend on accent hue alone.

- **Theme-able freely:** panel, background, text, accent, font family, layout, icon weight, corner radius, density, and the window-chrome backdrop (Mica on title bar or panels only).
- **LeMuse is already ahead of Krita and Photoshop** on colour choice. The gap is in *how themes move*: sharing, presets per mode, and following the system. It isn't in palette count.

### Gaps
- I didn't retrieve primary documentation on interface themes for Clip Studio Paint, Procreate, Affinity or PureRef in this session. From general knowledge: Clip Studio Paint has light and dark interface plus a density setting; Procreate has light and dark interface; PureRef allows a custom background colour and opacity (all unverified).
- I didn't fetch the ISO 3664 or ISO 12646 text on UI chroma near images (paywalled). The earlier note has the available surround figures.

## 5. Do themes make an app feel "complete"? Evidence from theme ecosystems

### Takeaway
The evidence is indirect but consistent. In apps people describe as "complete" (Obsidian, VS Code, Blender), theming is an **ecosystem**: installable and shareable themes with a gallery. A long list of built-in themes isn't what does it. Obsidian's community directory grew past 8,000 plugins and themes after its 2026 relaunch, and the most-downloaded themes reach millions of installs. LeMuse's "something is missing" feeling is likely the missing loop of share, import and discover, not a missing palette.

### Cited Findings
- Obsidian's community site listed 901 community themes alongside 9,165 plugins (page date unclear) — [Obsidian community](https://community.obsidian.md/?lang=zh).
- Obsidian's October 2026 post says plugins and themes "more than doubled to over 8,000 projects" after the May 2026 directory relaunch — [Obsidian blog, October 2026](https://obsidian.md/blog/2026-obsidian-october/).
- Most-downloaded Obsidian themes (October 2026): ITS Theme (about 2.73M), Things (about 1.37M) and AnuPpuccin, a Catppuccin derivative (about 1.24M). Source: third-party with paid placements — [lilachbullock.com](https://www.lilachbullock.com/best-obsidian-themes/); see also [Obsidian theme stats](https://moritzjung.dev/obsidian-stats/themestats/community-theme-list).
- Obsidian users ran into theme name collisions with conflicting download counts and asked for theme IDs. Sharing ecosystems need unique identifiers — [Obsidian forum](https://forum.obsidian.md/t/theme-name-collisions-with-conflicting-download-counts-suggestion-theme-ids/117014.md).
- Krita users note "there is no easy way to create and share themes", which shows demand where the loop is missing — [Krita docs](https://docs.krita.org/Settings_Menu).

### Inferences
**What would make LeMuse's theming feel complete,** given the stage-neutral constraint:
1. **Share loop:** export and import (file plus string), a "Copy theme" button, and themes identified by a stable id, not by name (the Obsidian lesson). A future in-repo `themes/` gallery of community submissions would be reviewed by PR. That stays ToS-clean and needs no server.
2. **A live preview in the picker:** see the theme on a mock slide with a neutral grey placeholder image before applying it. LeMuse's design-artifact pipeline already draws placeholders.
3. **Paired presets:** choose a light theme and a dark theme for Auto; optional schedule.
4. **Curated packs with provenance:** a "Studio" pack (section 2) and a "Community palettes" pack (section 1), each with a one-line story and a credit. Provenance and story create delight more than raw count does.
5. **Accessibility presets:** forced-colors support, high-contrast variants (7:1) of Studio and Gallery, a reduced-transparency path, and a high-legibility font.
6. **An explicit "why the stage stays grey" note** in the theme editor, linking to the simultaneous-contrast explanation. This turns the constraint into a visible, trust-building feature artists will recognise, much as Lightroom fixes its panels.
7. **Don't add more built-in themes past about 12–15.** Six built-ins plus 8 studio plus 7 community is already enough. Beyond that, the share loop is the growth path.

**Security notes for the share loop** (CLAUDE.md): imported themes are untrusted input. Parse JSON, allow only known keys, check `#rrggbb` hex with a strict regex, cap and render names as text, and never accept CSS, URLs or fonts from a theme file. That keeps the CSP unchanged. Exported themes and user theme files belong to the user library and stay out of git (`.gitignore` plus `FORBIDDEN_FILES`), unless they are built-in assets authored in the repo.

### Gaps
- I found no controlled study linking theme ecosystems to perceived completeness or retention. The evidence is ecosystem size and user demand, so the link is inferred.
- No VS Code Marketplace or Raycast theme-store install figures were retrieved.
- No data on how many LeMuse-like (art-reference) app users change themes at all.
