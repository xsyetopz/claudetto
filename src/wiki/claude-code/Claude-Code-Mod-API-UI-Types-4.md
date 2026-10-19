# Mod API: UI Types (Part 4)

These are the last of the types behind `$.ui` and the element props.
They run from `UiOpenResult` to `UserMessageTask.durationMs`, and most of them are panes, scroll targets, and selections.

## Types

| Mark | Item | What it is for | Shape and limits | Source |
| --- | --- | --- | --- | --- |
| ✅ | `UiOpenResult` | What `$.ui.open` resolves to and what a `ui.open` hook's `{ value }` holds. | Object. Its fields have rows below. `isPlaced` says if a surface draws the pane now. Asked panes place at any width, and unasked panes need 144 columns (110 for an id the person opened before). | d.ts line 14820 |
| ✅ | `UiOpenResult.isPlaced` | True: the pane is open and drawn (or retitled in place), the first `ui.render` for `{ component: "Pane", requestId: id }` follows. | Type: `true`. | d.ts line 14820 |
| ✅ | `UiOpenResult.isPlaced` | False: the pane is open but undrawn: opened unasked on a narrow terminal, or where no surface places panes, or none is attached. | Type: `false`. With none attached keep the pane, which stays open: `session.attach` is raised when one is, `$.ui.panes()` then says placed, and a surface that places panes asks the pane's `ui.render`. | d.ts line 14820 |
| ✅ | `UiOpenResult.reason` | Why it waits and what seats it: the floor it fell under (144 columns unasked, 110 for an id the person once opened) and the width now. | Type: `string`. Says why a pane is not placed. It starts with `no-surface` when no surface is attached, such as in a `-p` run. | d.ts line 14820 |
| ✅ | `UiPane` | One of this plugin's open panes as `$.ui.panes()` lists it: the pane's id and title, and where it stands with the person right now. | Object. Its fields have rows below. Where the surface seated the pane (`dock` or `inline`) is on the `Pane` render props. Used by `$.ui.panes`, `ui.panes`. | d.ts line 14857 |
| ✅ | `UiPane.id` | What `$.ui.open({ id })` named it, which `$.ui.close` and its `ui.render` `requestId` name too. | Type: `string`. | d.ts line 14857 |
| ✅ | `UiPane.title` | Its tab's label: the `title` of its latest open, or the id. | Type: `string`. | d.ts line 14857 |
| ✅ | `UiPane.isShown` | True for the one pane the surface shows, the rest are tabs behind it. | Type: `boolean`. | d.ts line 14857 |
| ✅ | `UiPane.isFocused` | True while the person has given it the keyboard. | Type: `boolean`. | d.ts line 14857 |
| ✅ | `UiPane.isPlaced` | False while it waits undrawn: opened unasked on a terminal too narrow for an unrequested pane, its `$.ui.open` answered `{ isPlaced: false }`. | Type: `boolean`. It turns true when the person opens the pane or the terminal widens to the floor. It is false on every row while an open answers `no-surface`. | d.ts line 14857 |
| ✅ | `UiPressArgument` | The argument of `ui.press`: a press on a `Button` a render hook drew, or on an answered `Markdown` link. Flat and frozen like every event's. | Object. Its fields have rows below. Another plugin addresses one button by matcher: `on("ui.press", { plugin: "explainer", element: "explain" }, ...)`. Used by `ui.press`. | d.ts line 14893 |
| ✅ | `UiPressArgument.plugin` | Whose `ui.render` hook drew the element. | Type: `string`. | d.ts line 14893 |
| ✅ | `UiPressArgument.element` | The `key` the hook gave its `Button` or `Markdown`: its address, what a matcher names. | Type: `string`. | d.ts line 14893 |
| ✅ | `UiPressArgument.component` | The render component the element was drawn in (`ToolUse`, `AssistantMessage`, ...). | Type: `RenderComponent`. | d.ts line 14893 |
| ✅ | `UiPressArgument.requestId` | The instance the element was drawn in: the `requestId` the `ui.render` hook that drew it saw (a tool row's tool_use_id, a pane's id). | Type: `string`. | d.ts line 14893 |
| ✅ | `UiPressArgument.surface` | Where the press came from, one literal per member, so `if (e.surface === "terminal")` narrows `e`. | Type: `RenderSurface`. | d.ts line 14893 |
| ✅ | `UiPressArgument.link` | Where the press landed, when the element is a `Markdown` whose links its plugin answers (`onLinkPress`), absent for a `Button`. | Type: `PressedLink`. Optional. A hook may rewrite its `href` for the hooks and the closure beneath, one that adds or drops it fails, and the press goes on beneath it. | d.ts line 14893 |
| ✅ | `UiPressResult` | What a `ui.press` hook returns and what `next(e)` resolves to. | Object. Its fields have rows below. Core runs the element's `onPress` closure and answers `{ element }`. Used by `ui.press`. | d.ts line 14935 |
| ✅ | `UiPressResult.element` | Which handler the press reached, by its Button's `key`. | Type: `string`. | d.ts line 14935 |
| ✅ | `UiScrollArgs` | What a plugin's `$.ui.scroll(args)` takes: what to bring into view, in which of its sites, and where in the window it lands. | Object. Its fields have rows below. The engine resolves it to a window and an offset. A transcript row shows only while the plugin answers the person's own input. Used by `$.ui.scroll`. | d.ts line 14950 |
| ✅ | `UiScrollArgs.to` | What to reveal (UiScrollTarget): a render instance by `requestId`, one of this plugin's elements by `key`, or the `start` or `end` of `in`. | Type: `UiScrollTarget`. | d.ts line 14950 |
| ✅ | `UiScrollArgs.in` | The site to scroll, by the `requestId` this plugin draws it under: one of its panes' ids, or the band's. | Type: `string`. Optional. Required with `start` and `end`, with `{ key }` it picks the site when the key is drawn in several. | d.ts line 14950 |
| ✅ | `UiScrollArgs.block` | Where the target lands in the window (UiScrollBlock), `nearest` when left out, so a row already showing does not move. | Type: `UiScrollBlock`. Optional. | d.ts line 14950 |
| ✅ | `UiScrollBlock` | Where in its scrollable a revealed row lands, as the DOM's `scrollIntoView({ block })` names it. | Alias of `'start' \| 'center' \| 'end' \| 'nearest'`. `nearest` moves the least that shows the row whole. A row taller than the window shows its top. | d.ts line 14980 |
| ✅ | `UiScrollComponent` | The render components whose site the engine scrolls: a pane's body and the band above the prompt, each a window over the tree a hook drew there. | Alias of `'Pane' \| 'AbovePrompt'`. | d.ts line 14986 |
| ✅ | `UiScrollInput` | The input of `ui.scroll`: a site's window asked to move over the tree a hook drew in it (a pane's body, the band above the prompt). | Object. Its fields have rows below. Every key but `offset` is pinned. A rewrite that changes one fails the hook. Used by `ui.scroll`. | d.ts line 14996 |
| ✅ | `UiScrollInput.component` | Which site: a `Pane` body or the `AbovePrompt` band. | Type: `UiScrollComponent`. | d.ts line 14996 |
| ✅ | `UiScrollInput.requestId` | The instance the `ui.render` hook drawing the site sees: the pane's id, or the band's one id. | Type: `string`. | d.ts line 14996 |
| ✅ | `UiScrollInput.offset` | The first row the window is to show, 0 at the top: the row it shows now plus `by`, clamped to the tree, or where `$.ui.scroll` resolved. | Type: `number`. `next({ ...e, offset })` moves it elsewhere (a clamp), one past the tree's end lands at the end. Nothing has moved when a hook reads it. | d.ts line 14996 |
| ✅ | `UiScrollInput.by` | The rows the move asks for, signed, negative toward the top, what the DOM's `scrollBy` takes. Read-only. | Type: `number`. The scroll distance. A wheel tick is `-1` or `1`. A page key is `bodyRows`. Home and End are `contentRows`. | d.ts line 14996 |
| ✅ | `UiScrollInput.bodyRows` | How many rows of the tree the window shows at once, as drawn now. Read-only. | Type: `number`. | d.ts line 14996 |
| ✅ | `UiScrollInput.contentRows` | How many rows the tree has, as drawn now: the window's last offset is `contentRows - bodyRows`, none when the tree fits. Read-only. | Type: `number`. | d.ts line 14996 |
| ✅ | `UiScrollInput.origin` | Who moves it (UiScrollOrigin), set by the engine where the move starts. | Type: `UiScrollOrigin`. | d.ts line 14996 |
| ✅ | `UiScrollInput.pointer` | The body cell the person's wheel or trackpad was over (UiScrollPointer), absent for the scroll keys and for `$.ui.scroll`. Read-only. | Type: `UiScrollPointer`. Optional. Tells a tick over a hook's own list from a tick over the body. | d.ts line 14996 |
| ✅ | `UiScrollOrigin` | Who moves the window at `ui.scroll`, as the engine stamps it where the move starts, a closed set a matcher narrows on. | Object. Its fields have rows below. `next(e)` passes it on as received, no hook sets one. | d.ts line 15054 |
| ✅ | `UiScrollOrigin.kind` | The person, by the wheel over the site or its scroll keys while they hold it. | Type: `'person'`. | d.ts line 15054 |
| ✅ | `UiScrollOrigin.kind` | A plugin's `$.ui.scroll`. | Type: `'plugin'`. | d.ts line 15054 |
| ✅ | `UiScrollOrigin.name` | The scrolling plugin's name. | Type: `string`. | d.ts line 15054 |
| ✅ | `UiScrollPointer` | The cell the pointer was over when the person's wheel raised `ui.scroll`, in the site's body: the box its `ui.render` hook draws into, as painted. | Object. Its fields have rows below. The pointer position in cells, measured from the top of the body. The window offset is not added. | d.ts line 15079 |
| ✅ | `UiScrollPointer.column` | 0 at the body's left edge, as `bodyColumns` counts them, negative, or `bodyColumns` and past, over an inline pane's sides or the band's `[-]`. | Type: `number`. | d.ts line 15079 |
| ✅ | `UiScrollPointer.row` | 0 at the body's first showing row, as `bodyRows` counts them. | Type: `number`. The row under the pointer. It is negative above the body and `bodyRows` or more below it. | d.ts line 15079 |
| ✅ | `UiScrollResult` | What a `ui.scroll` hook returns, what `next(e)` resolves to, and what `$.ui.scroll` hands back: `{}` once the window moved, or why it did not. | Object. Its fields have rows below. Used by `$.ui.scroll`, `ui.scroll`. | d.ts line 15099 |
| ✅ | `UiScrollResult.deny` | Absent when the window is where the chain left it, else why nothing moved, as `tool.call` and `config.set` spell a refusal. | Type: `string`. Optional. Says why nothing scrolled: a hook kept the window, the target is not this plugin's, or another move came first. With no surface `no-surface` heads it. | d.ts line 15099 |
| ✅ | `UiScrollTarget` | What `$.ui.scroll` brings into view: never a row number, always a thing drawn somewhere. | Object. Its fields have rows below. `{ requestId }` names a render instance. `{ key }` names an element this plugin drew. `start` and `end` are the top and bottom of the site. | d.ts line 15125 |
| ✅ | `UiScrollTarget.requestId` | A field of `UiScrollTarget`. | Type: `string`. | d.ts line 15125 |
| ✅ | `UiScrollTarget.key` | A field of `UiScrollTarget`. | Type: `string`. | d.ts line 15125 |
| ✅ | `UiSelectArgument` | The argument of `ui.select`: a pick from a `Select` a render hook drew. Flat and frozen like every event's. | Object. Its fields have rows below. Another plugin addresses one picker by matcher: `on("ui.select", { plugin: "roster", element: "peer" }, ...)`. Used by `ui.select`. | d.ts line 15138 |
| ✅ | `UiSelectArgument.plugin` | Whose `ui.render` hook drew the element. | Type: `string`. | d.ts line 15138 |
| ✅ | `UiSelectArgument.element` | The `key` the hook gave its `Select`: its address, what a matcher names. | Type: `string`. | d.ts line 15138 |
| ✅ | `UiSelectArgument.component` | The render component the element was drawn in (`AbovePrompt`, `ToolUse`, ...). | Type: `RenderComponent`. | d.ts line 15138 |
| ✅ | `UiSelectArgument.requestId` | The instance the element was drawn in: the `requestId` the `ui.render` hook that drew it saw (a tool row's tool_use_id, a pane's id). | Type: `string`. | d.ts line 15138 |
| ✅ | `UiSelectArgument.surface` | Where the pick came from, one literal per member, so `if (e.surface === "terminal")` narrows `e`. | Type: `RenderSurface`. | d.ts line 15138 |
| ✅ | `UiSelectArgument.value` | The picked option's value, a hook above may rewrite it for the plugins beneath and the element's own handler. | Type: `string`. | d.ts line 15138 |
| ✅ | `UiSelection` | What the person has selected on screen, as `$.ui.selection()` answers it: the text, and the transcript row it lies in when it lies in one. | Object. Its fields have rows below. Example: `const selected = await $.ui.selection()`. Used by `$.ui.selection`, `ui.selection`. | d.ts line 15176 |
| ✅ | `UiSelection.text` | The selected text as the person sees it: what a copy would put on the clipboard, wrapped rows joined back into their lines. | Type: `string`. | d.ts line 15176 |
| ✅ | `UiSelection.requestId` | The transcript row the selection lies in, by the id its `ui.render` hook reads as `e.requestId` and `$.ui.scroll` takes. | Type: `string`. Optional. A tool call's row by its `tool_use_id`. Absent when the selection spans several rows or lies outside the transcript. | d.ts line 15176 |
| ✅ | `UiSelectResult` | What a `ui.select` hook returns and what `next(e)` resolves to. | Object. Its fields have rows below. Core runs the element's `onSelect` closure and answers `{ element, value }`. Used by `ui.select`. | d.ts line 15200 |
| ✅ | `UiSelectResult.element` | Which handler the pick reached, by its Select's `key`. | Type: `string`. | d.ts line 15200 |
| ✅ | `UiSelectResult.value` | What the handler received: the option's value as the chain left it. | Type: `string`. | d.ts line 15200 |
| ✅ | `UiViewResult` | What `$.ui.view` hands back and what a `ui.view` hook's `{ value }` holds: `{}` once the main view shows what was asked, or why it does not. | Object. Its fields have rows below. As `ui.scroll` spells it. Example: `$.ui.view({ agentId }).then(shown => shown.deny && $.ui.toast(shown.deny))`. Used by `$.ui.view`, `ui.view`. | d.ts line 15220 |
| ✅ | `UiViewResult.deny` | Absent when the main view shows the transcript asked for, else why the view did not move. | Type: `string`. Optional. Says why the view did not change: the call was not the person's own input, no agent has the id, or the view moved meanwhile. | d.ts line 15220 |
| ✅ | `UserMessageFrom` | Who sent the message a `UserMessage` row carries, when someone other than the person did: another agent, a teammate, another session, a channel. | Object. Its fields have rows below. Read-only. The sender's words are not the person's: the model reads them framed as that sender's whatever a hook draws for the row. | d.ts line 15315 |
| ✅ | `UserMessageFrom.name` | The sender's name as the row shows it: a subagent's name, else its type, a teammate's, another session's title, a channel's sender, else server. | Type: `string`. One printable line: control and format characters stripped, whitespace collapsed, length bounded. Absent (no `from`) for a teammate block whose frames name different senders or none. | d.ts line 15315 |
| ✅ | `UserMessageTask` | The background task a `UserMessage` notification row reports on: a subagent, a background shell, a workflow, a remote agent, a monitor. | Object. Its fields have rows below. Read-only. Every field is the notification's own, so the row names the same task on every draw. Each string is one printable line. | d.ts line 15336 |
| ✅ | `UserMessageTask.id` | The task's id as the notification names it, for a subagent, the `agentId` its `turn.complete` carried and `$.agent.list()` keys. | Type: `string`. Optional. | d.ts line 15336 |
| ✅ | `UserMessageTask.status` | How the task ended: `completed`, `failed` or `killed` (stopped, by the person or by Claude), or another word its producer wrote. | Type: `string`. Optional. | d.ts line 15336 |
| ✅ | `UserMessageTask.type` | What kind of task, when the notification says (`remote_agent`, an artifact watch's kind), a subagent's and a shell's leave it out. | Type: `string`. Optional. | d.ts line 15336 |
| ✅ | `UserMessageTask.toolUseId` | Which call started the task: its `tool_use_id`, when the notification carries it. | Type: `string`. Optional. | d.ts line 15336 |
| ✅ | `UserMessageTask.durationMs` | How long the task ran, in milliseconds, when the notification says, the row draws it after the summary (`2m 2s`). | Type: `number`. Optional. | d.ts line 15336 |

## See Also

- [Mod API: UI Types (Part 3)](Claude-Code-Mod-API-UI-Types-3)
- [Mod API: UI Methods](Claude-Code-Mod-API-UI)
- [Claude Code Mod API](Claude-Code-Mod-API)
