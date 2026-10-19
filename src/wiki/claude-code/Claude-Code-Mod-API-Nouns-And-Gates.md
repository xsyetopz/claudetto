# Mod API: Files, Nouns, and Gates

A mod has a few files, one object named `$` with about twenty nouns, and a short list of switches that can stop it.
The tables below list them all, with the limits that apply.
The first row of the first table is the one file that makes a plugin a mod: `modules` in `hooks/hooks.json`.

## Files and Manifest Keys

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `hooks/hooks.json` key `modules` | The path of the hooks module. | One path only. The module and each file it imports are `.ts`, `.tsx`, `.jsx`, `.js`, `.mjs`, `.cjs`, `.mts`, or `.cts`. Bundle strings: `hooks.json` `modules` names one hooks module per plugin. | Plugin `hooks/` folder. | [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference), bundle string `hooks.json \`modules\` names one hooks module per plugin` |
| ✅ | `register(on, options)` | The export that the loader reads. Nothing else is read. | See [Hooks](Claude-Code-Mod-API-Hooks). | The hooks module. | `HooksModule` line 5312, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | Manifest key `types` | Path to the type contract of the plugin, starts with `./`. | A self-contained `.d.ts` with no import, export-from, require, or reference. It declares the noun in `declare module 'claude-code' { interface EngineInterface { ... } }` and the `PluginState` values. `claude plugin validate` checks it. | `plugin.json`. | `plugin.schema.json` (2.1.300), [Plugins Reference](https://code.claude.com/docs/en/plugins-reference) |
| ✅ | Manifest key `dependencies` | Plugins that must be enabled. | A mod that lists a plugin here gets its contract at `.claude-plugin/types/<plugin>/index.d.ts` when the engine loads the mod from a folder the person owns. | `plugin.json`. | `plugin.schema.json` (2.1.300) |
| ✅ | Manifest key `userConfig` | Fields whose values reach `register` as `options`. | Defaults are filled in. Values are in `pluginConfigs` of settings. A required field with no value fails the load. `PluginOptions` is a read-only record of string, number, boolean, or string list. | `plugin.json`. | `PluginOptions` line 7821, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `.claude-plugin/types/` | The engine writes `claude-code/index.d.ts`, `claude-code-tools/`, `claude-code-mcp/`, and one folder for each dependency here. | Written again after an update. A tsconfig that extends `.claude-plugin/types/tsconfig.json` is given to a mod that has none. | A mod loaded from a folder the person owns. | Header comment of the d.ts |
| ✅ | Tests `*.test.ts`, `*.test.tsx` | Run by `claude plugin test [dir]`. | See [Testing](Claude-Code-Mod-API-Testing). | Plugin folder. | [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |

A manifest has no `mods` key.
A plugin is a mod when `hooks/hooks.json` has `modules`.

## The Dollar Object

`$` is the first argument of every hook.
It is frozen.
It has `plugin`, 20 nouns, and every noun that an `engine.create` hook added.
Write each call in full, such as `$.fs.read('notes.md')`.
Each `$` call is also an event with the same name, such as `fs.read`.
A hook on it can pass the call on, refuse it with `{ deny }`, or answer it with `{ value }`.
The calling hook alone is skipped, so a plugin does not trap itself.

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `$.plugin` | This plugin, as loaded: its manifest name and its directory. | Members: `name`, `root`. | Run time only. See [Plugin](Claude-Code-Mod-API-Plugin). | `CoreEngineInterface` line 2351, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.ui` | Display: a line under an open dialog, a redraw or a repaint, a log line, panes the surface places, a window or ring, a surface's clipboard. | Members: `notice`, `invalidate`, `blit`, `resolve`, `log`, `ask`, `toast`, `notify`, `status`, `open`, `close`, `panes`, `scroll`, `focus`, `copy`, `selection`, `view`. | Run time only. See [UI](Claude-Code-Mod-API-UI). | `CoreEngineInterface` line 2365, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.model` | Completions through the session's own client and credentials. | Members: `complete`, `fork`, `classify`. | Run time only. See [Model](Claude-Code-Mod-API-Model). | `CoreEngineInterface` line 2640, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.audio` | Sound: clip playback and platform speech. | Members: `play`, `speak`. | Run time only. See [Model](Claude-Code-Mod-API-Model). | `CoreEngineInterface` line 2710, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.mcp` | The engine's MCP servers: calling a connected one's tools, and connecting one the plugin lists itself. | Members: `call`, `connect`. | Run time only. See [Model](Claude-Code-Mod-API-Model). | `CoreEngineInterface` line 2746, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.session` | The running session, read as plain data, compacting it, and sending a message from it to another agent or session. | Members: `messages`, `cwd`, `root`, `model`, `turns`, `id`, `repo`, `surfaces`, `surface`, `usage`, `version`, `compact`, `send`, `append`, `authorize`, `identity`. | Run time only. See [Session](Claude-Code-Mod-API-Session). | `CoreEngineInterface` line 2790, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.turn` | The running model turn: ending it. | Members: `abort`. | Run time only. See [Turn-Prompt](Claude-Code-Mod-API-Turn-Prompt). | `CoreEngineInterface` line 2985, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.prompt` | Submitting a prompt the model reads as a user turn, and the person's prompt box: read as it stands, written, or proposed into. | Members: `submit`, `read`, `media`, `fill`, `suggest`, `compose`. | Run time only. See [Turn-Prompt](Claude-Code-Mod-API-Turn-Prompt). | `CoreEngineInterface` line 3007, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.tool` | The tools the model has in this session, and running one. | Members: `list`, `call`, `check`, `register`. | Run time only. See [Tool-Command-Config](Claude-Code-Mod-API-Tool-Command-Config). | `CoreEngineInterface` line 3085, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.command` | The slash commands the person can run in this session, and running one. | Members: `list`, `run`, `register`. | Run time only. See [Tool-Command-Config](Claude-Code-Mod-API-Tool-Command-Config). | `CoreEngineInterface` line 3138, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.config` | Every row of the settings menu (`/config`), the panel's own and each enabled plugin's `userConfig` fields alike: listing and changing them. | Members: `list`, `set`. | Run time only. See [Tool-Command-Config](Claude-Code-Mod-API-Tool-Command-Config). | `CoreEngineInterface` line 3179, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.telemetry` | Analytics: first-party rows and feature marks for Anthropic, and records for the telemetry collector the session's operator configured. | Members: `log`, `mark`. | Run time only. See [Telemetry](Claude-Code-Mod-API-Telemetry). | `CoreEngineInterface` line 3210, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.agent` | Subagents. | Members: `spawn`, `list`, `register`. | Run time only. See [Agent](Claude-Code-Mod-API-Agent). | `CoreEngineInterface` line 3248, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.fs` | The file system as the engine's own process reaches it, a relative path is under the session's working directory, and text is UTF-8. | Members: `read`, `write`, `list`, `exists`, `stat`, `ancestors`. | Run time only. See [Fs-Store-State](Claude-Code-Mod-API-Fs-Store-State). | `CoreEngineInterface` line 3305, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.store` | This plugin's own key-value store, kept between sessions and hot reloads, values are JSON data. | Members: `get`, `set`, `delete`, `keys`. | Run time only. See [Fs-Store-State](Claude-Code-Mod-API-Fs-Store-State). | `CoreEngineInterface` line 3433, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.state` | Named values held by the host for the session, each with a version: plain data that survives a hot reload of the plugin's code. | Members: `get`, `set`. | Run time only. See [Fs-Store-State](Claude-Code-Mod-API-Fs-Store-State). | `CoreEngineInterface` line 3466, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.clock` | The time and timers, each an event through the host: `clock.now` reads the time, `clock.sleep`, `after` and `every` wait until it has passed. | Members: `now`, `sleep`, `after`, `every`. | Run time only. See [Clock-Http-Process-Env-Settings](Claude-Code-Mod-API-Clock-Http-Process-Env-Settings). | `CoreEngineInterface` line 3508, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.http` | The network, through the host. | Members: `fetch`. | Run time only. See [Clock-Http-Process-Env-Settings](Claude-Code-Mod-API-Clock-Http-Process-Env-Settings). | `CoreEngineInterface` line 3551, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.process` | Commands on the host, run as the user the session runs as. CLI only. | Members: `run`, `spawn`. | Run time only. See [Clock-Http-Process-Env-Settings](Claude-Code-Mod-API-Clock-Http-Process-Env-Settings). | `CoreEngineInterface` line 3580, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.settings` | What the settings files, `--settings` and managed policy hold, as the engine runs under it, read only. | Members: `read`. | Run time only. See [Clock-Http-Process-Env-Settings](Claude-Code-Mod-API-Clock-Http-Process-Env-Settings). | `CoreEngineInterface` line 3645, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.env` | The environment of this process, the one every Bash child, MCP server and `$.process.run` command started after inherits. | Members: `get`, `set`. | Run time only. See [Clock-Http-Process-Env-Settings](Claude-Code-Mod-API-Clock-Http-Process-Env-Settings). | `CoreEngineInterface` line 3670, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |

## Modules

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `claude-code` | Types only. `import type { Register, On, EngineInterface } from 'claude-code'`. At run time the import is empty. | Exports 585 declarations. The values `atom`, `derive`, `memberOf`, `read`, and `update` are the state helpers. | Hooks modules and contracts. | d.ts line 100, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `claude-code/testing` | The kit for `claude plugin test`: `test`, `describe`, `expect`, `mock`, `tier`. | See [Testing](Claude-Code-Mod-API-Testing). | `*.test.ts` and `*.test.tsx`. | d.ts line 15589 |
| ✅ | Globals `h`, `Fragment`, `JSX` | JSX compiles against them. | See [Elements](Claude-Code-Mod-API-UI-Elements). | Files with JSX. | d.ts lines 15462 to 15586, [Mods Overview](https://code.claude.com/docs/en/plugins/mods/overview) |

## Gates That Stop Mods

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `disableAllHooks` | No mod or hook of an installed plugin runs. | In managed settings it also stops organization mods. In user settings what the organization manages keeps running. Built-in mods load. | Settings files. | [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `allowManagedHooksOnly` | Blocks hooks and mods that are not the organization's. | Bundle string: `hooks modules are turned off here (disableAllHooks, allowManagedHooksOnly or a policy)`. | Managed settings. | [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `allowManagedModsOnly` | Only organization mods and built-in mods run their hooks. | Option on the built-in guard `sec-default`. | Managed settings. | [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `allowModsToOverrideDenyRules` | Lets an installed mod approve a call that a `deny` rule refuses. | Option on the built-in guard. | Managed settings. | [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `prependPlugins`, `appendPlugins` | Plugin ids that run before or after user mods. | Only these can call `next.to`. | Managed settings. | [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `disableSideloadFlags` | Rejects `--plugin-dir` and `--plugin-url`. | - | Managed settings. | [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `--safe-mode`, `--bare` | No installed hooks module loads. | Bundle: `Safe mode: installed plugins are disabled, none of their hooks or hooks modules load, built-in plugins load regardless`. | CLI flags. | [Mods Overview](https://code.claude.com/docs/en/plugins/mods/overview) |
| 🧪 | Rollout switch | Bundle strings say installed hooks modules wait for a rollout flag, and a message says installed mods are turned off remotely. | Built-in plugins and organization plugins load regardless. The flag name is not shown in the strings. | Installed plugins. | Bundle strings `rollout flag (` and `installed mods are turned off remotely` |
| ❌ | `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` | Ignored since `2.1.287`. Setting it to `0` does not turn mods off. | The name is still in the bundle. | Environment. | [Mods Overview](https://code.claude.com/docs/en/plugins/mods/overview) |
| ✅ | `CLAUDE_CODE_PLUGIN_DIRS`, `CLAUDE_CODE_PLUGIN_DIR_WATCH` | Load plugin dirs as `--plugin-dir` does, and reload on save in a non-interactive session. | - | Environment. | [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |

## Limits

Hooks and Mod API calls run under time and size limits.
Claude Code skips a hook that is too slow.

| Limit | Value |
| --- | --- |
| Own time of one hook for one event | 10 seconds, or 50 milliseconds for a `prompt.edit` hook |
| A `.catch` handler | 1 second |
| All `session.end` hooks together | 1.5 seconds unless you change the `SessionEnd` hook budget |
| `$.process.run` | 30 seconds by default, 10 minutes at most |
| `$.model.complete` `maxTokens` | 1024 by default, up to 64,000 or the output limit of the model |
| `$.fs.read` and `$.fs.write` | 4 MiB for one file |
| `$.http.fetch` body and response | 4 MiB each, 30 seconds, 5 redirects |
| `$.store` | 4 MiB of JSON in all |
| `$.session.messages()` | The newest 4,096 entries |
| `$.ui.invalidate('ui.render')` | 10 redraws a second, or 30 in the terminal for the visible pane |
| `$.ui.toast` | 4 seconds unless you pass `timeoutMs` |
| A pane that nobody asked for | Placed from 144 terminal columns, 110 after the person opened it once |
| Names of commands, tools, subagent types, and panes | Letters, digits, `_`, and `-`, up to 64 characters |
| One `claude plugin test` test | 5 seconds unless the test sets `timeoutMs` |

## Built-in Mods

Six built-in plugins ship in the binary.
The settings and flags that stop installed mods do not stop them.

| Name in `/plugin` | What it does |
| --- | --- |
| `cc-plugin-agents-md` | Loads `AGENTS.md` as project instructions |
| `cc-plugin-diff` | Takes over `/diff` and draws its pane |
| `cc-plugin-plugin-authoring` | Gives Claude the `plugin-authoring` skill for writing mods. It holds no mod code. |
| `cc-plugin-sec-default` | Guards what your organization manages from the mods a user installs. You cannot turn it off. |
| `cc-plugin-telemetry` | Sends the analytics records that Claude Code and its built-in mods log |
| `cc-plugin-you-should-know` | Shows a note above the prompt when a side agent finds something you might have missed. Off until you turn it on. |

## See Also

- [Claude Code Mod API](Claude-Code-Mod-API)
- [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference)
- [Mods Overview](https://code.claude.com/docs/en/plugins/mods/overview)
- [Manage Mods for Your Organization](https://code.claude.com/docs/en/plugins/mods/admin)
