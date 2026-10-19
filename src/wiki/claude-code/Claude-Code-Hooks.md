# Claude Code Hooks

A hook is a small action that Claude Code runs by itself at a fixed point of a session, such as before a tool runs or when a session ends.
Hooks can block a risky command, add context, or run a check every time, which a prompt to Claude cannot promise.
For example, a `PreToolUse` hook can stop each `rm -rf` command before it runs.

## Key Facts

- Handler: a hook runs a shell command, an HTTP call, an MCP tool call, an LLM prompt, or a subagent.
- Events: Claude Code `2.1.303` has 33 hook events, and the docs and the bundle list the same 33 names.
- Mods: hooks that run as JavaScript functions inside Claude Code are mods, and they are in [Mod API](Claude-Code-Mod-API), not on these pages.
- Plugins: a plugin can carry hooks, as [Plugins](Claude-Code-Plugins) explains.
- Settings: the settings keys of hooks are in [Settings: Hooks and Plugins](Claude-Code-Settings-Hooks-And-Plugins).

## Legend

| Mark | Meaning |
| --- | --- |
| ✅ | Named by a page of the docs |
| 🔍 | Not in the docs, found in the bundle |
| ⚠️ | The docs differ from the bundle |
| 🧪 | Behind a flag or a gate |
| ❌ | Removed or inert in `2.1.303` |

## Sub-Pages

| Page | Content |
| --- | --- |
| [Handlers](Claude-Code-Hooks-Handlers) | The five handler types, plus the internal ones, and their fields |
| [Config](Claude-Code-Hooks-Config) | Matchers, `if`, timeouts, `onFailure`, async hooks, env vars, trust, settings keys |
| [Output](Claude-Code-Hooks-Output) | Common input fields, JSON output fields, exit codes, HTTP responses |
| [Tool Events](Claude-Code-Hooks-Events-Tool) | `PreToolUse`, `PermissionRequest`, `PermissionDenied` |
| [Tool Result Events](Claude-Code-Hooks-Events-ToolResult) | `PostToolUse`, `PostToolUseFailure`, `PostToolBatch` |
| [Session Events](Claude-Code-Hooks-Events-Session) | `SessionStart`, `Setup`, `SessionEnd`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged`, `DirectoryAdded` |
| [Prompt Events](Claude-Code-Hooks-Events-Prompt) | `UserPromptSubmit`, `UserPromptExpansion`, `MessageDisplay`, `Notification`, `Stop`, `StopFailure` |
| [Agent Events](Claude-Code-Hooks-Events-Agent) | `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle` |
| [Other Events](Claude-Code-Hooks-Events-Other) | `PreCompact`, `PostCompact`, `PreModelSwitch`, `PostModelSwitch`, `Elicitation`, `ElicitationResult`, `WorktreeCreate`, `WorktreeRemove` |

## Configuration Shape

A hook config has three levels.
The first level is the event name.
The second level is a matcher group with an optional `matcher`.
The third level is the `hooks` array of handlers.
The same shape is used in settings files, in plugin `hooks/hooks.json` (wrapped in a top-level `hooks` key), and in skill and agent frontmatter.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "if": "Bash(rm *)", "command": "./block-rm.sh", "timeout": 10 }
        ]
      }
    ]
  }
}
```

All matching handlers of an event run in parallel.
Claude Code runs a handler that is defined twice in settings files only once.
The copy of a plugin or a skill stays separate.
Source: [Hooks Reference][hr], and the hook schemas in the bundle.

## Where Hooks Are Defined

| Mark | Place | What it does | How it works | Scope | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `~/.claude/settings.json` | User hooks | Merged with the other levels | All projects, not shared | [Hooks Reference][hr] |
| ✅ | `.claude/settings.json` | Project hooks | Merged. Held back until the workspace trust dialog is accepted | One project, can be committed | [Hooks Reference][hr] |
| ✅ | `.claude/settings.local.json` | Local project hooks | Merged | One project, not shared | [Hooks Reference][hr] |
| ✅ | Managed policy settings | Organization hooks | Cannot be disabled by `disableAllHooks` below the managed level | Organization | [Hooks Reference][hr] |
| ✅ | `--settings '{...}'` flag | Hooks for one run | Bundle name `flagSettings`. Can set `disableAllHooks` | One run | [Hooks Reference][hr] |
| ✅ | Plugin `hooks/hooks.json` | Plugin hooks | Active when the plugin is on | Plugin | [Hooks Reference][hr] |
| ✅ | Plugin manifest key `hooks` | Path, inline object, or array | Merged with `hooks/hooks.json` | Plugin | [Plugin Manifest Reference][pm] |
| ✅ | Skill frontmatter `hooks` | Skill hooks | Registered when the skill is invoked. Kept for the session. `once` works here | Session | [Hooks Reference][hr] |
| ✅ | Subagent frontmatter `hooks` | Subagent hooks | Run only while the subagent runs. `Stop` becomes `SubagentStop`. Ignored for plugin subagents | Subagent | [Hooks Reference][hr], [Create Custom Subagents][sa] |
| ✅ | Mod `on("classic.<Event>")` | A function hook on a classic event | The chain is managed hooks, hooks modules, then other settings hooks. See [Mod API](Claude-Code-Mod-API) | Mod | [React to Events](https://code.claude.com/docs/en/plugins/mods/events) |
| 🔍 | SDK callback hooks | Handler type `callback` | Set by an Agent SDK host. A callback that times out on `PreToolUse` or `UserPromptSubmit` blocks | SDK | [Hooks Reference][hr], bundle `type:"callback"` |

## Sources

- [Hooks Reference][hr]: `external/cc-2.1.303/docs/hooks.md`.
- [Plugin Manifest Reference][pm] and [Create Custom Subagents][sa].
- `external/cc-2.1.303/types-2.1.303.d.ts`: `HookInput`, `BaseHookInput`, `ClassicResult`.
- `external/cc-diff-302-303/data/hookfields-2.1.303.tsv` and the bundle inventory (`hook_events`).
- Bundle: the hook schemas (the handler schema and the event input schema).

## Not Yet Checked

- The old page said the blocking fields of each event were not settled.
  They are settled on the event pages from `ClassicResultFields`, the bundle output schema, and the docs.
- Defaults of timeouts and the exit code 2 table come from the docs.
  The bundle was not searched for each value.
- ⚠️ The `script` handler type is rejected in `2.1.303`, and a `script` entry under `PreToolUse` disables its whole settings file (see [Handlers](Claude-Code-Hooks-Handlers) and [Probes](Claude-Code-Probes)).

## See Also

- [Hooks Reference](https://code.claude.com/docs/en/hooks)
- [Settings: Hooks and Plugins](Claude-Code-Settings-Hooks-And-Plugins)
- [Mod API](Claude-Code-Mod-API)
- [Plugins](Claude-Code-Plugins)

[hr]: https://code.claude.com/docs/en/hooks
[pm]: https://code.claude.com/docs/en/plugins/manifest-reference
[sa]: https://code.claude.com/docs/en/sub-agents
