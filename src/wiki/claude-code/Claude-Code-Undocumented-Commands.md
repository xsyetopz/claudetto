# Claude Code Undocumented Commands

A command is a `/` word that you type, such as `/compact`.
Some commands and bundled skills are not in the official docs.
Of its 59 rows, 11 is found only in the program, 1 differs from the docs, and 47 work only behind a flag or a gate.
Anthropic can change or remove each item in any release.

## Found Only in the Program

11 items are in the program but not in the official docs.
These are the most useful ones.

- `/pro-trial-expired`: Options shown when the Pro plan trial has ended. See [Skills and Commands Commands Cloud](Claude-Code-Skills-And-Commands-Commands-Cloud).
- `/daemon`: Manage background services and routines. See [Skills and Commands Commands Cloud](Claude-Code-Skills-And-Commands-Commands-Cloud).
- `/keybindings-help`: Helps edit `~/.claude/keybindings.json`. See [Skills and Commands Skills Bundled](Claude-Code-Skills-And-Commands-Skills-Bundled).
- `created_by`, `improved_by`: Mark a skill as made by the `dream-proposal` flow. See [Skills and Commands Skills Frontmatter](Claude-Code-Skills-And-Commands-Skills-Frontmatter).
- MCP-served skill: A skill served by an MCP server. See [Skills and Commands Skills Locations](Claude-Code-Skills-And-Commands-Skills-Locations).
- Skill `loadedFrom` values: Internal origin tags. See [Skills and Commands Skills Locations](Claude-Code-Skills-And-Commands-Skills-Locations).
- Name length: Caps a frontmatter `name`. See [Skills and Commands Skills Locations](Claude-Code-Skills-And-Commands-Skills-Locations).
- Total size cap: Stops huge fills. See [Skills and Commands Skills Substitutions](Claude-Code-Skills-And-Commands-Skills-Substitutions).
- Commit-time skills: `verify`, `pr`, `commit`, `code-review`, `simplify`, `go`. See [Skills and Commands Skills Substitutions](Claude-Code-Skills-And-Commands-Skills-Substitutions).

## Where the Docs Differ

1 items work in a different way from what the docs say.
This is the whole list.

- `effort`: Effort level for the turn. See [Skills and Commands Skills Frontmatter](Claude-Code-Skills-And-Commands-Skills-Frontmatter).

## Behind a Flag or a Gate

47 items work only when a flag or a gate is on.
These are some of them.

- `/web-setup`: Set up cloud sessions with your GitHub account. See [Skills and Commands Commands Cloud](Claude-Code-Skills-And-Commands-Commands-Cloud).
- `/sandbox` `exclude "command pattern"` (Windows also `install`): Show the sandbox state and open its configuration. See [Skills and Commands Commands Setup](Claude-Code-Skills-And-Commands-Commands-Setup).
- `/install-github-app`: Set up Claude GitHub Actions for a repository. See [Skills and Commands Commands Cloud](Claude-Code-Skills-And-Commands-Commands-Cloud).
- `/advisor` `[model\|off]`: Let Claude consult a stronger model at key moments. See [Skills and Commands Commands Session](Claude-Code-Skills-And-Commands-Commands-Session).
- `/session` (aliases `/remote`): Show the cloud session URL and QR code. See [Skills and Commands Commands Cloud](Claude-Code-Skills-And-Commands-Commands-Cloud).
- `/remote-control` (aliases `/rc`) `[name]`: Control this session from your phone or claude.ai/code. See [Skills and Commands Commands Cloud](Claude-Code-Skills-And-Commands-Commands-Cloud).

## Full Lists

Each page below has the full rows, with the value and the effect.

| Page | Rows |
| --- | --- |
| [Skills and Commands Commands Cloud](Claude-Code-Skills-And-Commands-Commands-Cloud) | 36 |
| [Skills and Commands Commands Session](Claude-Code-Skills-And-Commands-Commands-Session) | 4 |
| [Skills and Commands Commands Setup](Claude-Code-Skills-And-Commands-Commands-Setup) | 8 |
| [Skills and Commands Skills Bundled](Claude-Code-Skills-And-Commands-Skills-Bundled) | 4 |
| [Skills and Commands Skills Frontmatter](Claude-Code-Skills-And-Commands-Skills-Frontmatter) | 2 |
| [Skills and Commands Skills Locations](Claude-Code-Skills-And-Commands-Skills-Locations) | 3 |
| [Skills and Commands Skills Substitutions](Claude-Code-Skills-And-Commands-Skills-Substitutions) | 2 |

## See Also

- [Undocumented](Claude-Code-Undocumented)
- [Claude Code](Claude-Code)
- [Probes](Claude-Code-Probes)
