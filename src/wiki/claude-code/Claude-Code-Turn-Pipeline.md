# Claude Code Turn Pipeline

A turn is everything that happens from your prompt to the final answer.
Inside a turn the model asks for tools, Claude Code runs them, and the model reads the results.
This repeats until the model answers without a tool call.

## Example

You type `fix the failing test`.
The `UserPromptSubmit` hooks run, Claude Code builds a request, and the model asks to run `Bash`.
A `PreToolUse` hook can block that call, and if it does not, the tool runs and the loop goes on.
The turn ends when the model stops asking for tools and the `Stop` hooks agree.

## The Stages

Sources: [Hooks Reference](https://code.claude.com/docs/en/hooks#hook-lifecycle) for the hook events, [Mod API Reference](https://code.claude.com/docs/en/plugins/mods/reference) for the mod events, and the bundle for the rest.

| Stage | Mark | What happens | Where you can act |
| --- | --- | --- | --- |
| 1. Input | ✅ | Claude Code reads your text, and a message you typed during a turn joins at a safe point. | `UserPromptSubmit` hook, `prompt.submit` mod event |
| 2. Command expansion | ✅ | A slash command or skill name turns into a prompt. | `UserPromptExpansion` hook |
| 3. Context pickup | ✅ | Claude Code adds nested memory, `@` mentions, and file-change notes. | `InstructionsLoaded` hook, `prompt.mention` and `prompt.attachment` mod events |
| 4. Message prep | 🔍 | Large tool results become references, and Claude Code looks up the facts of the model. | `PreModelSwitch` and `PostModelSwitch` hooks |
| 5. Auto compaction | ✅ | Claude Code compacts the conversation if it is over the threshold (see [Context and Compaction](Claude-Code-Context-And-Compaction)). | `PreCompact` and `PostCompact` hooks |
| 6. Attachments | 🔍 | Claude Code adds reminders and notes about the mode. | `prompt.attachment` mod event |
| 7. Request build | ✅ | Claude Code builds the `system`, `tools`, and `messages` parts (see [Request Build](Claude-Code-Request-Build)). | `prompt.section`, `prompt.compose`, and `tool.describe` mod events |
| 8. Stream | ✅ | Claude Code sends the request and reads the events, with retries and fallbacks. | `MessageDisplay` hook |
| 9. Tools | ✅ | Each tool call passes the permission check and then runs (see the next table). | Tool hooks |
| 10. Next round | 🔍 | The tool results join the messages, and the loop starts again at stage 3. | `PostToolBatch` hook |
| 11. Stop | ✅ | With no tool call, the `Stop` hooks run, and a hook that blocks sends its reason back to the model. | `Stop` and `StopFailure` hooks |

The mod events `turn.start`, `turn.step`, and `turn.complete` wrap the whole turn (see [Mod API](Claude-Code-Mod-API)).

## Tool Stage

Sources: [Hooks Reference](https://code.claude.com/docs/en/hooks) and [Environment Variables](https://code.claude.com/docs/en/env-vars).

| Step | Mark | What happens |
| --- | --- | --- |
| Permission check | ✅ | Your rules and the permission mode decide to allow, ask, or deny (see [Permissions and Sandbox](Claude-Code-Permissions-And-Sandbox)). |
| `PreToolUse` hook | ✅ | The hook can block or change the call. |
| `PermissionRequest` hook | ✅ | The hook runs when a decision is needed. |
| Run | ✅ | Read-only tools and subagents run in parallel, up to `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` (default 10). |
| `PostToolUse` and `PostToolUseFailure` hooks | ✅ | They run after each call. |
| `PostToolBatch` hook | ✅ | It runs after a batch of parallel calls and before the next model call, and it can stop the loop. |

Other tools run one after another.

## Recovery Inside the Loop

| Case | Mark | What Claude Code does |
| --- | --- | --- |
| The output stops at `max_tokens` | 🔍 | It adds a nudge message and asks again, a limited number of times. |
| The response is cut off | 🔍 | It does the same. |
| A `tool_use` block has no valid call | 🔍 | It drops the reply and asks once more, then ends with a message that the tool call could not be parsed. |
| The model sends only thinking | 🔍 | It sends one nudge. |
| A safety refusal | ✅ | It re-runs on the fallback model of that category (see [Models and API](Claude-Code-Models-And-API)). |
| The context is too long | ✅ | It lowers `max_tokens` or compacts. |
| Autocompact refills 3 times in a row | ✅ | It ends the turn with an error that starts `Autocompact is thrashing` ([Troubleshooting](https://code.claude.com/docs/en/troubleshooting)). |
| A `Stop` hook blocks | ✅ | It feeds the reason back, and after `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` blocks in a row (default 8) it ends the turn. |
| `--max-turns` is reached | ✅ | It ends the run ([CLI Reference](https://code.claude.com/docs/en/cli-reference)). |

## How a Turn Ends

The loop returns a `reason`, and Claude Code records it in telemetry.
The chat does not show it.
A result message of the SDK and of `--output-format stream-json` carries it as `terminal_reason` ([Agent SDK TypeScript Reference](https://code.claude.com/docs/en/agent-sdk/typescript)).
All reasons are 🔍, because only the Agent SDK pages name them.

| `reason` | Meaning |
| --- | --- |
| `completed` | The turn ended in the normal way. |
| `max_turns` | The turn limit was reached. |
| `aborted_streaming`, `aborted_tools` | You stopped the turn (for example with `Esc`) while the model streamed or tools ran. |
| `hook_stopped`, `stop_hook_prevented` | A hook stopped the turn. |
| `tool_deferred` | A hook deferred a tool call. |
| `background_requested` | The turn moved to a background session. |
| `blocking_limit` | The context hit the blocked level. |
| `rapid_refill_breaker` | Autocompact refilled the context too fast. |
| `model_error`, `api_error`, `image_error` | The API or an image failed. |
| `malformed_tool_use_exhausted` | The model sent two bad tool calls in a row. |
| `prompt_too_long` | The prompt did not fit the context window. |
| `budget_exhausted` | The budget for the run was used up. |
| `structured_output_retry_exhausted` | The model did not give valid structured output after the allowed retries. |
| `tool_deferred_unavailable` | A deferred tool call could not be resumed. |
| `turn_setup_failed` | Claude Code failed to set up the turn. |

## See Also

- [Request Build](Claude-Code-Request-Build)
- [Hooks](Claude-Code-Hooks)
- [Tools](Claude-Code-Tools)
- [Subagents](Claude-Code-Subagents)
- [Context and Compaction](Claude-Code-Context-And-Compaction)
