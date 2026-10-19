# Mod API: Model, Audio, and MCP Types

These are the types behind `$.model`, `$.audio`, and `$.mcp`.
They describe the request and the answer of a model call, the cache marks of a prompt, and the result of an MCP call.
Example: `const r = await $.model.complete({ model: "haiku", prompt, effort: "low" })`.

## Types

| Mark | Item | What it is for | Shape and limits | Source |
| --- | --- | --- | --- | --- |
| ✅ | `ApiContentBlock` | One content block of an ApiMessage: `type` names its kind (`text`, `tool_use`, `tool_result`, `image`, `document`, `thinking`, ...). | Object. Its fields have rows below. The other fields are that kind's as the Messages API defines them (see its reference), the engine hands the block over as it holds it, nothing renamed or dropped. | d.ts line 650 |
| ✅ | `ApiContentBlock.type` | The block's kind, the rest of the block is that kind's fields. | Type: `string`. | d.ts line 650 |
| ✅ | `ApiContentBlock.[field: string]` | A field of `ApiContentBlock`. | Type: `unknown`. | d.ts line 650 |
| ✅ | `ApiMessage` | One message of the conversation in Messages API form, as `$.session.messages({ as: "api" })` returns it. | Object. Its fields have rows below. The messages the next request is built from, at most 4096, opening on a user message. | d.ts line 666 |
| ✅ | `ApiMessage.role` | Who wrote it. | Type: `'user' \| 'assistant'`. | d.ts line 666 |
| ✅ | `ApiMessage.content` | Its blocks in order, always an array: text, tool_use and tool_result (paired across an assistant message and the next), image and document. | Type: `ApiContentBlock[]`. Media blocks stay inline and thinking goes back. The system prompt and the tool list are in no message. | d.ts line 666 |
| ✅ | `AudioClip` | What `$.audio.play` plays: a URL the engine fetches, or the bytes. | Object. Its fields have rows below. Used by `$.audio.play`, `audio.play`. | d.ts line 786 |
| ✅ | `AudioClip.asset` | A file of the calling plugin's own, relative to the plugin's directory (`fx/open.wav`), no `.`, no leading slash. | Type: `string`. The engine resolves it and loads the file from disk. | d.ts line 786 |
| ✅ | `AudioClip.url` | A field of `AudioClip`. | Type: `undefined`. Optional. | d.ts line 786 |
| ✅ | `AudioClip.base64` | A field of `AudioClip`. | Type: `undefined`. Optional. | d.ts line 786 |
| ✅ | `AudioClip.mime` | A field of `AudioClip`. | Type: `undefined`. Optional. | d.ts line 786 |
| ✅ | `AudioClip.url` | The clip's URL, the engine fetches it (never the plugin), or refuses it as `$.http.fetch` would refuse the same URL. | Type: `string`. | d.ts line 786 |
| ✅ | `AudioClip.asset` | A field of `AudioClip`. | Type: `undefined`. Optional. | d.ts line 786 |
| ✅ | `AudioClip.base64` | A field of `AudioClip`. | Type: `undefined`. Optional. | d.ts line 786 |
| ✅ | `AudioClip.mime` | A field of `AudioClip`. | Type: `undefined`. Optional. | d.ts line 786 |
| ✅ | `AudioClip.base64` | The clip's bytes, base64. | Type: `string`. | d.ts line 786 |
| ✅ | `AudioClip.mime` | What the bytes are (`audio/mpeg`, `audio/wav`). | Type: `string`. | d.ts line 786 |
| ✅ | `AudioClip.asset` | A field of `AudioClip`. | Type: `undefined`. Optional. | d.ts line 786 |
| ✅ | `AudioClip.url` | A field of `AudioClip`. | Type: `undefined`. Optional. | d.ts line 786 |
| ✅ | `ClassifyOptions` | Options of `$.model.classify`. | Object. Its fields have rows below. Used by `$.model.classify`, `model.classify`. | d.ts line 1425 |
| ✅ | `ClassifyOptions.model` | An alias (`haiku`) or a full model id, default the engine's small fast model. | Type: `string`. Optional. | d.ts line 1425 |
| ✅ | `McpConnectRefusal` | Why `$.mcp.connect` left a server unconnected, in one word, `unlisted` too where the session's host runs the plugin's servers itself. | Alias of `'unlisted' \| 'unapproved' \| 'disabled' \| 'policy' \| 'auth' \| 'failed'`. Each name says why the connection was refused, such as `auth` for a missing sign-in. | d.ts line 6032 |
| ✅ | `McpConnectResult` | What `$.mcp.connect` resolves to and what an `mcp.connect` hook's `{ value }` holds: the server connected, or why not. | Object. Its fields have rows below. Example: `const browser = await $.mcp.connect("browser")`. Used by `$.mcp.connect`, `mcp.connect`. | d.ts line 6041 |
| ✅ | `McpConnectResult.isConnected` | True: the server is connected and its tools are the session's. | Type: `true`. | d.ts line 6041 |
| ✅ | `McpConnectResult.server` | The name /mcp lists it under and `$.mcp.call` takes: usually `plugin:<plugin>:<server>`. | Type: `string`. Or the name the session already runs the same server under. | d.ts line 6041 |
| ✅ | `McpConnectResult.isConnected` | False: the server is not connected. | Type: `false`. | d.ts line 6041 |
| ✅ | `McpConnectResult.reason` | Why, in one word. | Type: `McpConnectRefusal`. | d.ts line 6041 |
| ✅ | `McpConnectResult.message` | The same as one plain sentence, to log or toast. | Type: `string`. | d.ts line 6041 |
| ✅ | `McpContentBlock` | One block of an MCP result: `type` and the fields that kind of block carries. | Object. Its fields have rows below. | d.ts line 6071 |
| ✅ | `McpContentBlock.type` | The block's kind: `text`, `image`, `audio`, `resource`, `resource_link`. | Type: `string`. | d.ts line 6071 |
| ✅ | `McpContentBlock.text` | Set on a `text` block. | Type: `string`. Optional. | d.ts line 6071 |
| ✅ | `McpContentBlock.uri` | Set on a `resource_link` (or embedded `resource`) block. | Type: `string`. Optional. | d.ts line 6071 |
| ✅ | `McpContentBlock.mimeType` | Declared by an image, audio or resource block. | Type: `string`. Optional. | d.ts line 6071 |
| ✅ | `McpContentBlock.[field: string]` | A field of `McpContentBlock`. | Type: `unknown`. | d.ts line 6071 |
| ✅ | `McpServerProvenance` | The MCP server that serves this tool. `name` is the server's config key and `source` says where its definition came from. Key trust on `source`, not on the name. | Object. Its fields have rows below. | d.ts line 6094 |
| ✅ | `McpServerProvenance.name` | A field of `McpServerProvenance`. | Type: `string`. | d.ts line 6094 |
| ✅ | `McpServerProvenance.source` | sdk \| plugin \| user \| project \| local \| dynamic \| managed \| enterprise \| claudeai \| agent - an open set, treat unknown values as an unrecognized configured source, never as sdk. | Type: `string`. | d.ts line 6094 |
| ✅ | `McpToolCallInput` | The MCP branch of a `tool.call` hook's `e` (and of `$.tool.call`'s input): one variant per declared tool, else the loose McpToolCallInputFallback. | Alias of the input types of connected MCP tools. `$.mcp.call(server, tool, args)` does not use it, because its parameters are positional. | d.ts line 6109 |
| ✅ | `McpToolCallInput.[N in keyof McpToolInputs & string]` | A field of `McpToolCallInput`. | Type: `ToolInputOf<N, McpToolInputs[N] & Record<string, unknown>>`. | d.ts line 6109 |
| ✅ | `McpToolCallInputFallback` | The `e` a `tool.call` (or `classic.PreToolUse`) hook receives for an MCP tool while no MCP tool is declared: every `mcp__*` name, loose arguments. | Object. Its fields have rows below. The `input` of `$.tool.call({ tool: "mcp__<server>__<tool>" })` when no tool types are declared. | d.ts line 6124 |
| ✅ | `McpToolCallInputFallback.tool` | The name of the tool being called (`mcp__<server>__<tool>`), comparing it narrows `e`. Reserved: a rewrite of it is ignored by core. | Type: `McpToolName`. | d.ts line 6124 |
| ✅ | `McpToolCallInputFallback.tool_use_id` | The tool_use block's id: the same at every event of the call and in `$.ui.notice`. Reserved: a rewrite of it is ignored by core. | Type: `string`. | d.ts line 6124 |
| ✅ | `McpToolCallInputFallback.[argument: string]` | A field of `McpToolCallInputFallback`. | Type: `unknown`. | d.ts line 6124 |
| ✅ | `McpToolInputs` | The inputs of the MCP tools this project knows, keyed by full tool name, for declaration merging, empty by default, then every MCP tool is loose. | Interface. A `.d.ts` in the author's project adds entries under `declare module "claude-code"`. Then `e.tool === <name>` narrows to them. | d.ts line 6149 |
| ✅ | `McpToolName` | The name of an MCP tool as the engine spells it: `mcp__<server>__<tool>`. | Alias of `` `mcp__${string}__${string}` ``. | d.ts line 6155 |
| ✅ | `McpToolResult` | An MCP tools/call result as the SDK returns it, plain data. | Object. Its fields have rows below. Used by `$.mcp.call`, `mcp.call`. | d.ts line 6160 |
| ✅ | `McpToolResult.content` | The result's content blocks, in order (text, image, resource, resource_link, ...). | Type: `McpContentBlock[]`. | d.ts line 6160 |
| ✅ | `McpToolResult.isError` | True when the server reported the call as failed, the blocks then describe the error. | Type: `boolean`. | d.ts line 6160 |
| ✅ | `McpToolResult.structuredContent` | The server's structured result, when its tool declares an output schema. | Type: `unknown`. Optional. | d.ts line 6160 |
| ✅ | `ModelApiError` | Which kind of API failure ended a model call (a completion, a fork), in the word Claude Code classifies every API error with (StopFailure's). | Alias of the `error` field of the `StopFailure` input. `rate_limit`, `overloaded`, and `server_error` may clear on their own. Others will not. | d.ts line 6224 |
| ✅ | `ModelCompleteInput` | What a hook on `model.complete` reads as `e`: the request with its text as strings, as it always was, and the caller's blocks beside them. | Object. Its fields have rows below. A list of blocks arrives joined in `prompt` and as given in `promptBlocks`. Used by `model.complete`. | d.ts line 6237 |
| ✅ | `ModelCompleteInput.model` | Which model answers, as the request named it (ModelCompleteRequest). | Type: `string`. | d.ts line 6237 |
| ✅ | `ModelCompleteInput.prompt` | The one user message, as text: a string as the caller gave it, or the texts of its blocks joined in order with nothing between them. | Type: `string`. It is what the model is sent: a hook that passes another string down has rewritten the prompt, whatever `promptBlocks` still says. | d.ts line 6237 |
| ✅ | `ModelCompleteInput.system` | What precedes the completion as its system prompt, as text joined as `prompt` is, absent when the caller gave none. | Type: `string`. Optional. Passing `null` or `false` down sends none. | d.ts line 6237 |
| ✅ | `ModelCompleteInput.promptBlocks` | The caller's blocks of `prompt`, as given, when it gave a list: where the cache marks are. Absent for a string. | Type: `readonly ModelTextBlock[]`. Optional. They place cache marks and change no text. A rewritten opening keeps no mark. | d.ts line 6237 |
| ✅ | `ModelCompleteInput.systemBlocks` | The caller's blocks of `system`, read against `system` exactly as `promptBlocks` is against `prompt`. Absent for a string or none. | Type: `readonly ModelTextBlock[]`. Optional. | d.ts line 6237 |
| ✅ | `ModelCompleteInput.maxTokens` | The reply's token cap, as the request gave it. | Type: `number`. Optional. | d.ts line 6237 |
| ✅ | `ModelCompleteInput.effort` | How hard the model thinks about it, as the request gave it. | Type: `ModelEffort`. Optional. | d.ts line 6237 |
| ✅ | `ModelCompleteInput.timeoutMs` | How long the whole call may take, in milliseconds, as the request gave it. | Type: `number`. Optional. | d.ts line 6237 |
| ✅ | `ModelCompleteOptions` | Options of `$.model.complete`: what is no part of the request, so no hook on `model.complete` reads it on `e`. | Object. Its fields have rows below. Used by `$.model.complete`. | d.ts line 6295 |
| ✅ | `ModelCompleteOptions.signal` | Aborting it cuts the call while it runs: it resolves `aborted`, as when its dispatch is aborted. Already aborted, no request is made. | Type: `AbortSignal`. Optional. The plugin's own signal. Aborting it cuts the call, which then resolves `aborted`. | d.ts line 6295 |
| ✅ | `ModelCompleteRequest` | What `$.model.complete` takes. | Object. Its fields have rows below. Used by `$.model.complete`. | d.ts line 6313 |
| ✅ | `ModelCompleteRequest.model` | An alias (`haiku`) or a full model id, resolved and allowlist-checked like a `--model` value. | Type: `string`. | d.ts line 6313 |
| ✅ | `ModelCompleteRequest.prompt` | The one user message: a string, or blocks of text sent in order (ModelTextBlock), any of which may be marked for the prompt cache. | Type: `string \| readonly ModelTextBlock[]`. The result says what happened: text and usage, or a `reason`. Too many cache marks gives an API error 400. | d.ts line 6313 |
| ✅ | `ModelCompleteRequest.system` | Precedes the completion as its system prompt, after the CLI's identity block: a string, or blocks of text as `prompt` takes. Default none. | Type: `string \| readonly ModelTextBlock[]`. Optional. Note: On Bedrock, Vertex, Foundry or behind a gateway, text marked here is found again only while `prompt` opens the same: mark it there. | d.ts line 6313 |
| ✅ | `ModelCompleteRequest.maxTokens` | The reply's token cap: any positive integer up to what one reply can hold, the model's own output limit or 64000, whichever is lower. | Type: `number`. Optional. Default 1024. The reply comes back whole, not streamed, and a provider ends such a request at ten minutes, hence the 64000. One past the limit is refused, naming it. | d.ts line 6313 |
| ✅ | `ModelCompleteRequest.effort` | How hard the model thinks about it (ModelEffort): `low` for a cheap label, `max` for a hard judgment. Default: the model's own. | Type: `ModelEffort`. Optional. Sent where the model takes an effort and dropped where it does not. A value outside the five levels is refused. | d.ts line 6313 |
| ✅ | `ModelCompleteRequest.timeoutMs` | How long the whole call may take, in milliseconds, before it resolves `aborted` and the request is abandoned, default none. | Type: `number`. Optional. Bounds the completion itself. A positive whole number up to 2147483647. Anything else is refused. | d.ts line 6313 |
| ✅ | `ModelCompleteResult` | What one model call resolves to: the reply when the model answered (`isAnswered`), else which of three things left it without text (`reason`). | Object. Its fields have rows below. A provider failure never rejects the call. Branch on `isAnswered` and `reason`. Used by `$.model.complete`, `model.complete`. | d.ts line 6387 |
| ✅ | `ModelCompleteResult.isAnswered` | True: the model answered, `text` and `usage` are its reply. | Type: `true`. Example: `if (r.isAnswered) spent += r.usage.output_tokens`. | d.ts line 6387 |
| ✅ | `ModelCompleteResult.text` | The reply's text: a completion's text blocks joined, on a fork, the non-error replies' text joined by newlines. | Type: `string`. | d.ts line 6387 |
| ✅ | `ModelCompleteResult.usage` | What the call cost (ModelUsage), on a fork its completions summed. | Type: `ModelUsage`. On a fork, `cache_read_input_tokens` near zero means the fork paid for the whole prefix. | d.ts line 6387 |
| ✅ | `ModelCompleteResult.isAnswered` | A field of `ModelCompleteResult`. | Type: `false`. | d.ts line 6387 |
| ✅ | `ModelCompleteResult.reason` | The API answered with an error and no reply carried text. | Type: `'api-error'`. Example: `if (!r.isAnswered && r.reason === "api-error") retry(r.status)`. | d.ts line 6387 |
| ✅ | `ModelCompleteResult.status` | The error reply's HTTP status (429, 500, 529, ...), null when no response arrived at all (a dropped connection, a provider timeout). | Type: `number \| null`. | d.ts line 6387 |
| ✅ | `ModelCompleteResult.error` | Which kind of failure, as Claude Code classifies API errors, never the error's text or body. | Type: `ModelApiError`. `rate_limit`, `overloaded`, `invalid_request`, `authentication_failed`, `server_error`, ..., `unknown` when it fits none of the named kinds. | d.ts line 6387 |
| ✅ | `ModelCompleteResult.usage` | What the call cost before it failed: all zeros for a completion (its one request was the one refused), on a fork, the turns before it. | Type: `ModelUsage`. | d.ts line 6387 |
| ✅ | `ModelCompleteResult.isAnswered` | A field of `ModelCompleteResult`. | Type: `false`. | d.ts line 6387 |
| ✅ | `ModelCompleteResult.reason` | The model replied and its reply carried no text. | Type: `'empty-reply'`. The reply held no text block, or a fork answered only with a denied tool attempt. | d.ts line 6387 |
| ✅ | `ModelCompleteResult.usage` | What the call cost. | Type: `ModelUsage`. | d.ts line 6387 |
| ✅ | `ModelCompleteResult.isAnswered` | A field of `ModelCompleteResult`. | Type: `false`. | d.ts line 6387 |
| ✅ | `ModelCompleteResult.reason` | The call was cut before a reply came, whatever had come back is discarded. | Type: `'aborted'`. The dispatch was aborted, the plugin unloaded, `options.signal` fired, or `timeoutMs` ran out. | d.ts line 6387 |
| ✅ | `ModelCompleteResult.usage` | What the call cost before it was cut: all zeros for a completion (no response arrived), on a fork, what came back before the abort. | Type: `ModelUsage`. | d.ts line 6387 |
| ✅ | `ModelEffort` | How hard a request asks the model to think, by the levels the engine and `turn.step` name: `low` to `max`, `xhigh` between `high` and `max`. | Alias of `'low' \| 'medium' \| 'high' \| 'xhigh' \| 'max'`. A model that takes no effort setting is sent none, whatever is asked. | d.ts line 6479 |
| ✅ | `ModelForkRequest` | What `$.model.fork` takes. | Object. Its fields have rows below. Used by `$.model.fork`, `model.fork`. | d.ts line 6484 |
| ✅ | `ModelForkRequest.prompt` | The one user message, appended to the session's own transcript as the main thread last sent it. | Type: `string`. The result says what happened: text and usage, or a `reason` such as `nothing-to-fork`. | d.ts line 6484 |
| ✅ | `ModelForkResult` | What `$.model.fork` resolves to: a completion's result (ModelCompleteResult) or that there was nothing to fork yet. | Union. Fields: `isAnswered`, `reason`. The completion's arms are the reply when the fork answered, else `api-error`, `empty-reply` or `aborted`, `usage` on each. Used by `$.model.fork`, `model.fork`. | d.ts line 6506 |
| ✅ | `ModelForkResult.isAnswered` | A field of `ModelForkResult`. | Type: `false`. | d.ts line 6506 |
| ✅ | `ModelForkResult.reason` | Nothing to fork, so no request was made: the session holds no snapshot of this conversation's main thread that a fork may share. | Type: `'nothing-to-fork'`. No turn has run yet, or the conversation started afresh after `/clear` or a resume. | d.ts line 6506 |
| ✅ | `ModelTextBlock` | One block of text in a `$.model.complete` request's `prompt` or `system`: sent as written, in the order given, and markable for the prompt cache. | Object. Its fields have rows below. Put the text that every call repeats first and mark its last block with `cache`. | d.ts line 6532 |
| ✅ | `ModelTextBlock.text` | The block's text, sent as written, an empty one is the API's to refuse, as an `api-error` of status 400. | Type: `string`. | d.ts line 6532 |
| ✅ | `ModelTextBlock.cache` | Keeps the request up to and including this block in the prompt cache, a call within five minutes that opens with the same text reads it there. | Type: `true`. Optional. The `usage` of the result shows `cache_creation_input_tokens` or `cache_read_input_tokens`. Both zero means nothing was cached. | d.ts line 6532 |
| ✅ | `ModelUsage` | What one model call cost, as the API counted it: the four token counts in the API's spelling, summed over the call's responses when it made several. | Object. Its fields have rows below. One shape for every place that reports a call's cost. All four counts are always present. A missing count reads as zero. | d.ts line 6567 |
| ✅ | `ModelUsage.input_tokens` | Uncached input tokens the call was answered over: the part of the prompt neither read from nor written to the prompt cache. | Type: `number`. | d.ts line 6567 |
| ✅ | `ModelUsage.output_tokens` | Tokens the call generated. | Type: `number`. | d.ts line 6567 |
| ✅ | `ModelUsage.cache_read_input_tokens` | Input tokens the prompt cache served. | Type: `number`. On a fork, how much of the main thread's transcript the cache still held: near zero, the fork paid for the whole prefix (the entry had lapsed, or the model changed since it was made). | d.ts line 6567 |
| ✅ | `ModelUsage.cache_creation_input_tokens` | Input tokens the call wrote to the prompt cache. | Type: `number`. | d.ts line 6567 |
| ✅ | `PlayOptions` | How `$.audio.play` plays a clip: looped until `signal` aborts, or once. | Object. Its fields have rows below. A loop needs the signal that ends it, a single play takes one as an option. Used by `$.audio.play`. | d.ts line 7771 |
| ✅ | `PlayOptions.shouldLoop` | Repeat the clip until `signal` aborts (the promise then resolves). | Type: `true`. | d.ts line 7771 |
| ✅ | `PlayOptions.gain` | Linear gain, from 0 to 4, default 1. | Type: `number`. Optional. | d.ts line 7771 |
| ✅ | `PlayOptions.signal` | Stops the clip: playback ends at once and the promise resolves. | Type: `AbortSignal`. | d.ts line 7771 |
| ✅ | `PlayOptions.shouldLoop` | Play once. | Type: `false`. Optional. | d.ts line 7771 |
| ✅ | `PlayOptions.gain` | Linear gain, from 0 to 4, default 1. | Type: `number`. Optional. | d.ts line 7771 |
| ✅ | `PlayOptions.signal` | Stops the clip early, as above. | Type: `AbortSignal`. Optional. | d.ts line 7771 |
| ✅ | `SpeakOptions` | Options of `$.audio.speak`. | Object. Its fields have rows below. Used by `$.audio.speak`. | d.ts line 12512 |
| ✅ | `SpeakOptions.voice` | The system voice's exact name as the platform lists it (`Samantha`, or the name of a voice you installed). Absent: the synthesizer's default voice. | Type: `string`. Optional. | d.ts line 12512 |
| ✅ | `SpeakRequest` | The argument of `$.audio.speak(text, options)` as the event carries it. | Intersection with `SpeakRequest`, `SpeakOptions`. Object. Its fields have rows below. Used by `audio.speak`. | d.ts line 12523 |
| ✅ | `SpeakRequest.text` | What to say, as plain text: its first 4096 characters are spoken. | Type: `string`. | d.ts line 12523 |
| ✅ | `SpeakResult` | What `$.audio.speak` resolves with once the utterance has ended. | Object. Its fields have rows below. Used by `$.audio.speak`, `audio.speak`. | d.ts line 12533 |
| ✅ | `SpeakResult.via` | Which synthesizer spoke: `system`, the platform's own (`say` on macOS). | Type: `'system'`. | d.ts line 12533 |

## See Also

- [Mod API: Model, Audio, and MCP](Claude-Code-Mod-API-Model)
- [Claude Code Mod API](Claude-Code-Mod-API)
- [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference)
