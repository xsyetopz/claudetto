# Claude Code Hooks: Prompt and Turn Events

These events fire around a turn: when you send a prompt, while text shows, when Claude Code sends a notification, and when Claude stops.
The events are `UserPromptSubmit`, `UserPromptExpansion`, `MessageDisplay`, `Notification`, `Stop`, and `StopFailure`.
For example, a `UserPromptSubmit` hook can add the current git branch to each prompt.

## UserPromptSubmit

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `UserPromptSubmit` | Fires when a prompt is submitted, before Claude reads it | No matcher. Also fires for scheduled tasks, background subagent reports, and cross-session messages. Default timeout 30 s. Exit 2 blocks the prompt. Plain stdout is added as context | All five handler types | [Hooks Reference][hr], `UserPromptSubmitHookInput` |
| ✅ | `prompt` | The text | A typed `/skill` arrives as typed, not expanded. Pasted text arrives expanded | stdin | [Hooks Reference][hr] |
| 🔍 | `source` | Who made the prompt | `user`, `sdk`, `system`, `loop_wakeup`, `schedule_wakeup`, `poll_event`. May be missing. The docs input section does not list it | stdin | `UserPromptSubmitHookInput`, bundle hook field table |
| ✅ | `session_title` | Custom title | Only when one is set | stdin | [Hooks Reference][hr] |
| ✅ | `decision`, `reason` | `block` stops the prompt | `reason` is shown to the user and not added to context | stdout | [Hooks Reference][hr] |
| ✅ | `additionalContext` | Context next to the prompt | | `hookSpecificOutput` | [Hooks Reference][hr] |
| ✅ | `sessionTitle` | Sets the title | | `hookSpecificOutput` | [Hooks Reference][hr] |
| ✅ | `suppressOriginalPrompt` | Leaves the prompt text out of the block message | Else the block message ends with `Original prompt:` and is written to the transcript | `hookSpecificOutput` | [Hooks Reference][hr] |

## UserPromptExpansion

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `UserPromptExpansion` | Fires when a typed command expands into a prompt | Matcher is `command_name`. Covers `/skill` typing, which skips `PreToolUse`. Exit 2 blocks. Plain stdout is context | All five handler types | [Hooks Reference][hr], `UserPromptExpansionHookInput` |
| ✅ | `expansion_type` | `slash_command` or `mcp_prompt` | | stdin | [Hooks Reference][hr] |
| ✅ | `command_name`, `command_args`, `prompt` | The command parts and the raw line | | stdin | [Hooks Reference][hr] |
| ✅ | `command_source` | Where the command came from, such as `plugin` | Optional | stdin | [Hooks Reference][hr] |
| ✅ | `decision`, `reason` | `block` stops the expansion | | stdout | [Hooks Reference][hr] |
| ✅ | `additionalContext`, `suppressOriginalPrompt` | As in `UserPromptSubmit` | | `hookSpecificOutput` | [Hooks Reference][hr] |

## MessageDisplay

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `MessageDisplay` | Fires while assistant text streams, once for each batch of finished lines | No matcher. Timeout 10 s. Display only: the transcript and Claude keep the original. In `-p` it runs once with the full text | `command`, `http`, `mcp_tool` | [Hooks Reference][hr], `MessageDisplayHookInput` |
| ✅ | `turn_id`, `message_id` | UUIDs of the turn and message | `message_id` is stable for the whole message | stdin | [Hooks Reference][hr] |
| ✅ | `index`, `final` | Position of the batch. `final` is true on the last | | stdin | [Hooks Reference][hr] |
| ✅ | `delta` | The new lines | Whole lines, except the final batch | stdin | [Hooks Reference][hr] |
| ✅ | `displayContent` | Text shown in place of `delta` | If the hook fails, the original shows. `systemMessage` and `continue` are dropped | `hookSpecificOutput` | [Hooks Reference][hr] |

## Notification

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `Notification` | Fires when Claude Code sends a notification | Matcher is the type. Runs even if desktop notifications are off. Exit code and stderr are ignored. `terminalSequence` still works | `command`, `http`, `mcp_tool` | [Hooks Reference][hr], `NotificationHookInput` |
| ✅ | `message`, `title`, `notification_type` | The text, an optional title, and the type | | stdin | [Hooks Reference][hr] |
| ✅ | `permission_prompt`, `idle_prompt` | A prompt waited about 6 s. Idle for about 60 s | Both depend on typing and on running agents | Type | [Hooks Reference][hr] |
| ✅ | `auth_success`, `elicitation_dialog`, `elicitation_url_dialog`, `elicitation_complete`, `elicitation_response` | Auth done and MCP elicitation steps | The two dialog types wait 6 s | Type | [Hooks Reference][hr] |
| ✅ | `agent_needs_input`, `agent_completed` | Background session events in agent view | `agent_needs_input` for a teammate setup question needs 2.1.248 | Type | [Hooks Reference][hr] |
| ✅ | `quota_auto_resume_fired`, `quota_auto_resume_stale`, `quota_auto_resume_disabled` | Usage limit wait events | Need 2.1.234 | Type | [Hooks Reference][hr] |
| 🔍 | `auth_storage_failure`, `computer_use_enter`, `computer_use_exit`, `plugin_notification`, `push_notification`, `worker_permission_prompt` | Other values passed as `notificationType` in the bundle | `plugin_notification` comes from the mod call `$.ui.notify`. Whether each reaches a hook is not verified | Type | bundle |

## Stop

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `Stop` | Fires when the main agent finishes. Not on a user interrupt | No matcher. Exit 2 or `decision: "block"` keeps Claude working. Cap: 8 continuations in a row, set by `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` | All five handler types | [Hooks Reference][hr], `StopHookInput` |
| ✅ | `stop_hook_active` | `true` when a stop hook already continued the turn | Check it to avoid loops | stdin | [Hooks Reference][hr] |
| ✅ | `last_assistant_message` | Text of the final reply | Prefer it over the transcript | stdin | [Hooks Reference][hr] |
| ✅ | `background_tasks` | In-flight tasks | Entries: `id`, `type`, `status`, `description`, and `command`, `agent_type`, `server`, `tool`, `name` by type. Text cap 1000 | stdin | [Hooks Reference][hr], `BackgroundTaskSummary` |
| ✅ | `session_crons` | Scheduled wakeups | Entries: `id`, `schedule`, `recurring`, `prompt` | stdin | [Hooks Reference][hr], `SessionCronSummary` |
| ✅ | `decision`, `reason` | `block` stops Claude from stopping | `reason` is required. It is the next instruction | stdout | [Hooks Reference][hr] |
| ✅ | `additionalContext` | Feedback that keeps the turn going | Labeled `Stop hook feedback`, not an error | `hookSpecificOutput` | [Hooks Reference][hr] |

## StopFailure

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `StopFailure` | Fires instead of `Stop` when the turn ends on an API error | Matcher is `error`. Output and exit code are ignored, but `terminalSequence` works | `command`, `http`, `mcp_tool` | [Hooks Reference][hr], `StopFailureHookInput` |
| ⚠️ | `error` | The error type | The docs list 12 values. The type `SDKAssistantMessageError` also has `verification_required` | stdin | [Hooks Reference][hr], d.ts |
| ✅ | `error_details` | More detail | Optional | stdin | [Hooks Reference][hr] |
| ✅ | `last_assistant_message` | The rendered API error text | Not Claude's words, unlike `Stop` | stdin | [Hooks Reference][hr] |

## Sources

- [Hooks Reference][hr].
- d.ts types `UserPromptSubmitHookInput`, `UserPromptExpansionHookInput`, `MessageDisplayHookInput`, `NotificationHookInput`, `StopHookInput`, `StopFailureHookInput`.
- Bundle: the strings `notificationType:"..."` in `strings.txt`.

## Not Yet Checked

- Not verified: the call path from each undocumented `notificationType` to the `Notification` hooks.

## See Also

- [Hooks](Claude-Code-Hooks), with the legend of marks
- [Output](Claude-Code-Hooks-Output)
- [Session Events](Claude-Code-Hooks-Events-Session)

[hr]: https://code.claude.com/docs/en/hooks
