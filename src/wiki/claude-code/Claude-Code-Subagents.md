# Claude Code Subagents

A subagent is a separate Claude run with its own context window, prompt, tools, and model.
It does a side task, such as a long search, and returns only a short summary, so your main conversation stays clean.
For example, Claude can send a code search to the `Explore` subagent and get back only the answer.

## Legend

- ✅ documented in the saved docs.
- 🔍 undocumented, found in the bundle.
- ⚠️ the docs differ from the bundle.
- 🧪 behind a flag or a gate.
  The gate is in the cell.
- ❌ removed or inert in `2.1.303`.

## Sub-Pages

| Page | Content |
| --- | --- |
| [Frontmatter](Claude-Code-Subagents-Frontmatter) | Each key of an agent file and the `--agents` JSON |
| [Runtime](Claude-Code-Subagents-Runtime) | Built-in agents, tool filters, forks, background, depth, teams |

## Overview

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | Agent file | A Markdown file with YAML frontmatter and a prompt body. | Body is the system prompt. See [Frontmatter](Claude-Code-Subagents-Frontmatter). | Folders in the table below. | [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |
| ✅ | `Agent` tool | Starts a subagent, a fork, or a teammate. | See [Agents and Tasks](Claude-Code-Tools-Agents-And-Tasks). | Main session and subagents. | [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |
| ✅ | `--agent` flag and `agent` setting | Runs an agent as the main session. | `initialPrompt` applies. `Agent(type)` in `tools` limits spawnable types. | CLI and settings. | [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |
| ✅ | `@` mention | Invokes a subagent by name. | Details in the docs section on explicit invocation. | Interactive. | [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |
| ✅ | `permissions.deny` `Agent(name)` | Disables one agent type. | `Agent(fork)` blocks forks. Deny `Agent` to stop all delegation. `Task(...)` is an alias. | Settings. | [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |
| ✅ | `Task` alias | Old name of `Agent` (before `2.1.63`). | Works in rules and agent files. | Settings and files. | [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |

## Agent Locations and Priority

Same name in two places: the higher priority wins.

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | Managed settings | Priority 1 (highest). | Pushed by an administrator. | Organization. | [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |
| ✅ | `--agents` JSON | Priority 2. | Session only. Not saved. | Current session. | [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |
| ✅ | `.claude/agents/` | Priority 3. | Found by walking up from the working directory. The closest definition wins. `--add-dir` folders also load. | Project. | [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |
| ✅ | `~/.claude/agents/` | Priority 4. | Scanned recursively. Identity is the `name`, not the path. | User. | [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |
| ✅ | Plugin `agents/` | Priority 5 (lowest). | Subfolders become part of `plugin:folder:file`. | Plugin. | [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |

## Other Points

- Fork: a subagent that inherits the whole conversation.
  It shares the prompt cache with the parent.
  See [Runtime](Claude-Code-Subagents-Runtime).
- `/subtask` starts a fork by hand (`2.1.212`).
  On `2.1.161` to `2.1.211` the command was `/fork`.
- `tools` and `disallowedTools` order, MCP patterns, `skills`, `memory`, `maxTurns`, and `isolation` are rows on the frontmatter page.
- `SubagentStart` and `SubagentStop` hooks fire with `agent_type`.
  See [Hooks](Claude-Code-Hooks).
- Subagent descriptions count toward context.
  The docs show a startup warning when the descriptions of non-built-in agents pass 15000 tokens (old page, Not verified in `2.1.303`).

## Sources

- [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents).
- [Environment Variables](https://code.claude.com/docs/en/env-vars).
- [Hooks Reference](https://code.claude.com/docs/en/hooks).

## Not Yet Checked

- Not verified: the 15000-token warning in `2.1.303`.

## See Also

- [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents)
- [Frontmatter](Claude-Code-Subagents-Frontmatter)
- [Runtime](Claude-Code-Subagents-Runtime)
- [Hooks](Claude-Code-Hooks)
- [Tools](Claude-Code-Tools)
