# Claude Code Tools: Shell, Web, and Background Tasks

These tools run shell commands, fetch web pages, search the web, and manage background tasks.
They are the tools that reach outside the project, so permission rules and the sandbox matter most for them.
For example, `Bash` with `run_in_background` set to `true` starts a long command and returns at once.
The marks are explained on [Tools](Claude-Code-Tools).

## Tools

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Read-Only | Parallel | Deferred | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ✅ | `Bash` | Runs a shell command. | Six parameters, listed in [Bash Parameters](#bash-parameters). | Main session and subagents. Kept in background subagents. | ❌ | ❌ | ❌ | [Tools Reference](https://code.claude.com/docs/en/tools-reference), [Configure Permissions](https://code.claude.com/docs/en/permissions) |
| ✅ 🧪 | `PowerShell` | Runs a Windows PowerShell command. | Same parameters as `Bash` except `command` is a PowerShell command and `description` has a shorter text. Gate: `CLAUDE_CODE_USE_POWERSHELL_TOOL` (Environment Variables). | Main session and subagents. Kept in background subagents. | ❌ | ❌ | ❌ | [Tools Reference](https://code.claude.com/docs/en/tools-reference), [Configure Permissions](https://code.claude.com/docs/en/permissions) |
| ✅ | `Monitor` | Streams the output of a background command or a WebSocket as notifications. | Parameters are listed in [Monitor Parameters](#monitor-parameters). | Main session and subagents. Kept in background subagents. | ❌ | ✅ | ✅ | [Tools Reference](https://code.claude.com/docs/en/tools-reference), [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |
| ✅ 🧪 | `WebFetch` | Fetches a URL and applies a prompt to the page text. | `url` (URL string, required), `prompt` (string, required), `offset` (int >= 0, optional, character offset for a long page). Gate: `CLAUDE_CODE_DISABLE_WEB_FETCH=1` turns it off (needs `2.1.285`). | Main session and subagents. Kept in background subagents. | ✅ | ✅ | ✅ | [Tools Reference](https://code.claude.com/docs/en/tools-reference), [Configure Permissions](https://code.claude.com/docs/en/permissions) |
| ✅ 🧪 | `WebSearch` | Searches the web. | `query` (string, min 2, required), `allowed_domains` (string array, optional), `blocked_domains` (string array, optional). Off for `gateway`. Vertex depends on the model. | Main session and subagents. Kept in background subagents. | ✅ | ✅ | ✅ | [Tools Reference](https://code.claude.com/docs/en/tools-reference), [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |
| ✅ | `TaskStop` | Stops a running background task. | `task_id` (string, optional, also takes a teammate or named background agent by ID or name), `shell_id` (string, optional, deprecated). No special gate. | Main session and subagents. Kept in background subagents. | ❌ | ✅ | ✅ | [Tools Reference](https://code.claude.com/docs/en/tools-reference), [Configure Permissions](https://code.claude.com/docs/en/permissions) |
| 🔍 🧪 | `GetTask` | Checks a background shell command by task ID. | `taskId` (string, required). A hidden server-side flag turns it on. | Unknown | ✅ | ✅ | ❌ | Bundle `searchHint:"check on a background shell command by task ID"` |

## Bash Parameters

| Parameter | What It Does | Required |
| --- | --- | --- |
| `command` | The shell command to run. | ✅ |
| `timeout` | Time limit in milliseconds for a foreground command. | ❌ |
| `description` | A short note on what the command does. | ❌ |
| `run_in_background` | Starts the command as a background task and returns at once. | ❌ |
| `dangerouslyDisableSandbox` | Runs the command without the sandbox. | ❌ |
| `allowed_domains` | Network hosts that this command may reach. Offered only when the sandbox network lists are on. | ❌ |
| `machine` | Name of an attached machine to run the call on. Offered only when machines are attached. | ❌ |

`PowerShell` takes the same parameters, except that it has no `allowed_domains` unless the network lists are on.
The source is the `Bash` input schema in the bundle.

## Monitor Parameters

| Parameter | What It Does | Required |
| --- | --- | --- |
| `description` | Short note on what is watched, shown in notifications. | ✅ |
| `command` | Shell command whose output lines become notifications. | ❌ |
| `ws` | WebSocket target to stream. Give exactly one of `command` or `ws`. | ❌ |
| `timeout_ms` | Kills the monitor after this time. At least 1000, with a default and a cap. | ❌ |
| `persistent` | Runs until `TaskStop` or the end of the session, with no timeout. | ❌ |
| `allowed_domains` | Network hosts for a `command` monitor, offered only when the sandbox network lists are on. | ❌ |

The source is the `Monitor` input schema in the bundle.

## Notes

- Background subagents keep `Bash`, `PowerShell`, `Monitor`, `TaskStop`, `WebFetch`, and `WebSearch`.
  The list is in [Subagents](https://code.claude.com/docs/en/sub-agents).
- `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` also disables auto-backgrounding and the `Ctrl+B` key ([Environment Variables](https://code.claude.com/docs/en/env-vars)).
- `CLAUDE_AUTO_BACKGROUND_TASKS` set to a true value gives the `Agent` tool a 120000 ms auto-background time (bundle env name).
  Not in the saved docs.

## See Also

- [Tools Reference](https://code.claude.com/docs/en/tools-reference) is the docs page.
- [Permissions And Sandbox](Claude-Code-Permissions-And-Sandbox) covers `Bash` rules and the sandbox.
