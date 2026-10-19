# Mod API: Tool, Command, and Config

`$.tool` lists, checks, calls, and registers tools.
`$.command` does the same for slash commands.
`$.config` lists and sets the rows of the `/config` menu.
A tool or command that a mod registers is served by a hook on `tool.call` or `command.run`.
This mod adds a `/standup` command:

```javascript
on('session.start', async ($, e, next) => {
  await $.command.register({ name: 'standup', description: 'Summarize what changed today', argumentHint: '[days]' })
  return next(e)
})
on('command.run', { command: 'standup' }, async ($, e) => ({ text: 'Summary for ' + (e.args || '1') + ' day(s)' }))
```

In the "Where" column, **Run time** means in a hook, in a closure that a hook drew, or in a timer callback.
It does not mean inside `register`.

## Members

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `$.tool.list` | Returns the tools the model can call now, built-in and MCP alike, in the order the model sees them. | Type: `() => Promise<ToolInfo[]>`. Example: `const names = (await $.tool.list()).map(t => t.name)`. | Run time. | `CoreEngineInterface` line 3093, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.tool.call` | Calls a tool: the event `tool.call`, the same call the engine makes for the model's tool calls, under a `tool_use_id` of its own. | Type: `ToolCallOverloads`. Runs a tool through the hooks, the permission check, and the tool. Rejects for an unknown name or an aborted call. Example: `await $.tool.call({ tool: "Read", file_path: "a.md" })`. | Run time. | `CoreEngineInterface` line 3105, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.tool.check` | Asks the engine's permission decision for a tool call now: the event `tool.check`, resolved to its verdict (`{ decision, reason?, ... }`). | Type: `(input: ToolCheckArgs) => Promise<ToolCheckResult>`. Asks the hooks whether a call would be allowed. Nothing runs and no dialog opens. Example: `await $.tool.check({ tool: "Read", input })`. | Run time. | `CoreEngineInterface` line 3117, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.tool.register` | Declares a tool the model can call from the next prompt on: the name, description and input schema of `mcp__<plugin>__<name>`. | Type: `(tool: ToolSpec) => Promise<OpValueOf['tool.register']>`. Adds a tool as `mcp__<plugin>__<name>`. Serve it with a `tool.call` hook. A name registered again is replaced. | After the session binds at `session.start` (rejects before). | `CoreEngineInterface` line 3133, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.command.list` | Returns the slash commands the person can run now, built-in, plugin and MCP alike, in the order the typeahead lists them. | Type: `() => Promise<CommandInfo[]>`. Example: `const names = (await $.command.list()).map(c => c.name)`. | Run time. | `CoreEngineInterface` line 3146, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.command.run` | Runs a slash command as if the person typed `/command args`: the event `command.run`, queued and run once the session is idle. | Type: `(input: CommandRunArgs) => Promise<CommandRunResult>`. Runs a slash command through the hooks. Rejects an unknown name. Example: `await $.command.run({ command: "status" })`. | Run time. | `CoreEngineInterface` line 3158, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.command.register` | Declares the slash command `/<name>` for this session, listed in the typeahead from the next keystroke on. | Type: `(command: CommandSpec) => Promise<OpValueOf['command.register']>`. Adds a slash command. Serve it with a `command.run` hook. A built-in's name is refused. | Run time. | `CoreEngineInterface` line 3173, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.config.list` | Returns the rows the `/config` menu would draw now, in its order, each with its current value, its kind, its owner and its lock. | Type: `() => Promise<ConfigRow[]>`. Lists the rows of `/config` after every `config.describe` hook. A hidden row is left out. | Run time. | `CoreEngineInterface` line 3190, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.config.set` | Changes one row as if the person did in the menu: the event `config.set` with `origin` `{ kind: 'plugin', name }`, then the writer. | Type: `(input: ConfigSetArgs) => Promise<ConfigSetResult>`. Changes a `/config` row by `key`. Resolves `{ value }` or `{ deny }`. Rejects a key that no row has. | Run time. | `CoreEngineInterface` line 3204, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |

## Engine Events

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `tool.call` | Fires when the engine is about to run a tool. Each `next(e)` runs the hooks beneath, then core (the permission prompt, the tool itself). | Input `ToolCallInput`. Result `ToolCallResult`. Hook result: `{ result, context? }` or `{ deny }`. `{ deny: reason }` refuses the call. A guard that fails is skipped and the tool runs. | Hook via `on('tool.call', ...)`. Also callable as `$.tool.call(...)`. | `EngineEventOf` line 4054, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `tool.check` | Fires when the engine decides whether a tool call may run, after the `tool.call` and PreToolUse hooks and before the mode settles an ask. | Input `ToolCheckInput`. Result `ToolCheckResult`. Hook result: `{ decision, reason?, ... }`. `next(e)` gives the engine's verdict. A guard that fails is skipped, so add a `.catch`. | Hook via `on('tool.check', ...)`. Also callable as `$.tool.check(...)`. | `EngineEventOf` line 4068, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `tool.describe` | Fires when the engine first renders the tool's schema in a session, `next(e)` resolves to `{ description, isDeferred? }`. | Input `ToolDescribeInput`. Result `ToolDescribeResult`. Hook result: `{ description, isDeferred? }`. The answer is cached until `$.ui.invalidate("tool.describe")`. | Hook via `on('tool.describe', ...)`. Also callable as `$.tool.describe(...)`. | `EngineEventOf` line 4336, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `command.run` | Fires when a slash command is about to run (`/name args` typed, or a plugin's `$.command.run`), `next(e)` resolves to `{ text }`, its output. | Input `CommandRunInput`. Result `CommandRunResult`. Hook result: `{ text }`. Rewrite `args` with `next`, or return `{ text }` to answer in its place. | Hook via `on('command.run', ...)`. Also callable as `$.command.run(...)`. | `EngineEventOf` line 4350, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `command.describe` | Fires once per command, when the engine lists it for the typeahead and `/help`, `next(e)` resolves to `{ description, argumentHint, isHidden }`. | Input `CommandDescribeInput`. Result `CommandDescribeResult`. Hook result: `{ description, argumentHint, isHidden }`. Cached for the session until `$.ui.invalidate("command.describe")`. | Hook via `on('command.describe', ...)`. Also callable as `$.command.describe(...)`. | `EngineEventOf` line 4362, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `config.set` | Fires when a `/config` row is about to change, from the menu or a plugin's `$.config.set`, `next(e)` resolves to `{ value }` once written. | Input `ConfigSetInput`. Result `ConfigSetResult`. Hook result: `{ value }` or `{ deny }`. `{ deny: reason }` leaves the row as it is. A value of the wrong kind is refused. | Hook via `on('config.set', ...)`. Also callable as `$.config.set(...)`. | `EngineEventOf` line 4376, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `config.describe` | Fires once per `/config` row, when the menu lists it and for `$.config.list`, `next(e)` resolves to `{ label, description, isHidden }`. | Input `ConfigDescribeInput`. Result `ConfigDescribeResult`. Hook result: `{ label, description, isHidden }`. Cached until `$.ui.invalidate("config.describe")`. | Hook via `on('config.describe', ...)`. Also callable as `$.config.describe(...)`. | `EngineEventOf` line 4388, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |

## Events Raised by These Calls

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `tool.list` | The argument of `$.tool.list()`. | Input: `NoArgs`. Value: `ToolInfo[]`. A hook above the caller returns `next(e)`, `{ deny: reason }` or `{ value }`. | Hook via `on('tool.list', ...)`. Raised by the call `$.tool.list(...)`. | `OpEventOf` line 7095, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `tool.register` | The argument of `$.tool.register(spec)`. | Input: `RegisteredToolSpec`. Value: `{ tool: string, }`. A hook above the caller returns `next(e)`, `{ deny: reason }` or `{ value }`. | Hook via `on('tool.register', ...)`. Raised by the call `$.tool.register(...)`. | `OpEventOf` line 7099, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `command.list` | The argument of `$.command.list()`. | Input: `NoArgs`. Value: `CommandInfo[]`. A hook above the caller returns `next(e)`, `{ deny: reason }` or `{ value }`. | Hook via `on('command.list', ...)`. Raised by the call `$.command.list(...)`. | `OpEventOf` line 7103, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `command.register` | The argument of `$.command.register(spec)`. | Input: `CommandSpec`. Value: `{ command: string, }`. A hook above the caller returns `next(e)`, `{ deny: reason }` or `{ value }`. | Hook via `on('command.register', ...)`. Raised by the call `$.command.register(...)`. | `OpEventOf` line 7107, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `config.list` | The argument of `$.config.list()`. | Input: `NoArgs`. Value: `ConfigRow[]`. A hook above the caller returns `next(e)`, `{ deny: reason }` or `{ value }`. | Hook via `on('config.list', ...)`. Raised by the call `$.config.list(...)`. | `OpEventOf` line 7111, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |

## See Also

- [Mod API: Tool, Command, and Config Types](Claude-Code-Mod-API-Tool-Command-Config-Types)
- [Claude Code Mod API](Claude-Code-Mod-API)
- [Use the Mods API](https://code.claude.com/docs/en/plugins/mods/api)
- [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference)
