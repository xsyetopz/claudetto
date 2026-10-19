# Claude Code Hooks: Agent and Task Events

These events tell your hooks when a subagent, a task, or a teammate starts, stops, or goes idle.
The events are `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, and `TeammateIdle`.
For example, a `SubagentStop` hook can keep a subagent at work until its tests pass.

## SubagentStart

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `SubagentStart` | Fires when a subagent spawns or resumes, and for each message of an in-process teammate | Matcher is the agent type. Cannot block. Exit 2 shows stderr in the subagent transcript only | `command`, `http`, `mcp_tool` | [Hooks Reference][hr], `SubagentStartHookInput` |
| ✅ | `agent_id`, `agent_type` | The subagent ID and type | A plugin agent type is `my-plugin:reviewer`. Anchor the matcher with `^` and `$` | stdin | [Hooks Reference][hr] |
| ✅ | `additionalContext` | Context for the subagent before its first prompt | On a repeat run it is added only if the earlier copy is gone, to keep the cache | `hookSpecificOutput` | [Hooks Reference][hr] |

## SubagentStop

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `SubagentStop` | Fires when a subagent finishes | Matcher is the agent type. Exit 2 or `decision: "block"` keeps it running, and `reason` is its next instruction | All five handler types | [Hooks Reference][hr], `SubagentStopHookInput` |
| ✅ | `stop_hook_active`, `last_assistant_message`, `background_tasks`, `session_crons` | As in `Stop` | The two arrays are scoped to the parent session | stdin | [Hooks Reference][hr] |
| ✅ | `agent_id`, `agent_type` | Subagent ID and type | `agent_type` can be empty for internal agents, such as prompt suggestions and `/btw`. A named matcher does not match empty | stdin | [Hooks Reference][hr] |
| ✅ | `agent_transcript_path` | The subagent transcript | In a nested `subagents/` folder. `transcript_path` is the main one | stdin | [Hooks Reference][hr] |
| ✅ | `additionalContext` | Non-error feedback that keeps the subagent running | Same loop guards as `Stop` | `hookSpecificOutput` | [Hooks Reference][hr] |

## TaskCreated

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `TaskCreated` | Fires when `TaskCreate` makes a task | No matcher. Not in a session without the Task tools. Exit 2 or `decision: "block"` deletes the task and gives the message to Claude. `continue: false` is ignored | All five handler types | [Hooks Reference][hr], `TaskCreatedHookInput` |
| ✅ | `task_id`, `task_subject` | Task ID and title | | stdin | [Hooks Reference][hr] |
| ✅ | `task_description`, `teammate_name` | Optional detail and creator | May be absent | stdin | [Hooks Reference][hr] |
| ✅ | `team_name` | Session team name | Deprecated, to be removed | stdin | [Hooks Reference][hr], d.ts |
| ✅ | `agent_id` | The creating subagent or teammate | Needs 2.1.290. May be absent | stdin | [Hooks Reference][hr] |

## TaskCompleted

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `TaskCompleted` | Fires when a task is marked done, or a teammate ends its turn with open tasks | No matcher. Exit 2 keeps the task open and stderr goes to the model. `continue: false` stops a teammate and is ignored for `TaskUpdate` | All five handler types | [Hooks Reference][hr], `TaskCompletedHookInput` |
| ✅ | `task_id`, `task_subject`, `task_description`, `teammate_name` | As in `TaskCreated` | | stdin | [Hooks Reference][hr] |
| ✅ | `team_name`, `agent_id` | Deprecated team name. Acting agent | `agent_id` needs 2.1.290 | stdin | [Hooks Reference][hr] |

## TeammateIdle

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `TeammateIdle` | Fires when an agent team teammate is about to go idle | No matcher. Exit 2 gives stderr to the teammate and it keeps working. `continue: false` stops it | All five handler types | [Hooks Reference][hr], `TeammateIdleHookInput` |
| ✅ | `teammate_name`, `team_name` | Teammate and deprecated team name | | stdin | [Hooks Reference][hr] |
| ✅ | `agent_id` | The in-process teammate | Needs 2.1.290. May be absent | stdin | [Hooks Reference][hr] |

## Sources

- [Hooks Reference][hr], [Create Custom Subagents][sa].
- d.ts types `SubagentStartHookInput`, `SubagentStopHookInput`, `TaskCreatedHookInput`, `TaskCompletedHookInput`, `TeammateIdleHookInput`.

## Not Yet Checked

- Not verified: the effect of `onFailure` on `TaskCompleted` and `TeammateIdle`.
  The bundle says it is ignored on both.
  See [Config](Claude-Code-Hooks-Config).

## See Also

- [Hooks](Claude-Code-Hooks), with the legend of marks
- [Subagents](Claude-Code-Subagents)
- [Config](Claude-Code-Hooks-Config)

[hr]: https://code.claude.com/docs/en/hooks
[sa]: https://code.claude.com/docs/en/sub-agents
