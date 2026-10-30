# Lucide, the Source of the Two Plugin Icons

The listing icon of each plugin is drawn from [Lucide](https://lucide.dev), under the ISC licence in
`LICENSE` beside this page: "Copyright (c) 2026 Lucide Icons and Contributors". The licence permits
use, copying, modification, and distribution for any purpose with or without fee, provided the
copyright notice and the permission notice appear in all copies, which is why `LICENSE` is vendored
here rather than linked.

## What Is Kept

| File | What it is |
| --- | --- |
| `LICENSE` | The ISC licence of Lucide, downloaded on 2026-10-30. |
| `gauge.svg` | The `gauge` glyph as downloaded, 24 by 24, two paths. |
| `lightbulb.svg` | The `lightbulb` glyph as downloaded, 24 by 24, three paths. |
| `icon-claudetto.svg` | The composed source of `plugins/claudetto/.claude-plugin/icon.png`. |
| `icon-you-should-know.svg` | The composed source of `plugins/claudetto-you-should-know/.claude-plugin/icon.png`. |

## What Was Changed

Each composed file is a 1024 by 1024 square holding one glyph. The glyph's own paths are copied
verbatim; nothing of the drawing is redrawn. What is added around them is a background rectangle of
`#17181a`, a stroke colour of `#f2f2f2` in place of the glyph's `currentColor`, and a transform that
scales the 24-unit glyph to 640 px and centres it, which leaves a margin of 192 px on each side.

`gauge` is the core plugin, because what claudetto does is measure: every capability of it ships with
the reading that set its values. `lightbulb` is `claudetto-you-should-know`, which raises one note
when a side check finds something about the work that the person very likely does not understand.

## How the PNG Is Made

```bash
rsvg-convert -w 1024 -h 1024 -o plugins/claudetto/.claude-plugin/icon.png docs/keep/lucide/icon-claudetto.svg
rsvg-convert -w 1024 -h 1024 -o plugins/claudetto-you-should-know/.claude-plugin/icon.png docs/keep/lucide/icon-you-should-know.svg
```

`rsvg-convert` comes from `librsvg`, installed with Homebrew. It is not in `just check`, because the
two PNG files are committed and nothing regenerates them on a gate run.

A PNG is committed beside the SVG it is rendered from because the listing wants one, not because the
local validator insists. `claude plugin validate --profile directory` checks an icon it finds only
for a magic number that matches the file's own extension: a `.png` must open with the PNG signature,
a `.jpg` with `FF D8 FF`, and a `.svg` is merely parsed as text. It reads no dimensions and no byte
count beyond a floor of 12, so it passes a 256 px PNG, a 3000 px PNG, and an `icon.svg` alike, and
raises `ICON_INVALID` only for a file whose bytes contradict its extension.

The requirement itself comes from the `fix` advice of the validator's `ICON_MISSING` warning, which
is raised only when no icon is found at all: "a square PNG or JPEG in the plugin: 512 to 2048 px on
each side, under 2 MB. SVG and WebP are not accepted. That file may become the listing icon only
once: the first time the plugin is saved or submitted in the developer portal." So the sizes are the
developer portal's rule and go unchecked here, and replacing either PNG after a submission does not
change the icon that the catalogue shows.
