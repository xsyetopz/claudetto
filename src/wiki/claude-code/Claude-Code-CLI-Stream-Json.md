# Claude Code CLI Stream JSON

Print mode can talk in JSON lines.
With `--output-format stream-json`, Claude Code writes one JSON object per line to stdout.
With `--input-format stream-json`, you send JSON lines on stdin, and the same channel carries control requests.
For example, `claude -p "Explain this repo" --output-format stream-json --verbose --include-partial-messages` prints a `system` / `init` line, then `stream_event` lines while the answer grows, then a final `result` line.

## Messages Out

The table lists the message types that the bundle schema of `2.1.303` defines.
The text of each row is a short form of the description in the schema, and a row that has no description says so.
A row has the mark ✅ when a docs page other than the changelog and the Agent SDK pages names the type.
Sources: [Run Claude Code Programmatically](https://code.claude.com/docs/en/headless) and [CLI Reference](https://code.claude.com/docs/en/cli-reference).

| `type` / `subtype` | Mark | What it is |
| --- | --- | --- |
| `user` | ✅ | A user message, such as a message of a subagent when `--forward-subagent-text` is on. |
| `rate_limit_event` | 🔍 | Rate limit information changed. |
| `result` | ✅ | The final result of the run. |
| `system` / `init` | ✅ | Session data at the start of each turn: session ID, model, working folder, tools, MCP servers, slash commands, and plugins. |
| `stream_event` | ✅ | A step of the answer as it grows, only with `--include-partial-messages`. |
| `system` / `compact_boundary` | ✅ | The conversation was compacted here. |
| `system` / `status` | 🔍 | The bundle gives no description. |
| `system` / `post_turn_summary` | 🔍 | A summary made in the background after each assistant turn. |
| `system` / `task_summary` | 🔍 | A progress line in the middle of a turn. |
| `system` / `session_metadata` | 🔍 | A patch of session data for a local host, such as the list of published artifacts. |
| `system` / `informational` | 🔍 | A text banner: a status line, hook feedback, or the output of a slash command. |
| `system` / `permission_retry` | 🔍 | Tools run again after a change of permission mode allowed commands that were denied before. |
| `system` / `stop_hook_summary` | 🔍 | Which `Stop` and `SubagentStop` hooks ran at the end of a turn, their output, and whether one stopped the continuation. |
| `system` / `memory_saved` | 🔍 | The memory system wrote to the listed paths. |
| `system` / `agents_killed` | 🔍 | Background agents were stopped, for example on an interrupt. |
| `system` / `instruction_size_warning` | 🔍 | The instruction files of the session are larger than the advised limit. |
| `system` / `away_summary` | 🔍 | A summary of what happened while you were away. |
| `system` / `thinking` | 🔍 | The thinking text itself. |
| `transcript_mirror` | 🔍 | Sent after each successful write of the local transcript. |
| `system` / `mirror_error` | 🔍 | A batch of the transcript mirror failed after 3 tries. |
| `system` / `api_retry` | ✅ | An API request failed with an error that can be retried, and Claude Code will try again after a wait. |
| `system` / `control_request_progress` | 🔍 | Progress of a long control request, matched by `request_id`. |
| `system` / `model_refusal_fallback` | 🔍 | The bundle gives no description. |
| `system` / `model_refusal_no_fallback` | 🔍 | The bundle gives no description. |
| `system` / `model_fallback` | 🔍 | The bundle gives no description. |
| `system` / `model_consent_fallback` | 🔍 | A check before the request moved the session off the model that was asked for. |
| `system` / `file_snapshot` | 🔍 | A snapshot of the plan and todo files, made for rewind. |
| `system` / `scheduled_task_fire` | 🔍 | A scheduled task (cron) started. |
| `system` / `peer_message_hold` | 🔍 | A message from another session was held and not queued, and how the hold ended. |
| `system` / `turn_duration` | 🔍 | The wall-clock time of a turn, with the budget and the number of background jobs. |
| `system` / `api_error` | 🔍 | An API error that can be retried, with the error data and the retry counts. |
| `system` / `local_command_output` | 🔍 | The output of a local slash command, such as `/usage`. |
| `system` / `hook_started` | ✅ | A hook started to run. |
| `system` / `hook_progress` | ✅ | A hook reported progress. |
| `system` / `hook_response` | ✅ | A hook finished with a response. |
| `system` / `plugin_install` | ✅ | Progress of a plugin install in print mode, when `CLAUDE_CODE_SYNC_PLUGIN_INSTALL` is set. |
| `tool_progress` | 🔍 | The bundle gives no description. |
| `auth_status` | 🔍 | The bundle gives no description. |
| `system` / `files_persisted` | 🔍 | The bundle gives no description. |
| `system` / `task_notification` | 🔍 | The bundle gives no description. |
| `system` / `task_started` | 🔍 | The bundle gives no description. |
| `system` / `task_updated` | 🔍 | The bundle gives no description. |
| `system` / `background_tasks_changed` | 🔍 | The bundle gives no description. |
| `system` / `feedback_draft_queued` | 🔍 | The `SendFeedback` tool wrote a draft to `~/.claude/feedback/drafts/`. |
| `system` / `session_state_changed` | 🔍 | The state of the session changed. |
| `system` / `session_title_changed` | 🔍 | The bundle gives no description. |
| `system` / `worker_shutting_down` | 🔍 | The bundle gives no description. |
| `system` / `turn_handoff_available` | 🔍 | The bundle gives no description. |
| `system` / `ui_invalidate` | 🔍 | The bundle gives no description. |
| `system` / `ui_log` | 🔍 | A plugin called `$.ui.log(text)`, and the screen adds a dim notice under the name of the plugin. |
| `system` / `ui_toast` | 🔍 | A plugin called `$.ui.toast(text)`, and the screen shows a short note under the prompt. |
| `system` / `ui_status` | 🔍 | A plugin called `$.ui.status(text)`, and the screen pins a line under the prompt. |
| `system` / `ui_scroll` | 🔍 | A plugin scrolled a site that a remote screen draws. |
| `system` / `ui_focus` | 🔍 | A plugin moved the focus ring of a site that a remote screen draws. |
| `system` / `commands_changed` | 🔍 | The full list of slash commands, sent after a change in the middle of a session. |
| `system` / `notification` | 🔍 | A text notification from the loop. |
| `system` / `task_progress` | 🔍 | The bundle gives no description. |
| `system` / `thinking_tokens` | 🔍 | A live estimate of the thinking tokens while the thinking text is hidden. |
| `tool_use_summary` | 🔍 | The bundle gives no description. |
| `system` / `memory_recall` | 🔍 | The bundle gives no description. |
| `system` / `elicitation_complete` | 🔍 | An MCP server confirmed that a URL-mode elicitation is complete. |
| `system` / `permission_denied` | ✅ | A tool call was denied, and the final result lists the denials in `permission_denials`. |
| `system` / `permission_check_status` | 🔍 | The bundle gives no description. |
| `prompt_suggestion` | ✅ | The predicted next prompt, sent after each turn when prompt suggestions are on. |
| `system` / `code_change_published` | 🔍 | The bundle gives no description. |
| `system` / `vcs_state_changed` | 🔍 | The bundle gives no description. |
| `system` / `dev_intent` | 🔍 | The bundle gives no description. |
| `system` / `turn_preempted` | 🔍 | The bundle gives no description. |
| `system` / `per_turn_effort_changed` | 🔍 | The conversation stopped sending the effort with each turn, because the server refused it. |
| `system` / `file_attachments_missing` | 🔍 | The bundle gives no description. |
| `system` / `cloud_session_delta` | 🔍 | The bundle gives no description. |
| `control_request` | 🔍 | A request of the control protocol, which either side can send on the same stream. |
| `control_response` | 🔍 | The single reply to a `control_request`. |
| `control_cancel_request` | 🔍 | The sender no longer needs the answer to one of its own control requests. |
| `keep_alive` | 🔍 | A heartbeat with no payload. |
| `update_environment_variables` | 🔍 | Updates env vars while the process runs. |

## Control Requests

Control requests have their own page: [CLI Stream JSON Control](Claude-Code-CLI-Stream-Json-Control).

## See Also

- [CLI](Claude-Code-CLI)
- [CLI Flags](Claude-Code-CLI-Flags)
- [CLI Stream JSON Control](Claude-Code-CLI-Stream-Json-Control)
- [Sessions Transcript](Claude-Code-Sessions-Transcript)
