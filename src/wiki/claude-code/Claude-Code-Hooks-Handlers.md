# Claude Code Hooks: Handlers

A handler is the part of a hook that does the work.
It can run a command, call a URL, call an MCP tool, ask a model, or start a subagent, and its `type` key picks which one.
For example, `{"type": "command", "command": "./check.sh"}` runs a script.

## Handler Types

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `command` | Runs a shell command or an executable | Input on stdin. Result by exit code, stdout, stderr | All 33 events | [Hooks Reference][hr], bundle `BashCommandHookSchema` |
| ✅ | `http` | POSTs the input as JSON to a URL | Result by the response body. Needs a 2xx status | 31 events, not `SessionStart`, not `Setup` | [Hooks Reference][hr], `HttpHookSchema` |
| ✅ | `mcp_tool` | Calls a tool on a configured MCP server | The text result is read like stdout. `isError: true` is a non-blocking error | 33 events, but skipped on `Setup` and on `SessionStart` at launch | [Hooks Reference][hr], `McpToolHookSchema` |
| ✅ | `prompt` | One LLM call that returns `ok` | Default model is the small fast model. See below | 12 events plus `PermissionRequest` | [Hooks Reference][hr], `PromptHookSchema` |
| ✅ | `agent` | A subagent that checks a condition | Up to 50 turns. Experimental. Docs say it may change | 12 events, not `PermissionRequest` | [Hooks Reference][hr], `AgentHookSchema` |
| 🔍 | `callback` | A function that an SDK host or a mod registers | The bundle builds it as `{type:"callback", callback, timeout}`. It is not a config key | Events that run device hooks | bundle `type:"callback"` |
| 🧪 | `script` | An internal handler with a `file` field | Bundle error: `script hooks are not available in this build`. Env `CLAUDE_SCRIPT_HOOK_ACK` | Not for users | bundle |
| ⚠️ | `script` | A hook type that some text names | `2.1.303` rejects it with `Unknown hook type "script"`. A `script` entry under `PreToolUse` also disables the whole settings file. See [Probes](Claude-Code-Probes). | Do not use | probe |

The 12 events of `prompt` and `agent` are `PermissionDenied`, `PostToolBatch`, `PostToolUse`, `PostToolUseFailure`, `PreToolUse`, `Stop`, `SubagentStop`, `TaskCompleted`, `TaskCreated`, `TeammateIdle`, `UserPromptExpansion`, and `UserPromptSubmit`.
A `prompt` hook on `PermissionRequest` works and an `agent` hook there is skipped.
`SessionStart` and `Setup` accept `command` and `mcp_tool` only.

## Common Fields

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `type` | Picks the handler kind | One of `command`, `http`, `mcp_tool`, `prompt`, `agent` | All handlers | [Hooks Reference][hr] |
| ✅ | `if` | One permission rule that filters the handler | Only tool events read it. See [Config](Claude-Code-Hooks-Config) | All handlers, tool events | [Hooks Reference][hr] |
| ✅ | `timeout` | Seconds before cancel | Positive number. Defaults are in [Config](Claude-Code-Hooks-Config) | All handlers | [Hooks Reference][hr] |
| ✅ | `statusMessage` | Spinner text while the hook runs | A string | All handlers | [Hooks Reference][hr] |
| ✅ | `once` | Remove the hook after the first successful run | A failure, exit 2, or timeout keeps it. Honored only in skill frontmatter | All handlers | [Hooks Reference][hr] |

## Command Fields

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `command` | The command string, or the executable when `args` is set | Shell form uses `sh -c`, Git Bash, or PowerShell | `command` | [Hooks Reference][hr] |
| ✅ | `args` | Argument list for exec form | No shell. Placeholders are replaced in `command` and in each element | `command` | [Hooks Reference][hr] |
| ✅ | `shell` | `bash` or `powershell` | Ignored when `args` is set | `command` | [Hooks Reference][hr] |
| ✅ | `async` | Run in the background | Not enforced by `timeout`. Cannot block. Output arrives on the next turn | `command` | [Hooks Reference][hr] |
| ✅ | `asyncRewake` | Background run that wakes the model on exit 2 | stderr, or stdout if stderr is empty, becomes a system reminder. `timeout` still applies. Implies `async` | `command` | [Hooks Reference][hr], bundle |
| ✅ | `onFailure` | `continue` or `block` | Needs 2.1.295. See [Config](Claude-Code-Hooks-Config) | `command`, `http` | [Hooks Reference][hr] |
| 🔍 | `rewakeMessage` | Custom prefix of the system reminder for `asyncRewake` | An internal field | `command` | bundle `BashCommandHookSchema` |
| 🔍 | `rewakeSummary` | One-line user summary for `asyncRewake` | An internal field. Default text is `Stop hook feedback` | `command` | bundle `BashCommandHookSchema` |
| 🔍 | `cloud` | `device` or `skip` for cloud sessions that this machine drives | An internal field. An unknown value reads as `skip` | `command`, `http` | bundle schema |

## HTTP Fields

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `url` | The POST target | Must pass `allowedHttpHookUrls` when that setting exists | `http` | [Hooks Reference][hr] |
| ✅ | `headers` | Extra headers | `$VAR` and `${VAR}` are replaced only for names in `allowedEnvVars` | `http` | [Hooks Reference][hr] |
| ✅ | `allowedEnvVars` | Names that may be replaced in headers | Other references become empty strings. `httpHookAllowedEnvVars` narrows it | `http` | [Hooks Reference][hr] |

## MCP Tool Fields

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `server` | Name of a configured MCP server | Plugin servers use `plugin:<plugin>:<server>` | `mcp_tool` | [Hooks Reference][hr] |
| ✅ | `tool` | Tool to call | A string | `mcp_tool` | [Hooks Reference][hr] |
| ✅ | `input` | Tool arguments | String values accept `${path}` from the hook input, such as `${tool_input.file_path}` | `mcp_tool` | [Hooks Reference][hr] |

On events that can block, Claude Code waits for a server that is still connecting.
The wait is at most `MCP_TIMEOUT` and the hook `timeout`.
On observer events, it does not wait.

## Prompt and Agent Fields

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `prompt` | The text to evaluate | `$ARGUMENTS` is replaced by the input JSON. Without it, the JSON is appended | `prompt`, `agent` | [Hooks Reference][hr] |
| ⚠️ | `model` | Model for the check | Docs: the default is the background model for both types. Bundle: the agent default is Haiku | `prompt`, `agent` | [Hooks Reference][hr], bundle |
| ✅ | `continueOnBlock` | Feed an `ok: false` reason to Claude and go on | Default `false`. Agent hooks always act as if `true` | `prompt` | [Hooks Reference][hr] |
| ✅ | `ok` (model reply) | `true` allows. `false` blocks | Per-event effect of `false` is in the docs section Response schema | `prompt`, `agent` | [Hooks Reference][hr] |
| ✅ | `reason` (model reply) | Why it blocked | Required when `ok` is `false` | `prompt`, `agent` | [Hooks Reference][hr] |
| ✅ | `impossible` (model reply) | The condition can never be met | On `Stop` and `SubagentStop` the turn ends. Agents ignore it | `prompt` | [Hooks Reference][hr], bundle string `judged impossible` |

## Sources

- [Hooks Reference][hr].
- Bundle: the handler schema for `command`, `prompt`, `mcp_tool`, `http`, and `agent`.

## Not Yet Checked

- The `script` type is rejected in `2.1.303`, so no `script` hook runs ([Probes](Claude-Code-Probes)).
- Not verified: the `callback` forwarding rules for cloud sessions.

## See Also

- [Hooks](Claude-Code-Hooks), with the legend of marks
- [Config](Claude-Code-Hooks-Config)
- [Output](Claude-Code-Hooks-Output)

[hr]: https://code.claude.com/docs/en/hooks
