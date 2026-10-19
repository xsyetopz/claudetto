# Mod API: Classic Event Types

These are the input and result types of the `classic.*` events.
Each one matches the data that a settings hook of the same name receives on `stdin`.
Example: `on("classic.Stop", ($, e, next) => next(e))`.
The types here run from `BackgroundTaskSummary` to `PermissionMode`.

## Types

| Mark | Item | What it is for | Shape and limits | Source |
| --- | --- | --- | --- | --- |
| ✅ | `BackgroundTaskSummary` | No description in the d.ts. | Object. Its fields have rows below. | d.ts line 819 |
| ✅ | `BackgroundTaskSummary.id` | A field of `BackgroundTaskSummary`. | Type: `string`. | d.ts line 819 |
| ✅ | `BackgroundTaskSummary.type` | Friendly task-type label (e.g. 'shell', 'subagent', 'monitor', 'workflow'). Falls back to the raw discriminant for unknown types. | Type: `string`. | d.ts line 819 |
| ✅ | `BackgroundTaskSummary.status` | A field of `BackgroundTaskSummary`. | Type: `string`. | d.ts line 819 |
| ✅ | `BackgroundTaskSummary.description` | Free-text description. Capped at 1000 chars, clipped values append an in-string "... [+N chars]" marker. | Type: `string`. | d.ts line 819 |
| ✅ | `BackgroundTaskSummary.command` | Shell command line. Only present for 'shell' tasks. Capped at 1000 chars with the same "... [+N chars]" marker. | Type: `string`. Optional. | d.ts line 819 |
| ✅ | `BackgroundTaskSummary.agent_type` | Subagent type name. Only present for 'subagent' tasks. | Type: `string`. Optional. | d.ts line 819 |
| ✅ | `BackgroundTaskSummary.server` | MCP server name. Only present for 'monitor' / 'MCP task' tasks. | Type: `string`. Optional. | d.ts line 819 |
| ✅ | `BackgroundTaskSummary.tool` | MCP tool name. Only present for 'monitor' / 'MCP task' tasks. | Type: `string`. Optional. | d.ts line 819 |
| ✅ | `BackgroundTaskSummary.name` | Workflow name. Only present for 'workflow' tasks. | Type: `string`. Optional. | d.ts line 819 |
| ✅ | `BaseHookInput` | No description in the d.ts. | Object. Its fields have rows below. | d.ts line 852 |
| ✅ | `BaseHookInput.session_id` | A field of `BaseHookInput`. | Type: `string`. | d.ts line 852 |
| ✅ | `BaseHookInput.transcript_path` | A field of `BaseHookInput`. | Type: `string`. | d.ts line 852 |
| ✅ | `BaseHookInput.cwd` | A field of `BaseHookInput`. | Type: `string`. | d.ts line 852 |
| ✅ | `BaseHookInput.prompt_id` | A UUID that ties a user prompt to all later events until the next prompt. It is also the `prompt.id` attribute on OpenTelemetry events. Absent until the first user input. | Type: `string`. Optional. | d.ts line 852 |
| ✅ | `BaseHookInput.permission_mode` | A field of `BaseHookInput`. | Type: `string`. Optional. | d.ts line 852 |
| ✅ | `BaseHookInput.agent_id` | Subagent identifier. Present only when the hook fires inside a subagent. Absent on the main thread. Use it, not `agent_type`, to tell subagent calls apart. | Type: `string`. Optional. | d.ts line 852 |
| ✅ | `BaseHookInput.agent_type` | Agent type name, such as `general-purpose`. Present inside a subagent, or on the main thread of a session started with `--agent`. | Type: `string`. Optional. | d.ts line 852 |
| ✅ | `BaseHookInput.effort` | Reasoning effort of the current turn. Present for hooks in a tool-use context on a model that supports effort. Absent for session-lifecycle hooks. | Type: `object`. Optional. | d.ts line 852 |
| ✅ | `ClassicEventName` | The name of a classic hook event as a function-hooks event: the settings hook's own name under `classic` (`classic.Stop`, `classic.PreToolUse`). | Alias of `` `classic.${ClassicHookEvent}` ``. Each fires wherever the engine runs the classic hook, even with no settings hook configured. | d.ts line 1270 |
| ✅ | `ClassicEventOf` | The classic (settings) hook events, one per classic event name: `e` is the hook's whole stdin input, base fields (`transcript_path`, `cwd`) included. | Object. One key for each classic event. The chain is managed settings hooks, then hooks modules, then the other settings hooks. A managed block ends it above every module. | d.ts line 1283 |
| ✅ | `` ClassicEventOf.[E in ClassicHookEvent as `classic.${E}`] `` | A field of ` ClassicEventOf.[E in ClassicHookEvent as `classic`. | Type: `E extends 'PreToolUse' ? ToolCallEnvelope : ClassicHookInputs[E]`. | d.ts line 1283 |
| ✅ | `ClassicHookEvent` | The name of a classic hook event: `PreToolUse`, `Stop`, and the rest. | Alias of `HookInput['hook_event_name']`. | d.ts line 1290 |
| ✅ | `ClassicHookInputs` | What a classic hook receives on stdin for each event, by event name: the Agent SDK's `<Event>HookInput`. | Alias of `{ [I in HookInput as I['hook_event_name']]: I, }`. | d.ts line 1296 |
| ✅ | `ClassicResult` | Everything a classic hook event's answer can carry, named as the classic hook's JSON output names it, each event reads its subset (ClassicResultOf). | Object. Its fields have rows below. The settings hooks fold into one of these. A field of the wrong shape fails the hook. | d.ts line 1308 |
| ✅ | `ClassicResult.block` | `decision: "block"` with this text as `reason` (a command hook's exit code 2): the event's block, veto or re-prompt. | Type: `string`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.preventContinuation` | `continue: false`: the session stops after this event. | Type: `true`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.stopReason` | Shown when `preventContinuation` stops the session (`stopReason`). | Type: `string`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.additionalContext` | `hookSpecificOutput.additionalContext`, one entry per hook: text handed to the model with the event. | Type: `string[]`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.sessionTitle` | `hookSpecificOutput.sessionTitle` (UserPromptSubmit, SessionStart). | Type: `string`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.suppressOriginalPrompt` | `hookSpecificOutput.suppressOriginalPrompt` (UserPromptSubmit, UserPromptExpansion). | Type: `true`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.initialUserMessage` | `hookSpecificOutput.initialUserMessage` (SessionStart). | Type: `string`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.watchPaths` | `hookSpecificOutput.watchPaths` (SessionStart). | Type: `string[]`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.reloadSkills` | `hookSpecificOutput.reloadSkills` (SessionStart). | Type: `true`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.permissionDecision` | `hookSpecificOutput.permissionDecision` (PreModelSwitch). | Type: `'allow' \| 'deny' \| 'ask'`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.permissionDecisionReason` | `hookSpecificOutput.permissionDecisionReason` (PreModelSwitch). | Type: `string`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.decision` | `hookSpecificOutput.decision` (PermissionRequest). | Type: `PermissionRequestDecision`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.updatedToolOutput` | `hookSpecificOutput.updatedToolOutput` (PostToolUse): replaces what the model sees of the tool's result. | Type: `unknown`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.updatedMCPToolOutput` | `hookSpecificOutput.updatedMCPToolOutput` (PostToolUse, MCP tools only). | Type: `unknown`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.retry` | `hookSpecificOutput.retry` (PermissionDenied). | Type: `true`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.displayContent` | `hookSpecificOutput.displayContent` (MessageDisplay). | Type: `string`. Optional. | d.ts line 1308 |
| ✅ | `ClassicResult.worktreePath` | `hookSpecificOutput.worktreePath` (WorktreeCreate, a command hook prints it): the worktree the hook created, absolute or relative to its cwd. | Type: `string`. Optional. Left unset, the session creates its git worktree as it would unhooked. | d.ts line 1308 |
| ✅ | `ClassicResultFields` | The event-specific fields of ClassicResult each classic event reads (its `hookSpecificOutput`), by event, an event absent here reads none of them. | Object. Its fields have rows below. `block`, `preventContinuation` and `stopReason` are every event's. | d.ts line 1392 |
| ✅ | `ClassicResultFields.UserPromptSubmit` | A field of `ClassicResultFields`. | Type: `'additionalContext' \| 'sessionTitle' \| 'suppressOriginalPrompt'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.UserPromptExpansion` | A field of `ClassicResultFields`. | Type: `'additionalContext' \| 'suppressOriginalPrompt'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.SessionStart` | A field of `ClassicResultFields`. | Type: `'additionalContext' \| 'initialUserMessage' \| 'sessionTitle' \| 'watchPaths' \| 'reloadSkills'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.Setup` | A field of `ClassicResultFields`. | Type: `'additionalContext'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.PreModelSwitch` | A field of `ClassicResultFields`. | Type: `'permissionDecision' \| 'permissionDecisionReason'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.PostModelSwitch` | A field of `ClassicResultFields`. | Type: `'additionalContext'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.SubagentStart` | A field of `ClassicResultFields`. | Type: `'additionalContext'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.PostToolUse` | A field of `ClassicResultFields`. | Type: `'additionalContext' \| 'updatedToolOutput' \| 'updatedMCPToolOutput'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.PostToolUseFailure` | A field of `ClassicResultFields`. | Type: `'additionalContext'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.PostToolBatch` | A field of `ClassicResultFields`. | Type: `'additionalContext'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.Stop` | A field of `ClassicResultFields`. | Type: `'additionalContext'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.SubagentStop` | A field of `ClassicResultFields`. | Type: `'additionalContext'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.PermissionDenied` | A field of `ClassicResultFields`. | Type: `'retry'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.PermissionRequest` | A field of `ClassicResultFields`. | Type: `'decision'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.MessageDisplay` | A field of `ClassicResultFields`. | Type: `'displayContent'`. | d.ts line 1392 |
| ✅ | `ClassicResultFields.WorktreeCreate` | A field of `ClassicResultFields`. | Type: `'worktreePath'`. | d.ts line 1392 |
| ✅ | `ClassicResultOf` | What each classic hook event's hook returns and its `next(e)` resolves to: the event's own subset of ClassicResult. | Object. Its fields have rows below. [E in ClassicHookEvent as `classic.${E}`] ``. `classic.PreToolUse` keeps its `allow` / `ask` / `deny` result (PreToolUseResult). | d.ts line 1418 |
| ✅ | `` ClassicResultOf.[E in ClassicHookEvent as `classic.${E}`] `` | A field of ` ClassicResultOf.[E in ClassicHookEvent as `classic`. | Type: `E extends 'PreToolUse' ? PreToolUseResult : Pick<ClassicResult, 'block' \| 'preventContinuation' \| 'stopReason' \| (E extends keyof ClassicResultFields ? ClassicResultFields[E] : never)>`. | d.ts line 1418 |
| ✅ | `ConfigChangeHookInput` | No description in the d.ts. | Intersection with `ConfigChangeHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 1943 |
| ✅ | `ConfigChangeHookInput.hook_event_name` | A field of `ConfigChangeHookInput`. | Type: `'ConfigChange'`. | d.ts line 1943 |
| ✅ | `ConfigChangeHookInput.source` | A field of `ConfigChangeHookInput`. | Type: `'user_settings' \| 'project_settings' \| 'local_settings' \| 'policy_settings' \| 'skills'`. | d.ts line 1943 |
| ✅ | `ConfigChangeHookInput.file_path` | A field of `ConfigChangeHookInput`. | Type: `string`. Optional. | d.ts line 1943 |
| ✅ | `CwdChangedHookInput` | No description in the d.ts. | Intersection with `CwdChangedHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 3708 |
| ✅ | `CwdChangedHookInput.hook_event_name` | A field of `CwdChangedHookInput`. | Type: `'CwdChanged'`. | d.ts line 3708 |
| ✅ | `CwdChangedHookInput.old_cwd` | A field of `CwdChangedHookInput`. | Type: `string`. | d.ts line 3708 |
| ✅ | `CwdChangedHookInput.new_cwd` | A field of `CwdChangedHookInput`. | Type: `string`. | d.ts line 3708 |
| ✅ | `DirectoryAddedHookInput` | No description in the d.ts. | Intersection with `DirectoryAddedHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 3835 |
| ✅ | `DirectoryAddedHookInput.hook_event_name` | A field of `DirectoryAddedHookInput`. | Type: `'DirectoryAdded'`. | d.ts line 3835 |
| ✅ | `DirectoryAddedHookInput.directory` | Absolute path of the directory that was added. | Type: `string`. | d.ts line 3835 |
| ✅ | `DirectoryAddedHookInput.source` | How the directory was added: "slash_command" for /add-dir, "register_repo_root" for the SDK control_request. | Type: `'slash_command' \| 'register_repo_root'`. | d.ts line 3835 |
| ✅ | `ElicitationHookInput` | Hook input for the Elicitation event. Fired when an MCP server requests user input. Hooks can auto-respond (accept/decline) instead of showing the dialog. | Intersection with `ElicitationHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 3978 |
| ✅ | `ElicitationHookInput.hook_event_name` | A field of `ElicitationHookInput`. | Type: `'Elicitation'`. | d.ts line 3978 |
| ✅ | `ElicitationHookInput.mcp_server_name` | A field of `ElicitationHookInput`. | Type: `string`. | d.ts line 3978 |
| ✅ | `ElicitationHookInput.message` | A field of `ElicitationHookInput`. | Type: `string`. | d.ts line 3978 |
| ✅ | `ElicitationHookInput.mode` | A field of `ElicitationHookInput`. | Type: `'form' \| 'url'`. Optional. | d.ts line 3978 |
| ✅ | `ElicitationHookInput.url` | A field of `ElicitationHookInput`. | Type: `string`. Optional. | d.ts line 3978 |
| ✅ | `ElicitationHookInput.elicitation_id` | A field of `ElicitationHookInput`. | Type: `string`. Optional. | d.ts line 3978 |
| ✅ | `ElicitationHookInput.requested_schema` | A field of `ElicitationHookInput`. | Type: `Record<string, unknown>`. Optional. | d.ts line 3978 |
| ✅ | `ElicitationResultHookInput` | Hook input for the ElicitationResult event. Fired after the user responds to an MCP elicitation. Hooks can observe or override the response before it is sent to the server. | Intersection with `ElicitationResultHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 3991 |
| ✅ | `ElicitationResultHookInput.hook_event_name` | A field of `ElicitationResultHookInput`. | Type: `'ElicitationResult'`. | d.ts line 3991 |
| ✅ | `ElicitationResultHookInput.mcp_server_name` | A field of `ElicitationResultHookInput`. | Type: `string`. | d.ts line 3991 |
| ✅ | `ElicitationResultHookInput.elicitation_id` | A field of `ElicitationResultHookInput`. | Type: `string`. Optional. | d.ts line 3991 |
| ✅ | `ElicitationResultHookInput.mode` | A field of `ElicitationResultHookInput`. | Type: `'form' \| 'url'`. Optional. | d.ts line 3991 |
| ✅ | `ElicitationResultHookInput.action` | A field of `ElicitationResultHookInput`. | Type: `'accept' \| 'decline' \| 'cancel'`. | d.ts line 3991 |
| ✅ | `ElicitationResultHookInput.content` | A field of `ElicitationResultHookInput`. | Type: `Record<string, unknown>`. Optional. | d.ts line 3991 |
| ✅ | `ExitReason` | No description in the d.ts. | Alias of `'clear' \| 'resume' \| 'logout' \| 'prompt_input_exit' \| 'other'`. | d.ts line 4949 |
| ✅ | `FileChangedHookInput` | No description in the d.ts. | Intersection with `FileChangedHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 4951 |
| ✅ | `FileChangedHookInput.hook_event_name` | A field of `FileChangedHookInput`. | Type: `'FileChanged'`. | d.ts line 4951 |
| ✅ | `FileChangedHookInput.file_path` | A field of `FileChangedHookInput`. | Type: `string`. | d.ts line 4951 |
| ✅ | `FileChangedHookInput.event` | A field of `FileChangedHookInput`. | Type: `'change' \| 'add' \| 'unlink'`. | d.ts line 4951 |
| ✅ | `HookInput` | No description in the d.ts. | Alias of the union of every hook input type, such as `PreToolUseHookInput`, `PostToolUseHookInput`, `SessionStartHookInput`, and `StopHookInput`. | d.ts line 5300 |
| ✅ | `InstructionsLoadedHookInput` | No description in the d.ts. | Intersection with `InstructionsLoadedHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 5688 |
| ✅ | `InstructionsLoadedHookInput.hook_event_name` | A field of `InstructionsLoadedHookInput`. | Type: `'InstructionsLoaded'`. | d.ts line 5688 |
| ✅ | `InstructionsLoadedHookInput.file_path` | A field of `InstructionsLoadedHookInput`. | Type: `string`. | d.ts line 5688 |
| ✅ | `InstructionsLoadedHookInput.memory_type` | A field of `InstructionsLoadedHookInput`. | Type: `'User' \| 'Project' \| 'Local' \| 'Managed'`. | d.ts line 5688 |
| ✅ | `InstructionsLoadedHookInput.load_reason` | A field of `InstructionsLoadedHookInput`. | Type: `'session_start' \| 'nested_traversal' \| 'path_glob_match' \| 'include' \| 'compact'`. | d.ts line 5688 |
| ✅ | `InstructionsLoadedHookInput.globs` | A field of `InstructionsLoadedHookInput`. | Type: `string[]`. Optional. | d.ts line 5688 |
| ✅ | `InstructionsLoadedHookInput.trigger_file_path` | A field of `InstructionsLoadedHookInput`. | Type: `string`. Optional. | d.ts line 5688 |
| ✅ | `InstructionsLoadedHookInput.parent_file_path` | A field of `InstructionsLoadedHookInput`. | Type: `string`. Optional. | d.ts line 5688 |
| ✅ | `MessageDisplayHookInput` | Hook input for the MessageDisplay event. Fired with each batch of newly completed lines while an assistant message streams. Display-only: the stored message and what the model sees are untouched. | Intersection with `MessageDisplayHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 6192 |
| ✅ | `MessageDisplayHookInput.hook_event_name` | A field of `MessageDisplayHookInput`. | Type: `'MessageDisplay'`. | d.ts line 6192 |
| ✅ | `MessageDisplayHookInput.turn_id` | UUID of the current turn. | Type: `string`. | d.ts line 6192 |
| ✅ | `MessageDisplayHookInput.message_id` | UUID of the assistant message being displayed. Stable across every flush of the same message. Not the API msg_... id. | Type: `string`. | d.ts line 6192 |
| ✅ | `MessageDisplayHookInput.index` | Zero-based index of this delta within the message. Increments by one per flush. | Type: `number`. | d.ts line 6192 |
| ✅ | `MessageDisplayHookInput.final` | True on the message's last flush. Exactly one flush per message has it. | Type: `boolean`. | d.ts line 6192 |
| ✅ | `MessageDisplayHookInput.delta` | The newly completed lines since the last flush. Always whole lines, except on the final flush. Treat `final` as the end-of-message signal. | Type: `string`. | d.ts line 6192 |
| ✅ | `NotificationHookInput` | No description in the d.ts. | Intersection with `NotificationHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 6836 |
| ✅ | `NotificationHookInput.hook_event_name` | A field of `NotificationHookInput`. | Type: `'Notification'`. | d.ts line 6836 |
| ✅ | `NotificationHookInput.message` | A field of `NotificationHookInput`. | Type: `string`. | d.ts line 6836 |
| ✅ | `NotificationHookInput.title` | A field of `NotificationHookInput`. | Type: `string`. Optional. | d.ts line 6836 |
| ✅ | `NotificationHookInput.notification_type` | A field of `NotificationHookInput`. | Type: `string`. | d.ts line 6836 |
| ✅ | `PermissionBehavior` | No description in the d.ts. | Alias of `'allow' \| 'deny' \| 'ask'`. | d.ts line 7636 |
| ✅ | `PermissionDeniedHookInput` | No description in the d.ts. | Intersection with `PermissionDeniedHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 7638 |
| ✅ | `PermissionDeniedHookInput.hook_event_name` | A field of `PermissionDeniedHookInput`. | Type: `'PermissionDenied'`. | d.ts line 7638 |
| ✅ | `PermissionDeniedHookInput.tool_name` | A field of `PermissionDeniedHookInput`. | Type: `string`. | d.ts line 7638 |
| ✅ | `PermissionDeniedHookInput.tool_input` | A field of `PermissionDeniedHookInput`. | Type: `unknown`. | d.ts line 7638 |
| ✅ | `PermissionDeniedHookInput.tool_use_id` | A field of `PermissionDeniedHookInput`. | Type: `string`. | d.ts line 7638 |
| ✅ | `PermissionDeniedHookInput.reason` | A field of `PermissionDeniedHookInput`. | Type: `string`. | d.ts line 7638 |
| ✅ | `PermissionDeniedHookInput.mcp_server` | A field of `PermissionDeniedHookInput`. | Type: `McpServerProvenance`. Optional. | d.ts line 7638 |
| ✅ | `PermissionMode` | How tool runs are handled: `default`, `acceptEdits`, `bypassPermissions`, `plan`, `dontAsk`, or `auto`. `bypassPermissions` needs `allowDangerouslySkipPermissions`. | Alias of `'default' \| 'acceptEdits' \| 'bypassPermissions' \| 'plan' \| 'dontAsk' \| 'auto'`. | d.ts line 7650 |

## See Also

- [Mod API: Classic Events](Claude-Code-Mod-API-Classic-Events)
- [Mod API: Classic Event Types (Part 2)](Claude-Code-Mod-API-Classic-Types-2)
- [Hooks](Claude-Code-Hooks)
- [Claude Code Mod API](Claude-Code-Mod-API)
