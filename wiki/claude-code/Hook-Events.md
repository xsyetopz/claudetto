# Hook Events

This page lists the hook events of Claude Code.
It explains how a plugin registers a hook for them, and how the 11 dotclaude events map to them.
Read it if you write or test a hook.
The page also states how a hook fails.
The architecture of the plugin is in [Architecture](Architecture).

## Sources and Version

- The event names and payload fields come from the type file `.claude-plugin/types/claude-code/index.d.ts`.
  Claude Code `2.1.289` wrote that file, not `2.1.296`.
- The 33 event names are also in the `2.1.296` binary.
  A search of the extracted strings of the binary (`external/cc-2.1.296/strings.txt`) found them.
  Each name appears next to the `hook_event_name` field that the binary builds for the payload.
  This search shows that the names exist in `2.1.296`.
  It does not show when each event fires, or which output field each event reads, in `2.1.296`.
- The output fields of a hook, such as `worktreePath` and `updatedToolOutput`, also appear in the `2.1.296` binary.
- The blocking fields of each event for `2.1.296` are not settled.
  The table below uses the `2.1.289` type file for them.
- The "When it fires" column comes from the event name and the payload.
  Where the type file has a doc comment, the column follows that comment.
  The other values in this column are inference.

## The 33 Claude Code Events

Each hook input has these base fields: `session_id`, `transcript_path`, `cwd`, `prompt_id`, `permission_mode`, `agent_id`, `agent_type`, and `effort`.
Each event can return these base fields: `block`, `preventContinuation`, and `stopReason`.
A command hook blocks with exit code `2`, which the type file names as `decision: "block"`.
The "Returns" column lists only the fields that an event adds to the base fields.

| Event | When it fires | Main payload fields | Returns |
| --- | --- | --- | --- |
| `ConfigChange` | A settings or skills file changes. | `source`, `file_path` | Base only. |
| `CwdChanged` | The working directory changes. | `old_cwd`, `new_cwd` | Base only. |
| `DirectoryAdded` | A directory joins the session. | `directory`, `source` | Base only. |
| `Elicitation` | An MCP server asks the user for input. | `mcp_server_name`, `message`, `mode`, `url`, `requested_schema` | Base only. The doc comment says a hook can answer, but the type has no field for the answer. |
| `ElicitationResult` | The user answers an MCP elicitation. | `mcp_server_name`, `action`, `content` | Base only. The doc comment says a hook can change the answer, but the type has no field for it. |
| `FileChanged` | A watched file changes. | `file_path`, `event` | Base only. |
| `InstructionsLoaded` | An instruction file loads. | `file_path`, `memory_type`, `load_reason`, `globs` | Base only. |
| `MessageDisplay` | A streamed assistant message gets new lines. Show only. | `turn_id`, `message_id`, `index`, `final`, `delta` | `displayContent`. |
| `Notification` | Claude Code sends a notification. | `message`, `title`, `notification_type` | Base only. |
| `PermissionDenied` | The permission flow denies a tool call. | `tool_name`, `tool_input`, `tool_use_id`, `reason` | `retry`. |
| `PermissionRequest` | The permission prompt is about to show. | `tool_name`, `tool_input`, `permission_suggestions` | `decision`. |
| `PostCompact` | A compaction ends. | `trigger`, `compact_summary` | Base only. |
| `PostModelSwitch` | A model switch ends. | `from_model`, `to_model`, `source`, `context_tokens`, `cache_ttl` | Base only. |
| `PostToolBatch` | Once, after every tool call of a batch resolves, before the next model request. | `tool_calls` | Base only. |
| `PostToolUse` | A tool call ends with a result. | `tool_name`, `tool_input`, `tool_response`, `tool_use_id`, `duration_ms` | `updatedToolOutput`, `updatedMCPToolOutput`. |
| `PostToolUseFailure` | A tool call fails. | `tool_name`, `tool_input`, `tool_use_id`, `error`, `is_interrupt` | Base only. |
| `PreCompact` | A compaction starts. | `trigger`, `custom_instructions` | Base only. |
| `PreModelSwitch` | A model switch is about to start. | `from_model`, `to_model`, `requested_model`, `source`, `context_tokens` | `permissionDecision` (`allow`, `deny`, or `ask`), `permissionDecisionReason`. |
| `PreToolUse` | A tool call is about to run. | `tool_name`, `tool_input`, `tool_use_id` | `allow`, `ask`, or `deny` with a reason, and `updatedInput`. |
| `SessionEnd` | The session ends. | `reason` | Base only. |
| `SessionStart` | The session starts. | `source` (`startup`, `resume`, `clear`, `compact`, or `fork`), `model`, `session_title` | `additionalContext`, `sessionTitle`, `initialUserMessage`, `watchPaths`, `reloadSkills`. |
| `Setup` | Setup runs. | `trigger` (`init` or `maintenance`) | `additionalContext`. |
| `StopFailure` | A turn ends with an API error. | `error`, `error_details`, `last_assistant_message` | Base only. |
| `Stop` | The main agent ends its response. | `stop_hook_active`, `last_assistant_message` | `additionalContext`. |
| `SubagentStart` | A subagent is about to start. | `agent_id`, `agent_type` | `additionalContext`. |
| `SubagentStop` | A subagent ends. | `agent_id`, `agent_transcript_path`, `agent_type`, `last_assistant_message` | `additionalContext`. |
| `TaskCompleted` | A task completes. | `task_id`, `task_subject`, `teammate_name`, `team_name` | Base only. |
| `TaskCreated` | A task is created. | `task_id`, `task_subject`, `teammate_name`, `team_name` | Base only. |
| `TeammateIdle` | A teammate goes idle. | `teammate_name`, `team_name` | Base only. |
| `UserPromptExpansion` | A slash command or an MCP prompt expands. | `expansion_type`, `command_name`, `command_args`, `prompt` | `additionalContext`, `suppressOriginalPrompt`. |
| `UserPromptSubmit` | The user submits a prompt. | `prompt`, `source`, `session_title` | `additionalContext`, `sessionTitle`, `suppressOriginalPrompt`. |
| `WorktreeCreate` | A git worktree is created. | `name` | `worktreePath`. |
| `WorktreeRemove` | A git worktree is removed. | `worktree_path` | Base only. |

## The 11 dotclaude Events

The dotclaude hooks module handles 11 events of its own.
The `slice.ts` files of `src/plugins/dotclaude/slices/` declare them, not `src/kernel/`.
No source uses `prompt.attachment`, although the type file names it.

The map below relates each dotclaude event to a Claude Code event.
The relation is by the time of firing, which the type file describes.
It is not a one-to-one equivalent.
So the match is "partial" or "none" when the events differ.

| dotclaude event | Declared in | Claude Code event | Match |
| --- | --- | --- | --- |
| `session.start` | `decide`, `setup` | `SessionStart` | Partial. The dotclaude event runs once for each plugin load, before the first prompt. |
| `tool.call` | `decide`, `guard`, `sembr`, `handoff` | `PreToolUse` | Partial. The dotclaude event runs the `PreToolUse` hooks beneath it. |
| `tool.check` | `asks`, `guard` | `PermissionRequest` | Partial. The dotclaude event runs after `PreToolUse`, before the mode settles an ask. |
| `prompt.compose` | `prompt` | none | None. |
| `prompt.section` | `prompt` | none | None. |
| `agent.spawn` | `prompt`, `spec` | `SubagentStart` | Partial. The dotclaude event can deny a subagent, and `SubagentStart` returns only `additionalContext`. |
| `agent.offer` | `surface` | none | None. |
| `tool.describe` | `surface` | none | None. |
| `turn.complete` | `spec`, `handoff` | `Stop` | Partial. |
| `turn.step` | `handoff` | none | None. It runs before each model request. |
| `skill.prompt` | `handoff` | `UserPromptExpansion` | Partial. `expansion_type` names slash commands and MCP prompts, not skills. |

## Registration Kinds

A plugin registers a hook in one of two ways.

### Hooks Module

A hooks module is a file, such as `hooks/register.ts`, that Claude Code runs in its own mod runtime.
The `hooks.json` file names it with `modules`, for example `{"modules": ["./register.ts"]}`.
The module handles the dotclaude events and the mod events of the type file, with `on`.
The type file gives this form as an example: `on("tool.check", { tool: "Read" }, handler)`.
The module must not import `node:` or `bun:`.
It must not use `Bun`, because Claude Code runs it with neither Node.js nor Bun.
The rule is in `.claude/rules/hooks-module.md`.

### Command Hook

A command hook is an entry under `hooks` in `hooks.json`.
The entry is keyed by a Claude Code event name.
Each entry has a `type` of `command`, a `command`, and a `timeout` in seconds.
It can also have a `matcher` and an `async` flag.
The `dotclaude-codegraph` plugin uses this form.
For example, it uses it for `SessionStart` with `bun --no-env-file` and a script path under `${CLAUDE_PLUGIN_ROOT}`.

The command reads the event payload as JSON from stdin.
It writes a JSON object to stdout with a `hookSpecificOutput` field.
The shared glue in `src/kernel/node/hook-io.ts` writes the fields `permissionDecision`, `permissionDecisionReason`, `updatedInput`, and `additionalContext`.
A command hook needs Bun on `PATH` for the `bun` command.

## Fail-Open Rule

A dotclaude hook fails open.
On an error, the call goes on.
The permission rules and the sandbox still apply.
This follows the design in [Decisions](Decisions) (D31).

- For a command hook, the glue in `src/kernel/node/hook-io.ts` prints nothing on stdout for a payload that is not JSON.
  For any other error, it prints nothing on stdout.
  It writes the error to stderr, and it exits with code `0`.
  A hook that crashes never blocks a call.
- For a hooks module, no source sets `onFailure`, so the default applies.
  The `2.1.296` binary names an `onFailure` option with the values `continue`, `refuse`, and `block`.
  The default is `continue`.
  This run did not tie that option to hooks, so the Claude Code side of this rule is not checked.
- The timeout of a hook is set by its `timeout` entry.
  Without that entry, the default of Claude Code applies.

## Test the Hooks

- `just lab` runs `claude plugin test` on each plugin that has a `tests/` folder.
  The run stops at the first plugin that fails.
- `just test` runs `bun test` with the arguments that you give it.
- See [Development](Development) for the other checks.

## Related Pages

- [Plugin Loader](Plugin-Loader)
- [Architecture](Architecture)
