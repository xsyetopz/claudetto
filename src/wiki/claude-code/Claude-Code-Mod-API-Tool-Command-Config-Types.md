# Mod API: Tool, Command, and Config Types

These are the types behind `$.tool`, `$.command`, and `$.config`.
They describe a tool call, a permission check, a command run, and a row of the `/config` menu.
Example: `const { decision } = await $.tool.check({ tool: "Read", input })`.
The types here run from `BuiltinToolCallInput` to `ToolDescribeInput.provider`.

## Types

| Mark | Item | What it is for | Shape and limits | Source |
| --- | --- | --- | --- | --- |
| ✅ | `BuiltinToolCallInput` | One variant per built-in tool, with none in the table (a plugin author's project with no tools entry laid), one loose variant over every name. | Alias of `[BuiltinToolName] extends [never] ? BuiltinToolCallInputFallback : { [N in BuiltinToolName]: ToolInputOf<N, BuiltinToolInputs[N]>, }[BuiltinToolName]`. | d.ts line 1028 |
| ✅ | `BuiltinToolCallInput.[N in BuiltinToolName]` | A field of `BuiltinToolCallInput`. | Type: `ToolInputOf<N, BuiltinToolInputs[N]>`. | d.ts line 1028 |
| ✅ | `BuiltinToolCallInputFallback` | The built-in branch's answer when no built-in tool is declared: every name, its args unconstrained. | Object. Its fields have rows below. | d.ts line 1036 |
| ✅ | `BuiltinToolCallInputFallback.tool` | The name of the tool being called (`Bash`), comparing it narrows `e` once the table has entries. Reserved: a rewrite of it is ignored by core. | Type: `string`. | d.ts line 1036 |
| ✅ | `BuiltinToolCallInputFallback.tool_use_id` | The tool_use block's id: the same at every event of the call and in `$.ui.notice`. Reserved: a rewrite of it is ignored by core. | Type: `string`. | d.ts line 1036 |
| ✅ | `BuiltinToolCallInputFallback.[argument: string]` | A field of `BuiltinToolCallInputFallback`. | Type: `unknown`. | d.ts line 1036 |
| ✅ | `BuiltinToolInputs` | The arguments of each built-in tool by name, for declaration merging, empty until a declaration file adds entries, then `e.tool === "Bash"` narrows `e` to Bash's arguments. | Interface. The engine lays this build's set beside a mod it loads (claude-code-tools/index.d.ts), from each tool's input schema. | d.ts line 1061 |
| ✅ | `BuiltinToolName` | The names of the built-in tools. | Alias of `keyof BuiltinToolInputs & string`. | d.ts line 1067 |
| ✅ | `BuiltinToolResults` | The structured result of each built-in tool by name, for declaration merging, empty until a declaration file adds entries, then after `e.tool === "Bash"` the `result` of `next(e)` is Bash's record. | Interface. The engine lays this build's set beside a mod it loads (claude-code-tools/index.d.ts), from each tool's output schema, a tool without one is `unknown`. | d.ts line 1081 |
| ✅ | `CommandDescribeInput` | The input of `command.describe`: how one slash command presents in the typeahead and `/help`, at the moment the engine lists it. | Object. Its fields have rows below. Used by `command.describe`, `$.command.describe`. | d.ts line 1721 |
| ✅ | `CommandDescribeInput.command` | Names the command without its slash, the key a matcher narrows on. A rewrite is refused. | Type: `string`. | d.ts line 1721 |
| ✅ | `CommandDescribeInput.description` | The one-line description the menu shows, as the command declares it. | Type: `string`. | d.ts line 1721 |
| ✅ | `CommandDescribeInput.argumentHint` | The hint drawn dim after the name (`[name]`), when the command has one. | Type: `string`. Optional. | d.ts line 1721 |
| ✅ | `CommandDescribeInput.isHidden` | Whether the typeahead and `/help` leave the command out, a hidden command still runs when typed in full. | Type: `boolean`. | d.ts line 1721 |
| ✅ | `CommandDescribeInput.immediate` | Whether the command declares it runs at once when typed mid-turn, instead of waiting for the turn to end. | Type: `boolean`. One that decides per invocation reads false. Read only: not part of what a hook answers, and a rewrite is refused. | d.ts line 1721 |
| ✅ | `CommandDescribeInput.provider` | Who provides this command: the plugin and its tier, `{ plugin: "engine", tier: "core" }` for a built-in. Pinned: a rewrite is refused. | Type: `Origin`. | d.ts line 1721 |
| ✅ | `CommandDescribeResult` | What a `command.describe` hook returns: the description, hint and hidden flag the menu uses, the name, `immediate` and `provider` stay as they were. | Alias of `Omit<CommandDescribeInput, 'command' \| 'immediate' \| 'provider'>`. Used by `command.describe`, `$.command.describe`. | d.ts line 1759 |
| ✅ | `CommandInfo` | One slash command as `$.command.list()` returns it. | Object. Its fields have rows below. Used by `$.command.list`, `command.list`. | d.ts line 1764 |
| ✅ | `CommandInfo.name` | What the person runs it by, without the slash. | Type: `string`. | d.ts line 1764 |
| ✅ | `CommandInfo.description` | The one line the typeahead shows for it. | Type: `string`. | d.ts line 1764 |
| ✅ | `CommandInfo.source` | Where it comes from (CommandSource). | Type: `CommandSource`. | d.ts line 1764 |
| ✅ | `CommandInfo.plugin` | Which plugin added it, when `source` is `plugin` and the engine knows: the one that registered it, or whose manifest carries it. | Type: `string`. Optional. | d.ts line 1764 |
| ✅ | `CommandPresentation` | Where a command's answer will show: which of the terminal's two layouts the surface renders, and how wide it is when the command runs. | Object. Its fields have rows below. A fact that the engine stamps on `command.run`, so a command can suit the room it has. A pane docks from 110 columns in fullscreen. | d.ts line 1793 |
| ✅ | `CommandPresentation.isFullscreen` | True under the fullscreen (alternate-screen) layout, false on the main screen (`CLAUDE_CODE_NO_FLICKER=0`, tmux by default) and headless. | Type: `boolean`. The fact `RenderViewport`'s `isFullscreen` carries on every terminal drawing, from the same source: the two agree. | d.ts line 1793 |
| ✅ | `CommandPresentation.columns` | The terminal's width in cells as the command runs, 80 where no terminal has measured (headless with no tty). | Type: `number`. | d.ts line 1793 |
| ✅ | `CommandRunArgs` | `command.run`'s input as a plugin's `$.command.run` takes it: `args` may be left out (`/command`, bare), `origin` and `presentation` the engine sets. | Intersection with `CommandRunArgs`, `CommandRunInput`. Object. Its fields have rows below. Used by `$.command.run`. | d.ts line 1813 |
| ✅ | `CommandRunArgs.args` | Everything after the name, as the person would type it, left out, `""`. | Type: `string`. Optional. | d.ts line 1813 |
| ✅ | `CommandRunInput` | The input of `command.run`: one slash command about to run, the way the person typed it (`/name args`), and where the run came from. | Object. Its fields have rows below. Used by `command.run`. | d.ts line 1824 |
| ✅ | `CommandRunInput.command` | Names the command without its slash (`compact`, `hello`), aliases and folds resolved, the key a matcher narrows on. A rewrite is refused. | Type: `string`. | d.ts line 1824 |
| ✅ | `CommandRunInput.args` | Everything after the name, as typed (`""` when nothing was), a hook rewrites it with `next({ ...e, args })`. | Type: `string`. | d.ts line 1824 |
| ✅ | `CommandRunInput.origin` | Where the run came from, in `prompt.submit`'s words (PromptOrigin): the person's Enter (`composer`), the bridge, the SDK, or a plugin. | Type: `PromptOrigin`. A plugin's `$.command.run` reads `{ kind: 'plugin', name }`. `next(e)` passes it on as received. | d.ts line 1824 |
| ✅ | `CommandRunInput.presentation` | Where the command's answer will show (CommandPresentation): the fullscreen layout or the main screen, and the terminal's width. | Type: `CommandPresentation`. Pinned: the engine stamps it, `next(e)` passes it on, a rewrite that leaves it out keeps it and one that changes it is refused. | d.ts line 1824 |
| ✅ | `CommandRunResult` | What a `command.run` hook returns and what `next(e)` and `$.command.run` resolve to: the command's output text and the notes it leaves the model. | Object. Its fields have rows below. `text` is what the command printed and `context` is what it recorded for the model. A hook that answers without `next` runs no command. Used by `command.run`. | d.ts line 1869 |
| ✅ | `CommandRunResult.text` | The command's output as a transcript line, or undefined when the command showed nothing as text (a panel, a prompt for the model). | Type: `string`. Optional. | d.ts line 1869 |
| ✅ | `CommandRunResult.context` | What the model reads after the command's output and the person never sees, each entry one hidden user message recorded after the output row. | Type: `readonly string[]`. Optional. The notes that the command left the model. Absent when none. | d.ts line 1869 |
| ✅ | `CommandRunResult.exitCode` | What the process exits with when this command was the whole prompt of a headless run (`claude -p "/lint"`): a whole number from 0 to 255. | Type: `number`. Optional. Left out, the run exits as it would have. Any other value fails the hook. An interactive session ignores it. | d.ts line 1869 |
| ✅ | `CommandRunResult.ref` | Set by core on what `next(e)` resolves to: names the engine's run of the command (its result stays on the host side). | Type: `number`. Optional. A hook that returns the object it got makes the engine use that run verbatim. Absent on a hook's own `{ text }` and on `$.command.run`'s. | d.ts line 1869 |
| ✅ | `CommandSource` | Where a slash command comes from, as `$.command.list()` tells them apart. | Alias of `'builtin' \| 'plugin' \| 'user' \| 'mcp'`. `builtin` ships with Claude Code. `user` is the person's or project's own file. | d.ts line 1913 |
| ✅ | `CommandSpec` | What `$.command.register` takes: the slash command this plugin serves. | Object. Its fields have rows below. Used by `$.command.register`, `command.register`. | d.ts line 1918 |
| ✅ | `CommandSpec.name` | The command's name without the slash (letters, digits, `_`, `-`, up to 64), the person runs it as `/<name>`. | Type: `string`. | d.ts line 1918 |
| ✅ | `CommandSpec.description` | The one line the typeahead and `/help` show for it. | Type: `string`. | d.ts line 1918 |
| ✅ | `CommandSpec.argumentHint` | The hint drawn dim after the name (`[name]`), when it takes arguments. | Type: `string`. Optional. | d.ts line 1918 |
| ✅ | `CommandSpec.immediate` | Set so that `/<name>` typed while a turn is in flight runs at once instead of waiting for the turn to end, as it does when left out. | Type: `true`. Optional. Its `command.run` hook runs while a turn may still be streaming, so it must not assume the turn's state. | d.ts line 1918 |
| ✅ | `ConfigDescribeInput` | The input of `config.describe`: how one `/config` row presents, at the moment the menu lists it (and for `$.config.list`). | Object. Its fields have rows below. Used by `config.describe`, `$.config.describe`. | d.ts line 1953 |
| ✅ | `ConfigDescribeInput.key` | Names the row, as `config.set`'s `key` does, the key a matcher narrows on. Pinned: a rewrite is refused. | Type: `string`. | d.ts line 1953 |
| ✅ | `ConfigDescribeInput.label` | What the menu draws for the row, before its value. | Type: `string`. | d.ts line 1953 |
| ✅ | `ConfigDescribeInput.description` | The help text beneath the label, when the row has one (a plugin field's `description`), absent for the panel's own rows. | Type: `string`. Optional. | d.ts line 1953 |
| ✅ | `ConfigDescribeInput.isHidden` | Whether the menu leaves the row out, a hidden row still answers `$.config.set` and `/config key=value`. | Type: `boolean`. | d.ts line 1953 |
| ✅ | `ConfigDescribeInput.provider` | Who owns the row, as `config.set`'s `provider`. Pinned. | Type: `Origin`. | d.ts line 1953 |
| ✅ | `ConfigDescribeResult` | What a `config.describe` hook returns: the label, help text and hidden flag the menu uses, the key and provider stay as they were. | Alias of `Omit<ConfigDescribeInput, 'key' \| 'provider'>`. Used by `config.describe`, `$.config.describe`. | d.ts line 1983 |
| ✅ | `ConfigKind` | How a `/config` row takes its value: `boolean` toggles, `choice` picks one of its `options`, `text` takes a string, `number` a number. | Alias of `'boolean' \| 'choice' \| 'text' \| 'number'`. | d.ts line 1989 |
| ✅ | `ConfigOrigin` | Where a `config.set` came from, in `prompt.submit`'s words: the person in the `/config` menu (`composer`), the bridge, or a plugin, named. | Object. Its fields have rows below. Set by the engine, `next(e)` passes it on as received and none sets it. | d.ts line 1997 |
| ✅ | `ConfigOrigin.kind` | The person's own change in the `/config` menu (a toggle, a pick, a typed value), or their `/config key=value`. | Type: `'composer'`. | d.ts line 1997 |
| ✅ | `ConfigOrigin.kind` | A `/config key=value` that arrived over the Remote Control bridge (a phone or web client, or a relay): not attestably the owner's hand. | Type: `'bridge'`. | d.ts line 1997 |
| ✅ | `ConfigOrigin.kind` | A plugin's `$.config.set`, that plugin's own hooks do not see it. | Type: `'plugin'`. | d.ts line 1997 |
| ✅ | `ConfigOrigin.name` | The calling plugin's name. | Type: `string`. | d.ts line 1997 |
| ✅ | `ConfigRow` | One `/config` row as `$.config.list()` returns it: what the menu would draw now, after every `config.describe` hook, a hidden row left out. | Object. Its fields have rows below. Used by `$.config.list`, `config.list`. | d.ts line 2024 |
| ✅ | `ConfigRow.key` | Names the row: the panel's id for a built-in, `<plugin>.<field>` for a plugin's `userConfig` field, what `$.config.set` takes. | Type: `string`. | d.ts line 2024 |
| ✅ | `ConfigRow.label` | What the menu draws for the row, before its value. | Type: `string`. | d.ts line 2024 |
| ✅ | `ConfigRow.description` | The help text under the label, when the row has one. | Type: `string`. Optional. | d.ts line 2024 |
| ✅ | `ConfigRow.kind` | How the row takes its value (ConfigKind). | Type: `ConfigKind`. | d.ts line 2024 |
| ✅ | `ConfigRow.value` | What the row holds now. | Type: `ConfigValue`. | d.ts line 2024 |
| ✅ | `ConfigRow.options` | The values a `choice` row takes, in order (a plugin string field's declared `options` for its row), absent otherwise. | Type: `readonly string[]`. Optional. | d.ts line 2024 |
| ✅ | `ConfigRow.provider` | Who owns the row: the engine for the panel's own, else the plugin. | Type: `Origin`. | d.ts line 2024 |
| ✅ | `ConfigRow.isLocked` | Whether a trusted source (managed settings, the organization's policy) owns the value, so the menu shows it and refuses a change. | Type: `boolean`. | d.ts line 2024 |
| ✅ | `ConfigSetArgs` | `config.set`'s input as a plugin's `$.config.set(args)` takes it: the row's key and the value, the engine fills the rest. | Alias of `Pick<ConfigSetInput, 'key' \| 'value'>`. Used by `$.config.set`. | d.ts line 2066 |
| ✅ | `ConfigSetInput` | The input of `config.set`: one `/config` row about to change, from the menu or a plugin's `$.config.set`, with what it holds now and who owns it. | Object. Its fields have rows below. Used by `config.set`. | d.ts line 2072 |
| ✅ | `ConfigSetInput.key` | Names the row: the panel's own id for a built-in (`theme`, `verbose`, `autoCompact`), `<plugin>.<field>` for a plugin's `userConfig` field. | Type: `string`. The key a matcher narrows on, pinned: a rewrite is refused. | d.ts line 2072 |
| ✅ | `ConfigSetInput.value` | What the row is being set to, `next({ ...e, value })` clamps or replaces it, held to the row's kind (a toggle takes a boolean). | Type: `ConfigValue`. | d.ts line 2072 |
| ✅ | `ConfigSetInput.previous` | What the row holds before the change, as the menu shows it. Pinned. | Type: `ConfigValue`. | d.ts line 2072 |
| ✅ | `ConfigSetInput.provider` | Who owns the row: `{ plugin: "engine", tier: "core" }` for the panel's own, the plugin and its tier for a `userConfig` field. Pinned. | Type: `Origin`. | d.ts line 2072 |
| ✅ | `ConfigSetInput.origin` | Where the change came from (ConfigOrigin): the person in the menu (`composer`) or a plugin's `$.config.set`. Pinned. | Type: `ConfigOrigin`. | d.ts line 2072 |
| ✅ | `ConfigSetResult` | What a `config.set` hook returns and what `next(e)` resolves to: `{ value }` once written, or `{ deny: reason }`, the row left as it was. | Object. Its fields have rows below. The menu shows a deny's reason. A deny after `next(e)` was answered fails the hook. Used by `config.set`, `$.config.set`. | d.ts line 2109 |
| ✅ | `ConfigSetResult.value` | A field of `ConfigSetResult`. | Type: `ConfigValue`. | d.ts line 2109 |
| ✅ | `ConfigSetResult.deny` | A field of `ConfigSetResult`. | Type: `undefined`. Optional. | d.ts line 2109 |
| ✅ | `ConfigSetResult.deny` | A field of `ConfigSetResult`. | Type: `string`. | d.ts line 2109 |
| ✅ | `ConfigSetResult.value` | A field of `ConfigSetResult`. | Type: `undefined`. Optional. | d.ts line 2109 |
| ✅ | `ConfigValue` | A `/config` row's value as a hook and `$.config` see it: a toggle's boolean, a choice's or a text's string, a number, or a list of strings. | Alias of `boolean \| string \| number \| readonly string[]`. | d.ts line 2121 |
| ✅ | `RegisteredToolSpec` | A ToolSpec as `$.tool.register` hands it on: the input schema filled in, `isDeferred` as the plugin gave it. | Object. Its fields have rows below. Used by `tool.register`. | d.ts line 9718 |
| ✅ | `RegisteredToolSpec.name` | A field of `RegisteredToolSpec`. | Type: `string`. | d.ts line 9718 |
| ✅ | `RegisteredToolSpec.description` | A field of `RegisteredToolSpec`. | Type: `string`. | d.ts line 9718 |
| ✅ | `RegisteredToolSpec.inputSchema` | A field of `RegisteredToolSpec`. | Type: `Record<string, unknown>`. | d.ts line 9718 |
| ✅ | `RegisteredToolSpec.isDeferred` | A field of `RegisteredToolSpec`. | Type: `ToolDeferral`. Optional. | d.ts line 9718 |
| ✅ | `ToolCallArgs` | `tool.call`'s input as the call takes it: `tool_use_id` and `agentId` may ride along (a hook passing its event's input on) and are dropped. | Alias of `ToolCallEnvelope extends infer I ? I extends ToolCallEnvelope ? Omit<I, 'tool_use_id'> & ToolCallReserved<I['tool']> : never : never`. The run gets its own id and runs in the session's loop. | d.ts line 13282 |
| ✅ | `ToolCallEnvelope` | The envelope the two tool events share: the tool, the id of this call, and the tool's arguments spread beside them (`e.command` for Bash). | Alias of `BuiltinToolCallInput \| McpToolCallInput`. A union keyed by `tool`. After `if (e.tool === "Bash")`, `e.command` is a string. | d.ts line 13292 |
| ✅ | `ToolCallInput` | The input of `tool.call`: the tool, the id of this call, the tool's arguments beside them (`e.command` for Bash), and `agentId` in a subagent. | Alias of `ToolCallEnvelope & AgentLoop & ToolRequestMeta`. `tool`, `tool_use_id`, and `agentId` are reserved. A rewrite of any is refused. Used by `tool.call`. | d.ts line 13303 |
| ✅ | `ToolCallOverloads` | `$.tool.call(input)`: resolves with `result` typed for the tool `input` names (ToolCallResult), or loosely for an input that names none literally. | Alias of `{ <T extends string>(input: ToolCallArgs & ToolNamed<T>): Promise<ToolCallResult<T>>, (input: ToolCallArgs): Promise<ToolCallResult>, }`. Used by `$.tool.call`. | d.ts line 13309 |
| ✅ | `ToolCallReserved` | The keys `tool.call`'s input carries beside the tool's own arguments, none of which the tool sees (the engine strips them before the tool runs). | Object. Its fields have rows below. `consent` is the person's own words for the press that raised the call. The permission path reads it as the user's request. | d.ts line 13322 |
| ✅ | `ToolCallReserved.tool` | A field of `ToolCallReserved`. | Type: `T`. | d.ts line 13322 |
| ✅ | `ToolCallReserved.tool_use_id` | A field of `ToolCallReserved`. | Type: `string`. Optional. | d.ts line 13322 |
| ✅ | `ToolCallReserved.consent` | A field of `ToolCallReserved`. | Type: `string`. Optional. | d.ts line 13322 |
| ✅ | `ToolCallResult` | What a `tool.call` hook returns and what `next(e)` and `$.tool.call(input)` resolve to: the tool's result (`{ result, context? }`) or `{ deny }`. | Union. Fields: `context`, `deny`, `isError`, `isReadOnly`, `ref`, `result`, `text`. From core the result is `{ ref, result, text }`, plus `isError` on a tool error. Used by `tool.call`. | d.ts line 13339 |
| ✅ | `ToolCallResult.deny` | Refuses the call: the model receives the text as an error result. Absent when the call was answered. | Type: `string`. Returned after the tool answered without error it withholds that result and undoes nothing: in its place the model reads `<tool> ran, and a plugin withheld its result: <text>`. | d.ts line 13339 |
| ✅ | `ToolCallResult.result` | A field of `ToolCallResult`. | Type: `undefined`. Optional. | d.ts line 13339 |
| ✅ | `ToolCallResult.context` | A field of `ToolCallResult`. | Type: `undefined`. Optional. | d.ts line 13339 |
| ✅ | `ToolCallResult.ref` | A field of `ToolCallResult`. | Type: `undefined`. Optional. | d.ts line 13339 |
| ✅ | `ToolCallResult.text` | A field of `ToolCallResult`. | Type: `undefined`. Optional. | d.ts line 13339 |
| ✅ | `ToolCallResult.isError` | A field of `ToolCallResult`. | Type: `undefined`. Optional. | d.ts line 13339 |
| ✅ | `ToolCallResult.isReadOnly` | A field of `ToolCallResult`. | Type: `undefined`. Optional. | d.ts line 13339 |
| ✅ | `ToolCallResult.result` | The tool's output: from core the tool's record, typed per built-in tool once `e.tool` and `isError` are narrowed, from a hook, its own. | Type: `ToolResultOf<Name>`. Core checks a hook's answer against the tool's output schema when it has one. Absent on a deny. | d.ts line 13339 |
| ✅ | `ToolCallResult.context` | What the model reads after the tool's result and the user never sees. From core, none. | Type: `readonly string[]`. Optional. One reminder, as a `PostToolUse` hook's is. Past 100,000 characters (200,000 together) the model reads a head and a path. | d.ts line 13339 |
| ✅ | `ToolCallResult.ref` | Set by core on what `next(e)` resolves to: names the messages core produced for the call (they stay on the host side). | Type: `number`. Optional. A hook that returns the object it got makes core use them verbatim. Absent on a hook's own `{ result }` and on a deny. | d.ts line 13339 |
| ✅ | `ToolCallResult.text` | Set by core: the result as the model reads it (text blocks joined), present whatever the tool, where `result`'s shape varies per tool. | Type: `string`. Optional. Absent on a hook's own `{ result }`. | d.ts line 13339 |
| ✅ | `ToolCallResult.isReadOnly` | Set by core, present only when the tool held the input it executed read-only by its own check (the one its permissions use). | Type: `true`. Optional. Says the call ran read-only, rewrites included. It does not cover calls that this call causes. | d.ts line 13339 |
| ✅ | `ToolCallResult.isError` | A field of `ToolCallResult`. | Type: `undefined`. Optional. | d.ts line 13339 |
| ✅ | `ToolCallResult.deny` | A field of `ToolCallResult`. | Type: `undefined`. Optional. | d.ts line 13339 |
| ✅ | `ToolCallResult.isError` | Set by core, present only when the tool reported an error (it threw, was interrupted, or answered an error): `text` is what the model read. | Type: `true`. | d.ts line 13339 |
| ✅ | `ToolCallResult.result` | What the transcript stored for the errored call: the error text, or undefined when nothing was stored, never the tool's typed record. | Type: `unknown`. | d.ts line 13339 |
| ✅ | `ToolCallResult.text` | The error as the model reads it. | Type: `string`. Optional. | d.ts line 13339 |
| ✅ | `ToolCallResult.ref` | As on an answered result: names the messages core produced. | Type: `number`. Optional. | d.ts line 13339 |
| ✅ | `ToolCallResult.context` | As on an answered result. | Type: `readonly string[]`. Optional. | d.ts line 13339 |
| ✅ | `ToolCallResult.isReadOnly` | As on an answered result: the tool held the input it ran read-only. | Type: `true`. Optional. | d.ts line 13339 |
| ✅ | `ToolCallResult.deny` | A field of `ToolCallResult`. | Type: `undefined`. Optional. | d.ts line 13339 |
| ✅ | `ToolCheckArgs` | `tool.check`'s input as `$.tool.check` takes it: the tool and its arguments, the call's id, `agentId` and the ceiling are the engine's to set. | Alias of `Pick<ToolCheckInput, 'tool' \| 'input'>`. Used by `$.tool.check`. | d.ts line 13434 |
| ✅ | `ToolCheckDecider` | Who an ask is put to, where that is not a dialog here: `host`, the program that answers a hosted session's asks, or a served call's own session. | Alias of `'host'`. | d.ts line 13440 |
| ✅ | `ToolCheckDecision` | The verdict of `tool.check`: run the tool, put it to the mode's decider (the dialog, the auto-mode classifier, a headless host), or refuse it. | Alias of `'allow' \| 'ask' \| 'deny'`. | d.ts line 13446 |
| ✅ | `ToolCheckInput` | The input of `tool.check`: the tool, its arguments, the organization's ceiling if it set one, and on a real call its id and the loop's `agentId`. | Object. Its fields have rows below. All fields are pinned. A hook decides about the call and does not change it. Used by `tool.check`. | d.ts line 13456 |
| ✅ | `ToolCheckInput.tool` | As the model names it (`Bash`, `mcp__server__tool`), the key a matcher narrows on. | Type: `string`. A matcher on any name the host declares for the tool admits it. | d.ts line 13456 |
| ✅ | `ToolCheckInput.input` | The tool's arguments as the permission decision reads them (`{ command }` for Bash, `{ file_path, ... }` for the file tools). | Type: `unknown`. | d.ts line 13456 |
| ✅ | `ToolCheckInput.tool_use_id` | The call being decided, on a real call only, absent on a query. | Type: `string`. Optional. `next.origin` names who raised it: `{ plugin: 'engine', tier: 'core' }` for the model's own call, the plugin for its `$.tool.call` or its query. | d.ts line 13456 |
| ✅ | `ToolCheckInput.agentId` | The id of the loop the call is decided in, on a real call inside a subagent's or a teammate's loop: the one its `tool.call` carried. | Type: `string`. Optional. Absent on the main loop and on a query. Which loop, not which plugin caused the call (that is `next.origin`). | d.ts line 13456 |
| ✅ | `ToolCheckInput.ceiling` | The most permissive verdict the organization lets a call of the tool reach (`ask`), as its administrators set it on a connector's tool. | Type: `ToolCheckDecision`. Optional. Set by the engine, from the tool, never by a query, and pinned. A hook's own `ceiling`, on its answer, is dropped. Absent where none is set. | d.ts line 13456 |
| ✅ | `ToolCheckResult` | What a `tool.check` hook returns and what `next(e)` resolves to: the verdict, why, what stands behind it, and who answers core's ask. | Object. Its fields have rows below. From core, the engine's decision for the mode and rules. A hook may answer any verdict. The last word up the chain decides. Used by `tool.check`, `$.tool.check`. | d.ts line 13503 |
| ✅ | `ToolCheckResult.decision` | `allow` runs the tool, `ask` puts it to the mode's decider, `deny` refuses it, the reason the model's error. | Type: `ToolCheckDecision`. For a tool that needs the person, a hook can only tighten the verdict. Its `allow` does not dismiss the dialog. | d.ts line 13503 |
| ✅ | `ToolCheckResult.reason` | Why, in a sentence: from core the rule or check that decided, from a hook, what the model reads on a deny and the dialog shows on an ask. | Type: `string`. Optional. | d.ts line 13503 |
| ✅ | `ToolCheckResult.rule` | The settings rule that decided, as written (`Bash(git push:*)`). | Type: `string`. Optional. Absent for a mode or a tool's own check. | d.ts line 13503 |
| ✅ | `ToolCheckResult.hook` | The classic hook event that decided, or whose ask the verdict was reached under (`PreToolUse`), whoever configured the hook. | Type: `string`. Optional. Absent on a `$.tool.check` query, which runs no classic hook. | d.ts line 13503 |
| ✅ | `ToolCheckResult.setting` | The key of the option whose own check asked, whoever configured it (`permissions.blockReadsOutsideWorkingDirectories`). | Type: `string`. Optional. From core, for the read block: its ask on a shell command that reads outside the working directories or, the block on, leaves the sandbox. | d.ts line 13503 |
| ✅ | `ToolCheckResult.decider` | Who an ask is put to, where that is not a dialog here: `host`, a hosted session's permission callback or the cloud session a served call is for. | Type: `ToolCheckDecider`. Optional. From core, only where a host would be asked. Names who decided. | d.ts line 13503 |
| ✅ | `ToolCheckResult.ceiling` | The most permissive verdict the organization lets a call of the tool reach (`ask`), as its administrators set it on a connector's tool. | Type: `ToolCheckDecision`. Optional. Set by the engine from the tool. A hook's own `ceiling` is dropped. | d.ts line 13503 |
| ✅ | `ToolDeferral` | Where a `tool.describe` answer places the tool: `true` behind ToolSearch (its schema loads when the model asks for it), `false` in the prompt's list. | Alias of `boolean`. Left out of an answer, the placement beneath stands. | d.ts line 13565 |
| ✅ | `ToolDescribeInput` | The input of `tool.describe`: one tool's description, at the moment the engine first renders the tool's schema for the model. | Object. Its fields have rows below. Used by `tool.describe`, `$.tool.describe`. | d.ts line 13571 |
| ✅ | `ToolDescribeInput.tool` | As the model sees the name (`Bash`, `mcp__server__tool`), the key a matcher narrows on. | Type: `string`. | d.ts line 13571 |
| ✅ | `ToolDescribeInput.description` | The tool's description as it computed it. | Type: `string`. | d.ts line 13571 |
| ✅ | `ToolDescribeInput.isDeferred` | Present, and true, when the engine lists the tool behind ToolSearch (its schema loads when the model asks for it by name), absent for one listed. | Type: `true`. Optional. An MCP server's tool, or one that asks to be, loads on demand. A plugin tool with `isDeferred: false` stays in front. | d.ts line 13571 |
| ✅ | `ToolDescribeInput.provider` | Who provides this tool: the plugin and its tier, `{ plugin: "engine", tier: "core" }` for a built-in. Pinned: a rewrite is refused. | Type: `Origin`. A configured MCP server's tool is `mcp:<server>`, in `prepend` when the policy settings source configures the server, else `user`. | d.ts line 13571 |

## See Also

- [Mod API: Tool, Command, and Config](Claude-Code-Mod-API-Tool-Command-Config)
- [Mod API: Tool, Command, and Config Types (Part 2)](Claude-Code-Mod-API-Tool-Command-Config-Types-2)
- [Claude Code Mod API](Claude-Code-Mod-API)
- [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference)
