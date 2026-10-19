# Claude Code Hooks: Input and Output

Each hook gets a JSON description of what happened, and it answers with an exit code or a JSON reply.
The answer tells Claude Code to go on, to block, or to add context.
For example, exit code 2 with a message on `stderr` blocks a `PreToolUse` call and tells Claude why.

## Common Input Fields

A command hook reads this JSON on stdin.
An HTTP hook gets it as the POST body.

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `session_id` | Session identifier | A string | All events | [Hooks Reference][hr], `BaseHookInput` |
| ✅ | `transcript_path` | Path to the conversation JSONL | Written async, so it can lag. Use `last_assistant_message` on `Stop` | All events | [Hooks Reference][hr], `BaseHookInput` |
| ✅ | `cwd` | Working directory when the hook runs | Follows `cd` and worktrees | All events | [Hooks Reference][hr], `BaseHookInput` |
| ✅ | `prompt_id` | UUID of the prompt in progress | Equals `prompt.id` in OpenTelemetry events. Absent before the first input | All events | [Hooks Reference][hr], `BaseHookInput` |
| ⚠️ | `scratchpad_dir` | The session scratchpad directory | Needs 2.1.257. In the docs and in the bundle string list. Missing from `BaseHookInput` in the d.ts | Most events | [Hooks Reference][hr], bundle |
| ✅ | `permission_mode` | `default`, `plan`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions` | **Manual** is sent as `default`. Not on every event | Some events | [Hooks Reference][hr], `BaseHookInput` |
| ✅ | `effort` | Object `{level}` with `low`, `medium`, `high`, `xhigh`, `max` | Only in tool-use context and when the model supports effort | Tool events, `Stop`, `SubagentStop` | [Hooks Reference][hr], `BaseHookInput` |
| ✅ | `hook_event_name` | Name of the event | In the d.ts it is a literal on each event type, not on `BaseHookInput` | All events | [Hooks Reference][hr], `HookInput` |
| ✅ | `agent_id` | Subagent or in-process teammate that the hook fires in | Absent on the main thread. On task and teammate events it names the actor (2.1.290) | Inside subagents | [Hooks Reference][hr], `BaseHookInput` |
| ✅ | `agent_type` | Agent name | Set in a subagent, or on the main thread with `--agent` | Inside subagents, `--agent` | [Hooks Reference][hr], `BaseHookInput` |
| ✅ | `mcp_server` | Object `{name, source}` of an MCP tool | Needs 2.1.274. `source` is an open set: `sdk`, `plugin`, `user`, `project`, `local`, `dynamic`, `managed`, `enterprise`, `claudeai`, `agent` | MCP tool events | [Hooks Reference][hr], `McpServerProvenance` |

## Universal Output Fields

A hook prints one JSON object to stdout and exits 0.
Every event accepts these keys.
Some events drop them, and the event pages say so.

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `continue` | `false` stops Claude after the hook | Beats event decisions. Ignored by `TaskCreated`, and by `TaskCompleted` from `TaskUpdate` | Most events | [Hooks Reference][hr] |
| ✅ | `stopReason` | Message when `continue` is `false` | Stays in the conversation | Most events | [Hooks Reference][hr] |
| ❌ | `suppressOutput` | Accepted and not acted on | Stdout of a good hook is never shown in the transcript | Schema only | [Hooks Reference][hr], bundle schema |
| ✅ | `systemMessage` | Warning for the user | Some events drop it or send it to another place | Most events | [Hooks Reference][hr] |
| ✅ | `terminalSequence` | An escape sequence that Claude Code writes for you | Allowed: OSC `0`, `1`, `2`, `9`, `99`, `777` and BEL. Only in interactive mode. Works on events that drop other fields | All events but `WorktreeCreate` command hooks | [Hooks Reference][hr] |
| ⚠️ | `decision` | Top-level block | Docs: only `"block"`. Bundle enum: `approve` or `block` for any event. On `PreToolUse` both are deprecated and map to `allow` and `deny` | See the decision table | [Hooks Reference][hr], bundle |
| ✅ | `reason` | Text for the block | Seen by the user or by Claude, by event | With `decision` | [Hooks Reference][hr] |
| ✅ | `hookSpecificOutput` | Event-specific object | Needs `hookEventName` set to the event name | Events in the table below | [Hooks Reference][hr] |
| 🔍 | `{"async":true,"asyncTimeout":n}` | A first reply that moves the hook to the background | See [Config](Claude-Code-Hooks-Config) | Command hooks | bundle |
| ✅ | 10,000 character cap | Applies to `additionalContext`, `systemMessage`, `initialUserMessage`, and plain stdout | Each string alone. Over the cap: saved to a file, the model gets the path and 2,000 characters | All events | [Hooks Reference][hr] |

## Decision Patterns

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | Top-level `decision: "block"` | Blocks | `reason` is the message | `UserPromptSubmit`, `UserPromptExpansion`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `Stop`, `SubagentStop`, `ConfigChange`, `PreCompact`, `TaskCreated` | [Hooks Reference][hr] |
| ✅ | `hookSpecificOutput.permissionDecision` | `allow`, `deny`, `ask`, `defer` | `defer` only in `-p` | `PreToolUse` (`PreModelSwitch` has no `defer`) | [Hooks Reference][hr] |
| ✅ | `hookSpecificOutput.decision.behavior` | `allow` or `deny` | Needs a `decision` object | `PermissionRequest` | [Hooks Reference][hr] |
| ✅ | `continue: false` or exit 2 | Stops the teammate | | `TeammateIdle`, `TaskCompleted` | [Hooks Reference][hr] |
| ✅ | Path return | Command prints the path. HTTP returns `worktreePath` | Failure fails the creation | `WorktreeCreate` | [Hooks Reference][hr] |
| ✅ | Context only | `additionalContext` | No block | `SessionStart`, `SubagentStart`, `PostModelSwitch`, `Setup`, `Notification` | [Hooks Reference][hr], `ClassicResultFields` |
| ✅ | None | Side effects only | | `SessionEnd`, `PostCompact`, `InstructionsLoaded`, `StopFailure`, `CwdChanged`, `DirectoryAdded`, `FileChanged`. The last two still return `watchPaths` | [Hooks Reference][hr] |

## Exit Codes

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | Exit 0 | Success | Claude Code reads JSON from stdout. Plain stdout becomes context only on `UserPromptSubmit`, `UserPromptExpansion`, `SessionStart`, `PostModelSwitch`. Stderr is not shown to Claude | All events | [Hooks Reference][hr] |
| ✅ | Exit 2 | Blocking error on events that can block | stderr is the reason. JSON fields are read but cannot override the block. `Elicitation` ignores them | See the list below | [Hooks Reference][hr] |
| ✅ | Any other exit | Non-blocking error | Action goes on. The notice has the first line of stderr. JSON on stdout can still decide | All events | [Hooks Reference][hr] |
| ✅ | Exit 1 | Not a block | Use exit 2 for policy | All events | [Hooks Reference][hr] |
| ✅ | Invalid JSON | Non-blocking error | The rules for one object, text, and several JSON lines are in the docs section Exit code 0 | All events | [Hooks Reference][hr] |
| ✅ | Exit 2 blocks | Block the action | `PreToolUse`, `UserPromptSubmit`, `UserPromptExpansion`, `Stop`, `SubagentStop`, `TeammateIdle`, `TaskCreated`, `TaskCompleted`, `ConfigChange` (not `policy_settings`), `PostToolBatch`, `PreCompact`, `PreModelSwitch`, `Elicitation`, `ElicitationResult` | Those events | [Hooks Reference][hr] |
| ✅ | Exit 2 fails | Fail the step | `WorktreeCreate` always. `WorktreeRemove` if the dir still exists | Those events | [Hooks Reference][hr] |
| ✅ | Exit 2 shows stderr | No block | To Claude on `PostToolUse` and `PostToolUseFailure`. To the user on `SubagentStart`, `SessionStart`, `SessionEnd`, `CwdChanged`, `FileChanged`, `PostCompact`, `PostModelSwitch` | Those events | [Hooks Reference][hr] |
| ✅ | Exit 2 ignored | No effect | `PermissionRequest`, `PermissionDenied`, `Notification`, `Setup`, `StopFailure`, `InstructionsLoaded`, `MessageDisplay`, `DirectoryAdded` (stderr to debug log) | Those events | [Hooks Reference][hr] |

## HTTP Responses

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | 2xx with an empty body | Success | Same as exit 0 with no output | `http` | [Hooks Reference][hr] |
| ✅ | 2xx with a JSON object | Parsed like command JSON | A body that fails validation is a non-blocking error | `http` | [Hooks Reference][hr] |
| ✅ | 2xx with other text, non-2xx, connection error | Non-blocking error | Text is not added to context. `onFailure: "block"` blocks | `http` | [Hooks Reference][hr] |

## Sources

- [Hooks Reference][hr], `BaseHookInput`, `McpServerProvenance`, `ClassicResult`, `ClassicResultFields`.
- Bundle: the hook output schema with `continue`, `suppressOutput`, `stopReason`, and `decision`.

## Not Yet Checked

- Not verified: the exact event list for which the bundle honors `continue` and `systemMessage`.

## See Also

- [Hooks](Claude-Code-Hooks), with the legend of marks
- [Config](Claude-Code-Hooks-Config)
- [Tool Events](Claude-Code-Hooks-Events-Tool)

[hr]: https://code.claude.com/docs/en/hooks
