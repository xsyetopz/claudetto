# Claude Code Mod API

A mod is a plugin whose code runs inside Claude Code.
Claude Code calls the code when an event happens, such as a tool call or a submitted prompt.
The code can watch the event, change it, or answer it.
This mod writes each Bash command that Claude runs to the transcript:

```javascript
// hooks/register.js
export function register(on) {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    $.ui.log('Claude runs: ' + e.command)
    return next(e)
  })
}
```

The object `$` is the Mod API.
The d.ts file that Claude Code publishes marks this API as early access, so it may change between releases.
These pages cover `2.1.303`, from the docs and from `types-2.1.303.d.ts`.

## A First Mod

A small mod has three files:

```text
first-mod/
├── .claude-plugin/plugin.json
└── hooks/
    ├── hooks.json
    └── register.js
```

- `plugin.json` is the manifest of the plugin, with a `name`, a `version`, and a `description`.
- `hooks.json` holds `{ "modules": ["./register.js"] }`.
  That key makes the plugin a mod.
- `register.js` is the hooks module.
  It exports `register`, and `register` calls `on` once for each hook.

Load the folder for one session with the flag `--plugin-dir`:

```bash
claude --plugin-dir ./first-mod
```

Claude Code reloads the module when you save a file.
The docs build the same mod step by step, with a `/tally` command and a spinner count, in [Create a Mod](https://code.claude.com/docs/en/plugins/mods/create).
You can also describe the mod in a session and let Claude write it.

## How a Mod Loads

1. The plugin has `hooks/hooks.json` with `modules`.
   It holds one path, relative to that file.
   A second entry is refused.
2. The engine reads the source of the module before it loads it.
   It lists the events, the `$` calls, the env names, and the `$.state` values.
   `claude plugin validate <dir>` prints that list.
3. The `plugin.register` hooks of the modules admitted before it can refuse the module.
4. The `engine.create` fold builds `$` for the plugin.
   A step can add a noun.
5. The engine calls `register(on, options)` once.
   Then `session.start` fires for each loaded mod.
6. After an edit, `/reload-plugins` or the reload of `--plugin-dir` runs the cycle again.

Hooks run in five tiers, from outermost: `prepend`, `user`, `append`, `builtin`, `core`.
Managed plugins in `prependPlugins` and `appendPlugins` take the first and third tier.
The engine itself is `core`.

## Commands for Mod Authors

| Command | What it does |
| --- | --- |
| `claude --plugin-dir <dir>` | Loads a plugin folder for one session and reloads its module on save. |
| `claude plugin validate <dir>` | Reads the manifest and the module, then lists the events and `$` calls. `--strict` makes warnings errors and `--json` prints a report. |
| `claude plugin test [dir]` | Runs every `*.test.ts` and `*.test.tsx` file. Exits with 1 when a test fails. |
| `/plugin` | Shows a line such as `1 mod active · first-mod` when a mod loaded. |
| `/reload-plugins` | Reloads the plugins of the session. |
| `claude --debug-file <path>` | Writes a log with a line for each module that loads or fails. |

If a mod does nothing, run `claude plugin validate` first, then read the debug log.
The docs list the causes in [Troubleshoot a Mod](https://code.claude.com/docs/en/plugins/mods/troubleshoot).

## What the Marks Mean

- ✅ means a page of the docs names the item, or the item is in the published d.ts.
  The docs call the d.ts "the complete reference".
- ⚠️ means the docs differ from the d.ts or the bundle.
- 🧪 means a flag or a gate controls the item.
- ❌ means the item is removed or inert in `2.1.303`.

Rows of the Mod API pages have these columns: Mark, Item, What it does, How it works, Where it can be used, and Source.
Type tables have the columns Mark, Item, What it is for, Shape and limits, and Source.
A semicolon in a doc comment became a comma.

## Pages of the Mod API

| Page | What is in it |
| --- | --- |
| [Mod API: Hooks, `on`, and `next`](Claude-Code-Mod-API-Hooks) | `register`, `on`, `next`, failure, and budgets. |
| [Mod API: Hook Machinery Types](Claude-Code-Mod-API-Hook-Types) | How hooks, matchers, and traces are typed. |
| [Mod API: Event Table Types](Claude-Code-Mod-API-Event-Types) | Which input and result each event has. |
| [Mod API: Files, Nouns, and Gates](Claude-Code-Mod-API-Nouns-And-Gates) | Manifest keys, the `$` nouns, switches, and limits. |
| [Mod API: Plugin and Engine](Claude-Code-Mod-API-Plugin) | `$.plugin`, `plugin.register`, `engine.create`, and their types. |
| [Mod API: UI Methods](Claude-Code-Mod-API-UI) | `$.ui`: toasts, panes, scroll, focus, clipboard. |
| [Mod API: UI Events](Claude-Code-Mod-API-UI-Events) | `ui.render`, `ui.press`, and the other interface events. |
| [Mod API: Surfaces, Elements, and Render Sites](Claude-Code-Mod-API-UI-Elements) | What a mod may draw, where, and with which props. Also JSX and globals. |
| [Mod API: UI Types (Parts 1 to 4)](Claude-Code-Mod-API-UI-Types) | Element props and results of `$.ui`, in four parts (`-2`, `-3`, `-4`). |
| [Mod API: Model, Audio, and MCP](Claude-Code-Mod-API-Model) | `$.model`, `$.audio`, `$.mcp`. |
| [Mod API: Model, Audio, and MCP Types](Claude-Code-Mod-API-Model-Types) | Requests, answers, and MCP types. |
| [Mod API: Session](Claude-Code-Mod-API-Session) | `$.session` and the `session.*` events. |
| [Mod API: Session Types (Parts 1 and 2)](Claude-Code-Mod-API-Session-Types) | Context, messages, usage, and send types (`-2` for part 2). |
| [Mod API: Turn and Prompt](Claude-Code-Mod-API-Turn-Prompt) | `$.turn`, `$.prompt`, `turn.*`, `prompt.*`, `skill.prompt`, `attribution.text`. |
| [Mod API: Turn and Prompt Types (Parts 1 to 3)](Claude-Code-Mod-API-Turn-Prompt-Types) | Prompt, attachment, and model step types (`-2`, `-3`). |
| [Mod API: Tool, Command, and Config](Claude-Code-Mod-API-Tool-Command-Config) | `$.tool`, `$.command`, `$.config`. |
| [Mod API: Tool, Command, and Config Types (Parts 1 and 2)](Claude-Code-Mod-API-Tool-Command-Config-Types) | Tool call, check, command, and config types (`-2` for part 2). |
| [Mod API: Agent](Claude-Code-Mod-API-Agent) | `$.agent`, `agent.offer`, `agent.spawn`, and the agent types. |
| [Mod API: Files, Store, and State](Claude-Code-Mod-API-Fs-Store-State) | `$.fs`, `$.store`, `$.state`, and the state helpers. |
| [Mod API: Clock, HTTP, Process, Env, and Settings](Claude-Code-Mod-API-Clock-Http-Process-Env-Settings) | `$.clock`, `$.http`, `$.process`, `$.env`, `$.settings`. |
| [Mod API: Files, State, Clock, HTTP, Process, and Settings Types](Claude-Code-Mod-API-Infra-Types) | Types of the nouns above. |
| [Mod API: Telemetry](Claude-Code-Mod-API-Telemetry) | `$.telemetry`, `telemetry.log`, `telemetry.mark`. |
| [Mod API: Classic Events](Claude-Code-Mod-API-Classic-Events) | The `classic.*` events of the settings hooks. |
| [Mod API: Classic Event Types (Parts 1 to 3)](Claude-Code-Mod-API-Classic-Types) | Inputs and results of the classic events (`-2`, `-3`). |
| [Mod API: The `claude-code/testing` Module](Claude-Code-Mod-API-Testing) | `test`, `describe`, `expect`, `mock`, `tier`, `$.ui.mount`. |
| [Mod API: Testing Types (Parts 1 and 2)](Claude-Code-Mod-API-Testing-Types) | Types of the test kit (`-2` for part 2). |

## Known Gaps

- The 50 millisecond limit of a `prompt.edit` hook is in the docs and not in the d.ts.
- The name of the rollout flag for installed mods is not in the bundle strings.
- The value `re-entry` of `next.error.kind` is in the docs and in a bundle debug string, and not in the d.ts.
- Many doc comments name code items without backticks.
  The cells keep the wording of the d.ts.

## See Also

- [Mods Overview](https://code.claude.com/docs/en/plugins/mods/overview)
- [Create a Mod](https://code.claude.com/docs/en/plugins/mods/create)
- [Use the Mods API](https://code.claude.com/docs/en/plugins/mods/api)
- [React to Events](https://code.claude.com/docs/en/plugins/mods/events)
- [Draw in the Interface](https://code.claude.com/docs/en/plugins/mods/interface)
- [Test a Mod](https://code.claude.com/docs/en/plugins/mods/test)
- [Troubleshoot a Mod](https://code.claude.com/docs/en/plugins/mods/troubleshoot)
- [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference)
- [Hooks](Claude-Code-Hooks)
- [Plugins](Claude-Code-Plugins)
- [Claude Code](Claude-Code)
