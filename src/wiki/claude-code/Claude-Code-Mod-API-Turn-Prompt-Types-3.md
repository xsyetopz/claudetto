# Mod API: Turn and Prompt Types (Part 3)

These are the last of the types behind `$.turn`, `$.prompt`, and their events.
They run from `TurnCompleteFields` to `UsageUnit`, and most of them are pieces of a model step.
Example: `for (const use of response.serverToolUses ?? []) $.ui.log(use.name)`.

## Types

| Mark | Item | What it is for | Shape and limits | Source |
| --- | --- | --- | --- | --- |
| ✅ | `TurnCompleteFields` | What every `turn.complete` carries whatever its reason: the answer, the duration, the interrupt flag, the turn's id, its loop and what it cost. | Object. Its fields have rows below. | d.ts line 13938 |
| ✅ | `TurnCompleteFields.answer` | The assistant's final visible text this turn ("" if none, e.g. thinking-only). | Type: `string`. For a subagent that handed its report back, this is the report as delivered. A refused hand-back changes nothing. | d.ts line 13938 |
| ✅ | `TurnCompleteFields.durationMs` | Wall-clock length of the turn in milliseconds. | Type: `number`. | d.ts line 13938 |
| ✅ | `TurnCompleteFields.isAborted` | True when the turn ended by interruption (`reason === 'aborted'`). | Type: `boolean`. | d.ts line 13938 |
| ✅ | `TurnCompleteFields.turnId` | The turn's id, the same one its `turn.start` and every `turn.step` carried, on the main loop and in a subagent's run alike. | Type: `string`. A hook that heard a turn's start hears its end too, even for an aborted run. | d.ts line 13938 |
| ✅ | `TurnCompleteFields.agentId` | The loop the turn ran in: a subagent's id, as `$.agent.spawn` resolves it, each run of its loop one turn, absent on the main loop. | Type: `string`. Optional. Pinned: a different value is refused. Every hook hears an agent's end, so a plugin gets its child's answer. | d.ts line 13938 |
| ✅ | `TurnCompleteFields.usage` | What the turn cost: its real requests' token counts, plus what a made-up response's stop stated, summed, and the model of the last that counted. | Type: `TurnUsage`. Optional. A response a `turn.step` hook made up adds nothing unless its stop states usage, absent when nothing counted (an interrupt, an API error). | d.ts line 13938 |
| ✅ | `TurnCompleteInput` | The input of `turn.complete`: the assistant's final message of a turn, at the moment the turn ends (where the turn's duration is reported). | Alias of `TurnCompleteFields & (TurnCompleteRefused \| TurnCompleteUnrefused)`. `reason` says why it ended, `refusal` exists on a refusal alone. Used by `turn.complete`, `$.turn.complete`. | d.ts line 13990 |
| ✅ | `TurnCompleteReason` | Why a turn ended: the model answered, the user interrupted it, the model refused with no fallback model to retry on, or an API error ended it. | Alias of `'answer' \| 'aborted' \| 'refusal' \| 'error'`. | d.ts line 13996 |
| ✅ | `TurnCompleteRefused` | The end of a turn the model refused with no fallback model to retry on: what the API said of the refusal rides along. | Object. Its fields have rows below. | d.ts line 14002 |
| ✅ | `TurnCompleteRefused.reason` | A field of `TurnCompleteRefused`. | Type: `'refusal'`. | d.ts line 14002 |
| ✅ | `TurnCompleteRefused.refusal` | A field of `TurnCompleteRefused`. | Type: `TurnRefusal`. | d.ts line 14002 |
| ✅ | `TurnCompleteResult` | What a `turn.complete` hook returns and what `next(e)` resolves to: `{ text }`, a text other than a main-loop answer's is shown beneath it. | Object. Its fields have rows below. Core fills `usage` from `e.usage` when the turn had one. Used by `turn.complete`, `$.turn.complete`. | d.ts line 14014 |
| ✅ | `TurnCompleteResult.text` | A field of `TurnCompleteResult`. | Type: `string`. | d.ts line 14014 |
| ✅ | `TurnCompleteResult.usage` | A field of `TurnCompleteResult`. | Type: `TurnUsage`. Optional. | d.ts line 14014 |
| ✅ | `TurnCompleteUnrefused` | The end of a turn that was not a refusal: answered, interrupted, or dead on an API error (retries exhausted, the context limit), nothing more. | Object. Its fields have rows below. | d.ts line 14023 |
| ✅ | `TurnCompleteUnrefused.reason` | A field of `TurnCompleteUnrefused`. | Type: `Exclude<TurnCompleteReason, 'refusal'>`. | d.ts line 14023 |
| ✅ | `TurnRefusal` | What the API said about a refusal that ended a turn: the classifier's category and its explanation, each null when the API sent none. | Object. Its fields have rows below. | d.ts line 14031 |
| ✅ | `TurnRefusal.category` | A field of `TurnRefusal`. | Type: `string \| null`. | d.ts line 14031 |
| ✅ | `TurnRefusal.explanation` | A field of `TurnRefusal`. | Type: `string \| null`. | d.ts line 14031 |
| ✅ | `TurnStartInput` | The input of `turn.start`: the prompt a model turn begins with, the main loop's or a subagent's or teammate's run (`agentId`). | Object. Its fields have rows below. On the main loop it comes after `prompt.submit` and the `UserPromptSubmit` settings hooks. Used by `turn.start`, `$.turn.start`. | d.ts line 14044 |
| ✅ | `TurnStartInput.text` | The user's text as the turn proceeds with it ("" for a turn started without a typed prompt, e.g. a continuation). | Type: `string`. In a subagent's run, the prompt the run begins with. It is empty for a continued turn. | d.ts line 14044 |
| ✅ | `TurnStartInput.turnId` | The turn's id, minted here, the same one every `turn.step` and the `turn.complete` of this turn carry. | Type: `string`. | d.ts line 14044 |
| ✅ | `TurnStartInput.agentId` | The loop the turn runs in: a subagent's or teammate's id, as `agent.spawn` answers it and `$.agent.list()` lists it, absent on the main loop. | Type: `string`. Optional. Pinned: a different value is refused. The hooks that an agent's spawn was nested in do not hear its start. | d.ts line 14044 |
| ✅ | `TurnStartResult` | What a `turn.start` hook returns and what `next(e)` resolves to: `{ turnId }`, echoed by core, a hook's own value does not change the turn. | Object. Its fields have rows below. Used by `turn.start`, `$.turn.start`. | d.ts line 14074 |
| ✅ | `TurnStartResult.turnId` | A field of `TurnStartResult`. | Type: `string`. | d.ts line 14074 |
| ✅ | `TurnStepChunk` | One piece of a `turn.step` response as it streams through the chain: what a hook's `next(e)` yields and what the hook yields up in turn. | Alias of six chunk types: text, thinking, tool start, tool input, stop, and `engine`. The first five are plain data a hook reads and rewrites. `engine` is passed on unread. Used by `$.turn.step`. | d.ts line 14086 |
| ✅ | `TurnStepEngineChunk` | An item of the engine's stream the other chunk kinds do not model (the envelope, a block's start and end, a retry marker), opaque by `ref`. | Object. Its fields have rows below. A tool call that the API runs itself streams as these chunks. Pass each on as it came. | d.ts line 14096 |
| ✅ | `TurnStepEngineChunk.kind` | A field of `TurnStepEngineChunk`. | Type: `'engine'`. | d.ts line 14096 |
| ✅ | `TurnStepEngineChunk.ref` | The engine's handle on the item, opaque, this step's only. | Type: `number`. | d.ts line 14096 |
| ✅ | `TurnStepInput` | The input of `turn.step`: one model request inside a turn, at the moment the engine is about to send it, the bottom of the chain sends it. | Object. Its fields have rows below. The transcript is not on it. `messageCount` says how many messages go out. A hook rewrites `model` or `effort` only. Used by `turn.step`, `$.turn.step`. | d.ts line 14113 |
| ✅ | `TurnStepInput.turnId` | The turn this step belongs to: its `turn.start`'s id, which its `turn.complete` will carry too. Pinned. | Type: `string`. | d.ts line 14113 |
| ✅ | `TurnStepInput.index` | The step's position in the turn, from 0. Pinned. | Type: `number`. | d.ts line 14113 |
| ✅ | `TurnStepInput.model` | Which model the request names, as the engine resolved it for this step (the session's, a fallback's). `next({ ...e, model })` names another. | Type: `string`. | d.ts line 14113 |
| ✅ | `TurnStepInput.effort` | How hard the request asks the model to think: the session's setting or the model's default, absent for a model without effort, rewritable. | Type: `'low' \| 'medium' \| 'high' \| 'xhigh' \| 'max' \| number`. Optional. | d.ts line 14113 |
| ✅ | `TurnStepInput.messageCount` | How many messages the request carries (the conversation so far, the turn's tool results included). Pinned: the messages are the engine's. | Type: `number`. | d.ts line 14113 |
| ✅ | `TurnStepInput.agentId` | The loop the request is made in: a subagent's id, the `id` `$.agent.list()` gives it and its `tool.call`s carry, absent on main. | Type: `string`. Optional. Pinned: a different value is refused. A subagent that a hook spawned steps past that hook. | d.ts line 14113 |
| ✅ | `TurnStepInputChunk` | A piece of a tool call's arguments as they arrive: JSON text, partial, for the `tool` chunk of the same `index`. | Object. Its fields have rows below. The tool arguments are these pieces joined and parsed once the block ends. Broken JSON leaves the call with no usable arguments. | d.ts line 14157 |
| ✅ | `TurnStepInputChunk.kind` | A field of `TurnStepInputChunk`. | Type: `'input'`. | d.ts line 14157 |
| ✅ | `TurnStepInputChunk.index` | A field of `TurnStepInputChunk`. | Type: `number`. | d.ts line 14157 |
| ✅ | `TurnStepInputChunk.json` | The next piece of the arguments' JSON text. | Type: `string`. | d.ts line 14157 |
| ✅ | `TurnStepResult` | What a `turn.step` hook returns and what `next(e)` resolves to: the model's response to the step's request, once its blocks are all in. | Object. Its fields have rows below. A hook's own value changes what the hooks above it read, never what the engine streamed. Used by `turn.step`, `$.turn.step`. | d.ts line 14173 |
| ✅ | `TurnStepResult.turnId` | The turn this step belongs to, as received. | Type: `string`. | d.ts line 14173 |
| ✅ | `TurnStepResult.index` | The step's position in the turn, as received. | Type: `number`. | d.ts line 14173 |
| ✅ | `TurnStepResult.answer` | The visible text of the response ("" when it only called tools, only thought, or no request was made). | Type: `string`. | d.ts line 14173 |
| ✅ | `TurnStepResult.toolUses` | The tool calls the response asks the engine to run, in order, empty for a step that asks for none. | Type: `readonly TurnStepToolUse[]`. | d.ts line 14173 |
| ✅ | `TurnStepResult.serverToolUses` | The tool calls the API ran itself inside the request (the advisor is one), in order, each with when it started and ended. | Type: `readonly TurnStepServerToolUse[]`. Optional. Tools that the API ran itself. A hook reads them here and cannot refuse or rewrite them. | d.ts line 14173 |
| ✅ | `TurnStepResult.stopReason` | Why the model stopped, null when no response arrived (the request failed or was interrupted before a message, or no request was made). | Type: `TurnStopReason`. | d.ts line 14173 |
| ✅ | `TurnStepResult.usage` | What the request cost as the API reported it, and the model that answered, null when no response arrived or it carried no usage. | Type: `TurnUsage \| null`. | d.ts line 14173 |
| ✅ | `TurnStepServerToolUse` | One tool call of a step that the API ran itself, inside the request (the advisor is one): the engine ran nothing for it. | Object. Its fields have rows below. No `tool.check`, `tool.call`, or `tool.describe` chain runs for it. A tool that the engine runs, such as `WebSearch`, is in `toolUses`. | d.ts line 14224 |
| ✅ | `TurnStepServerToolUse.id` | The call's id, as its result block names it (`tool_use_id` there). | Type: `string`. | d.ts line 14224 |
| ✅ | `TurnStepServerToolUse.name` | The server tool's name as the API spells it (`advisor`). | Type: `string`. | d.ts line 14224 |
| ✅ | `TurnStepServerToolUse.input` | The arguments the model gave it. | Type: `unknown`. | d.ts line 14224 |
| ✅ | `TurnStepServerToolUse.startedAt` | When the model had written the call and the API began to run it, in `$.clock.now()`'s milliseconds. | Type: `number`. | d.ts line 14224 |
| ✅ | `TurnStepServerToolUse.endedAt` | When the call's result had arrived, in the same milliseconds. | Type: `number`. Optional. Absent when the response ended before the result, such as a cut stream. | d.ts line 14224 |
| ✅ | `TurnStepStopChunk` | The response is whole: why the model stopped and what the request cost, as the step's result will carry them. The last chunk of one response. | Intersection with `TurnStepStopChunk`, `ChunkRef`. Object. Its fields have rows below. | d.ts line 14256 |
| ✅ | `TurnStepStopChunk.kind` | A field of `TurnStepStopChunk`. | Type: `'stop'`. | d.ts line 14256 |
| ✅ | `TurnStepStopChunk.stopReason` | A field of `TurnStepStopChunk`. | Type: `TurnStopReason`. | d.ts line 14256 |
| ✅ | `TurnStepStopChunk.usage` | A field of `TurnStepStopChunk`. | Type: `TurnUsage \| null`. | d.ts line 14256 |
| ✅ | `TurnStepTextChunk` | A piece of the response's visible text as it arrives, in block `index`. | Object. Its fields have rows below. The text on screen and the text in the transcript are both these chunks joined in order. A rewrite changes both. | d.ts line 14269 |
| ✅ | `TurnStepTextChunk.kind` | A field of `TurnStepTextChunk`. | Type: `'text'`. | d.ts line 14269 |
| ✅ | `TurnStepTextChunk.index` | The content block the piece belongs to, from 0 within one response. | Type: `number`. | d.ts line 14269 |
| ✅ | `TurnStepTextChunk.text` | A field of `TurnStepTextChunk`. | Type: `string`. | d.ts line 14269 |
| ✅ | `TurnStepThinkingChunk` | A piece of the model's thinking as it arrives, in block `index`: what the person sees of it live. | Object. Its fields have rows below. The transcript keeps the thinking block the model signed. Thinking that a hook streams alone is shown and not recorded. | d.ts line 14286 |
| ✅ | `TurnStepThinkingChunk.kind` | A field of `TurnStepThinkingChunk`. | Type: `'thinking'`. | d.ts line 14286 |
| ✅ | `TurnStepThinkingChunk.index` | A field of `TurnStepThinkingChunk`. | Type: `number`. | d.ts line 14286 |
| ✅ | `TurnStepThinkingChunk.text` | A field of `TurnStepThinkingChunk`. | Type: `string`. | d.ts line 14286 |
| ✅ | `TurnStepToolChunk` | The model begins a tool call in block `index`: the tool's name and the call's id, its arguments follow as `input` chunks of the same index. | Intersection with `TurnStepToolChunk`, `ChunkRef`. Object. Its fields have rows below. A block whose `tool` chunk never comes out of the chain is no tool call: the engine records none and runs none. | d.ts line 14299 |
| ✅ | `TurnStepToolChunk.kind` | A field of `TurnStepToolChunk`. | Type: `'tool'`. | d.ts line 14299 |
| ✅ | `TurnStepToolChunk.index` | A field of `TurnStepToolChunk`. | Type: `number`. | d.ts line 14299 |
| ✅ | `TurnStepToolChunk.id` | The call's `tool_use_id`. | Type: `string`. | d.ts line 14299 |
| ✅ | `TurnStepToolChunk.name` | The tool's name (`Read`, `Bash`, `mcp__server__tool`). | Type: `string`. | d.ts line 14299 |
| ✅ | `TurnStepToolUse` | One tool call the model asked for in a step: the tool's name and its arguments. | Object. Its fields have rows below. | d.ts line 14316 |
| ✅ | `TurnStepToolUse.name` | The tool's name (`Read`, `Bash`, `mcp__server__tool`). | Type: `string`. | d.ts line 14316 |
| ✅ | `TurnStepToolUse.input` | The arguments the model gave it, as the tool schema shapes them. | Type: `unknown`. | d.ts line 14316 |
| ✅ | `TurnStopReason` | Why the model stopped, as a `turn.step` result and its stop chunk carry it: one of the API's stop reasons, or null when no response arrived. | Alias of `'end_turn' \| 'max_tokens' \| 'stop_sequence' \| 'tool_use' \| 'pause_turn' \| 'compaction' \| 'refusal' \| 'model_context_window_exceeded' \| null`. | d.ts line 14331 |
| ✅ | `TurnUsage` | What a model turn, or one response inside it, cost as the API reported it: the four token counts (ModelUsage) and the model's id. | Intersection with `TurnUsage`, `ModelUsage`. Object. Its fields have rows below. A turn's counts are its responses' summed, its model is the last response's. | d.ts line 14339 |
| ✅ | `TurnUsage.model` | Which model answered, by the id the API reports. | Type: `string`. | d.ts line 14339 |
| ✅ | `UndeclaredAttachmentInput` | One `prompt.attachment` input of every other type, the ones PromptAttachmentDetailOf does not name: the attachment's text alone. | Object. Its fields have rows below. | d.ts line 15236 |
| ✅ | `UndeclaredAttachmentInput.type` | As the engine names the attachment's kind, the key a matcher narrows on. Pinned. Builds add and retire kinds: match by name. | Type: `string`. The attachment kind, such as `todo_reminder`, `auto_mode`, `instructions`, `nested_memory`, `skill_listing`, `file`, or `queued_command`. | d.ts line 15236 |
| ✅ | `UndeclaredAttachmentInput.text` | What the model reads for this attachment, inside the engine's framing, rewritable with `next({ ...e, text })`. | Type: `string`. The `<system-reminder>` wrapper goes around what the chain answers, never inside it. Several text blocks arrive joined by newlines. | d.ts line 15236 |
| ✅ | `UndeclaredAttachmentInput.origin` | Who authored the text (PromptAttachmentOrigin): the engine, a settings hook, or a plugin's chain context. | Type: `PromptAttachmentOrigin`. Pinned: a different value is refused, one left out is kept. | d.ts line 15236 |
| ✅ | `UndeclaredAttachmentInput.agentId` | The loop whose request carries the attachment: a subagent's id, the `id` `$.agent.list()` gives it and its `tool.call`s carry, absent on main. | Type: `string`. Optional. Pinned: a different value is refused, one left out is kept. A subagent a hook spawned through `$.agent.spawn` is resolved past that hook. | d.ts line 15236 |
| ✅ | `UndeclaredAttachmentInput.detail` | Absent, the key itself: the engine declares no facts for the type, and a rewrite that adds the key is refused. | Type: `undefined`. Optional. Example: `if (!("detail" in e)) return next(e)`. | d.ts line 15236 |
| ✅ | `UsageUnit` | One unit of what `$.session.usage()` answers, by its key there: the context window's fill, the rate-limit windows, the session's cost. | Alias of `'context' \| 'rateLimits' \| 'cost'`. | d.ts line 15306 |

## See Also

- [Mod API: Turn and Prompt Types (Part 2)](Claude-Code-Mod-API-Turn-Prompt-Types-2)
- [Mod API: Turn and Prompt](Claude-Code-Mod-API-Turn-Prompt)
- [Claude Code Mod API](Claude-Code-Mod-API)
- [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference)
