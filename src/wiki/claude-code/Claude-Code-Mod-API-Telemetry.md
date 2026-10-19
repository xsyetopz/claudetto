# Mod API: Telemetry

`$.telemetry` logs analytics records.
A record is sent only when Claude Code or a built-in mod makes the call.
A mod you install must give its telemetry hook the filter `{ to: 'collector' }`, as here:

```javascript
on('telemetry.log', { to: 'collector' }, ($, e, next) => next(e))
```

Without the filter the mod fails `claude plugin validate`, and `*` does not select these events.

## Members of `$.telemetry`

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `$.telemetry.log` | Logs one record to the destination `entry.to` names, the event `telemetry.log`, `e.to` is pinned, and `anthropic` when left out. | Type: `(entry: TelemetryLogArgs) => Promise<void>`. Sends a first-party row or a collector record. A first-party row is queued for built-ins only. Rejects if a hook denies. | Only built-ins and the engine make records that are sent. | `CoreEngineInterface` line 3228, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.telemetry.mark` | Marks one use of a feature as the CLI's own feature events do, the event `telemetry.mark`, it takes no `to` and always means `anthropic`. | Type: `(entry: TelemetryMarkInput) => Promise<void>`. Marks use of a feature. The engine does nothing with it. Built-in plugins that hook the event queue the row. | Only built-ins and the engine make records that are sent. | `CoreEngineInterface` line 3243, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |

## Engine Events

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `telemetry.log` | Fires when a record is about to be logged to the destination `e.to` names: a built-in's `$.telemetry.log`, or the engine's own events. | Input `TelemetryLogInput`. Result `TelemetryLogResult`. Hook result: `{ value: undefined }` or `{ deny }`. `e.to` is pinned. A hook rewrites what the record carries, never where it goes. | Hook via `on('telemetry.log', ...)`. Also callable as `$.telemetry.log(...)`. | `EngineEventOf` line 4400, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `telemetry.mark` | Fires when one use of a feature is marked (`$.telemetry.mark`), as the CLI's own feature events mark one, always for `anthropic`, no `to`. | Input `TelemetryMarkInput`. Result `TelemetryMarkResult`. Hook result: `{ value: undefined }` or `{ deny }`. `{ deny }` rejects the caller. | Hook via `on('telemetry.mark', ...)`. Also callable as `$.telemetry.mark(...)`. | `EngineEventOf` line 4411, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |

## Types

| Mark | Item | What it is for | Shape and limits | Source |
| --- | --- | --- | --- | --- |
| ✅ | `TelemetryAttribute` | One attribute of a collector record, as the collector receives it. | Alias of `string \| number \| boolean \| readonly string[]`. | d.ts line 12942 |
| ✅ | `TelemetryChoice` | A string property of a first-party row: the value and the list it is chosen from, so no free text reaches a row. | Object. Its fields have rows below. Every member of `of` is a lowercase token of letters, digits, `_`, and `-`. At most 32 members. `value` is one of them. | d.ts line 12954 |
| ✅ | `TelemetryChoice.value` | What the row carries, one member of `of`. | Type: `string`. | d.ts line 12954 |
| ✅ | `TelemetryChoice.of` | Every value the property may take. | Type: `readonly string[]`. | d.ts line 12954 |
| ✅ | `TelemetryDestination` | Where a telemetry record goes: `anthropic`, Anthropic's first-party analytics, or `collector`, the one the session's operator configured. | Alias of `'anthropic' \| 'collector'`. `e.to` reads the same at every hook. A hook picks its stream with the matcher. | d.ts line 12976 |
| ✅ | `TelemetryLogArgs` | What a call of `$.telemetry.log` passes: a first-party row, `to` optional, or a collector record. | Alias of `TelemetryRowArgs \| TelemetryRecordEntry`. Used by `$.telemetry.log`. | d.ts line 12982 |
| ✅ | `TelemetryLogInput` | The input of `telemetry.log`: one record about to be logged to the destination `to` names, which is always present and pinned. | Alias of `TelemetryRowEntry \| TelemetryRecordEntry`. Used by `telemetry.log`. | d.ts line 12988 |
| ✅ | `TelemetryLogResult` | What a `telemetry.log` hook returns and `next(e)` resolves to: `{ value: undefined }`, or `{ deny }`, which rejects the caller's promise. | Alias of `ValueOrDeny<undefined>`. Used by `telemetry.log`, `$.telemetry.log`. | d.ts line 12994 |
| ✅ | `TelemetryMarkInput` | The input of `telemetry.mark`: one use of a feature, as the CLI's own feature events mark one. | Object. Its fields have rows below. A mark takes no `to`: it always means `anthropic`. Used by `$.telemetry.mark`, `telemetry.mark`. | d.ts line 13002 |
| ✅ | `TelemetryMarkInput.feature` | Which feature was used, by its snake_case name. | Type: `string`. | d.ts line 13002 |
| ✅ | `TelemetryMarkInput.kind` | How the use went (TelemetryMarkKind). | Type: `TelemetryMarkKind`. | d.ts line 13002 |
| ✅ | `TelemetryMarkInput.reason` | Why it went so, as a short token. | Type: `string`. Optional. | d.ts line 13002 |
| ✅ | `TelemetryMarkInput.props` | The mark's properties, by name. | Type: `Readonly<Record<string, TelemetryProp>>`. Optional. | d.ts line 13002 |
| ✅ | `TelemetryMarkKind` | How one use of a feature went, as the CLI's own feature events count it. | Alias of `'ok' \| 'sad' \| 'bad'`. `ok`: used, the person got what they asked. `sad`: degraded, they still got something. `bad`: failed, they got nothing. | d.ts line 13027 |
| ✅ | `TelemetryMarkResult` | What a `telemetry.mark` hook returns and `next(e)` resolves to: `{ value: undefined }`, or `{ deny }`, which rejects the caller's promise. | Alias of `ValueOrDeny<undefined>`. Used by `telemetry.mark`, `$.telemetry.mark`. | d.ts line 13033 |
| ✅ | `TelemetryProp` | One property of a first-party row or a mark: a number, a boolean, or a string chosen from a list (TelemetryChoice). | Alias of `number \| boolean \| TelemetryChoice`. | d.ts line 13039 |
| ✅ | `TelemetryRecordEntry` | A record for the telemetry collector the session's operator configured. | Object. Its fields have rows below. | d.ts line 13044 |
| ✅ | `TelemetryRecordEntry.to` | The operator's collector. Pinned. | Type: `'collector'`. | d.ts line 13044 |
| ✅ | `TelemetryRecordEntry.event` | The record's event, it leaves named `claude_code.<event>`. | Type: `string`. | d.ts line 13044 |
| ✅ | `TelemetryRecordEntry.attributes` | The record's attributes, they go out as they stand, in the order written. | Type: `Readonly<Record<string, TelemetryAttribute>>`. | d.ts line 13044 |
| ✅ | `TelemetryRecordEntry.loggedAt` | When it was logged: an ISO 8601 instant to the millisecond. | Type: `string`. | d.ts line 13044 |
| ✅ | `TelemetryRecordEntry.span` | Where in a trace the record belongs, when it belongs to one. | Type: `TelemetrySpan`. Optional. | d.ts line 13044 |
| ✅ | `TelemetryRowArgs` | A first-party row as a call passes it: `to` left out reads as `anthropic`. | Object. Its fields have rows below. | d.ts line 13072 |
| ✅ | `TelemetryRowArgs.to` | The destination, Anthropic's first-party analytics, optional here. | Type: `'anthropic'`. Optional. | d.ts line 13072 |
| ✅ | `TelemetryRowArgs.event` | The row's event name. | Type: `string`. | d.ts line 13072 |
| ✅ | `TelemetryRowArgs.props` | The row's properties, by name. | Type: `Readonly<Record<string, TelemetryProp>>`. Optional. | d.ts line 13072 |
| ✅ | `TelemetryRowEntry` | A first-party row as a hook reads it: `to` is always present, the engine having completed it before any hook or matcher reads `e`. | Object. Its fields have rows below. | d.ts line 13091 |
| ✅ | `TelemetryRowEntry.to` | Anthropic's first-party analytics. Pinned. | Type: `'anthropic'`. | d.ts line 13091 |
| ✅ | `TelemetryRowEntry.event` | The row's event name. | Type: `string`. | d.ts line 13091 |
| ✅ | `TelemetryRowEntry.props` | The row's properties, by name. | Type: `Readonly<Record<string, TelemetryProp>>`. Optional. | d.ts line 13091 |
| ✅ | `TelemetrySpan` | The span a collector record belongs to, as W3C trace context spells it: the ids in lowercase hex. | Object. Its fields have rows below. | d.ts line 13110 |
| ✅ | `TelemetrySpan.traceId` | The trace's id, 32 hex digits. | Type: `string`. | d.ts line 13110 |
| ✅ | `TelemetrySpan.spanId` | The span's id, 16 hex digits. | Type: `string`. | d.ts line 13110 |
| ✅ | `TelemetrySpan.traceFlags` | Bit 0 set when the trace is sampled, as W3C trace context spells it. | Type: `number`. | d.ts line 13110 |

## See Also

- [Claude Code Mod API](Claude-Code-Mod-API)
- [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference)
