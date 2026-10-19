# Claude Code Hooks: Tool Result Events

These events fire after a tool runs.
The events are `PostToolUse`, `PostToolUseFailure`, and `PostToolBatch`.
For example, a `PostToolUse` hook on `Edit|Write` can run a code formatter after each edit.
`PostToolUse` and `PostToolUseFailure` match on tool name.
`PostToolBatch` has no matcher.
All three accept the five handler types.

## PostToolUse

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `PostToolUse` | Fires after a tool call succeeds | Exit 2 shows stderr to Claude and does not undo the tool. It does not see writes from `Bash` or outside processes. Use `FileChanged` for that | All five handler types | [Hooks Reference][hr], `PostToolUseHookInput` |
| ✅ | `tool_name`, `tool_input`, `tool_use_id`, `mcp_server` | As in `PreToolUse` | | stdin | [Hooks Reference][hr] |
| ✅ | `tool_response` | The structured tool output | Shape depends on the tool | stdin | [Hooks Reference][hr] |
| ✅ | `duration_ms` | Run time in ms | Excludes permission prompts and `PreToolUse` hooks. Optional | stdin | [Hooks Reference][hr] |
| ✅ | `decision`, `reason` | `block` adds the reason next to the result | Claude still sees the original output | stdout | [Hooks Reference][hr] |
| ✅ | `additionalContext` | Text next to the result | Not delivered for async hooks | `hookSpecificOutput` | [Hooks Reference][hr] |
| ✅ | `updatedToolOutput` | Replaces what Claude sees | Must match the tool output shape. For built-in tools a bad shape is ignored. The tool already ran | `hookSpecificOutput` | [Hooks Reference][hr] |
| ✅ | `updatedMCPToolOutput` | Same, for MCP tools only | Prefer `updatedToolOutput` | `hookSpecificOutput` | [Hooks Reference][hr] |
| ✅ | `classifierContext` | A note for the auto mode classifier | Needs 2.1.236. Cap 2,000 characters for one call. Dropped for async hooks and for read-only calls. Treated as unverified context | `hookSpecificOutput` | [Hooks Reference][hr], bundle |
| ✅ | `tool_response.bashEditDiff` | Changed files of a `Bash` run | Needs 2.1.269, public beta, setting `bashEditDiffEnabled`. Keys: `changedFiles` (200), `files` (5), `moreFiles`, `unavailable`, `skipped`, `shared` | `Bash` | [Hooks Reference][hr] |
| ✅ | `tool_response` of `Agent` | Run result | `status` (`completed` or `async_launched`), `agentId`, `content`, `resolvedModel`, `modelsUsed`, `totalTokens`, `totalDurationMs`, `totalToolUseCount`, `usage`, and `outputFile` for a background launch. | `Agent` | [Hooks Reference][hr] |
| ✅ | `tool_response` of `ExitPlanMode` | The approved plan | `plan` and `filePath` | `ExitPlanMode` | [Hooks Reference][hr] |
| ✅ | `SubagentHandback` | Tool that carries the report of a subagent in auto mode | Match it to read `tool_input.message`. Needs 2.1.271 | Tool events | [Hooks Reference][hr] |

## PostToolUseFailure

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `PostToolUseFailure` | Fires when a started tool fails or an MCP tool returns an error | Not for unknown tools, schema errors, or permission denials. Exit 2 shows stderr to Claude | All five handler types | [Hooks Reference][hr], `PostToolUseFailureHookInput` |
| ✅ | `tool_name`, `tool_input`, `tool_use_id`, `mcp_server` | As in `PostToolUse` | | stdin | [Hooks Reference][hr] |
| ✅ | `error` | What went wrong | Same text as the tool result. `Bash` and `PowerShell` start with `Exit code N` | stdin | [Hooks Reference][hr] |
| ✅ | `is_interrupt` | `true` for an abort | Cancel of a running tool does not fire this hook | stdin | [Hooks Reference][hr] |
| ✅ | `duration_ms` | Run time in ms | Optional | stdin | [Hooks Reference][hr] |
| ✅ | `additionalContext` | Text next to the error | Top-level `decision: "block"` also works | `hookSpecificOutput` | [Hooks Reference][hr], `ClassicResultFields` |

## PostToolBatch

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `PostToolBatch` | Fires once after all tool calls of a batch resolve, before the next model request | Exit 2, `decision: "block"`, or `continue: false` stops the loop. No matcher | All five handler types | [Hooks Reference][hr], `PostToolBatchHookInput` |
| ✅ | `tool_calls` | One entry for each call | Keys `tool_name`, `tool_input`, `tool_use_id`, `tool_response` | stdin | [Hooks Reference][hr], `PostToolBatchToolCall` |
| ✅ | `tool_calls[].tool_response` | What the model gets in the `tool_result` | A serialized string or content blocks, not the `PostToolUse` object | stdin | [Hooks Reference][hr] |
| ✅ | `additionalContext` | Context for the next request | Sent once | `hookSpecificOutput` | [Hooks Reference][hr] |

## Sources

- [Hooks Reference][hr].
- d.ts types `PostToolUseHookInput`, `PostToolUseFailureHookInput`, `PostToolBatchHookInput`, `PostToolBatchToolCall`, and `ClassicResultFields`.
- Bundle: the hook output schema.

## Not Yet Checked

- Not verified: the output schema of each built-in tool for `updatedToolOutput`.
  Only `Bash` is given in the docs (`stdout`, `stderr`, `interrupted`, `isImage`).

## See Also

- [Hooks](Claude-Code-Hooks), with the legend of marks
- [Tool Events](Claude-Code-Hooks-Events-Tool)
- [Output](Claude-Code-Hooks-Output)

[hr]: https://code.claude.com/docs/en/hooks
