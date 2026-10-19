# Claude Code Undocumented CLI Flags

A flag changes how `claude` runs, such as `--brief`.
The program has many flags and SDK messages that the official docs do not name.
All 207 rows are found only in the program.
Anthropic can change or remove each item in any release.

## Found Only in the Program

207 items are in the program but not in the official docs.
These are the most useful ones.

- `rename_session`: Sets the title of the session. See [CLI Stream Json Control](Claude-Code-CLI-Stream-Json-Control).
- `set_mcp_permission_mode_override`: Sets or clears the permission mode of one MCP server. See [CLI Stream Json Control](Claude-Code-CLI-Stream-Json-Control).
- `register_repo_root`: Adds a folder as a working folder root, and can reload `CLAUDE.md`, skills, and plugins. See [CLI Stream Json Control](Claude-Code-CLI-Stream-Json-Control).
- `mcp_toggle`: Turns an MCP server on or off. See [CLI Stream Json Control](Claude-Code-CLI-Stream-Json-Control).
- `--enable-auth-status`: Turns on auth status messages in SDK mode. See [CLI Hidden Flags](Claude-Code-CLI-Hidden-Flags).
- `--brief`: Turns on the `SendUserMessage` tool so the agent can message the user. See [CLI Flags](Claude-Code-CLI-Flags).
- `set_model`: Sets the model for the next turns. See [CLI Stream Json Control](Claude-Code-CLI-Stream-Json-Control).
- `set_prompt_suggestions_paused`: Pauses or resumes prompt suggestions. See [CLI Stream Json Control](Claude-Code-CLI-Stream-Json-Control).
- `can_use_tool`: Asks for permission to use a tool with the given input. See [CLI Stream Json Control](Claude-Code-CLI-Stream-Json-Control).
- `--agent-name <name>`: Sets the display name of a teammate. See [CLI Hidden Flags](Claude-Code-CLI-Hidden-Flags).

## Full Lists

Each page below has the full rows, with the value and the effect.

| Page | Rows |
| --- | --- |
| [CLI](Claude-Code-CLI) | 3 |
| [CLI Flags](Claude-Code-CLI-Flags) | 2 |
| [CLI Hidden Flags](Claude-Code-CLI-Hidden-Flags) | 47 |
| [CLI Stream Json](Claude-Code-CLI-Stream-Json) | 64 |
| [CLI Stream Json Control](Claude-Code-CLI-Stream-Json-Control) | 91 |

## See Also

- [Undocumented](Claude-Code-Undocumented)
- [Claude Code](Claude-Code)
- [Probes](Claude-Code-Probes)
