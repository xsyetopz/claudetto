# Mod API: Classic Event Types (Part 2)

These are more of the types behind the `classic.*` events, which mirror the settings hooks.
They run from `PermissionRequestDecision` to `SessionStartHookInput.estimated_cache_write_usd`.

## Types

| Mark | Item | What it is for | Shape and limits | Source |
| --- | --- | --- | --- | --- |
| ✅ | `PermissionRequestDecision` | A `classic.PermissionRequest` answer's `decision`, as the classic hook's `hookSpecificOutput.decision`: allow (with a rewrite or rules) or deny. | Object. Its fields have rows below. | d.ts line 7656 |
| ✅ | `PermissionRequestDecision.behavior` | A field of `PermissionRequestDecision`. | Type: `'allow'`. | d.ts line 7656 |
| ✅ | `PermissionRequestDecision.updatedInput` | A field of `PermissionRequestDecision`. | Type: `Record<string, unknown>`. Optional. | d.ts line 7656 |
| ✅ | `PermissionRequestDecision.updatedPermissions` | A field of `PermissionRequestDecision`. | Type: `PermissionUpdates`. Optional. | d.ts line 7656 |
| ✅ | `PermissionRequestDecision.behavior` | A field of `PermissionRequestDecision`. | Type: `'deny'`. | d.ts line 7656 |
| ✅ | `PermissionRequestDecision.message` | A field of `PermissionRequestDecision`. | Type: `string`. Optional. | d.ts line 7656 |
| ✅ | `PermissionRequestDecision.interrupt` | A field of `PermissionRequestDecision`. | Type: `true`. Optional. | d.ts line 7656 |
| ✅ | `PermissionRequestHookInput` | No description in the d.ts. | Intersection with `PermissionRequestHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 7666 |
| ✅ | `PermissionRequestHookInput.hook_event_name` | A field of `PermissionRequestHookInput`. | Type: `'PermissionRequest'`. | d.ts line 7666 |
| ✅ | `PermissionRequestHookInput.tool_name` | A field of `PermissionRequestHookInput`. | Type: `string`. | d.ts line 7666 |
| ✅ | `PermissionRequestHookInput.tool_input` | A field of `PermissionRequestHookInput`. | Type: `unknown`. | d.ts line 7666 |
| ✅ | `PermissionRequestHookInput.permission_suggestions` | A field of `PermissionRequestHookInput`. | Type: `PermissionUpdate[]`. Optional. | d.ts line 7666 |
| ✅ | `PermissionRequestHookInput.mcp_server` | A field of `PermissionRequestHookInput`. | Type: `McpServerProvenance`. Optional. | d.ts line 7666 |
| ✅ | `PermissionRuleValue` | No description in the d.ts. | Object. Its fields have rows below. | d.ts line 7674 |
| ✅ | `PermissionRuleValue.toolName` | A field of `PermissionRuleValue`. | Type: `string`. | d.ts line 7674 |
| ✅ | `PermissionRuleValue.ruleContent` | A field of `PermissionRuleValue`. | Type: `string`. Optional. | d.ts line 7674 |
| ✅ | `PermissionUpdate` | No description in the d.ts. | Object. Its fields have rows below. | d.ts line 7679 |
| ✅ | `PermissionUpdate.type` | A field of `PermissionUpdate`. | Type: `'addRules'`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.rules` | A field of `PermissionUpdate`. | Type: `PermissionRuleValue[]`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.behavior` | A field of `PermissionUpdate`. | Type: `PermissionBehavior`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.destination` | A field of `PermissionUpdate`. | Type: `PermissionUpdateDestination`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.type` | A field of `PermissionUpdate`. | Type: `'replaceRules'`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.rules` | A field of `PermissionUpdate`. | Type: `PermissionRuleValue[]`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.behavior` | A field of `PermissionUpdate`. | Type: `PermissionBehavior`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.destination` | A field of `PermissionUpdate`. | Type: `PermissionUpdateDestination`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.type` | A field of `PermissionUpdate`. | Type: `'removeRules'`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.rules` | A field of `PermissionUpdate`. | Type: `PermissionRuleValue[]`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.behavior` | A field of `PermissionUpdate`. | Type: `PermissionBehavior`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.destination` | A field of `PermissionUpdate`. | Type: `PermissionUpdateDestination`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.type` | A field of `PermissionUpdate`. | Type: `'setMode'`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.mode` | A field of `PermissionUpdate`. | Type: `PermissionMode`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.destination` | A field of `PermissionUpdate`. | Type: `PermissionUpdateDestination`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.type` | A field of `PermissionUpdate`. | Type: `'addDirectories'`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.directories` | A field of `PermissionUpdate`. | Type: `string[]`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.destination` | A field of `PermissionUpdate`. | Type: `PermissionUpdateDestination`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.type` | A field of `PermissionUpdate`. | Type: `'removeDirectories'`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.directories` | A field of `PermissionUpdate`. | Type: `string[]`. | d.ts line 7679 |
| ✅ | `PermissionUpdate.destination` | A field of `PermissionUpdate`. | Type: `PermissionUpdateDestination`. | d.ts line 7679 |
| ✅ | `PermissionUpdateDestination` | No description in the d.ts. | Alias of `'userSettings' \| 'projectSettings' \| 'localSettings' \| 'session' \| 'cliArg'`. | d.ts line 7708 |
| ✅ | `PermissionUpdates` | The permission rules a PermissionRequest allow may add: the shape of the request's own `permission_suggestions` (the SDK's PermissionUpdate list). | Alias of `NonNullable<ClassicHookInputs['PermissionRequest']['permission_suggestions']>`. | d.ts line 7714 |
| ✅ | `PostCompactHookInput` | No description in the d.ts. | Intersection with `PostCompactHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 7952 |
| ✅ | `PostCompactHookInput.hook_event_name` | A field of `PostCompactHookInput`. | Type: `'PostCompact'`. | d.ts line 7952 |
| ✅ | `PostCompactHookInput.trigger` | A field of `PostCompactHookInput`. | Type: `'manual' \| 'auto'`. | d.ts line 7952 |
| ✅ | `PostCompactHookInput.compact_summary` | The conversation summary produced by compaction | Type: `string`. | d.ts line 7952 |
| ✅ | `PostModelSwitchHookInput` | No description in the d.ts. | Intersection with `PostModelSwitchHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 7961 |
| ✅ | `PostModelSwitchHookInput.hook_event_name` | A field of `PostModelSwitchHookInput`. | Type: `'PostModelSwitch'`. | d.ts line 7961 |
| ✅ | `PostModelSwitchHookInput.from_model` | Resolved model id the session was running before the switch | Type: `string`. | d.ts line 7961 |
| ✅ | `PostModelSwitchHookInput.to_model` | Resolved model id the session runs after the switch | Type: `string`. | d.ts line 7961 |
| ✅ | `PostModelSwitchHookInput.requested_model` | What was asked for (alias such as "opus", a full id, or null for "default") | Type: `string \| null`. | d.ts line 7961 |
| ✅ | `PostModelSwitchHookInput.source` | Why the model changed: `command` (/model or the /config Model row), `picker`, `sdk` (headless `set_model`), `auto` (fallback or other change), or `resume`. | Type: `'command' \| 'picker' \| 'sdk' \| 'auto' \| 'resume'`. | d.ts line 7961 |
| ✅ | `PostModelSwitchHookInput.context_tokens` | Prompt tokens that the next request re-sends: the last main-thread response's input, cache read, cache creation, and output tokens. 0 before the first response. | Type: `number`. | d.ts line 7961 |
| ✅ | `PostModelSwitchHookInput.prompt_cache_warm` | Whether the current model's prompt cache is likely still warm (a switch then forfeits it) | Type: `boolean`. | d.ts line 7961 |
| ✅ | `PostModelSwitchHookInput.cache_ttl` | A field of `PostModelSwitchHookInput`. | Type: `'5m' \| '1h'`. | d.ts line 7961 |
| ✅ | `PostModelSwitchHookInput.estimated_cache_write_usd` | Estimated cost of re-caching context_tokens on to_model at its cache-write rate - the managed modelPricing when set, otherwise list price, excludes the response | Type: `number`. | d.ts line 7961 |
| ✅ | `PostModelSwitchHookInput.pricing` | configured: priced at the managed modelPricing setting, catalog: list price, default: to_model unknown, the default tier was assumed | Type: `'configured' \| 'catalog' \| 'default'`. | d.ts line 7961 |
| ✅ | `PostToolBatchHookInput` | Hook input for `PostToolBatch`. Fires once after every tool call in a batch resolved, before the next model request. `PostToolUse` fires for each tool. | Intersection with `PostToolBatchHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 8002 |
| ✅ | `PostToolBatchHookInput.hook_event_name` | A field of `PostToolBatchHookInput`. | Type: `'PostToolBatch'`. | d.ts line 8002 |
| ✅ | `PostToolBatchHookInput.tool_calls` | A field of `PostToolBatchHookInput`. | Type: `PostToolBatchToolCall[]`. | d.ts line 8002 |
| ✅ | `PostToolBatchToolCall` | No description in the d.ts. | Object. Its fields have rows below. | d.ts line 8007 |
| ✅ | `PostToolBatchToolCall.tool_name` | A field of `PostToolBatchToolCall`. | Type: `string`. | d.ts line 8007 |
| ✅ | `PostToolBatchToolCall.tool_input` | A field of `PostToolBatchToolCall`. | Type: `unknown`. | d.ts line 8007 |
| ✅ | `PostToolBatchToolCall.tool_use_id` | A field of `PostToolBatchToolCall`. | Type: `string`. | d.ts line 8007 |
| ✅ | `PostToolBatchToolCall.tool_response` | A field of `PostToolBatchToolCall`. | Type: `unknown`. Optional. | d.ts line 8007 |
| ✅ | `PostToolUseFailureHookInput` | No description in the d.ts. | Intersection with `PostToolUseFailureHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 8014 |
| ✅ | `PostToolUseFailureHookInput.hook_event_name` | A field of `PostToolUseFailureHookInput`. | Type: `'PostToolUseFailure'`. | d.ts line 8014 |
| ✅ | `PostToolUseFailureHookInput.tool_name` | A field of `PostToolUseFailureHookInput`. | Type: `string`. | d.ts line 8014 |
| ✅ | `PostToolUseFailureHookInput.tool_input` | A field of `PostToolUseFailureHookInput`. | Type: `unknown`. | d.ts line 8014 |
| ✅ | `PostToolUseFailureHookInput.tool_use_id` | A field of `PostToolUseFailureHookInput`. | Type: `string`. | d.ts line 8014 |
| ✅ | `PostToolUseFailureHookInput.error` | A field of `PostToolUseFailureHookInput`. | Type: `string`. | d.ts line 8014 |
| ✅ | `PostToolUseFailureHookInput.is_interrupt` | A field of `PostToolUseFailureHookInput`. | Type: `boolean`. Optional. | d.ts line 8014 |
| ✅ | `PostToolUseFailureHookInput.duration_ms` | Tool execution time in milliseconds. Excludes permission-prompt and hook time. | Type: `number`. Optional. | d.ts line 8014 |
| ✅ | `PostToolUseFailureHookInput.mcp_server` | A field of `PostToolUseFailureHookInput`. | Type: `McpServerProvenance`. Optional. | d.ts line 8014 |
| ✅ | `PostToolUseHookInput` | No description in the d.ts. | Intersection with `PostToolUseHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 8028 |
| ✅ | `PostToolUseHookInput.hook_event_name` | A field of `PostToolUseHookInput`. | Type: `'PostToolUse'`. | d.ts line 8028 |
| ✅ | `PostToolUseHookInput.tool_name` | A field of `PostToolUseHookInput`. | Type: `string`. | d.ts line 8028 |
| ✅ | `PostToolUseHookInput.tool_input` | A field of `PostToolUseHookInput`. | Type: `unknown`. | d.ts line 8028 |
| ✅ | `PostToolUseHookInput.tool_response` | A field of `PostToolUseHookInput`. | Type: `unknown`. | d.ts line 8028 |
| ✅ | `PostToolUseHookInput.tool_use_id` | A field of `PostToolUseHookInput`. | Type: `string`. | d.ts line 8028 |
| ✅ | `PostToolUseHookInput.duration_ms` | Tool execution time in milliseconds. Excludes permission-prompt and hook time. | Type: `number`. Optional. | d.ts line 8028 |
| ✅ | `PostToolUseHookInput.mcp_server` | A field of `PostToolUseHookInput`. | Type: `McpServerProvenance`. Optional. | d.ts line 8028 |
| ✅ | `PreCompactHookInput` | No description in the d.ts. | Intersection with `PreCompactHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 8041 |
| ✅ | `PreCompactHookInput.hook_event_name` | A field of `PreCompactHookInput`. | Type: `'PreCompact'`. | d.ts line 8041 |
| ✅ | `PreCompactHookInput.trigger` | A field of `PreCompactHookInput`. | Type: `'manual' \| 'auto'`. | d.ts line 8041 |
| ✅ | `PreCompactHookInput.custom_instructions` | A field of `PreCompactHookInput`. | Type: `string \| null`. | d.ts line 8041 |
| ✅ | `PreModelSwitchHookInput` | No description in the d.ts. | Intersection with `PreModelSwitchHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 8047 |
| ✅ | `PreModelSwitchHookInput.hook_event_name` | A field of `PreModelSwitchHookInput`. | Type: `'PreModelSwitch'`. | d.ts line 8047 |
| ✅ | `PreModelSwitchHookInput.from_model` | Resolved model id the session was running before the switch | Type: `string`. | d.ts line 8047 |
| ✅ | `PreModelSwitchHookInput.to_model` | Resolved model id the session runs after the switch | Type: `string`. | d.ts line 8047 |
| ✅ | `PreModelSwitchHookInput.requested_model` | What was asked for (alias such as "opus", a full id, or null for "default") | Type: `string \| null`. | d.ts line 8047 |
| ✅ | `PreModelSwitchHookInput.source` | command: /model <name>, the /config Model row, or enabling fast mode when that promotes the model, picker: an interactive model picker, sdk: headless set_model (SDK, Remote Control, IDE) | Type: `'command' \| 'picker' \| 'sdk'`. | d.ts line 8047 |
| ✅ | `PreModelSwitchHookInput.context_tokens` | Prompt tokens that the next request re-sends: the last main-thread response's input, cache read, cache creation, and output tokens. 0 before the first response. | Type: `number`. | d.ts line 8047 |
| ✅ | `PreModelSwitchHookInput.prompt_cache_warm` | Whether the current model's prompt cache is likely still warm (a switch then forfeits it) | Type: `boolean`. | d.ts line 8047 |
| ✅ | `PreModelSwitchHookInput.cache_ttl` | A field of `PreModelSwitchHookInput`. | Type: `'5m' \| '1h'`. | d.ts line 8047 |
| ✅ | `PreModelSwitchHookInput.estimated_cache_write_usd` | Estimated cost of re-caching context_tokens on to_model at its cache-write rate - the managed modelPricing when set, otherwise list price, excludes the response | Type: `number`. | d.ts line 8047 |
| ✅ | `PreModelSwitchHookInput.pricing` | configured: priced at the managed modelPricing setting, catalog: list price, default: to_model unknown, the default tier was assumed | Type: `'configured' \| 'catalog' \| 'default'`. | d.ts line 8047 |
| ✅ | `PreToolUseDecision` | The decision of a `classic.PreToolUse` result: `allow`, `ask`, `deny`, or none. | Object. Its fields have rows below. | d.ts line 8104 |
| ✅ | `PreToolUseDecision.allow` | Lets the call run without a permission prompt (the managed-settings hooks ran first, a deny from them ended the chain above). | Type: `true`. | d.ts line 8104 |
| ✅ | `PreToolUseDecision.ask` | A field of `PreToolUseDecision`. | Type: `undefined`. Optional. | d.ts line 8104 |
| ✅ | `PreToolUseDecision.deny` | A field of `PreToolUseDecision`. | Type: `undefined`. Optional. | d.ts line 8104 |
| ✅ | `PreToolUseDecision.ask` | Asks the user before the call runs, the text is shown as the reason. | Type: `string`. | d.ts line 8104 |
| ✅ | `PreToolUseDecision.allow` | A field of `PreToolUseDecision`. | Type: `undefined`. Optional. | d.ts line 8104 |
| ✅ | `PreToolUseDecision.deny` | A field of `PreToolUseDecision`. | Type: `undefined`. Optional. | d.ts line 8104 |
| ✅ | `PreToolUseDecision.deny` | Refuses the call, the model receives the text as the reason. | Type: `string`. | d.ts line 8104 |
| ✅ | `PreToolUseDecision.allow` | A field of `PreToolUseDecision`. | Type: `undefined`. Optional. | d.ts line 8104 |
| ✅ | `PreToolUseDecision.ask` | A field of `PreToolUseDecision`. | Type: `undefined`. Optional. | d.ts line 8104 |
| ✅ | `PreToolUseDecision.allow` | A field of `PreToolUseDecision`. | Type: `undefined`. Optional. | d.ts line 8104 |
| ✅ | `PreToolUseDecision.ask` | A field of `PreToolUseDecision`. | Type: `undefined`. Optional. | d.ts line 8104 |
| ✅ | `PreToolUseDecision.deny` | A field of `PreToolUseDecision`. | Type: `undefined`. Optional. | d.ts line 8104 |
| ✅ | `PreToolUseHookInput` | No description in the d.ts. | Intersection with `PreToolUseHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 8132 |
| ✅ | `PreToolUseHookInput.hook_event_name` | A field of `PreToolUseHookInput`. | Type: `'PreToolUse'`. | d.ts line 8132 |
| ✅ | `PreToolUseHookInput.tool_name` | A field of `PreToolUseHookInput`. | Type: `string`. | d.ts line 8132 |
| ✅ | `PreToolUseHookInput.tool_input` | A field of `PreToolUseHookInput`. | Type: `unknown`. | d.ts line 8132 |
| ✅ | `PreToolUseHookInput.tool_use_id` | A field of `PreToolUseHookInput`. | Type: `string`. | d.ts line 8132 |
| ✅ | `PreToolUseHookInput.mcp_server` | A field of `PreToolUseHookInput`. | Type: `McpServerProvenance`. Optional. | d.ts line 8132 |
| ✅ | `PreToolUseResult` | What a `classic.PreToolUse` hook returns: one of `allow`, `ask`, `deny`, or none of them, which passes the call on to the normal permission flow. | Intersection of `PreToolUseResult` and `PreToolUseDecision`. Object. Its fields have rows below. The event fires inside `tool.call`, beneath every plugin's `tool.call` hook. | d.ts line 8147 |
| ✅ | `PreToolUseResult.updatedInput` | Replaces the tool's arguments, validated against the tool's schema before the tool runs. | Type: `Record<string, unknown>`. Optional. | d.ts line 8147 |
| ✅ | `PreToolUseResult.additionalContext` | Extra context handed to the model with the call, one entry per note. | Type: `string[]`. Optional. | d.ts line 8147 |
| ✅ | `SDKAssistantMessageError` | No description in the d.ts. | Alias of 13 error names, from `authentication_failed` and `billing_error` to `rate_limit`, `overloaded`, `model_not_found`, `server_error`, `max_output_tokens`, and `unknown`. | d.ts line 10875 |
| ✅ | `SessionEndHookInput` | No description in the d.ts. | Intersection with `SessionEndHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 11463 |
| ✅ | `SessionEndHookInput.hook_event_name` | A field of `SessionEndHookInput`. | Type: `'SessionEnd'`. | d.ts line 11463 |
| ✅ | `SessionEndHookInput.reason` | A field of `SessionEndHookInput`. | Type: `ExitReason`. | d.ts line 11463 |
| ✅ | `SessionStartHookInput` | No description in the d.ts. | Intersection with `SessionStartHookInput`, `BaseHookInput`. Object. Its fields have rows below. | d.ts line 12130 |
| ✅ | `SessionStartHookInput.hook_event_name` | A field of `SessionStartHookInput`. | Type: `'SessionStart'`. | d.ts line 12130 |
| ✅ | `SessionStartHookInput.source` | A field of `SessionStartHookInput`. | Type: `'startup' \| 'resume' \| 'clear' \| 'compact' \| 'fork'`. | d.ts line 12130 |
| ✅ | `SessionStartHookInput.agent_type` | A field of `SessionStartHookInput`. | Type: `string`. Optional. | d.ts line 12130 |
| ✅ | `SessionStartHookInput.model` | A field of `SessionStartHookInput`. | Type: `string`. Optional. | d.ts line 12130 |
| ✅ | `SessionStartHookInput.session_title` | A field of `SessionStartHookInput`. | Type: `string`. Optional. | d.ts line 12130 |
| ✅ | `SessionStartHookInput.seconds_since_last_response` | resume/fork: seconds since the resumed transcript's last assistant response | Type: `number`. Optional. | d.ts line 12130 |
| ✅ | `SessionStartHookInput.context_tokens` | resume/fork: the resumed transcript's last response input + cache_read + cache_creation + output tokens (for a server-side tool loop, its last iteration's window, not the summed totals) | Type: `number`. Optional. | d.ts line 12130 |
| ✅ | `SessionStartHookInput.prompt_cache_likely_expired` | resume/fork: seconds_since_last_response exceeds the prompt-cache TTL, so the first request re-caches context_tokens | Type: `boolean`. Optional. | d.ts line 12130 |
| ✅ | `SessionStartHookInput.estimated_cache_write_usd` | resume/fork: estimated cost of re-caching context_tokens on the session model - the managed modelPricing when set, otherwise list price, excludes the response | Type: `number`. Optional. | d.ts line 12130 |

## See Also

- [Mod API: Classic Event Types](Claude-Code-Mod-API-Classic-Types)
- [Mod API: Classic Event Types (Part 3)](Claude-Code-Mod-API-Classic-Types-3)
- [Hooks](Claude-Code-Hooks)
- [Claude Code Mod API](Claude-Code-Mod-API)
