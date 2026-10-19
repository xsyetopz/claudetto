# Mod API: Event Table Types

These types map an event name to its input, its result, and its call on `$`.
They are how the editor knows the shape of `e` and `next` for each event.
Example: `$.fs.read(...)` is both a call and the event `fs.read`, so a hook can answer it.

## Types

| Mark | Item | What it is for | Shape and limits | Source |
| --- | --- | --- | --- | --- |
| ✅ | `AnyEventHook` | The hook `on("*", hook)` takes: it runs on every event, plugin nouns no declaration names included, so `e` is `unknown` and `next` is StarNext. | Alias of `($: EngineInterface, e: unknown, next: StarNext) => unknown`. Until `next.is(pattern, e)` narrows `e`, a hook can only pass it on, time it, log it, or fail it. | d.ts line 635 |
| ✅ | `AnyKeyOf` | Every key of every variant, index signatures included. | Alias of `I extends unknown ? keyof I : never`. | d.ts line 640 |
| ✅ | `Chunk` | What a hook on streaming event `N` yields, and what its `next(e)` yields to it (ChunkOf by name). | Generic alias of `ChunkOf[N]`. | d.ts line 1231 |
| ✅ | `ChunkOf` | The chunk type of each streaming event, by name: what its stream yields. | Object with fields `turn.step`, `process.spawn`. | d.ts line 1236 |
| ✅ | `ChunkRef` | What every `turn.step` chunk may carry: the engine's handle on the item of its own stream the chunk was read off, absent on a chunk a hook made. | Object with the field `ref?`. A hook that passes a chunk on or spreads it keeps the handle. A chunk built afresh has none. | d.ts line 1255 |
| ✅ | `CoreEventName` | The name of an event the engine defines itself (a key of CoreEventOf), EventName adds the declared plugin nouns' events. | Alias of `keyof CoreEventOf`. | d.ts line 3700 |
| ✅ | `CoreEventOf` | The argument of each event the engine defines itself: its call sites' (EngineEventOf), the classic hooks' (ClassicEventOf), the calls on `$`. | Alias of `EngineEventOf & ClassicEventOf & OpEventOf`. | d.ts line 3706 |
| ✅ | `DeclaredEvents` | The state events of each declared value in a union of `[plugin, key]` pairs, one variant per pair (it distributes), so a matcher narrows `e`. | Alias of `Pair extends readonly [ infer P extends keyof PluginState & string, infer K ] ? K extends keyof PluginState[P] & string ? DeclaredEventsOf<P, K> : never : never`. | d.ts line 3768 |
| ✅ | `DeclaredEventsOf` | `e` of `state.get` and of `state.set` for one declared value: its typed reference, and for a write the change, of the declared type. | Object with fields `get`, `set`. | d.ts line 3777 |
| ✅ | `DeclaredPair` | Every named value the enabled contracts declare, as one union of `[plugin, key]` pairs, `never` while PluginState is empty. | Object with fields `[P in keyof PluginState & string]`. | d.ts line 3786 |
| ✅ | `DeclaredStateChange` | What a `state.set` on one declared value carries beside its reference: the value being written and the one that stood there, of the declared type. | Object with fields `value`, `previous`, `ifVersion?`. | d.ts line 3796 |
| ✅ | `EngineEventOf` | The events the engine raises at its call sites, and `engine.create`, the classic settings hooks' events are ClassicEventOf. | Object. One key for each event that hooks can handle. A hook that fails is skipped and the next hook runs, so a guard needs a `.catch` to fail closed. | d.ts line 4042 |
| ✅ | `EngineResultOf` | The engine's events' results. | Object. One key for each event. Its value is the result type that a hook for the event may return. | d.ts line 4622 |
| ✅ | `EventCalls` | The engine's own events as calls on `$`, one signature each: `$.<noun>.<event>(input)` resolves to its result, or to its stream. | Object with one key for each noun that raises events (`tool`, `command`, `config`, `prompt`, and more). A plugin's call runs the same chain with the calling hook skipped. Used by 10 calls such as `$.session.compact`. | d.ts line 4846 |
| ✅ | `EventName` | The name of an event: a key of EventOf, the engine's own (CoreEventName) and the declared plugin nouns' (NounEventName). | Alias of `keyof EventOf`. | d.ts line 4912 |
| ✅ | `EventOf` | The argument of each event, by event name: what a hook receives as `e` and what the call on `$` takes. Plain data, frozen to every depth. | Alias of `CoreEventOf & NounEventOf`. The engine's own events plus the methods of the nouns that plugins add. | d.ts line 4922 |
| ✅ | `EventResult` | The result of event `N`: what its hooks return and what their `next(e)` resolves to. | Generic alias of `ResultOf[N]`. | d.ts line 4928 |
| ✅ | `Events` | The hook signature of each event, `($, e, next)`, as one mapped type over EventOf, a streaming event's is the generator form (StreamHook). | Object. One hook type for each event. `$` is frozen, `e` is read-only to every depth, and `next` runs the rest of the chain. | d.ts line 4945 |
| ✅ | `KeptEvent` | What `next` takes in a matched hook: the variants of `e` the matcher can match (KeptMembers), as declared, so a rewrite of a pinned field passes. | Alias of `MatchedNames<P, M> extends infer N extends EventName ? N extends unknown ? KeptMembers<Args<N>, M> : never : never`. | d.ts line 5748 |
| ✅ | `Namespace` | The prefixes a glob may name: one or more whole leading segments of an event name (`tool` of `tool.call`), derived, plugin nouns included. | Generic alias of ``N extends `${infer Head}.${infer Rest}` ? Head \| `${Head}.${Namespace<Rest>}` : never``. | d.ts line 6595 |
| ✅ | `NextResult` | What `next(e)` resolves to for event `N`: the event's result, except at `engine.create`, where the steps beneath return `$` as built so far. | Alias of `N extends 'engine.create' ? EngineInterfaceBuilt : EventResult<N>`. The type of the value that `next` gives back. | d.ts line 6792 |
| ✅ | `NextResultFor` | What `next(e)` resolves to once `e.tool` is the literal `T`: on `tool.call` the result typed for that tool, on every other event, `O` as declared. | Alias of `[ N ] extends ['tool.call'] ? ToolCallResult<T> : O`. `result` is Bash's record after `e.tool === "Bash"`, an un-narrowed `e` names every tool, and `result` stays `unknown`. | d.ts line 6801 |
| ✅ | `NoArgs` | The argument of a call on `$` that takes nothing (`$.session.cwd()`): an object with no keys. | Alias of `Record<never, never>`. Used by `session.cwd`, `session.root`, `session.model`, `session.turns` and 16 more. | d.ts line 6809 |
| ✅ | `NoArgsEvent` | The events whose argument is exactly NoArgs (`session.cwd`, a declared plugin noun's `() => ...`), their overloads come last (LateOverload). | Object with fields `[N in EventName]`. | d.ts line 6815 |
| ✅ | `NounEvent` | The declared plugin nouns' methods as event rows (NounEventRow), one per `<noun>.<method>` that is a function, a member that is not is no event. | Object with fields `[K in PluginNoun]`. | d.ts line 6858 |
| ✅ | `NounEventName` | The name of a declared plugin noun's event (`voice.speak`). | Alias of `keyof NounEventOf & string`. | d.ts line 6867 |
| ✅ | `NounEventOf` | The events of the plugin nouns declared on EngineInterface, by name: the argument of each `<noun>.<method>`. Empty until a plugin declares a noun. | Alias of `{ [E in NounEvent as E['name']]: E['args'], }`. Example: `declare module "claude-code" { interface EngineInterface { voice: Voice } }`. | d.ts line 6876 |
| ✅ | `NounEventResult` | The result of a declared plugin noun's event as its hooks see it: `{ value }` (the method's answer) or `{ deny }`. | Alias of `ValueOrDeny<NounValueOf[N]>`. | d.ts line 6884 |
| ✅ | `NounEventRow` | One method of a declared plugin noun as an event row: its event's name, argument (the method's first parameter) and value (its awaited result). | Object with fields `name`, `args`, `value`. | d.ts line 6890 |
| ✅ | `NounValueOf` | What each declared plugin noun's method answers (the `value` of its event's result), by event name. | Alias of `{ [E in NounEvent as E['name']]: E['value'], }`. | d.ts line 6900 |
| ✅ | `OpEventName` | The name of a call on `$` the host serves, as an event. | Alias of `keyof OpEventOf`. | d.ts line 6967 |
| ✅ | `OpEventOf` | The calls on `$` the host serves, as events: `e` is the call's argument as it crosses to the host, and every one is hookable by name and by `on("*")`. | Object. One key for each `$` call that is also an event, such as `fs.read` and `session.messages`. A hook can pass it on, rewrite it, refuse it with `{ deny }`, or answer with `{ value }`. | d.ts line 6980 |
| ✅ | `OpEventResult` | The result of a call on `$` as its event's hooks see it: `{ value }` (the call's answer) or `{ deny }`. | Generic alias of `ValueOrDeny<OpValueOf[N]>`. | d.ts line 7344 |
| ✅ | `OpValueOf` | What each call on `$` answers (the `value` of its event's result), by event name. | Object. One key for each `$` call. Its value is the type of the call's answer. Used by `$.tool.register`, `$.command.register`, `$.agent.register`. | d.ts line 7350 |
| ✅ | `PluginNoun` | The nouns a plugin declared on `$` by merging into EngineInterface, never one the engine's own events are under (`tool`, `session`, `ui`). | Alias for the names of nouns that plugins add. An identical open call that repeats waits behind the previous one. | d.ts line 7807 |
| ✅ | `ResultOf` | What each event's hook returns, and what its `next(e)` resolves to, by event name. | Intersection with `ResultOf`, `EngineResultOf`, `ClassicResultOf`. Object with fields `[N in OpEventName]`, `[N in NounEventName]`. | d.ts line 10869 |
| ✅ | `StreamingEventName` | The events that stream: their hooks are async generators, `next(e)` is the stream of everything beneath, and the result is what it returns. | Alias of `'turn.step' \| 'process.spawn'`. These two events stream their output in pieces. | d.ts line 12754 |
| ✅ | `ValueOrDeny` | The result of a call on `$` as the hooks on its event see it: `{ value }`, the call's answer, or `{ deny }`, the reason the caller's promise rejects. | Object with fields `value`, `deny?`, `deny`, `value?`. | d.ts line 15387 |

## See Also

- [Mod API: Hook Machinery Types](Claude-Code-Mod-API-Hook-Types)
- [Mod API: Hooks, `on`, and `next`](Claude-Code-Mod-API-Hooks)
- [Claude Code Mod API](Claude-Code-Mod-API)
- [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference)
