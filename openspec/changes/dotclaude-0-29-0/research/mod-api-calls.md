# Mod API calls, Claude Code 2.1.296

Scope: the `$` calls of a hooks module for the dotclaude 0.29.0 OpenSpec change.
Each fact is marked `d.ts`, `bundle`, or `inferred`.

## Calls

| Name | Arguments | Return | When it may run | Limits and refusals | Side effects | Source |
| --- | --- | --- | --- | --- | --- | --- |
| `$.prompt.submit` | `{ text, asUser? }` | `PromptSubmitResult`: `{ text, context?, origin? }` or `{ drop }` | Once the session is idle, as its own turn. `wait` is false. Resolves once the prompt entered and its turn started, not when the turn ends. | Calls `prompt.submit` through every hook except the caller. `context` past 100,000 characters (200,000 together) is cut to a head and path. A hook that answers without `next` enters nothing. | Starts a model turn, which spends model tokens. Transcript names the plugin. | `d.ts` `index.d.ts:2956`, `:9021`, `:9059`, `:9074`, `:9112`. `inferred`: the model-token cost, and that a hook answer without `next` enters nothing. |
| `$.prompt.read` | none | `{ text, cursor }` | Any time. | Never rejects. `{ text: '', cursor: 0 }` where no box is drawn (`-p`, SDK host, no box mounted yet). | None. | `d.ts` `index.d.ts:2967`. |
| `$.prompt.fill` | `{ text, mode? }`, `mode` is `replace` (default), `append`, or `insert` | `{ isFilled }` | Any time. | `isFilled: false` under a dialog or headless. A hook may answer `{ isFilled: false }` without `next`. | Writes the draft box. Fires `prompt.fill` to other plugins. | `d.ts` `index.d.ts:2981`, `:4116`, `:4122`. `inferred`: that a hook answer without `next` is allowed. |
| `$.prompt.suggest` | `{ text }` | `{ isShown }` | Any time. | `isShown: false` while the box holds text, a turn runs, or headless. | Shows a dim suggestion (Tab takes it). | `d.ts` `index.d.ts:2993`. |
| `$.prompt.compose` | `facts` (optional) | `{ sections }` with `id` per section | Any time. | A fact left out is the session's own (model, tools). | None: composed for nobody to send, nothing is written. | `d.ts` `index.d.ts:3005`. |
| `$.tool.list` | none | `ToolInfo[]`, built-in and MCP, in model order | Any time. | None stated. | None. | `d.ts` `index.d.ts:3018`. |
| `$.tool.call` | `{ tool, ...input }` | `ToolCallResult` | Any time a turn or hook runs it. | Rejects when no tool has that name, or the call is aborted. Runs the permission check and its dialog. | Runs the tool, which may write files or spend tokens. Runs through every hook except the caller. | `d.ts` `index.d.ts:3030`, `:12673`, `:12709`. `inferred`: the token cost of the tool. |
| `$.tool.check` | `{ tool, input }` | `{ decision, reason?, rule?, ceiling? }` | Any time. | Runs no tool, opens no dialog, asks no PreToolUse hook or classifier. | None. | `d.ts` `index.d.ts:3042`. |
| `$.tool.register` | `ToolSpec`: `name`, `description`, `inputSchema?`, `isDeferred?` | `{ tool }`, the full name `mcp__<plugin>__<name>` | Rejects until the session binds at `session.start`. | A name registered again replaces the old one. Needs a `tool.call` hook on `{ tool: "mcp__<plugin>__<name>" }` to answer. A call no hook answers fails. | Adds a tool the model can call from the next prompt. Cost of its schema per prompt: see the Open list. | `d.ts` `index.d.ts:3058`. `inferred`: the per-prompt cost of the schema. |
| `$.command.list` | none | `CommandInfo[]`, built-in, plugin, and MCP, in typeahead order | Any time. | None stated. | None. | `d.ts` `index.d.ts:3071`. |
| `$.command.run` | `{ command, args? }`, `args` as typed after the name, `""` when absent | `CommandRunResult`: `{ text?, context?, ref? }` | Queued, run once the session is idle. | Rejects an unknown name, and a call inside a hook the turn is waiting on. A hook's answer without `next` runs no command. Refusal texts: see the Open list. | Runs the command. Its lines go to the transcript with the plugin origin. | `d.ts` `index.d.ts:3083`, `:1787`, `:1798`, `:1843`. `inferred`: a hook answer without `next` runs no command. |
| `$.command.register` | `CommandSpec`: `name`, `description`, `argumentHint?`, `immediate?` | `{ command }` | Any time. | A built-in's name is refused. A name registered again replaces the old one. A run no hook answers prints a line saying so. | Adds `/<name>` to the typeahead from the next keystroke. | `d.ts` `index.d.ts:3098`. |
| `$.session.messages` | optional `{ agentId?, as? }`, `as` is `api` for `ApiMessage` | `{ role, text, toolUses }[]`, newest 4096, or `{ deny }` for an unreadable `agentId` | Any time. | Returns at most 4096 entries. An `agentId` the session cannot read gets `{ deny }`, never the main thread. | None. | `d.ts` `index.d.ts:2778`. |
| `$.session.cwd` | none | `string`, absolute | Any time. | None. | None. | `d.ts` `index.d.ts:2782`. |
| `$.session.root` | none | `string`, absolute project root | Any time. | A shell `cd` does not move it. | None. | `d.ts` `index.d.ts:2790`. |
| `$.session.model` | none | `string`, the main loop's model as `/model` shows it | Any time. | None. | None. | `d.ts` `index.d.ts:2794`. |
| `$.session.turns` | none | `number`, user prompts this session | Any time. | None. | None. | `d.ts` `index.d.ts:2799`. |
| `$.session.id` | none | `string`, the transcript file's name | Any time. | None. | None. | `d.ts` `index.d.ts:2803`. |
| `$.session.repo` | none | `SessionRepo` or `null` outside a git repo | Any time. | Read from the working copy on each call. | None. | `d.ts` `index.d.ts:2811`. |
| `$.session.surfaces` | none | `RenderSurface[]`, empty in `-p` | Any time. | Never rejects. | None. | `d.ts` `index.d.ts:2823`. |
| `$.session.surface` | none | first `RenderSurface` or `null` | Any time. | Deprecated: use `surfaces`. | None. | `d.ts` `index.d.ts:2831`. |
| `$.session.usage` | optional `{ breakdown, columns }` | `{ startedAt, context, rateLimits, cost }` | Any time. | Plain call is free. `breakdown: "full"` uses the token-count API (costs tokens), `"summary"` estimates locally. | With `full`, a token-count request. | `d.ts` `index.d.ts:2853`. |
| `$.session.version` | none | `{ version, base?, builtAt }` | Any time. | `base` absent when the version is not a release. | None. | `d.ts` `index.d.ts:2870`. |
| `$.session.compact` | `{ instructions? }` | `{ skip }` when a hook vetoed it | Between turns only. | Rejects while a turn runs. Runs `session.compact` through every hook except the caller, then core. | Replaces the transcript with a summary and kept messages. Spends model tokens for the summary. | `d.ts` `index.d.ts:2882`. `inferred`: the token cost of the summary. |
| `$.session.send` | `{ to, text }`, `to` is a name, an id, or `{ sessionId }` or `{ agentId }` | sent result, resolves once queued | Any time. | Framed at the receiver as a peer's message. | Queues a message for another agent or session. | `d.ts` `index.d.ts:2896`. |
| `$.session.append` | `{ message }`, a user-role row of text blocks | `{ deny }` or stored | Any time. | A plugin above may refuse with `{ deny: reason }`. Non-text blocks are refused. | Adds a row to the transcript. | `d.ts` `index.d.ts:2908`. |
| `$.session.authorize` | none | `{ handle, kind }` or `null` | Any time. | `null` with a third-party provider, a gateway, or no login. The secret never reaches the plugin. | None. | `d.ts` `index.d.ts:2920`. |
| `$.ui.notice` | `tool_use_id`, `text` or `undefined` | `void` | While the call's dialog is open. | A call that is not open is refused. Another plugin's `$.tool.call` run is refused. | Adds one dim line under the dialog. | `d.ts` `index.d.ts:2352`. |
| `$.ui.invalidate` | event name, `ui.render` or a cached-answer event | `void` | Any time. | Redraws at most ten times a second. | Re-runs the cached event. | `d.ts` `index.d.ts:2366`. |
| `$.ui.blit` | `{ requestId, key, cells \| source, columns?, rows? }` | `{}` or `{ deny }` | Only for a mounted `Raster` or `Image` the plugin drew. | Refused when not mounted, other plugin's, or another size. Up to 120 a second taken. | Repaints a cell grid. | `d.ts` `index.d.ts:2387`. |
| `$.ui.resolve` | the `ui.render` argument `e` | the surface's element table | Inside a render hook. | Read only. | None. | `d.ts` `index.d.ts:2403`. |
| `$.ui.log` | `text`, `{ to? }` where `to` is `transcript` (default) or `debug` | `void` | Any time. | First 2000 characters drawn in the terminal. 10000 in the debug log. | Adds a dim transcript row, not sent to the model. Works in `-p`: the host gets `ui_log`. | `d.ts` `index.d.ts:2420`. |
| `$.ui.ask` | `question`, options as strings or `{ options, header, multiSelect }` | label or free text | Any time with a person present. | Rejects when dismissed. Rejects in a `-p` run, which has no one to ask. | Opens the `AskUserQuestion` dialog and waits. | `d.ts` `index.d.ts:2436`. |
| `$.ui.toast` | `text`, `{ timeoutMs? }` (default 4000) | `void` | Any time. | Past 50 waiting toasts, the oldest leaves. A held pane delays drawing. | Shows a box over the transcript, not sent to the model. | `d.ts` `index.d.ts:2453`. |
| `$.ui.notify` | `text`, `{ title? }` | `{ isSent, channel }` or `{ isSent: false, reason }` | Any time. | `reason` is `disabled`, `no-channel`, `no-surface`, or `refused`. Rejects on a hook's `{ deny }` or a failed write. | Native notification through the person's channel. Runs `Notification` hooks first. | `d.ts` `index.d.ts:2471`. `bundle`: the `no-surface` reason string is in the bundle. |
| `$.ui.status` | `text` or `undefined` | `void` | Any time. | First 2000 characters drawn. One status line per plugin. | Pins a line under the prompt until replaced. | `d.ts` `index.d.ts:2483`. |
| `$.ui.open` | `{ id, title?, focus?, closeOnEscape?, holdToasts?, rows?, columns? }` | `{ isPlaced }` or `{ isPlaced: false, reason }` | Any time. | Below 144 columns (110 once asked) the pane waits undrawn. A `-p` run places all. | Opens a framed pane. | `d.ts` `index.d.ts:2506`. |
| `$.ui.close` | `{ id }` | `void` | Any time. | Rejects on a hook's `{ deny }`. An id that is not open is left alone. | Closes the pane. Raises `ui.close`. | `d.ts` `index.d.ts:2520`. |
| `$.ui.panes` | none | `UiPane[]` of this plugin's panes | Any time. | Lists only this plugin's panes. | None. | `d.ts` `index.d.ts:2533`. |
| `$.ui.scroll` | `{ to, in?, block? }` | `{}` or `{ deny }` | Any time. | Transcript rows move only while answering the person's input. | Scrolls a site of this plugin. | `d.ts` `index.d.ts:2548`. |
| `$.ui.focus` | `{ requestId, key }` | `{}` or `{ deny }` | Any time. | Refused when the site does not hold the keys. | Moves the focus ring. | `d.ts` `index.d.ts:2564`. |
| `$.ui.copy` | `{ text, surface? }` | `{ isCopied }` or `{ isCopied: false, reason }` | Any time. | A remote surface has no clipboard path yet. | Writes the clipboard. | `d.ts` `index.d.ts:2578`. |
| `$.ui.selection` | none | selected text and row, or `undefined` | Any time. | `undefined` in `-p`, without fullscreen, or where none is seen. | None. | `d.ts` `index.d.ts:2592`. |
| `$.model.complete` | `ModelCompleteRequest` (model, prompt, cap, effort, time limit) and `{ signal? }` | `{ isAnswered, text, usage }` or `{ isAnswered: false, reason }` | Any time. | No tools, no history. `reason` is `api-error`, `empty-reply`, or `aborted`. Rejects only when the engine refuses the request. | One model request, billed to the session. | `d.ts` `index.d.ts:2624`. `bundle`: `empty-reply` is in the bundle. `inferred`: the request is billed to the session. |
| `$.model.fork` | `{ prompt }` | `{ isAnswered, text, usage }` or a `reason` | Any time after the first response. | Rejects never. `reason` `nothing-to-fork` before the first response and after `/clear`. All tools denied. | One model request that reads the cached main-thread prefix. | `d.ts` `index.d.ts:2643`. `bundle`: `nothing-to-fork` is in the bundle. |
| `$.model.classify` | `text`, `labels` (2 or more), `{ model? }` | label or `undefined` | Any time. | Rejects when the request fails, the reply has no text, or on abort. Default model is the small fast one. | One model request with a fixed classifier prompt. | `d.ts` `index.d.ts:2662`. |
| `$.turn.abort` | `{ turnId }` | `void` | Only while the turn `turnId` is running. | Rejects, naming both ids, when `turnId` is not the running turn. | Stops the running turn with no interruption marker. | `d.ts` `index.d.ts:2938`. |
| `$.audio.play` | `clip` as `{ asset }`, a URL, or base64 bytes. `{ shouldLoop?, gain?, signal? }` | `void` | Any time. | Clips do not queue. Only `afplay` plays on macOS. Linux and Windows terminals play nothing. Rejects naming the cause. | Plays sound. | `d.ts` `index.d.ts:2683`. |
| `$.audio.speak` | `text`, `{ voice? }` | `SpeakResult` (which synthesizer spoke) | Any time. | Rejects with no synthesizer, a missing voice, or a failed utterance. | Speaks through the platform synthesizer. | `d.ts` `index.d.ts:2697`. |
| `$.mcp.call` | `server`, `tool`, `args?` | MCP `{ content, isError }` | Any time. | No permission prompt. The plugin's call is the grant. Hooks above see the call. | Calls a connected MCP server. The server may act. | `d.ts` `index.d.ts:2724`. |
| `$.mcp.connect` | `server` key from this plugin's manifest | `{ isConnected, server }` or a refusal with `reason` and `message` | Any time. | Listing a server does not defer it. Hold tools back with `tool.check`. | Connects a server if the session has not. | `d.ts` `index.d.ts:2739`. |
| `$.config.list` | none | `ConfigRow[]`, in `/config` order | Any time. | Hidden rows are left out after `config.describe`. | None. | `d.ts` `index.d.ts:3115`. |
| `$.config.set` | `{ key, value }` | `{ value }` or `{ deny }` | Any time. | `{ deny }` when a hook refuses, the value does not fit, or a trusted source owns the row. Rejects a key no row has. This plugin's own hooks are skipped. | Writes a settings row, as the person would in `/config`. | `d.ts` `index.d.ts:3129`. |
| `$.telemetry.log` | `TelemetryLogArgs` with `to` (`anthropic` by default) | `void` | Any time. | A first-party row is queued by built-in plugins only. Rejects when a hook denies. | Writes an analytics record. | `d.ts` `index.d.ts:3153`. |
| `$.telemetry.mark` | `TelemetryMarkInput`: `feature`, `kind`, `reason`, properties | `void` | Any time. | Always `anthropic`. Rejects when a hook denies. | Queues a feature-use mark, built-ins only. | `d.ts` `index.d.ts:3168`. |
| `$.agent.spawn` | `AgentSpawn` input, `prompt`, `subagentType?`, `description?` | `{ model, agentId }` or `{ deny }` | Any time. | Runs every hook but the caller, then the Agent tool in the background. The answer comes later as `turn.complete`. | Starts a subagent that spends model tokens. | `d.ts` `index.d.ts:3185`. `inferred`: the model-token cost. |
| `$.agent.list` | none | `AgentInfo[]` of this session's agents | Any time. | An entry lasts until the engine drops its task. | None. | `d.ts` `index.d.ts:3194`. |
| `$.agent.register` | `AgentSpec`: `name`, `description`, `prompt`, other agent fields | `{ agent }`, the full `<plugin>:<name>` | Rejects until the session binds at `session.start`. | Rejects on a spec the schema refuses, or a hook's deny. A re-registered name replaces the old one. | Defines an agent type for the Agent tool. | `d.ts` `index.d.ts:3220`. |
| `$.fs.read` | `path`, `{ as? }` (`text` default, or `bytes`) | text, or `{ base64 }` | Any time. | Rejects when missing or over 4 MiB. | None. | `d.ts` `index.d.ts:3249`. |
| `$.fs.write` | `path`, `text` | `void` | Any time. | Rejects a network location. Creates directories. | Writes or replaces a file. | `d.ts` `index.d.ts:3256`. |
| `$.fs.list` | optional `path` | `FsEntry[]`: `name`, `kind`, `size`, `mtimeMs`, `isLink` | Any time. | Symbolic links are `other` with `isLink`. | None. | `d.ts` `index.d.ts:3270`. |
| `$.fs.exists` | `path` | `boolean` | Any time. | Rejects only a network location. | None. | `d.ts` `index.d.ts:3275`. |
| `$.fs.stat` | `path`, `{ resolve? }` | `{ kind, size, mtimeMs, isLink, realPath? }` | Any time. | Rejects `ENOENT` for a missing path. `resolve` adds one file system call. | None. | `d.ts` `index.d.ts:3328`. |
| `$.fs.ancestors` | `{ names, of?, below? }` | `FsAncestor[]`, root first, with `dir`, `name`, `content` | Any time. | `names` are relative `.md` names with no `..`. | None. | `d.ts` `index.d.ts:3349`. |
| `$.store.get` | `key` | `unknown` or `undefined` | Any time. | None. | None. | `d.ts` `index.d.ts:3365`. |
| `$.store.set` | `key`, `value` (JSON data) | `void` | Any time. | Rejects a function, a cycle, or a store over 4 MiB of JSON. | Writes the plugin's own JSON file in the config directory. | `d.ts` `index.d.ts:3373`. |
| `$.store.delete` | `key` | `void` | Any time. | None. | Removes the key from that file. | `d.ts` `index.d.ts:3377`. |
| `$.store.keys` | none | `string[]` in insertion order | Any time. | None. | None. | `d.ts` `index.d.ts:3381`. |
| `$.state.get` | `{ plugin, key, id? }` | `{ value, version }` | Any time. | `plugin` and `key` are literals in source. A value never written is `undefined` at version 0. | None. A `ui.render` read subscribes the instance. | `d.ts` `index.d.ts:3407`. |
| `$.state.set` | `ref`, `value`, `{ ifVersion? }` | `{ isSet, version }` | Refused while a `ui.render` hook draws. | Refused for another plugin's value. `isSet` is false when `ifVersion` misses. | Writes a held value and redraws the readers. | `d.ts` `index.d.ts:3423`. |
| `$.clock.now` | none | `number`, epoch milliseconds | Any time. | None. | None. | `d.ts` `index.d.ts:3440`. |
| `$.clock.sleep` | `ms`, `{ signal? }` | `void` | Any time. | Rejects at once when `signal` aborts. The wait uses the hook's own budget. | None. | `d.ts` `index.d.ts:3454`. |
| `$.clock.after` | `ms`, `fn` | `{ cancel }` | Any time. | `fn` never runs when a hook refuses the dispatch. | Runs `fn` once later. | `d.ts` `index.d.ts:3461`. |
| `$.clock.every` | `ms` (at least 1), `fn` | `{ cancel }` | Any time. | A refused period ends the interval. | Runs `fn` each period. | `d.ts` `index.d.ts:3471`. |
| `$.http.fetch` | `url`, `{ method?, headers?, body?, auth?, socketPath? }` | `{ status, ok, headers, text }` | Any time. | http or https only. Refused when the organization's web-fetch policy refuses it. `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` refuses a built-in's request, and any plugin's request that carries `auth`. | A network request through the host. | `d.ts` `index.d.ts:3497`. `bundle`: the env var name is in the bundle. |
| `$.process.run` | `argv` (no shell), `{ cwd?, env?, stdin?, timeoutMs? }` | `{ exitCode, stdout, stderr }` | Any time. | Rejects when the command cannot start or runs past the timeout (30 s default, 10 min max). Output cut at 4 MiB per stream. | Runs a host command as the session's user. | `d.ts` `index.d.ts:3522`. |
| `$.process.spawn` | `{ argv, cwd?, env?, input? }` | an async stream of `{ stream, text }`, then `{ code, signal }` | Any time. | Rejects its first pull if the command cannot start. Leaving the loop kills the child. | Runs a host command for the loop's life. | `d.ts` `index.d.ts:3560`. |
| `$.settings.read` | optional `{ source? }` | `Settings`, merged or one source | Any time. | A source with no file answers `{}`. The OAuth session and `~/.claude.json` are never read. | None. | `d.ts` `index.d.ts:3585`. |
| `$.env.get` | `name` as a string literal | `string` or `undefined` | Any time. | `name` must be a literal. | None. | `d.ts` `index.d.ts:3605`. |
| `$.env.set` | `name` as a string literal, `value` or `undefined` | `void` | Any time. | `name` must be a literal. `undefined` unsets. | Changes the env of this process and of children it starts later. | `d.ts` `index.d.ts:3616`. |

## Changed since 2.1.293

Source: section 1, "Event list", line 19 of `openspec/changes/archive/2026-10-11-dotclaude-0-28-0/research/mods-api.md`, which calls the list "the calls (also hookable)".
That map carries no signatures, so this comparison covers names only.

Removed:

- `flag.value` has no `$.flag` namespace in the 2.1.296 `d.ts`.
  The bundle still holds the string, so it is no longer a `$` call.
- `classic.<HookName>` is not a `$` call in 2.1.296.
  The `d.ts` types `classic.<Event>` as a hook name for `on()` only (`ClassicEventName`, `index.d.ts:1244`).

Added to the `$` calls, where 0.28.0 listed them only as hookable events:

- `prompt.submit`, `prompt.fill`, `prompt.suggest`, `prompt.compose`.
- `tool.call`, `tool.check`.
- `command.run`.
- `config.set`.
- `telemetry.log`, `telemetry.mark`.
- `agent.spawn`.
- `ui.resolve`, `ui.scroll`, `ui.focus`.
- `session.send`, `session.append`, `session.compact`.

Renamed: none.
Each name in the 0.28.0 call list keeps its name in the table.

Not comparable: the 0.28.0 map names the `ui.*`, `fs.*`, `store.*`, `state.*`, and `clock.*` families without their members.
The table has 16 `ui.*` names, 6 `fs.*`, 4 `store.*`, 2 `state.*`, and 4 `clock.*`.
A member that was added to one of these families cannot be seen from the 0.28.0 map.

## Open for experiment

- `$.prompt.submit` when idle: the `d.ts` says the turn starts once the session is idle, but not how long the call waits.
  Test: a lab hook calls `$.prompt.submit` on an idle session and compares `$.clock.now` before the call with the first `turn.start` event.
- `$.prompt.submit` in `-p`: the `d.ts` does not say whether it starts a turn or rejects.
  Test: run `claude -p` with a hook that calls `$.prompt.submit`, and record the exit status and the output.
- `$.prompt.submit` in a subagent: the `d.ts` does not say which thread receives the prompt.
  Test: a hook spawns a subagent with `$.agent.spawn`, the subagent's hook calls `$.prompt.submit`, and the main thread reads `$.session.messages`.
- `$.command.run({ command: "clear" })`: the `d.ts` does not say what the call returns or what runs after the clear.
  Test: call it from a hook, then record the `CommandRunResult`, the `session.start` and `session.compact` events, and the transcript length.
- Start cost of a tool from `$.tool.register`: the `d.ts` does not give the schema cost per prompt.
  Test: run `dotclaude-sessions:start-cost` with and without the registered tool, and compare the input tokens.
- `$.ui.ask` in `-p`: the `d.ts` says it rejects, but the rejection text and exit status are not checked.
  Test: run `claude -p` with a hook that calls `$.ui.ask`, and record the rejection and the exit status.
- `$.command.run` refusal texts, which the `Calls` table cites here: the `d.ts` names the refusal but not its text.
  Test: call an unknown command name, then a call inside a waiting hook, and record each text in the transcript.
- Answers without `next` for `$.prompt.submit`, `$.prompt.fill`, and `$.command.run`: the rows mark these `inferred`.
  Test: a hook returns a value without `next`, then check whether the prompt is entered, the draft changes, or the command runs.
- Model-token cost of `$.agent.spawn`, `$.session.compact`, and `$.model.complete`: the rows mark these `inferred`.
  Test: read `$.session.usage` before and after one call of each, and compare the cost.
