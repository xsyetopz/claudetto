# Claude Code Undocumented Tools

A tool is an action that Claude can take, such as reading a file.
Some tools and some tool inputs are not in the official docs.
Of its 66 rows, 39 are found only in the program, 1 differs from the docs, and 59 work only behind a flag or a gate.
Anthropic can change or remove each item in any release.

## Found Only in the Program

39 items are in the program but not in the official docs.
These are the most useful ones.

- `StructuredOutput`: Returns the final JSON for `--json-schema` runs. See [Tools Other](Claude-Code-Tools-Other).
- `RefreshMcpTools`, `ObserverReport`, `TestingPermission`: Internal or gated tools. See [Tools Other](Claude-Code-Tools-Other).
- Query `select:A,B`: Fetches the named tools. See [Tools](Claude-Code-Tools).
- Query keywords: Searches by keyword and returns up to `max_results` matches. See [Tools](Claude-Code-Tools).
- Query `+term rest`: Requires `term` in the tool name and ranks by the rest. See [Tools](Claude-Code-Tools).
- `Placeholder`: A dummy tool keeps deferred loading active. See [Tools](Claude-Code-Tools).

## Where the Docs Differ

1 items work in a different way from what the docs say.
This is the whole list.

- `max_results`: The old `2.1.296` capture showed it as required. See [Tools](Claude-Code-Tools).

## Behind a Flag or a Gate

59 items work only when a flag or a gate is on.
These are some of them.

- `ShowOnboardingRolePicker`: Shows the Cowork onboarding role picker. See [Tools Other](Claude-Code-Tools-Other).
- `self_hosted_runner_list_runners`: List registered self-hosted runners for an environment. See [Tools Other](Claude-Code-Tools-Other).
- `ProposeGoal`: Proposes a goal condition for user approval. See [Tools Agents and Tasks](Claude-Code-Tools-Agents-And-Tasks).
- `GetTask`: Checks a background shell command by task ID. See [Tools Shell and Web](Claude-Code-Tools-Shell-And-Web).
- `PublishPlugin`: Publishes a plugin or mod to the organization library. See [Tools Other](Claude-Code-Tools-Other).
- `ListAgents`: Lists agents that `SendMessage` can reach. See [Tools Agents and Tasks](Claude-Code-Tools-Agents-And-Tasks).

## Full Lists

Each page below has the full rows, with the value and the effect.

| Page | Rows |
| --- | --- |
| [Tools](Claude-Code-Tools) | 8 |
| [Tools Agents and Tasks](Claude-Code-Tools-Agents-And-Tasks) | 14 |
| [Tools Files](Claude-Code-Tools-Files) | 3 |
| [Tools Other](Claude-Code-Tools-Other) | 37 |
| [Tools Shell and Web](Claude-Code-Tools-Shell-And-Web) | 4 |

## See Also

- [Undocumented](Claude-Code-Undocumented)
- [Claude Code](Claude-Code)
- [Probes](Claude-Code-Probes)
