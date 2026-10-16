# Trim

This page describes the built-in parts of Claude Code that the core plugin `claudetto` turns off.
It is for a user who wants to know why a tool or a text is not in the session, and for a contributor who edits the `trim` slice.

## What the Slice Does

The `trim` slice sets the env vars and the settings keys that remove parts that no slice of `claudetto` uses.
Each part is in `REMOVED_PARTS` in `src/plugins/claudetto/slices/trim/domain/removed.ts`, with its reason.
Each switch was checked against Claude Code 2.1.302: the first request loses the text of the part, or a line of the bundle reads the switch.
A switch that has no effect does not ship.

## Removed Parts

| Part | Switch | Reason |
| --- | --- | --- |
| Cron tools | `CLAUDE_CODE_DISABLE_CRON=1` | No slice schedules a task. |
| `Explore` and `Plan` agents | `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` | The role agents replace them. |
| Fast mode text | `CLAUDE_CODE_DISABLE_FAST_MODE=1` | No slice switches to fast mode. |
| Commit and PR workflow instructions | `includeGitInstructions: false` | The `attribution` and `sembr` slices and the guard give the git rules. |
| Auto memory | `autoMemoryEnabled: false` | No slice reads or writes the auto memory. |
| Claude.ai connectors | `disableClaudeAiConnectors: true` | No slice uses a connector. |
| Claude.ai skills and plugins sync | `syncClaudeAiSkills: false`, `syncClaudeAiPlugins: false` | Synced items add entries to the listings of each session. |

The settings also deny the built-in agent types `general-purpose`, `claude-code-guide`, and `statusline-setup`.
The `surface` slice removes `claude-code-guide` and `statusline-setup` from the agent listing.

## Parts That Stay

- The mode note of `WebSearch`:
  Claude Code adds it as its own system block, so `CLAUDE_CODE_REMOVE_PROMPT_STRINGS` does not remove it.
  The only switch that removes it also removes the `mode` parameter, which lets `WebSearch` choose the cheap search.
- The Claude in Chrome guidance:
  Claude in Chrome is off until you turn it on, and then its tools need the guidance.
  So `claudetto` does not set `CLAUDE_CODE_DISABLE_CFC_PROMPT`.
- The agent view:
  `disableAgentView` turns off `claude agents`, `--bg`, `/background`, and the background daemon.
  It does not change the request, so it is not a trim part, and `claudetto` does not set it.

## `Glob` and `Grep`

The native build of Claude Code hides `Glob` and `Grep` unless the CLI tool list names them.
A plugin cannot set a CLI flag.
To get the two tools, start Claude Code with this command:

```sh
claude --allowedTools Glob,Grep
```

The `init` event of the session then lists `Glob` and `Grep`.
To use the flag in each session, add this alias to the startup file of your shell, such as `~/.zshrc`:

```sh
alias claude='claude --allowedTools Glob,Grep'
```

The `setup` skill gives the same line, and it does not edit the startup file.

## Related Pages

- [Prompt](Prompt): the system prompt and the tool descriptions.
- [Agents](Agents): the role agents that replace the built-in agent types.
- [Settings Snippet](Settings-Snippet): the settings that the profile sets.
- [Bounds](Bounds): the bounds of the plugin.
