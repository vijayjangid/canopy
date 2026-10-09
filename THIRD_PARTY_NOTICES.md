# Third-party notices

Assets and libraries bundled with Canopy, with their licenses. Update this file whenever an asset is vendored.

## Sticker and icon assets

None. The stickers and interface icons are original artwork drawn for Canopy (`src/stickers/art.tsx`, `src/ui/icons.tsx`), so no third-party artwork is bundled. The open-licence packs once considered (Fluent Emoji, Noto Emoji, Phosphor, Open Doodles) were not used.

## Fonts

All four fonts are published on Google Fonts and bundled through the `@fontsource` packages, under the SIL Open Font License 1.1 (<https://openfontlicense.org>). The licence allows free use, including commercial use, bundling with an application and embedding in documents, so the fonts are also embedded in exported SVG, PNG and PDF files. The fonts are not sold on their own and are not modified. Each package ships its own `LICENSE` file with the full text, and `node_modules` keeps it with the font files.

| Font                | Used for                                   | Copyright                                                                                          |
| ------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Kalam               | The Playful theme's handwritten title font | Copyright (c) 2014 Indian Type Foundry (info@indiantypefoundry.com)                                |
| Source Serif 4      | The High Contrast theme's serif title font | Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'                |
| JetBrains Mono      | The level numbers                          | Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)     |
| Bricolage Grotesque | The Canopy name in the top bar             | Copyright 2022 The Bricolage Grotesque Project Authors (https://github.com/ateliertriay/bricolage) |

The Minimal theme and the app interface use the system font, so nothing is bundled for them.
