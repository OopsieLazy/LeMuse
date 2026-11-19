# Who LeMuse is for

A living tracker, so features and sources are chosen for real people. Update it when a feature or source ships
or is planned (CLAUDE.md). The reasoning behind the table is in ADR-0016 and ADR-0018.

**Status key:** ✅ shipped · 🛠 next PR · 🗺 on the roadmap · 💡 idea

## Audiences

| Audience | What they come for | Features that serve them | Sources that matter |
|---|---|---|---|
| **Architects, interior designers** | Precedent and material boards; facades, stairs, joinery, interiors | ✅ Categories (architecture, materials) · ✅ Mini player on a 2nd screen · ✅ Find channels · 🗺 Grid view · 🗺 Local folders | Are.na, Wikimedia Commons, museums (architecture, furniture), local folders |
| **Product and industrial designers** | CMF and form studies; mechanisms; exploded views | ✅ Material categories (plastic, rubber, metal) · ✅ Search words (CAD & making) · 🗺 CAD attachments (STEP, DXF) · 💡 3D previews | Are.na, Smithsonian 3D, Poly Haven, local CAD folders |
| **Artists, illustrators** | Daily practice; gesture and figure; master studies | ✅ Slideshow + timer · ✅ Daily reference sheet (print to PDF) · 🗺 Timed sessions · 🗺 Mirror, greyscale, value view, grid · 🗺 Daily set | Museums (CC0), Are.na, local folders |
| **Creators, streamers, studios** | Mood and B-roll on stream; a studio wall screen | ✅ Mini player · ✅ JSON CLI · ✅ Dashboard page `lemuse serve` (OBS, Home Assistant) · 🗺 Webhooks | Are.na, local folders |
| **Teachers, schools** | Classroom slideshows of public-domain objects, with attribution | ✅ Topics from museum keywords · ✅ Attribution always shown · ✅ Dashboard page on a projector · ✅ Printable sheets · 🗺 LeMuse Web (ADR-0020) | Museums, Wikimedia Commons |
| **Game, film, 3D artists** | Concept, material and texture reference | ✅ Categories · 🗺 Poly Haven · 💡 3D previews | Poly Haven, Are.na, museums |
| **Researchers, archivists** | Keeping links to things that vanish | ✅ Links kept after removal · ✅ `export-links` (CSV, JSON) · ✅ Save originals · 🗺 Archive view | Are.na, museums |

## Sources

| Source | Status | Audiences | Licence and notes |
|---|---|---|---|
| Are.na channels | ✅ | All | Content belongs to its creators; attribution and link always shown; whole channels load across refreshes (ADR-0017); ✅ your token (free account) opens your private channels, the channels you follow, and 4× the read limit (ADR-0023, ADR-0024) |
| Cleveland Museum of Art | ✅ | Artists, teachers, architects | CC0 objects only |
| Art Institute of Chicago | ⏸ built, held back | Artists, teachers | CC0; images behind a challenge (D-18) |
| Local folders | 🗺 1st | Everyone | Your own files; nothing leaves the PC |
| Wikimedia Commons | 🗺 2nd | Architects, teachers, researchers | Licence per file; attribution required |
| The Met | 🗺 3rd | Artists, designers | CC0 open-access objects |
| Smithsonian Open Access | 🗺 4th | Designers, teachers | CC0; free API key |
| Poly Haven | 🗺 5th | 3D artists, designers | CC0 textures and HDRIs |
| Pinterest | ✖ no own app (Q20 = no) | Everyone | Clip pins into Are.na (extension, or the Zapier "new pin → Are.na block" template, ADR-0021) |
| Instagram, Behance, Dribbble, Google Images | ✖ | — | No suitable API, or their terms forbid it |

## What sets LeMuse apart

- **Streams, doesn't hoard:** light on disk, fair to creators, attribution always shown.
- **Topics across sources:** channels, museums and (soon) folders in one slideshow, with its own categories.
- **Practice-shaped:** a slideshow first, with timed sessions and study aids coming.
- **Plays well with others:** a mini player, a JSON CLI, and a dashboard page coming.
