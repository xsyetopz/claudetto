# Mod API events of Claude Code 2.1.296, part 2

Scope: the classic settings events (`classic.<Name>`) and the plugin noun events of the hooks module.
Part 1 maps the 46 engine events in `mod-api-events.md`.
Facts are marked `d.ts`, `bundle`, or `inferred`.
Line numbers `index.d.ts:N` point to `plugins/dotclaude/.claude-plugin/types/claude-code/index.d.ts`.

## Classic events

Each cell of the classic table is `d.ts` unless it carries `inferred` or `bundle`.
The 33 classic events are the members of `HookInput` (`index.d.ts:5182`, `d.ts`).
Each one has a name `classic.<Name>` in `ClassicEventOf` (`index.d.ts:1257`, `d.ts`).
Each fires wherever the engine runs the classic hook, with or without a settings hook (`index.d.ts:1240`, `d.ts`).
The chain is managed settings hooks, then the hooks modules, then the other settings hooks as core (`index.d.ts:1257`, `d.ts`).
A `*` or `classic.*` hook reaches a classic event as it reaches a named one (`index.d.ts:1241`, `d.ts`).
A hook that blocks and fails is skipped, and the hooks beneath it decide, unless its `.catch` answers (`index.d.ts:1257`, `d.ts`).
The module return for every event except `classic.PreToolUse` is `block`, `preventContinuation`, `stopReason`, and the event's own fields (`index.d.ts:1392`, `d.ts`).
The `block` field is the command form's `decision: "block"` with exit code 2 (`index.d.ts:1284`, `d.ts`).
The `preventContinuation` field is the command form's `continue: false` (`index.d.ts:1289`, `d.ts`).
`classic.PreToolUse` returns `allow`, `ask`, or `deny`, plus `updatedInput` and `additionalContext` (`index.d.ts:7992`, `d.ts`).
The `classic.PreToolUse` input is `ToolCallEnvelope` and not the stdin object (`index.d.ts:1258`, `d.ts`).
The `classic.PreToolUse` event fires inside `tool.call`, beneath every plugin's `tool.call` hook (`index.d.ts:7989`, `d.ts`).
The `cc-plugin-sec-default` builtin seats outermost on managed machines and for Team and Enterprise (`bundle`).
The bundle lists no per-event routing for `cc-plugin-sec-default` in the strings I searched (`bundle`, inferred gap).
The `$` calls from `classic.PreToolUse` carry an "is holding" note, and from other classic events a "may be holding" note (`bundle`).
Only `classic.SessionStart`, `classic.Setup`, and `classic.SessionEnd` lack the "may be holding" note (`bundle`).
The `subagent` column reads `agent_id` in `BaseHookInput`, present when a hook fires inside a subagent (`index.d.ts:832`, `d.ts`).

| Event | Input beyond base (`d.ts`) | Module return fields (`d.ts`) | Refusal | Subagent | Command form covered | Line |
| --- | --- | --- | --- | --- | --- | --- |
| `classic.PreToolUse` | `ToolCallEnvelope` (`index.d.ts:12662`), not the stdin object | `allow`, `ask`, `deny`, `updatedInput`, `additionalContext` | `deny: string` | inferred yes | open (command JSON untyped) | `7977`, `7992` |
| `classic.PostToolUse` | `tool_name`, `tool_input`, `tool_response`, `tool_use_id`, `duration_ms?`, `mcp_server?` | `additionalContext`, `updatedToolOutput`, `updatedMCPToolOutput` | `block` | inferred yes | yes for typed fields | `7873`, `1374` |
| `classic.PostToolUseFailure` | `tool_name`, `tool_input`, `tool_use_id`, `error`, `is_interrupt?`, `duration_ms?` | `additionalContext` | `block` | inferred yes | yes for typed fields | `7859`, `1375` |
| `classic.PostToolBatch` | `tool_calls[]` of `tool_name`, `tool_input`, `tool_use_id`, `tool_response?` | `additionalContext` | `block` | inferred yes | yes for typed fields | `7847`, `1376` |
| `classic.PermissionDenied` | `tool_name`, `tool_input`, `tool_use_id`, `reason`, `mcp_server?` | `retry` | none typed (`retry` not a refusal) | inferred yes | yes for typed fields | `7487`, `1379` |
| `classic.PermissionRequest` | `tool_name`, `tool_input`, `permission_suggestions?`, `mcp_server?` | `decision` (`allow` with rewrite, or `deny`) | `decision.behavior: "deny"` | inferred yes | yes, same `decision` object | `7515`, `1380`, `7505` |
| `classic.Notification` | `message`, `title?`, `notification_type` | none beyond base fields | `block` | inferred yes | yes for typed fields | `6700` |
| `classic.UserPromptSubmit` | `prompt`, `source?`, `session_title?` | `additionalContext`, `sessionTitle`, `suppressOriginalPrompt` | `block` | inferred no | yes for typed fields | `14669`, `1367` |
| `classic.UserPromptExpansion` | `expansion_type`, `command_name`, `command_args`, `command_source?`, `prompt` | `additionalContext`, `suppressOriginalPrompt` | `block` | inferred no | yes for typed fields | `14660`, `1368` |
| `classic.SessionStart` | `source`, `agent_type?`, `model?`, `session_title?`, `seconds_since_last_response?`, `context_tokens?`, `prompt_cache_likely_expired?` | `additionalContext`, `initialUserMessage`, `sessionTitle`, `watchPaths`, `reloadSkills` | `block` | inferred no | open (dispatch), see below | `11651`, `1369` |
| `classic.SessionEnd` | `reason` (`ExitReason`) | none beyond base fields | `block` | inferred no | yes for typed fields | `11044` |
| `classic.Setup` | `trigger` (`init`, `maintenance`) | `additionalContext` | `block` | inferred no | yes for typed fields | `11826`, `1370` |
| `classic.Stop` | `stop_hook_active`, `last_assistant_message?`, `background_tasks?`, `session_crons?` | `additionalContext` | `block` (re-prompt) | inferred main thread | yes for typed fields | `12125`, `1377`, `1284` |
| `classic.StopFailure` | `error`, `error_details?`, `last_assistant_message?` | none beyond base fields | `block` | inferred no | yes for typed fields | `12118` |
| `classic.SubagentStart` | `agent_id`, `agent_type` | `additionalContext` | `block` | yes (`d.ts`, the event is the subagent's) | yes for typed fields | `12246`, `1373` |
| `classic.SubagentStop` | `stop_hook_active`, `agent_id`, `agent_transcript_path`, `agent_type`, `last_assistant_message?`, `background_tasks?`, `session_crons?` | `additionalContext` | `block` | yes (`d.ts`, the event is the subagent's) | yes for typed fields | `12252`, `1378` |
| `classic.PreCompact` | `trigger` (`manual`, `auto`), `custom_instructions` (string or null) | none beyond base fields | `block` | inferred no | yes for typed fields | `7886` |
| `classic.PostCompact` | `trigger` (`manual`, `auto`), `compact_summary` | none beyond base fields | `block` | inferred no | yes for typed fields | `7797` |
| `classic.PreModelSwitch` | `from_model`, `to_model`, `requested_model`, `source` (`command`, `picker`, `sdk`), `context_tokens`, `prompt_cache_warm`, `cache_ttl`, `estimated_cache_write_usd` | `permissionDecision` (`allow`, `deny`, `ask`), `permissionDecisionReason` | `permissionDecision: "deny"` | inferred no | yes, same keys | `7892`, `1325`, `1329` |
| `classic.PostModelSwitch` | as `PreModelSwitch`, plus `source` `auto` and `resume`, and `pricing` | `additionalContext` | `block` | inferred no | yes for typed fields | `7806`, `1372` |
| `classic.Elicitation` | `mcp_server_name`, `message`, `mode?`, `url?`, `elicitation_id?`, `requested_schema?` | none typed (doc: auto-respond) | none typed | inferred no | open (auto-respond not typed) | `3886` |
| `classic.ElicitationResult` | `mcp_server_name`, `elicitation_id?`, `mode?`, `action` (`accept`, `decline`, `cancel`), `content?` | none typed (doc: override response) | none typed | inferred no | open (override not typed) | `3899` |
| `classic.ConfigChange` | `source` (five settings tiers and `skills`), `file_path?` | none beyond base fields | `block` | inferred no | yes for typed fields | `1917` |
| `classic.InstructionsLoaded` | `file_path`, `memory_type`, `load_reason`, `globs?`, `trigger_file_path?`, `parent_file_path?` | none beyond base fields | `block` | inferred no | yes for typed fields | `5557` |
| `classic.WorktreeCreate` | `name` | `worktreePath` | `block` | inferred no | yes for typed fields | `14691`, `1382` |
| `classic.WorktreeRemove` | `worktree_path` | none beyond base fields | `block` | inferred no | yes for typed fields | `14696` |
| `classic.CwdChanged` | `old_cwd`, `new_cwd` | none beyond base fields | `block` | inferred no | yes for typed fields | `3632` |
| `classic.FileChanged` | `file_path`, `event` (`change`, `add`, `unlink`) | none beyond base fields | `block` | inferred no | yes for typed fields | `4818` |
| `classic.DirectoryAdded` | `directory`, `source` (`slash_command`, `register_repo_root`) | none beyond base fields | `block` | inferred no | yes for typed fields | `3759` |
| `classic.MessageDisplay` | `turn_id`, `message_id`, `index`, `final`, and the new lines | `displayContent` | `block` | inferred no | yes for typed fields | `6057`, `1381` |
| `classic.TaskCreated` | `task_id`, `task_subject`, `task_description?`, `teammate_name?`, `team_name?` (deprecated) | none beyond base fields | `block` | inferred no | yes for typed fields | `12336` |
| `classic.TaskCompleted` | as `TaskCreated` | none beyond base fields | `block` | inferred no | yes for typed fields | `12324` |
| `classic.TeammateIdle` | `teammate_name`, `team_name?` (deprecated) | none beyond base fields | `block` | inferred no | yes for typed fields | `12348` |

Every row's sec-default routing is the same: outermost on managed machines, with no per-event list in the bundle (`bundle`).
The `Command form covered` column answers only for `block`, `preventContinuation`, `stopReason`, and the typed event fields (`d.ts`).
Command JSON keys that the `d.ts` does not type are not covered by that answer.

## Plugin noun events

A plugin noun is a key of `EngineInterface` that `CoreEngineInterface` does not declare (`index.d.ts:7652`, `d.ts`).
The core `EngineInterface` body is empty, so core has no noun event rows (`index.d.ts:4494`, `d.ts`).
The `$` calls of the core are not noun events, and they are in `OpEventOf` (`index.d.ts:6844`, `d.ts`).
The rows below are the pattern that a plugin noun method gets, with no core instance.

| Name | Input (first parameter) | Return (`value`) | Refusal | Line |
| --- | --- | --- | --- | --- |
| `<noun>.<method>`, none declared in core | the first parameter, or `NoArgs` when the method takes none (`index.d.ts:6724`, `d.ts`) | `{ value }`, the awaited method result (`index.d.ts:6748`, `d.ts`) | `{ deny: string }` (`index.d.ts:14683`, `d.ts`) | `6740`, `6722`, `6754` |

The `NounEventOf` map is keyed by `E['name']`, so a method's name is its event name (`index.d.ts:6741`, `d.ts`).

## Open for experiment

- `classic.PreToolUse` dispatches to a module in 2.1.296: the `d.ts` says it does, but issue #96831 said it did not in 2.1.281 (`d.ts`, `index.d.ts:1240`).
  Test: a module with `on("classic.PreToolUse", ...)` that writes to a log, one Bash call in `just sandbox`, and the log must hold one line.
- `classic.SessionStart` dispatches to a module in 2.1.296 (`d.ts`, same issue #96831).
  Test: a module with `on("classic.SessionStart", ...)` that logs, one fresh start and one `--resume`, and the log must hold both.
- `classic.SubagentStop` fires when the agent reaches `maxTurns` (`d.ts` defines `maxTurns` as the stop, `index.d.ts:500`, but not the hook).
  Test: an agent with `maxTurns: 1` and a module on `classic.SubagentStop` that logs `stop_hook_active` and `agent_id`.
- The `classic.PreToolUse` command JSON (`permissionDecision`, `permissionDecisionReason`) maps to the module `allow`, `ask`, and `deny` (`inferred`, the `d.ts` types no such command keys for this event).
  Test: a command hook and a module that each deny one Bash call, and the reason text that the model reads must match in kind.
- Classic hooks fire inside a subagent with `agent_id` set, per event (`inferred` from `index.d.ts:832`).
  Test: a subagent that runs one Read, with a module on `classic.PreToolUse` that logs `agent_id` from its stdin object.
- A `classic.Stop` module that returns `block` re-prompts the model (`d.ts` says "veto or re-prompt", `index.d.ts:1284`).
  Test: a module on `classic.Stop` that blocks once, and the transcript must show a new turn.
- A `$` call from `classic.PreToolUse` is refused or waits (`bundle` names "is holding" for that event).
  Test: a module on `classic.PreToolUse` that calls `$.ui.notify`, and the call must finish or throw, with the outcome logged.
- A `$` call from `classic.SessionStart` runs without the wait (`bundle` exempts this event from "may be holding").
  Test: a module on `classic.SessionStart` that calls `$.ui.notify`, and the call must finish before the first prompt.
- `updatedInput` from `classic.PreToolUse` is checked against the tool schema (`d.ts` says so, `index.d.ts:7994`).
  Test: a module that rewrites a Bash `command` to an invalid type, and the tool must refuse before it runs.
- `updatedToolOutput` from `classic.PostToolUse` replaces the result the model reads (`d.ts`, `index.d.ts:1335`).
  Test: a module that rewrites a Read result, and the next model turn must quote the new text.
- Whether `cc-plugin-sec-default` hooks any given classic event (`bundle` shows no per-event list).
  Test: a managed settings file that enables the builtin, then a module on each classic event that logs its name.
- Whether a classic event fires with no settings hook configured (`d.ts` says it does, `index.d.ts:1240`).
  Test: an empty `hooks` setting, one module on `classic.Setup`, and one `--resume` start.
- Whether `preventContinuation` from `classic.SessionStart` stops the session at once (`d.ts`, `index.d.ts:1289`).
  Test: a module that returns `preventContinuation` with a `stopReason`, and the session must end before the first prompt.
- Whether a command JSON key that the `d.ts` does not type (for example `systemMessage`) reaches the user (`inferred`).
  Test: a command hook that prints the key, and a module that returns the same text, both compared in the transcript.
