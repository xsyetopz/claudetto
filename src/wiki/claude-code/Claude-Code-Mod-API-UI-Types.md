# Mod API: UI Types

These are the types of `$.ui`, the element props, and the client modules.
They describe `Box`, `Text`, `Button`, and the other elements that a mod can draw.
Example: `<Button key="save" onPress={() => $.ui.copy({ text: url })}>Copy</Button>`.
The types here run from `AskOptions` to `ImageProps.alt`.

## Types

| Mark | Item | What it is for | Shape and limits | Source |
| --- | --- | --- | --- | --- |
| ✅ | `AskOptions` | Options of `$.ui.ask`. | Object with fields `options?`, `header?`, `multiSelect?`. Used by `$.ui.ask`. | d.ts line 691 |
| ✅ | `AskOptions.options` | 2-4 option labels, fewer than two are padded with Yes/No, free text is the dialog's Other. | Type: `readonly string[]`. Optional. | d.ts line 691 |
| ✅ | `AskOptions.header` | A short chip beside the question (`Approach`, 12 characters at most). | Type: `string`. Optional. | d.ts line 691 |
| ✅ | `AskOptions.multiSelect` | Allow several options, the answer comes back comma-joined. | Type: `true`. Optional. | d.ts line 691 |
| ✅ | `BoxHoverProps` | The `Box` props a `hover` may override, none of which moves the Box's siblings, and `scope`, which names the hover group the Box joins. | Object. Its fields have rows below. The surface applies a hover as the pointer moves. A reveal that keeps moving settles and never loops. | d.ts line 888 |
| ✅ | `BoxHoverProps.scope` | Names a hover group of this plugin's: every element it draws with the same `scope`, in any site, lights while any is hovered, reveals included. | Type: `string`. Optional. A `Pane` row and a transcript mark can share one scope. A scope is 1 to 64 characters with no control characters. | d.ts line 888 |
| ✅ | `BoxHoverProps.borderStyle` | Restyles a border the Box has, it adds none. | Type: `string`. Optional. | d.ts line 888 |
| ✅ | `BoxHoverProps.borderColor` | A field of `BoxHoverProps`. | Type: `Color`. Optional. | d.ts line 888 |
| ✅ | `BoxHoverProps.borderDimColor` | A field of `BoxHoverProps`. | Type: `boolean`. Optional. | d.ts line 888 |
| ✅ | `BoxHoverProps.backgroundColor` | A field of `BoxHoverProps`. | Type: `Color`. Optional. | d.ts line 888 |
| ✅ | `BoxHoverProps.display` | `"flex"` alone, on a Box drawn `display: "none"`: with a `scope`, every member of the lit group is revealed, in whichever site it sits. | Type: `'flex'`. Optional. So a pointer on a glyph in the transcript can swap an entry into a fixed row of the band, or reveal an absolutely positioned card. | d.ts line 888 |
| ✅ | `BoxHoverProps.top` | Moves a Box drawn `position: "absolute"`, as `left`, `right` and `bottom` do, none of the four moves a Box in the flow. | Type: `number`. Optional. | d.ts line 888 |
| ✅ | `BoxHoverProps.left` | A field of `BoxHoverProps`. | Type: `number`. Optional. | d.ts line 888 |
| ✅ | `BoxHoverProps.right` | A field of `BoxHoverProps`. | Type: `number`. Optional. | d.ts line 888 |
| ✅ | `BoxHoverProps.bottom` | A field of `BoxHoverProps`. | Type: `number`. Optional. | d.ts line 888 |
| ✅ | `BoxProps` | The props of `Box`: the layout, position, margin, padding and border props of Ink's Box a tree may set, and the two of hover. | Object. Its fields have rows below. The layout and style props of a `Box`, such as `flexDirection`, `gap`, `padding`, and `borderStyle`. | d.ts line 927 |
| ✅ | `BoxProps.key` | Makes the Box a hover scope: while the pointer is anywhere over it, its own `hover` and that of every element beneath it apply. | Type: `string`. Optional. A nested `Box` with a `key` scopes what is beneath it. A key that a sibling took names no scope. | d.ts line 927 |
| ✅ | `BoxProps.hover` | Style overrides applied by the surface while the pointer is over the nearest keyed `Box`, this one included, or, given a `scope`, its group. | Type: `BoxHoverProps`. Optional. No hook runs on hover. To reveal on hover, draw the `Box` with `display: "none"` and set `hover: { display: "flex" }`. | d.ts line 927 |
| ✅ | `BoxProps.position` | `"absolute"` leaves the flow, as in CSS: placed against its parent by the offsets, no room among its siblings, painted over those before it. | Type: `'relative' \| 'absolute'`. Optional. An absolute `Box` moves nothing when it shows. The region of its site clips it. | d.ts line 927 |
| ✅ | `BoxProps.top` | Rows from the parent's top edge, in character cells: an integer, negative above the edge. | Type: `number`. Optional. With `bottom` and no `height` the Box spans the two. | d.ts line 927 |
| ✅ | `BoxProps.left` | Columns from the parent's left edge, in character cells: an integer, negative left of the edge. | Type: `number`. Optional. With `right` and no `width` the Box spans the two. | d.ts line 927 |
| ✅ | `BoxProps.right` | Columns from the parent's right edge, in character cells: an integer, negative right of the edge. | Type: `number`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.bottom` | Rows from the parent's bottom edge, in character cells: an integer, negative below the edge. | Type: `number`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.flexDirection` | A field of `BoxProps`. | Type: `'row' \| 'column' \| 'row-reverse' \| 'column-reverse'`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.flexGrow` | A field of `BoxProps`. | Type: `number`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.flexShrink` | A field of `BoxProps`. | Type: `number`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.flexWrap` | A field of `BoxProps`. | Type: `'nowrap' \| 'wrap' \| 'wrap-reverse'`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.alignItems` | A field of `BoxProps`. | Type: `'flex-start' \| 'center' \| 'flex-end' \| 'stretch'`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.alignSelf` | A field of `BoxProps`. | Type: `'flex-start' \| 'center' \| 'flex-end' \| 'auto'`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.justifyContent` | A field of `BoxProps`. | Type: `'flex-start' \| 'center' \| 'flex-end' \| 'space-between' \| 'space-around' \| 'space-evenly'`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.gap` | Space between the children, in cells or a step name. Set `gap` on the `Box` rather than a margin on each child. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.columnGap` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.rowGap` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.width` | A field of `BoxProps`. | Type: `number \| string`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.height` | A field of `BoxProps`. | Type: `number \| string`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.minWidth` | A field of `BoxProps`. | Type: `number \| string`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.minHeight` | A field of `BoxProps`. | Type: `number \| string`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.margin` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.marginX` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.marginY` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.marginTop` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.marginBottom` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.marginLeft` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.marginRight` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.padding` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.paddingX` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.paddingY` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.paddingTop` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.paddingBottom` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.paddingLeft` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.paddingRight` | A field of `BoxProps`. | Type: `Space`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.borderStyle` | A field of `BoxProps`. | Type: `string`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.borderColor` | A field of `BoxProps`. | Type: `Color`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.borderDimColor` | A field of `BoxProps`. | Type: `boolean`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.backgroundColor` | A field of `BoxProps`. | Type: `Color`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.overflow` | A field of `BoxProps`. | Type: `'visible' \| 'hidden'`. Optional. | d.ts line 927 |
| ✅ | `BoxProps.display` | A field of `BoxProps`. | Type: `'flex' \| 'none'`. Optional. | d.ts line 927 |
| ✅ | `ButtonProps` | The props of `Button`, every surface's pressable: an address, a label or children, the closure a press runs, and the styles a hover overrides. | Object. Its fields have rows below. The terminal draws `[ label ]` and desktop draws a native button. A click, a `hotkey`, or Enter raises `ui.press`. | d.ts line 1092 |
| ✅ | `ButtonProps.key` | The element's address: `e.element` at `ui.press`, what a matcher names. Defaults to the `label`, or the one string child. | Type: `string`. Optional. Needed where the Button holds other children and no `label`: a row's text holds what changes (a count, an age), its address must not. | d.ts line 1092 |
| ✅ | `ButtonProps.label` | The text drawn on the button, or the one string child. | Type: `string`. Optional. Children of strings and `Text` are drawn in its place. Any other element is refused. | d.ts line 1092 |
| ✅ | `ButtonProps.hotkey` | One digit (`"1"`) or one lowercase letter (`"w"`) that presses it while the plugin's site holds the focus, anything else is refused. | Type: `string`. Optional. Its site holds the key after ctrl+x tab, a click, or `open({ focus })`. Two buttons with the same key clash, and the later wins. | d.ts line 1092 |
| ✅ | `ButtonProps.action` | An engine keybinding action (`"app:cycleDiffBase"`) whose chord, as the person bound it, presses this from the prompt, unknown names refused. | Type: `string`. Optional. Chords that a global or active context binding holds, on the terminal while the button is mounted. | d.ts line 1092 |
| ✅ | `ButtonProps.plain` | Drawn without chrome: the hotkey in the accent color, a colon, the label (`1: Yes`), as a survey's row reads, no `hotkey`, the label alone. | Type: `true`. Optional. A one-glyph label is then a control by itself. `dimColor` and `hover` still apply. | d.ts line 1092 |
| ✅ | `ButtonProps.dimColor` | The label drawn dim at rest, as `Text`'s `dimColor`, and at full strength under the pointer or the focus: a secondary control, a path in a list. | Type: `boolean`. Optional. | d.ts line 1092 |
| ✅ | `ButtonProps.variant` | Which button of several is the main action: `"primary"` is drawn as the surface marks the one to press, `"secondary"`, and absent, as before. | Type: `'primary' \| 'secondary'`. Optional. The terminal draws a primary button in the accent color. `plain` wins over `variant`. | d.ts line 1092 |
| ✅ | `ButtonProps.role` | Marks the Button that closes its site: a drawing hint only. `onPress` still does the dismissing and the press is raised as for any Button. | Type: `'dismiss'`. Optional. The terminal draws it as without the prop, a desktop draws its native close control at the site's trailing edge, the label its accessible name. | d.ts line 1092 |
| ✅ | `ButtonProps.autoFocus` | The site's focus ring starts here when the site takes the keyboard, instead of on nothing, as the DOM's `autofocus`: Enter acts on it at once. | Type: `true`. Optional. A pane opened with `focus` takes it. Of several in one site, the first drawn wins. | d.ts line 1092 |
| ✅ | `ButtonProps.hover` | Label style overrides (the `Text` set) applied by the surface while the nearest enclosing keyed `Box`, or given a `scope` its group, is hovered. | Type: `TextHoverProps`. Optional. No hook runs and nothing crosses to the plugin, under the pointer itself the button inverts as it always has. Refused outside a keyed Box unless it names a `scope`. | d.ts line 1092 |
| ✅ | `ButtonProps.onPress` | What the press runs, in the plugin's own environment: the bottom of the `ui.press` chain. The host holds only a handle, for the drawing's life. | Type: `(e: UiPressArgument) => void`. Runs with the `ui.press` argument. `e.surface` names the surface the press came from. | d.ts line 1092 |
| ✅ | `ClientElements` | The element table a surface module draws with, `surface.elements`: the terminal's (Elements) less `Client` (none nests), `Raster` and `Image`. | Alias of the terminal element table without `Client`, `Raster`, and `Image`. A tree has bounds: 20,000 nodes, 32 deep, 100,000 characters. | d.ts line 1441 |
| ✅ | `ClientKeyEvent` | One key the person pressed while a `Client` had the focus, as `surface.onKey` hands it. Escape never arrives: it returns the focus. | Object with fields `key`, `ctrl?`, `shift?`, `meta?`. | d.ts line 1447 |
| ✅ | `ClientKeyEvent.key` | A special key's name (`up`, `down`, `left`, `right`, `return`, `tab`, `backspace`, `delete`, `pageup`, `home`, ...) or the character typed. | Type: `string`. | d.ts line 1447 |
| ✅ | `ClientKeyEvent.ctrl` | Modifier keys held with it, each present only when true. | Type: `true`. Optional. | d.ts line 1447 |
| ✅ | `ClientKeyEvent.shift` | A field of `ClientKeyEvent`. | Type: `true`. Optional. | d.ts line 1447 |
| ✅ | `ClientKeyEvent.meta` | A field of `ClientKeyEvent`. | Type: `true`. Optional. | d.ts line 1447 |
| ✅ | `ClientModule` | The component a surface module exports (default, or its one PascalCase export): from props and surface to the tree drawn (no nested `Client`). | Alias of a function `(props, surface) => RenderElement`. It runs on the drawing thread, a second per call at most. A throw or an overrun unmounts it. | d.ts line 1472 |
| ✅ | `ClientPointerEvent` | One pointer event over a `Client`'s region, as `surface.onPointer` hands it: region-relative cells, and the sub-cell position where known. | Object with the fields `type`, `x`, `y`, `fine?`, `button?`, `shift?`, `alt?`, `ctrl?`. After a `down` the instance holds the pointer until the `up`. | d.ts line 1482 |
| ✅ | `ClientPointerEvent.type` | A field of `ClientPointerEvent`. | Type: `ClientPointerType`. | d.ts line 1482 |
| ✅ | `ClientPointerEvent.x` | The column under the pointer, 0 at the region's left edge, on `enter` and `leave`, the last column a move reported. | Type: `number`. | d.ts line 1482 |
| ✅ | `ClientPointerEvent.y` | The row under the pointer, 0 at the region's top edge. | Type: `number`. | d.ts line 1482 |
| ✅ | `ClientPointerEvent.fine` | The same position with the fraction of a cell kept (`x: 12`, `fine.x: 12.375`), where the surface knows it: a terminal that reports pixels. | Type: `object`. Optional. Sub-cell pointer position. Kitty, Ghostty, iTerm2, WezTerm, and foot send it. tmux passes none. | d.ts line 1482 |
| ✅ | `ClientPointerEvent.button` | Which button is down (`down`, `move` while held) or came up (`up`), absent on a hover `move`, `enter` and `leave`. | Type: `'left' \| 'middle' \| 'right'`. Optional. | d.ts line 1482 |
| ✅ | `ClientPointerEvent.shift` | Modifier keys the terminal reported held, each present only when true. | Type: `true`. Optional. | d.ts line 1482 |
| ✅ | `ClientPointerEvent.alt` | A field of `ClientPointerEvent`. | Type: `true`. Optional. | d.ts line 1482 |
| ✅ | `ClientPointerEvent.ctrl` | A field of `ClientPointerEvent`. | Type: `true`. Optional. | d.ts line 1482 |
| ✅ | `ClientPointerType` | What the pointer did over a `Client`'s region: a button went down, the pointer moved, the button came up, or the pointer crossed the region's edge. | Alias of `'down' \| 'move' \| 'up' \| 'enter' \| 'leave'`. | d.ts line 1525 |
| ✅ | `ClientProps` | The props of `Client`: which of the plugin's surface modules draws here, under what key, with what data, in how much room. | Object with fields `key`, `module`, `props?`, `width?`, `height?`, `flexGrow?`. | d.ts line 1531 |
| ✅ | `ClientProps.key` | The instance's address within the drawing: two `Client`s of one plugin in one tree take two keys. What `e.element` carries at `ui.message`. | Type: `string`. The engine keeps the instance (its local state, its timers) across the plugin's redraws while a `Client` under this key stays in the tree. | d.ts line 1531 |
| ✅ | `ClientProps.module` | The surface module's path, a string literal relative to this file: `module: "./<name>.tsx"` (or `.jsx`, `.ts`, `.js`, `.mjs`). | Type: `string`. Read off the source, so a variable is refused at load. A path outside the plugin is refused too. | d.ts line 1531 |
| ✅ | `ClientProps.props` | Plain data (JsonValue) handed to the module function, a new value on a redraw reaches the running instance, its state kept. | Type: `unknown`. Optional. At most 100000 characters serialized, not a channel for closures. Typed `unknown` so a matcher over a tree stays shallow. | d.ts line 1531 |
| ✅ | `ClientProps.width` | Columns the instance's region takes: a count, or a percentage of the parent. Absent, the region is as wide as what the module draws. | Type: `number \| string`. Optional. | d.ts line 1531 |
| ✅ | `ClientProps.height` | Rows the instance's region takes: a count, or a percentage of the parent. Absent, the region is as tall as what the module draws. | Type: `number \| string`. Optional. | d.ts line 1531 |
| ✅ | `ClientProps.flexGrow` | How the region grows into free room along the parent's direction, as a Box's `flexGrow`. | Type: `number`. Optional. | d.ts line 1531 |
| ✅ | `ClientSurface` | What a surface module's function receives as its second argument: its elements, the instance's local state, its region, input, clock and port. | Alias of an object with `elements`, `state`, `setState`, `columns`, `rows`, `every`, `onPointer`, `onKey`, and `post`. The module runs again on new props, `setState`, and a resize. | d.ts line 1582 |
| ✅ | `ClientSurface.elements` | The surface's element table (ClientElements), the tags the module draws with: `const { Box, Text } = surface.elements`. No `Client` in it. | Type: `ClientElements`. | d.ts line 1582 |
| ✅ | `ClientSurface.state` | The instance's local state: `undefined` until the first `setState`. Kept across the plugin's redraws, dropped with the instance. | Type: `S \| undefined`. | d.ts line 1582 |
| ✅ | `ClientSurface.setState` | Replaces the local state and schedules one more call of the function on the next frame, several calls before it coalesce into one redraw. | Type: `(next: S) => void`. A `setState` on each of three renders in a row with no key, pointer, tick, press or props between is a render loop: the instance unmounts. | d.ts line 1582 |
| ✅ | `ClientSurface.columns` | The region's width in cells, as last laid out (0 before the first layout). | Type: `number`. | d.ts line 1582 |
| ✅ | `ClientSurface.rows` | The region's height in cells, as last laid out (0 before the first layout). | Type: `number`. | d.ts line 1582 |
| ✅ | `ClientSurface.every` | Calls `fn` every `ms` milliseconds on the surface's frame clock until the returned function is called or the instance unmounts. | Type: `(ms: number, fn: () => void) => () => void`. Start it once (while `state` is still undefined), not on every call. | d.ts line 1582 |
| ✅ | `ClientSurface.onPointer` | Sets the instance's pointer listener (one, a later call replaces it) and returns what clears it. See ClientPointerEvent for capture. | Type: `(fn: (event: ClientPointerEvent) => void) => () => void`. | d.ts line 1582 |
| ✅ | `ClientSurface.onKey` | Sets the instance's key listener (one, a later call replaces it), reached while a click has given it the focus, Escape returns that. | Type: `(fn: (event: ClientKeyEvent) => void) => () => void`. | d.ts line 1582 |
| ✅ | `ClientSurface.post` | Sends plain data to the plugin's hooks module: `e.data` of a `ui.message` only that plugin's hooks see, one per frame at most. | Type: `(data: JsonValue) => void`. A later post in the same frame replaces an undelivered one. At most 20,000 values, 32 deep, 100,000 characters. | d.ts line 1582 |
| ✅ | `CodeProps` | The props of `Code`, source text every surface draws with the engine's own highlighter: coloured tokens, a line gutter on request, or a unified diff. | Object with the fields `source`, `language?`, `path?`, `startLine?`, `format?`, `wrap?`. A leaf with no children. The color on screen is the engine's. | d.ts line 1658 |
| ✅ | `CodeProps.source` | The text drawn: source code, or under `format: 'diff'` one or more unified-diff hunks. | Type: `string`. Of any length, one drawing drawing 100000 characters in all, tab and newline its only control characters. A diff cut mid-hunk does not parse. | d.ts line 1658 |
| ✅ | `CodeProps.language` | A highlighter language id or alias (`typescript`, `ts`, `py`), a plugin-contributed grammar's included. | Type: `string`. Optional. Absent, the language is inferred from `path`, when neither resolves, the text is drawn plain. | d.ts line 1658 |
| ✅ | `CodeProps.path` | A file path the language is inferred from when `language` is absent: its extension or name, else a shebang on the first line. | Type: `string`. Optional. Drawn nowhere and never read: nothing touches the disk. | d.ts line 1658 |
| ✅ | `CodeProps.startLine` | The 1-based number of the first line of `source`: present, a dim right-aligned gutter numbers the lines from it, absent, no gutter. | Type: `number`. Optional. Ignored under `format: 'diff'`, whose hunks carry their own numbers. | d.ts line 1658 |
| ✅ | `CodeProps.format` | `'source'` (the default) draws `source` as code, `'diff'` reads it as unified-diff hunks and draws gutters, markers, add and remove colouring. | Type: `'source' \| 'diff'`. Optional. A diff holds `@@ -a,b +c,d @@` hunks. A source with no hunks is drawn as plain code. | d.ts line 1658 |
| ✅ | `CodeProps.wrap` | What a line wider than the room does, in Text's `wrap` vocabulary: `'wrap'` (the default) continues it on rows under the gutter. | Type: `'wrap' \| 'truncate-end'`. Optional. `'truncate-end'` cuts it at the edge with an ellipsis, Text's other spellings are refused, since a gutter leaves them no sense here. | d.ts line 1658 |
| ✅ | `Color` | What a prop that paints may hold: a theme key, which follows the person's theme, or any other string, a raw color (a name such as `"red"`, or hex). | Alias of `ThemeKey \| (string & {})`. The keys are named so that an editor lists them, every string is admitted. What a surface draws for one it does not know is its own. | d.ts line 1715 |
| ✅ | `ElementChildren` | The `children` field every element constructor's props carry, appended beside its own props type: one child, or a list that may nest. | Object with the field `children?`. A lone child is typed as the child itself. A mapped list beside a sibling is a nested list. | d.ts line 3855 |
| ✅ | `ElementChildren.children` | A field of `ElementChildren`. | Type: `RenderChildren`. Optional. | d.ts line 3855 |
| ✅ | `ElementConstructor` | An element as `$.ui.resolve(e)` hands it out: a constructor from props to the frozen plain-data element, `children` among the props as JSX passes. | Alias of `(props: P & ElementChildren) => RenderElement`. `const { Box } = $.ui.resolve(e)` then `<Box gap={1}>` compiles to a call of `h`. | d.ts line 3867 |
| ✅ | `ElementName` | Every element name of every surface: what a table handed out is completed to (an omitted one draws a fragment, see `ui.resolve`). | Object with fields `[P in RenderSurface]`. | d.ts line 3873 |
| ✅ | `ElementName.[P in RenderSurface]` | A field of `ElementName`. | Type: `keyof Elements[P]`. | d.ts line 3873 |
| ✅ | `Elements` | Each surface's primitive tags and their prop types, by `e.surface`, for the surfaces the plugin was compiled against. | Interface with the members `terminal`, `desktop`, `mobile`, `vscode`. A new surface adds its table by declaration merging. Used by `$.ui.resolve`. | d.ts line 3890 |
| ✅ | `ElementTable` | The table `ui.resolve` answers for an argument of surface `P`. | Generic alias of `Elements[P]`. Used by `ui.resolve`. | d.ts line 3973 |
| ✅ | `ImageBlitArgs` | A `$.ui.blit` argument swapping one of the caller's mounted keyed Images to its next picture, every call sends it, so a stream needs no generation. | Object with the fields `requestId`, `key`, `source`, `columns?`, `rows?`. Byte and `file` sources fold to the last one per frame. | d.ts line 5403 |
| ✅ | `ImageBlitArgs.requestId` | The site the Image is drawn in, by the `requestId` this plugin draws it under. | Type: `string`. | d.ts line 5403 |
| ✅ | `ImageBlitArgs.key` | The Image's `key` in that drawing. | Type: `string`. | d.ts line 5403 |
| ✅ | `ImageBlitArgs.source` | The next picture (ImageSource): bytes, or a name the terminal reads. | Type: `ImageSource`. | d.ts line 5403 |
| ✅ | `ImageBlitArgs.columns` | Refused unless it is the mounted Image's width in cells. Absent, that. | Type: `number`. Optional. | d.ts line 5403 |
| ✅ | `ImageBlitArgs.rows` | Refused unless it is the mounted Image's height in cells. Absent, that. | Type: `number`. Optional. | d.ts line 5403 |
| ✅ | `ImageProps` | The props of `Image`, the terminal surface's picture leaf: pixels over a box of cells where the terminal can (kitty, Ghostty), the `alt` elsewhere. | Object with the fields `key?`, `source`, `columns`, `rows`, `alt`. A leaf with no children, `hover`, or `onPress`. A new `source` replaces the picture in place. | d.ts line 5440 |
| ✅ | `ImageProps.key` | The element's address within the drawing: what `$.ui.blit` names to swap. | Type: `string`. Optional. Unique among the Images of one tree, absent, only a redraw changes it. | d.ts line 5440 |
| ✅ | `ImageProps.source` | The picture (ImageSource): `{ png }` or `{ rgba, width, height }` bytes, or `{ file, format }` / `{ shm, format, width, height }` read here. | Type: `ImageSource`. | d.ts line 5440 |
| ✅ | `ImageProps.columns` | /** How many terminal columns wide, 1 to 255, the picture is scaled to fill the box and the site clips what its body cannot show. */ | Type: `number`. | d.ts line 5440 |
| ✅ | `ImageProps.rows` | How many terminal rows tall, 1 to 255. | Type: `number`. | d.ts line 5440 |
| ✅ | `ImageProps.alt` | What the picture says, drawn dim in its place where the picture cannot be (and read by a screen reader), required, may be a single space. | Type: `string`. | d.ts line 5440 |

## See Also

- [Mod API: UI Methods](Claude-Code-Mod-API-UI)
- [Mod API: UI Types (Part 2)](Claude-Code-Mod-API-UI-Types-2)
- [Mod API: Surfaces, Elements, and Render Sites](Claude-Code-Mod-API-UI-Elements)
- [Claude Code Mod API](Claude-Code-Mod-API)
- [Draw in the Interface](https://code.claude.com/docs/en/plugins/mods/interface)
