# Claude Code

Claude Code is a coding assistant from Anthropic that works in your terminal, your editor, and the cloud.
You give it a task in plain words, and it reads your files, runs commands, and edits code to do the task.
You can change nearly every part of it with settings, hooks, plugins, skills, and MCP servers, so it fits the way you work.

This part of the wiki describes version `2.1.303`, released on 2026-10-19.
For example, you can run `claude --model opus --effort high` to ask for a stronger model that thinks harder.

## How It Works in One Minute

1. You type a prompt, or a script sends one.
2. Claude Code reads your settings, your `CLAUDE.md` files, and your plugins.
3. It builds a request that holds the system prompt, the tool list, and the whole conversation.
4. It sends the request to a model and reads the answer as it streams in.
5. If the model asks for a tool, such as `Bash` or `Edit`, Claude Code checks your permission rules and runs the tool.
6. It adds the tool result to the conversation and asks the model again.
7. It repeats steps 4 to 6 until the model answers without a tool call.
8. It saves the conversation to a file on your disk, so you can resume it later.
9. When the conversation gets too long, it asks the model for a short summary and goes on from the summary.

The page [Turn Pipeline](Claude-Code-Turn-Pipeline) shows each of these steps in detail.

## Marks

Each row in a table has one or more marks.

| Mark | Meaning |
| --- | --- |
| ✅ | A page of the [official docs](https://code.claude.com/docs/en) names the item |
| 🔍 | No docs page names the item, and it is found only in the program |
| ⚠️ | The docs and the program differ, and the row says how |
| 🧪 | The item works only behind a flag or a gate |
| ❌ | The item is removed or does nothing in `2.1.303` |

A yes or no value in a table is ✅ or ❌.
The bundle is the JavaScript code inside the `claude` binary.
Anthropic can change a 🔍 item without notice.

## Pages by Topic

### How Claude Code Runs

- [Architecture](Claude-Code-Architecture): the pieces, the processes, and the startup steps.
- [Turn Pipeline](Claude-Code-Turn-Pipeline): the path from your prompt to the final answer.
- [Request Build](Claude-Code-Request-Build): what goes into one request to the model, and how the cache works.
- [System Prompt](Claude-Code-System-Prompt): the first text the model reads, and how to change it.
- [Context and Compaction](Claude-Code-Context-And-Compaction): the context window and the summary.
- [Sessions and Storage](Claude-Code-Sessions-And-Storage): resume, branch, and the files on your disk.

### Models and the API

Models, effort, thinking, retries, and the server calls.

- [Models and API](Claude-Code-Models-And-API)

### Command Line

The `claude` command, its flags, and the JSON line protocol.

- [CLI](Claude-Code-CLI)
  - [Stream JSON Control](Claude-Code-CLI-Stream-Json-Control)

### Settings and Environment Variables

Every settings key and every environment variable.

- [Settings](Claude-Code-Settings)

- [Env Vars](Claude-Code-Env-Vars)

### Permissions and Sandbox

Rules, modes, auto mode, and the sandbox.

- [Permissions and Sandbox](Claude-Code-Permissions-And-Sandbox)

### Hooks

Commands that run at fixed points in a turn.

- [Hooks](Claude-Code-Hooks)

### Tools

The built-in tools the model can call.

- [Tools](Claude-Code-Tools)

### Subagents

Helper agents that work in their own context.

- [Subagents](Claude-Code-Subagents)

### Skills and Commands

Reusable instructions and slash commands.

- [Skills and Commands](Claude-Code-Skills-And-Commands)

### Plugins

Packages of skills, agents, hooks, and servers.

- [Plugins](Claude-Code-Plugins)

### MCP

Servers that give Claude Code more tools.

- [MCP](Claude-Code-MCP)

### Mod API

The `$` API for plugins that change how Claude Code behaves.

- [Mod API](Claude-Code-Mod-API)

### Memory, Style, and Display

- [Memory and Rules](Claude-Code-Memory-And-Rules): `CLAUDE.md` files, rules, and imports.
- [Output Styles](Claude-Code-Output-Styles): style files that change how Claude answers.
- [Status Line](Claude-Code-Status-Line): the line under the prompt.

### Not in the Docs

- [Undocumented](Claude-Code-Undocumented): every item that only the bundle shows.

## Sources

| Source | Use |
| --- | --- |
| [Claude Code docs](https://code.claude.com/docs/en) | Documented behavior, saved as a copy on 2026-10-19 |
| The bundle and the type file of `2.1.303` | Items that the docs do not name |
| `claude --help` and `claude <command> --help` | Flags and commands |

These pages used no model call and no patch of the program.

## See Also

- [Architecture](Claude-Code-Architecture)
- [Env Vars](Claude-Code-Env-Vars)
- [Undocumented](Claude-Code-Undocumented)
