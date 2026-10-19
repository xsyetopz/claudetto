# Mod API: UI Types (Part 2)

These are more of the types behind `$.ui` and the element props.
They run from `ImageSource` to `RenderSurface`, and they cover images, inputs, links, panes, and render inputs.

## Types

| Mark | Item | What it is for | Shape and limits | Source |
| --- | --- | --- | --- | --- |
| ✅ | `ImageSource` | The picture an `Image` shows: base64 bytes the plugin holds (at most 2 MiB decoded), or the name of a file or POSIX shared-memory object it does not. | Object. Its fields have rows below. The terminal reads and decodes a file name itself, so no pixel crosses `$`. An unreadable source draws a blank box, and a source equal to the last one sends nothing. | d.ts line 5483 |
| ✅ | `ImageSource.png` | A whole PNG file, base64. | Type: `string`. | d.ts line 5483 |
| ✅ | `ImageSource.rgba` | `width \* height` RGBA pixels, 4 bytes each, base64. | Type: `string`. | d.ts line 5483 |
| ✅ | `ImageSource.width` | Pixels per row, 1 to 2048. | Type: `number`. | d.ts line 5483 |
| ✅ | `ImageSource.height` | Rows of pixels, 1 to 2048. | Type: `number`. | d.ts line 5483 |
| ✅ | `ImageSource.file` | The absolute path of a regular file holding a whole PNG, at most 3072 bytes of path, read by the terminal, left in place. | Type: `string`. | d.ts line 5483 |
| ✅ | `ImageSource.format` | The file is a whole PNG, the terminal decodes it and sizes it itself. | Type: `'png'`. | d.ts line 5483 |
| ✅ | `ImageSource.generation` | A whole number that changes when the file's content does under the same path, so a redraw reads it again, absent, the path alone tells. | Type: `number`. Optional. | d.ts line 5483 |
| ✅ | `ImageSource.file` | The absolute path of a regular file of `width \* height` raw pixels, at most 3072 bytes of path, read by the terminal, left in place. | Type: `string`. On Linux a file under `/dev/shm` is memory. | d.ts line 5483 |
| ✅ | `ImageSource.format` | `rgba`, 4 bytes a pixel, or `rgb`, 3. | Type: `'rgba' \| 'rgb'`. | d.ts line 5483 |
| ✅ | `ImageSource.width` | Pixels per row, 1 to 4096. | Type: `number`. | d.ts line 5483 |
| ✅ | `ImageSource.height` | Rows of pixels, 1 to 4096. | Type: `number`. | d.ts line 5483 |
| ✅ | `ImageSource.generation` | A whole number that changes when the file's content does under the same path, so a redraw reads it again, absent, the path alone tells. | Type: `number`. Optional. | d.ts line 5483 |
| ✅ | `ImageSource.shm` | The name of a POSIX shared-memory object of `width \* height` raw pixels: `/` then up to 254 of `A-Z a-z 0-9 . _ -` (macOS takes 30). | Type: `string`. The terminal unlinks it after reading, so a name feeds one Image drawn once and is never sent again on a redraw, POSIX terminals only. | d.ts line 5483 |
| ✅ | `ImageSource.format` | `rgba`, 4 bytes a pixel, or `rgb`, 3. | Type: `'rgba' \| 'rgb'`. | d.ts line 5483 |
| ✅ | `ImageSource.width` | Pixels per row, 1 to 4096. | Type: `number`. | d.ts line 5483 |
| ✅ | `ImageSource.height` | Rows of pixels, 1 to 4096. | Type: `number`. | d.ts line 5483 |
| ✅ | `ImageSource.generation` | A whole number that changes when a fresh object reuses a name, so a redraw reads it again, absent, the name alone tells. | Type: `number`. Optional. | d.ts line 5483 |
| ✅ | `InputProps` | The props of `Input`, every surface's text field: an address, optional texts, and the closures a change and a submit run. A leaf. | Object. Its fields have rows below. One line, or several with `rows`. While it has focus every printable key reaches it and Esc returns them. A change and Enter raise `ui.input`. | d.ts line 5596 |
| ✅ | `InputProps.key` | The element's address: `e.element` at `ui.input`, what a matcher names. | Type: `string`. | d.ts line 5596 |
| ✅ | `InputProps.label` | Text drawn before the field. | Type: `string`. Optional. | d.ts line 5596 |
| ✅ | `InputProps.placeholder` | Text drawn dim in an empty field. | Type: `string`. Optional. | d.ts line 5596 |
| ✅ | `InputProps.value` | The text the field holds when drawn, the person's typing replaces it until the hook draws another. | Type: `string`. Optional. | d.ts line 5596 |
| ✅ | `InputProps.submitLabel` | What Enter does, in a word or two, drawn beside the field while it has focus (`send`). Defaults to `submit`. | Type: `string`. Optional. | d.ts line 5596 |
| ✅ | `InputProps.rows` | How many lines tall the field is, a whole number of at least 1, from 2 it holds several lines, as the DOM's `<textarea rows>`. Defaults to 1. | Type: `number`. Optional. Drawn this tall. A longer text scrolls inside. Enter submits. Up and Down walk its rows, then go to the next element. | d.ts line 5596 |
| ✅ | `InputProps.autoFocus` | The site's focus ring starts here when the site takes the keyboard, instead of on nothing, as the DOM's `autofocus`: Enter acts on it at once. | Type: `true`. Optional. A pane opened with `focus` takes it. Of several in one site, the first drawn wins. A ring the person has moved stays where it is. | d.ts line 5596 |
| ✅ | `InputProps.onInput` | Runs on every change of the text, in the plugin's own environment: the bottom of a `ui.input` chain of kind `change`. | Type: `(value: string, e: UiInputArgument) => void`. Optional. The text is whole, its lines joined by `\n`. | d.ts line 5596 |
| ✅ | `InputProps.onSubmit` | Runs on Enter with the text, in the plugin's own environment: the bottom of a `ui.input` chain of kind `submit`. No model turn unless it asks one. | Type: `(value: string, e: UiInputArgument) => void`. The text is whole, newlines kept and nothing trimmed. | d.ts line 5596 |
| ✅ | `InvalidatableEventName` | What `$.ui.invalidate` takes: a render event, or one of the six events whose answers the engine caches for the session. | Alias of the render event names plus `prompt.section`, `prompt.context`, `prompt.attachment`, `tool.describe`, `command.describe`, and `config.describe`. Used by `$.ui.invalidate`. | d.ts line 5706 |
| ✅ | `LinkProps` | The props of `Link`, a hyperlink every surface draws: an OSC 8 span on the terminal (else its text then the URL in dim), an anchor on desktop. | Object. Its fields have rows below. An inline element. Its children are the text. With no children the `label` is the text. With neither, the URL is. | d.ts line 5784 |
| ✅ | `LinkProps.href` | Where the link goes, as written: any scheme, host and port, at most 2048 characters once what a terminal acts on is percent-encoded. | Type: `string`. A blank value draws plain text. On a remote surface only an `https:` URL is a link. A click opens what the surface opens. | d.ts line 5784 |
| ✅ | `LinkProps.label` | The text drawn when the element has no children, absent both, the URL itself is the text. | Type: `string`. Optional. | d.ts line 5784 |
| ✅ | `MarkdownLeafProps` | What a `Markdown` carries across the boundary: its address, text, dimness and which links it answers, `onLinkPress` stays behind, a `press` instead. | Object. Its fields have rows below. | d.ts line 5811 |
| ✅ | `MarkdownLeafProps.key` | The element's address: what `e.element` carries and what a matcher names, present whenever the element carries a `press`. | Type: `string`. Optional. | d.ts line 5811 |
| ✅ | `MarkdownLeafProps.text` | The markdown drawn, checked as a Text's string is. | Type: `string`. | d.ts line 5811 |
| ✅ | `MarkdownLeafProps.dimColor` | The whole block dim, as `Text`'s `dimColor`, absent draws as false. | Type: `boolean`. Optional. | d.ts line 5811 |
| ✅ | `MarkdownLeafProps.pressableLinks` | Which links a press belongs to, by `href` as written, absent, with a `press`, every link drawn. Compared with the pressed target only. | Type: `readonly string[]`. Optional. | d.ts line 5811 |
| ✅ | `MarkdownProps` | The props of `Markdown`, a block of markdown every surface draws as it draws an assistant reply's text: its own renderer, links, tables, fences. | Object. Its fields have rows below. A leaf with no children. With `onLinkPress` a press on a link raises `ui.press` addressed to `key`. | d.ts line 5840 |
| ✅ | `MarkdownProps.key` | The element's address: `e.element` at `ui.press`, what a matcher names. Required with `onLinkPress`, since a press needs one, else optional. | Type: `string`. Optional. | d.ts line 5840 |
| ✅ | `MarkdownProps.text` | The markdown drawn, as an assistant reply would write it, a `<context>` block, hidden in a reply's own text, is drawn here as written. | Type: `string`. One drawing draws 100000 characters in all. A link that is not `https:`, `http:`, or `file:` draws as text. | d.ts line 5840 |
| ✅ | `MarkdownProps.dimColor` | The whole block dim, as `Text`'s `dimColor`: a thought, an aside. | Type: `boolean`. Optional. | d.ts line 5840 |
| ✅ | `MarkdownProps.onLinkPress` | What a press on a link in `text` runs, in the plugin's own environment: the bottom of a `ui.press` chain whose `e.link` names the link. | Type: `(link: PressedLink, e: UiPressArgument) => void`. Optional. Called on a plain single click where the surface reports clicks. Ctrl, alt, or cmd click opens the link as before. | d.ts line 5840 |
| ✅ | `MarkdownProps.pressableLinks` | Which links in `text` a press belongs to, by `href` as the markdown writes it, absent, every link drawn. Only with `onLinkPress`. | Type: `readonly string[]`. Optional. A link left out keeps the surface's own behavior. At most 256 entries of at most 2048 characters. | d.ts line 5840 |
| ✅ | `NotifyOptions` | Options of `$.ui.notify`. | Object. Its fields have rows below. Used by `$.ui.notify`. | d.ts line 6846 |
| ✅ | `NotifyOptions.title` | What heads the notification, sent as the mod gives it: the engine puts no name of its own beside it. Left out or empty, the plugin's name. | Type: `string`. Optional. | d.ts line 6846 |
| ✅ | `OnScreen` | The part of a transcript message the surface that drew it has on screen: units `first` to `last` of the message's `of`, counted from its start. | Object. Its fields have rows below. Says which rows of a site show on screen. The terminal counts rows. Other surfaces use their own unit, so compare `first / of` there. | d.ts line 6933 |
| ✅ | `OnScreen.first` | The unit inside the viewport, from 0: on the terminal, `7` when the message's top seven rows are scrolled away. | Type: `number`. | d.ts line 6933 |
| ✅ | `OnScreen.last` | The unit inside the viewport, inclusive, at least `first`. | Type: `number`. | d.ts line 6933 |
| ✅ | `OnScreen.of` | The message's whole extent in the same unit, as laid out (a hook's tree taller than the engine's counts its own rows), more than `last`. | Type: `number`. One surface's numbers say nothing of another's: what the phone shows the terminal may not, and each `ui.render` carries its own surface's. | d.ts line 6933 |
| ✅ | `PaneCloseArgs` | The argument of `$.ui.close`: the pane to close (`{ id }`). `origin` is the engine's to set: a plugin's call reads `plugin` at the hooks. | Alias of `Omit<PaneCloseInput, 'origin'>`. Used by `$.ui.close`. | d.ts line 7506 |
| ✅ | `PaneCloseInput` | The input of `ui.close`: the pane closing and why (PaneCloseOrigin). Closing an id that is not open does nothing. | Object. Its fields have rows below. Used by `ui.close`. | d.ts line 7512 |
| ✅ | `PaneCloseInput.id` | What `$.ui.open` named the pane, pinned: `next(e)` passes it on. | Type: `string`. | d.ts line 7512 |
| ✅ | `PaneCloseInput.origin` | Who closes it, set by the engine: a hook that answers without `next` keeps the pane open on `plugin` and `person`, never on `unload`. | Type: `PaneCloseOrigin`. | d.ts line 7512 |
| ✅ | `PaneCloseOrigin` | Why a pane closes, as the engine stamped it at `ui.close`. | Object. Its fields have rows below. `unload` drops a pane that nothing draws any more, before the hooks hear of it. `next(e)` passes the origin on as received. | d.ts line 7531 |
| ✅ | `PaneCloseOrigin.kind` | `plugin`, a plugin's `$.ui.close`, `person`, the person's close mark or close key, `unload`, the engine's own. | Type: `'plugin' \| 'person' \| 'unload'`. | d.ts line 7531 |
| ✅ | `PaneOpenArgs` | The argument of `$.ui.open`: which pane, its title, whether it asks the person's keyboard, its dialog manners, its size: rows inline, columns docked. | Object. Its fields have rows below. An open that answers the person's input is placed at any width. One the plugin makes alone waits below 144 columns. Used by `$.ui.open`, `ui.open`. | d.ts line 7549 |
| ✅ | `PaneOpenArgs.id` | Names the pane: 1-64 of letters, digits, `_` and `-`. One pane per id: opening an open id delivers the new title, never a second instance. | Type: `string`. Pinned at the hooks: `next(e)` passes it on, the title and focus rewrite. | d.ts line 7549 |
| ✅ | `PaneOpenArgs.title` | The pane's tab while more than one pane is open (with one, no title is drawn), and the `title` its hook sees, the id when omitted. | Type: `string`. Optional. An unpaired surrogate half (a `.slice()` through an emoji) is drawn as U+FFFD, a control character is refused. | d.ts line 7549 |
| ✅ | `PaneOpenArgs.focus` | A request, not a grant: the surface focuses (and raises) the pane only while the prompt has the keys over an empty composer. | Type: `true`. Optional. An element of the band or a pane the person holds, text in the composer, a dialog or a survey each refuse it: the pane opens without the keyboard. | d.ts line 7549 |
| ✅ | `PaneOpenArgs.closeOnEscape` | While the pane holds the keyboard, the key that hands it back (Escape) also closes it as the person's close does: `ui.close`, origin `person`. | Type: `true`. Optional. Escape at an idle, empty prompt closes the pane. A hook may refuse the close. Each open sets it anew. | d.ts line 7549 |
| ✅ | `PaneOpenArgs.holdToasts` | While the pane is the one shown the surface holds every transient toast: each other plugin's `$.ui.toast` and the engine's own, as this plugin's. | Type: `true`. Optional. Toasts wait while the pane is open. Use it for a dialog the person answers and leaves. Each open sets it anew. | d.ts line 7549 |
| ✅ | `PaneOpenArgs.rows` | The body rows the pane's content wants while seated inline above the prompt: it opens that tall, up to what the layout spares, not a third. | Type: `number`. Optional. A request, not a grant. A size the person dragged wins. The dock ignores it. A positive whole number. | d.ts line 7549 |
| ✅ | `PaneOpenArgs.columns` | The body columns the pane's content wants while docked beside a fullscreen transcript: the dock opens that wide, floor to ceiling. | Type: `number`. Optional. A request, not a grant. A width the person dragged wins. The inline block ignores it. A positive whole number. | d.ts line 7549 |
| ✅ | `PressedLink` | The link a press landed on: one a `Markdown` drew, pressed where the surface reports presses (a plain click in the fullscreen terminal). | Object. Its fields have rows below. What the surface knows of the cell pressed, not which occurrence: two links written with one target read the same here. | d.ts line 8092 |
| ✅ | `PressedLink.href` | The link's target as the surface drew it: for an `https:` link, the href as the markdown wrote it. | Type: `string`. | d.ts line 8092 |
| ✅ | `RasterBlitArgs` | A `$.ui.blit` argument repainting one of the caller's mounted Rasters. | Object. Its fields have rows below. `columns` and `rows`, when given, must be the mounted size (a resize is a redraw, `$.ui.invalidate("ui.render")`, not a blit). | d.ts line 9621 |
| ✅ | `RasterBlitArgs.requestId` | The site the Raster is drawn in, by the `requestId` this plugin draws it under: one of its panes' ids, a tool row's `tool_use_id`, the band's. | Type: `string`. | d.ts line 9621 |
| ✅ | `RasterBlitArgs.key` | The Raster's `key` in that drawing. | Type: `string`. | d.ts line 9621 |
| ✅ | `RasterBlitArgs.cells` | The new cells, encoded as the element's `cells` are (RasterProps), for the mounted `columns \* rows`. | Type: `string`. | d.ts line 9621 |
| ✅ | `RasterBlitArgs.columns` | The width the cells are laid out for, refused unless it is the mounted Raster's. Absent, the mounted width. | Type: `number`. Optional. | d.ts line 9621 |
| ✅ | `RasterBlitArgs.rows` | The height the cells are laid out for, refused unless it is the mounted Raster's. Absent, the mounted height. | Type: `number`. Optional. | d.ts line 9621 |
| ✅ | `RasterProps` | The props of `Raster`, the terminal surface's cell-grid leaf: a fixed box of cells, each a glyph, a foreground and a background, packed in `cells`. | Object. Its fields have rows below. A leaf with no children, `hover`, or `onPress`. `$.ui.blit` repaints it in place. Terminal only. The palette holds 1024 color pairs. | d.ts line 9656 |
| ✅ | `RasterProps.key` | The element's address within the drawing: what `$.ui.blit` names to repaint it, unique among the Rasters of one tree. | Type: `string`. | d.ts line 9656 |
| ✅ | `RasterProps.columns` | How many terminal columns wide, 1 to 512, the site clips what its body cannot show. | Type: `number`. | d.ts line 9656 |
| ✅ | `RasterProps.rows` | How many terminal rows tall, 1 to 256. | Type: `number`. | d.ts line 9656 |
| ✅ | `RasterProps.cells` | Every cell, row-major: standard padded base64 of `columns \* rows` little-endian u32 triplets `[codePoint, foreground, background]`. | Type: `string`. Each cell is a code point plus colors. A code point is one printable width-1 BMP character. A color is `0x00RRGGBB`, or `0x01000000` for the terminal default. | d.ts line 9656 |
| ✅ | `RenderChildren` | What an element takes as `children`, as JSX passes them: a node, a number (drawn as its string), a value the factory drops, or a list that may nest. | Alias of `RenderNode` plus numbers, booleans, `null`, `undefined`, and nested lists. `false`, `null`, and `undefined` are dropped, so `{ok && <Text>hi</Text>}` works. | d.ts line 9760 |
| ✅ | `RenderComponent` | Everything `ui.render` can draw: one name per component that has a render site, a matcher narrows on it. | Alias of the names of the 15 components a plugin may draw, from `AskUserQuestion` to `Pane`. The permission dialog is drawn by the engine alone. Used by `$.ui.render`. | d.ts line 9770 |
| ✅ | `RenderElement` | What a render hook returns, and what `next(e)` resolves to: a plain-data tree of elements (a Box or Text is a StyledElement), strings as children. | Union of the element types. Props are an allowed subset of the Ink `Box` and `Text` props. A tree with any other prop fails as a whole. Used by `ui.render`. | d.ts line 9780 |
| ✅ | `RenderElement.type` | A button, on every surface: `[ label ]` on the terminal, a native button on a desktop, a press raises `ui.press` (`e.element` the key). | Type: `'Button'`. Built by `<Button>`. The `onPress` closure stays in the plugin's own environment under `press.handle`. | d.ts line 9780 |
| ✅ | `RenderElement.props` | A field of `RenderElement`. | Type: `object`. | d.ts line 9780 |
| ✅ | `RenderElement.press` | Where the handler lives: the plugin whose hook drew the element, and the handle its environment keeps the `onPress` closure under. | Type: `object`. The runtime stamps the plugin as the tree leaves that hook. | d.ts line 9780 |
| ✅ | `RenderElement.hover` | Label style overrides (the Text set) the surface applies while the nearest keyed Box, or the group `scope` names, is hovered, plain data. | Type: `TextHoverProps`. Optional. | d.ts line 9780 |
| ✅ | `RenderElement.children` | What is drawn in the label's place, all of it one pressable: strings and `Text` (a chip, a dim part), any other element refused. | Type: `RenderNode[]`. Optional. Absent for a Button of a label alone, drawn as it always was. | d.ts line 9780 |
| ✅ | `RenderElement.type` | A text field on every surface, of one line or of `rows`, a change and Enter raise `ui.input` (`e.element`, `e.kind`, `e.value` the text). | Type: `'Input'`. Built by `<Input>`. The `onInput` and `onSubmit` closures stay in the plugin's environment. A leaf with no children. | d.ts line 9780 |
| ✅ | `RenderElement.props` | A field of `RenderElement`. | Type: `object`. | d.ts line 9780 |
| ✅ | `RenderElement.press` | Where the handlers live: the plugin whose hook drew the element, and the handle its environment keeps the closures under. | Type: `object`. The runtime stamps the plugin as the tree leaves that hook. | d.ts line 9780 |
| ✅ | `RenderElement.children` | A field of `RenderElement`. | Type: `undefined`. Optional. | d.ts line 9780 |
| ✅ | `RenderElement.type` | A one-of-several picker on every surface, a pick raises `ui.select` (`e.element` the key, `e.value` the option's value). | Type: `'Select'`. Built by `<Select>` or the table's `t.Select`. The `onSelect` closure stays in the plugin's own environment under `press.handle`, held as a Button's is. A leaf: no children. | d.ts line 9780 |
| ✅ | `RenderElement.props` | A field of `RenderElement`. | Type: `object`. | d.ts line 9780 |
| ✅ | `RenderElement.press` | Where the handler lives: the plugin whose hook drew the element, and the handle its environment keeps the closure under. | Type: `object`. The runtime stamps the plugin as the tree leaves that hook. | d.ts line 9780 |
| ✅ | `RenderElement.children` | A field of `RenderElement`. | Type: `undefined`. Optional. | d.ts line 9780 |
| ✅ | `RenderElement.type` | A hyperlink every surface draws: an OSC 8 span on the terminal (its text then the URL in dim where unsupported), an anchor on desktop. | Type: `'Link'`. Inline: its children are the text, strings and inline elements, absent children the label, absent both the URL. `href` is drawn as written, one that is no string draws the text plain. | d.ts line 9780 |
| ✅ | `RenderElement.props` | A field of `RenderElement`. | Type: `LinkProps`. | d.ts line 9780 |
| ✅ | `RenderElement.children` | A field of `RenderElement`. | Type: `RenderNode[]`. Optional. | d.ts line 9780 |
| ✅ | `RenderElement.type` | Source code every surface draws with the engine's highlighter, tokens coloured by language, under `format: 'diff'`, unified-diff hunks. | Type: `'Code'`. A leaf. A dim gutter numbers the lines from `startLine`. A diff has two gutters and add and remove backgrounds. | d.ts line 9780 |
| ✅ | `RenderElement.props` | A field of `RenderElement`. | Type: `CodeProps`. | d.ts line 9780 |
| ✅ | `RenderElement.children` | A field of `RenderElement`. | Type: `undefined`. Optional. | d.ts line 9780 |
| ✅ | `RenderElement.type` | A block of markdown every surface draws as it draws an assistant reply's text: its own renderer, theme, hyperlinks and highlighting. | Type: `'Markdown'`. Built by `<Markdown>`. A leaf. Without a `press` its links open as the surface opens links. | d.ts line 9780 |
| ✅ | `RenderElement.props` | A field of `RenderElement`. | Type: `MarkdownLeafProps`. | d.ts line 9780 |
| ✅ | `RenderElement.children` | A field of `RenderElement`. | Type: `undefined`. Optional. | d.ts line 9780 |
| ✅ | `RenderElement.type` | A `Markdown` whose plugin answers the links it drew (`onLinkPress`): a press on one raises `ui.press` with `e.link`, the surface opens none. | Type: `'Markdown'`. | d.ts line 9780 |
| ✅ | `RenderElement.props` | A field of `RenderElement`. | Type: `MarkdownLeafProps`. | d.ts line 9780 |
| ✅ | `RenderElement.press` | Where the `onLinkPress` handler lives: the plugin whose hook drew the element, and the handle its environment keeps the closure under. | Type: `object`. The runtime stamps the plugin as the tree leaves that hook. | d.ts line 9780 |
| ✅ | `RenderElement.children` | A field of `RenderElement`. | Type: `undefined`. Optional. | d.ts line 9780 |
| ✅ | `RenderElement.type` | A region one of the plugin's SURFACE MODULES, named by path, draws and handles input for on the drawing thread, without `$` (ClientModule). | Type: `'Client'`. One instance for each plugin. It lives while the node stays in the tree and talks to the plugin through `ui.message`. | d.ts line 9780 |
| ✅ | `RenderElement.props` | A field of `RenderElement`. | Type: `ClientProps`. | d.ts line 9780 |
| ✅ | `RenderElement.client` | Whose surface module `props.module` names: the plugin whose hook drew the element, stamped by the runtime as the tree leaves it. | Type: `object`. | d.ts line 9780 |
| ✅ | `RenderElement.children` | A field of `RenderElement`. | Type: `undefined`. Optional. | d.ts line 9780 |
| ✅ | `RenderElement.type` | A vector drawing, the remote surfaces' alone: the SVG markup is the element's data, drawn in an isolated box, off the page. | Type: `'Svg'`. A leaf. A surface whose table lacks it refuses the tree. Put a press that others should see on an enclosing `Button`. | d.ts line 9780 |
| ✅ | `RenderElement.props` | A field of `RenderElement`. | Type: `SvgProps`. | d.ts line 9780 |
| ✅ | `RenderElement.children` | A field of `RenderElement`. | Type: `undefined`. Optional. | d.ts line 9780 |
| ✅ | `RenderElement.type` | A grid of terminal cells, the terminal surface's alone: each cell a glyph, a foreground and a background, packed in `props.cells`. | Type: `'Raster'`. A leaf, one node however many cells. `$.ui.blit` repaints it in place. A surface whose table lacks it refuses the tree. | d.ts line 9780 |
| ✅ | `RenderElement.props` | A field of `RenderElement`. | Type: `RasterProps`. | d.ts line 9780 |
| ✅ | `RenderElement.raster` | Whose Raster: the plugin whose hook drew the element, stamped by the runtime as the tree leaves it, the one plugin whose blit reaches it. | Type: `object`. | d.ts line 9780 |
| ✅ | `RenderElement.children` | A field of `RenderElement`. | Type: `undefined`. Optional. | d.ts line 9780 |
| ✅ | `RenderElement.type` | A picture, the terminal surface's alone: `props.source` drawn over a box of cells where the terminal can, `props.alt` where it cannot. | Type: `'Image'`. A leaf. `$.ui.blit` swaps its picture. A surface without it refuses the tree. | d.ts line 9780 |
| ✅ | `RenderElement.props` | A field of `RenderElement`. | Type: `ImageProps`. | d.ts line 9780 |
| ✅ | `RenderElement.image` | Whose Image: the plugin whose hook drew the element, stamped by the runtime as the tree leaves it, the one plugin whose blit reaches it. | Type: `object`. | d.ts line 9780 |
| ✅ | `RenderElement.children` | A field of `RenderElement`. | Type: `undefined`. Optional. | d.ts line 9780 |
| ✅ | `RenderElement.type` | The component core draws itself, with the props held under `ref`. | Type: `'engine'`. | d.ts line 9780 |
| ✅ | `RenderElement.ref` | Which drawing: the number core answered from `next(e)`, under which it holds the props it received, 0 draws the original props. | Type: `number`. | d.ts line 9780 |
| ✅ | `RenderEventName` | The render event: `ui.render`, one event for every component that has a render site. | Alias of `'ui.render'`. | d.ts line 10119 |
| ✅ | `RenderInput` | The input of `ui.render`: a union discriminated by `component`, one member per RenderComponent and per RenderSurface. | Generic alias of `C extends RenderComponent ? P extends RenderSurface ? RenderInputOf<C, P> : never : never`. Used by `ui.render`, `$.ui.render`. | d.ts line 10125 |
| ✅ | `RenderInputOf` | One `ui.render` input, for a component narrowed to one surface. | Object. Its fields have rows below. | d.ts line 10130 |
| ✅ | `RenderInputOf.surface` | Where the tree will be drawn, one literal per member, so `if (e.surface === "terminal")` narrows `e` and `$.ui.resolve(e)`. | Type: `P`. Over the wire it is what the client declared, a rendering fact and not a trust signal: do not key policy on it. | d.ts line 10130 |
| ✅ | `RenderInputOf.component` | Which component this instance is, the key a matcher narrows on. | Type: `C`. | d.ts line 10130 |
| ✅ | `RenderInputOf.requestId` | The instance: the tool_use_id for a dialog or tool row, the message id for a message, the agent id for a spinner. | Type: `string`. Two drawings of one component are two instances. | d.ts line 10130 |
| ✅ | `RenderInputOf.viewport` | The size of what the surface draws into, in character cells, and whether its layout docks a pane, absent where no surface has measured. | Type: `RenderViewport`. Optional. Part of the envelope, so a rewrite keeps it. A change of width re-draws every hooked site once the resize settles. | d.ts line 10130 |
| ✅ | `RenderInputOf.props` | The component's plain-data props. | Type: `RenderPropsOf[C]`. | d.ts line 10130 |
| ✅ | `RenderNode` | A node of a render tree: an element, or a string (text). | Alias of `RenderElement \| string`. | d.ts line 10168 |
| ✅ | `RenderPropsOf` | The plain-data props of each renderable component, as `ui.render` sees them under `e.props`, a hook rewrites them with `next({ ...e, props })`. | Object. Its fields have rows below. A component validates a rewrite. An invalid rewrite draws the original. This is the render contract for plugins. | d.ts line 10178 |
| ✅ | `RenderResultOf` | What a `ui.render` hook returns and what `next(e)` resolves to: a RenderElement tree, the same for every component. | Object. Its fields have rows below. | d.ts line 10783 |
| ✅ | `RenderResultOf.[C in RenderComponent]` | A field of `RenderResultOf`. | Type: `RenderElement`. | d.ts line 10783 |
| ✅ | `RenderSurface` | The surface a render event's component is drawn on, by name. Plugins draw into surfaces, they do not provide them. | Alias of `keyof Elements & string`. The surfaces: `terminal`, `desktop`, `mobile`, and `vscode`. A host with no attached surface shows nothing drawn. Used by `$.session.surfaces`. | d.ts line 10802 |

## See Also

- [Mod API: UI Types](Claude-Code-Mod-API-UI-Types)
- [Mod API: UI Types (Part 3)](Claude-Code-Mod-API-UI-Types-3)
- [Mod API: UI Methods](Claude-Code-Mod-API-UI)
- [Claude Code Mod API](Claude-Code-Mod-API)
