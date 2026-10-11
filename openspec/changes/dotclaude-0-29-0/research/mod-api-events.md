# Mod API hook events of Claude Code 2.1.296

Scope: the hooks module (`on(event, ...)`) of Claude Code 2.1.296, for the dotclaude 0.29.0 change.
Facts are marked `d.ts`, `bundle`, or `inferred`.
Line numbers `index.d.ts:N` point to `plugins/dotclaude/.claude-plugin/types/claude-code/index.d.ts`.

## Event map

The engine raises 46 events in `EngineEventOf` (`index.d.ts:3950`).
The classic settings events add 33 more, `classic.<Name>` (part 2).
The `$` calls that a mod makes, and the plugin nouns, are in part 2.
Part 2 is [`mod-api-events-2.md`](./mod-api-events-2.md).
Budget is the same for every hook: 10 s per dispatch, a 1 s `.catch` grace, and 5 s of linger after an abort (`index.d.ts:5116`, `5124`, `5132`, all `d.ts`).
A hook that exceeds its budget, throws, or returns the wrong shape is skipped, and the chain beneath answers (`index.d.ts:3943`, `d.ts`).
Column "Fail" gives the default when the event's doc does not name one.
Column "Tier and sec-default" gives the routing of the 2.1.296 bundle (`bundle`), which matches the 2.1.293 list (see "Changed").

| Event | When it fires | Input fields | Return shapes | Refusal | Matcher keys (example) | Stream | Budget | Tier and sec-default | Fail | Line |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `tool.call` | Before each tool runs, in the main loop and in subagents | `tool`, `tool_use_id`, the tool's args (a union on `tool`, `command` for Bash), `agentId` in a subagent | `{ result }`, `{ context }`, or `next(e)` with a rewritten input | `{ deny: reason }` | `tool` (`{ tool: "Read" }`) | no | global | not routed, user hooks run | open, a `.catch` may deny (`bundle`) | `index.d.ts:3962` |
| `tool.check` | When the engine decides a call may run, after `tool.call` and PreToolUse, also on `$.tool.check` | `tool`, `input`, `tool_use_id?`, `agentId` | `{ decision: allow/ask/deny, reason?, rule?, hook? }` | `{ decision: "deny" }` | `tool` (`{ tool: "Read" }`) | no | global | deny-rule guard wraps it (`bundle`) | open, verdict beneath stands | `index.d.ts:3976` |
| `ui.render` | When a component is drawn, once per input value | `RenderInput` (props, viewport) | `RenderElement`, or `next(e)` drawn by the hook | none | none | no | global | not routed (`bundle`) | the engine draws its own tree | `index.d.ts:3988` |
| `ui.resolve` | Once per surface, component, and plugin, at plugin load | `ResolveInput`: surface and component names | `ElementTable` | none | none | no | global | not routed (`bundle`) | own table, hook skipped | `index.d.ts:3997` |
| `ui.press` | When a `Button` a render hook drew is pressed | `{ plugin, element, component, surface }` | `{ element }` | none, answer without `next` takes it | none | no | global | not routed (`bundle`) | the element's `onPress` runs | `index.d.ts:4006` |
| `ui.input` | When an `Input` a render hook drew changes or is submitted | `{ plugin, element, component, surface, kind, value }` | `{ element, value }` | none | none | no | global | not routed (`bundle`) | the element's `onInput` runs | `index.d.ts:4015` |
| `ui.select` | When a `Select` a render hook drew is picked | `{ plugin, element, component, surface, value }` | `{ element, value }` | none | none | no | global | not routed (`bundle`) | the element's `onSelect` runs | `index.d.ts:4024` |
| `ui.message` | When this plugin's `Client` posts from its surface module | `UiMessageArgument`, `data` | `{}`, `{ props }`, or `next({ ...e, data })` | none | none | no | global | not routed (`bundle`) | the post goes on | `index.d.ts:4033` |
| `ui.fault` | When this plugin's `Client` fails on a surface | `{ phase, reason }` | `{}` (observe only) | none | none | no | global | not routed (`bundle`) | observe only | `index.d.ts:4047` |
| `ui.scroll` | Before a site's window moves, on wheel or scroll keys | `UiScrollInput`: `requestId`, `offset`, `by` | `{}` or `next({ ...e, offset })` | `{ deny }` or no `next` | `requestId` (`{ requestId: "log" }`) | no | global | not routed (`bundle`) | window moves | `index.d.ts:4059` |
| `ui.focus` | Before a site's focus ring moves | `UiFocusInput`: `requestId`, `element` | `{}` or `next({ ...e, element })` | `{ deny }` or no `next` | `requestId` (`{ requestId: "list" }`) | no | global | not routed (`bundle`) | focus stays | `index.d.ts:4071` |
| `agent.offer` | When the engine offers an agent type to the model, in the listing and at dispatch | `{ agent, description, source, provider }` | `{ isOffered: boolean }` | `{ isOffered: false }` | `agent` (`{ agent: "Plan" }`) | no | global | `d()`, user hooks skipped for org-provided agents (`bundle`) | passes through (`index.d.ts:4077`) | `index.d.ts:4084` |
| `agent.spawn` | When the Agent tool is about to start a subagent, model not yet resolved, and on a workflow `agent()` | `tool_use_id`, `prompt`, `description`, `subagentType`, `provider`, `model?`, `parentModel`, `parentAgentId?`, `permissionMode?`, `background`, `fork`, `isTeammate?`, `workflow?`, `name?`, `cwd?` | `{ model }` (alias or id, `index.d.ts:401`) with the spawn's `agentId`, or `next(e)` rewritten | `{ deny: reason }` | `fork`, `subagentType` (`{ fork: true }`) | no | global | `d()`, as `agent.offer` (`bundle`) | subagent starts (`index.d.ts:4098`) | `index.d.ts:4098` |
| `prompt.submit` | When a prompt is submitted, before the turn starts | `text`, `origin`, `wait`, `context?`, `attachments?`, `turnId?` | `{ text, context? }` or `next({ ...e, text })` | `{ drop: reason }` | none | no | global | not routed (`bundle`) | the prompt goes through, `.catch` may drop | `index.d.ts:4110` |
| `prompt.fill` | When text is put in the prompt box as the draft (`$.prompt.fill`) | `text`, `mode` (`replace`, `append`, `insert`) | `{ text, mode }` through `next`, or `{ isFilled: false }` | `{ isFilled: false }` without `next` | none | no | global | not routed (`bundle`) | the draft is written | `index.d.ts:4122` |
| `prompt.suggest` | When a dim suggestion is proposed for the prompt box | suggestion `text` | `{ isShown }`, or `next({ ...e, text })` | `{ isShown: false }` without `next` | none | no | global | not routed (`bundle`) | suggestion shows | `index.d.ts:4134` |
| `prompt.edit` | When the person edits the main prompt box | `text`, `start`, `end`, `inputText`, `cursor` | `{ text, cursor }` or `next` with `inputText` | `{ text, cursor }` without `next` consumes | none | no | global, 50 ms in 2.1.293 (`bundle`, not re-read) | not routed (`bundle`) | the edit stands | `index.d.ts:4146` |
| `prompt.autocomplete` | As the person types a token in the prompt box | token at cursor | `{ suggestions }` | none | none | no | global | not routed (`bundle`) | rows join the typeahead, nothing waits | `index.d.ts:4158` |
| `prompt.section` | Once per named system prompt section, when the engine assembles the prompt | `{ name, text }` | `{ text: string }` or `{ text: null }` | `{ text: null }` drops the section | `name` (`{ name: "memory" }`) | no | global | `next.to(e, "append")`, user tier skipped (`bundle`) | passes through, cached until `$.ui.invalidate` | `index.d.ts:4170` |
| `prompt.context` | When the engine renders the context blocks (`CLAUDE.md` and user context) | `{ blocks, instructionFiles? }` | `{ blocks, instructionFiles? }` | removing a block | none | no | global | `next.to(e, "append")` (`bundle`) | passes through | `index.d.ts:4182` |
| `prompt.compose` | When the engine renders the system prompt | `model`, `promptModel`, `surfaces`, `tools`, `traits`, `outputStyle`, `sections` | `{ sections }`, each `{ id, text, scope }` | drop or reorder sections | none | no | global | `next.to(e, "append")` (`bundle`) | passes through | `index.d.ts:4191` |
| `prompt.attachment` | Once per message the engine injects for the model (reminders, mode changes, mentions) | `{ type, text, origin, agentId, detail? }` | `{ text: string }` or `{ text: null }` | `{ text: null }` leaves it out | `type` (`{ type: "todo_reminder" }`) | no | global | not routed, user hooks run under sec-default (`bundle`) | passes through, answer kept per attachment | `index.d.ts:4203` |
| `prompt.mention` | Once per `@` path, before the engine reads it | `{ path, ... }` | `{ type }` with `context`, or `next({ ...e, path })` | `{ deny: reason }` | `path` (`{ path: /\.env$/ }`) | no | global | not routed (`bundle`) | the file is read | `index.d.ts:4217` |
| `tool.describe` | When the engine first renders a tool schema in a session | `{ tool, description, isDeferred?, provider }` | `{ description, isDeferred? }` | none (rewrite only) | `tool` (`{ tool: "Bash" }`) | no | global | `d()`, as `agent.offer` (`bundle`) | passes through, cached per session | `index.d.ts:4232` |
| `command.run` | When a slash command is about to run | `{ command, args, origin, presentation }` | `{ text }` (answer without `next`), or `next` with rewritten `args` | answer without `next` replaces the run | `command` (`{ command: "hello" }`) | no | global | not routed (`bundle`) | the command runs | `index.d.ts:4246` |
| `command.describe` | Once per command, when listed for typeahead and `/help` | `{ command, immediate, provider, ... }` | `{ description, argumentHint, isHidden }` | none (rewrite only) | `command` | no | global | `d()`, as `agent.offer` (`bundle`) | passes through | `index.d.ts:4258` |
| `config.set` | When a config row is about to change | `ConfigSetInput`: the row `key`, `provider`, the new value | `{ deny }` or `next` | `{ deny: reason }` | `key` | no | global | not routed (`bundle`) | the change goes through | `index.d.ts:4272` |
| `config.describe` | When a config row is described | `ConfigDescribeInput` | rewrite of the row | none | `key` | no | global | not routed (`bundle`) | passes through | `index.d.ts:4284` |
| `telemetry.log` | When a telemetry event is logged | `TelemetryLogInput` | `{ deny }` or `next` | `{ deny: reason }` | none | no | global | not routed (`bundle`) | logged | `index.d.ts:4296` |
| `telemetry.mark` | When a telemetry mark is set | `TelemetryMarkInput` | `{ deny }` or `next` | `{ deny: reason }` | none | no | global | not routed (`bundle`) | logged | `index.d.ts:4307` |
| `skill.prompt` | When a skill's text is computed for the prompt | `{ skill, text }` | `{ text }` | none (rewrite only) | none named in `d.ts` | no | global | `next.to(e, "append")` (`bundle`) | passes through | `index.d.ts:4318` |
| `attribution.text` | When attribution text (for example a commit) is about to be written | `{ kind, text }` | `{ text }` | none (rewrite only) | `kind` (`{ kind: "commit" }`) | no | global | `next.to(e, "append")` (`bundle`) | passes through | `index.d.ts:4329` |
| `session.start` | Once per process for each loaded plugin, before the first prompt, and on a fresh load of one | `{ cwd, surface, isInteractive }` | `{ cwd }`, observe only | none | none | no | global | not routed (`bundle`) | observe only | `index.d.ts:4341` |
| `session.receive` | When a delivery reaches the session, before it is queued | `{ text, origin, event, agentId }` | `{ text }` or `{ consumed: reason }` | `{ consumed: reason }` | `origin` (`{ origin: "peer" }`) | no | global | not routed (`bundle`) | the delivery is queued | `index.d.ts:4354` |
| `session.append` | Once per row a conversation keeps, before it is stored | `{ message, door, origin, uuid, agentId? }` | `{ message }` (rewrite), or `{ deny }` for plugin appends | `{ deny }`, plugin appends only (`bundle`) | `door` (`{ door: "tool-result" }`) | no | global | not routed (`bundle`) | the row is stored | `index.d.ts:4366` |
| `session.send` | When a plain-text message leaves for another agent or session | `{ to, text, origin, agentId? }` | `{ text, to }` through `next`, or `{ isDelivered: false, reason }` | `{ isDelivered: false, reason }` without `next` | none | no | global | not routed (`bundle`) | the message is sent | `index.d.ts:4378` |
| `session.compact` | When the conversation is about to be compacted | `{ trigger, agentId?, instructions?, messages }` | `{ messages }` or `{ skip: reason }` | `{ skip: reason }` | `trigger` (`{ trigger: "precompute" }`) | no | global | not routed (`bundle`) | compaction runs | `index.d.ts:4390` |
| `session.attach` | When a remote client joins the roster of attached surfaces | `SessionAttachInput`: client and surface | `{ clientId }`, observe | none | `surface` (`{ surface: "mobile" }`) | no | global | not routed (`bundle`) | observe only | `index.d.ts:4402` |
| `session.detach` | When a client leaves the roster, or the session ends with it attached | `SessionDetachInput`: `clientId`, `reason` | `{ clientId }`, observe | none | none | no | global, and `end` shares the exit bound | not routed (`bundle`) | observe only | `index.d.ts:4410` |
| `session.measure` | After each main-thread turn, and when a rate-limit window moves a point | `SessionMeasureInput`: `rateLimits` and usage figures | `{ changed }`, observe | none | none | no | global | not routed (`bundle`) | observe only | `index.d.ts:4422` |
| `session.end` | Once when the session ends: exit, `/clear`, resume, logout, signal, end of a `-p` run | `{ reason, sessionId, resume }`, `reason` in `clear`, `resume`, `logout`, `prompt_input_exit`, `other` | `{ sessionId }` (the engine's end step through `next`) | none | none named in `d.ts` | no | one short wall-clock bound for the whole chain, `next.budget` reads it (value not in `d.ts`) | not routed (`bundle`) | the exit goes on | `index.d.ts:4434` |
| `plugin.register` | Once per hooks module about to join the chain, at load and at reload | `{ name, tier, root, version?, provenance, uses }` | `{ allow: true }` or `{ refuse: reason }` | `{ refuse: reason }` | `tier` (`{ tier: "user" }`) | no | global | guard in sec-default (`bundle`) | the module joins (`index.d.ts:4448`) | `index.d.ts:4448` |
| `turn.start` | When a model turn begins, before its first model call | `{ text, turnId }` | `{ turnId }`, observe | none | none | no | global | not routed (`bundle`) | observe only | `index.d.ts:4453` |
| `turn.step` | Before each model request of a turn, main loop or subagent (`agentId`) | `{ turnId, index, model, effort?, messageCount, agentId? }` | the whole response, `TurnStepResult` (`answer`, tool uses, usage) | an answer without `next` sends no request | none named in `d.ts` | yes, an async generator (`StreamingEventName`, `index.d.ts:12179`) | global, counted on its own code, summed over the response | not routed (`bundle`) | the request goes on | `index.d.ts:4462` |
| `turn.complete` | When a turn has ended, at the point its duration is reported | `{ reason: answer/aborted/refusal/error, text, usage? }` | `{ text }`, shown beneath the answer | none | none | no | global | not routed (`bundle`) | the answer stands | `index.d.ts:4471` |
| `engine.create` | Once per load or reload of the plugin, before any other hook of it | `EngineCreateInput`: the `$` built so far | `EngineInterfaceBuilt`, `$` through `next` | none (withholding nouns outside `user`) | none | no | none, no budget (`index.d.ts:5128`) | not routed (`bundle`) | the plugin unloads when it replaces a noun | `index.d.ts:4480` |

## Dispatch rules

- The hooks module exports `register(on, options)` (`d.ts`, `index.d.ts:9299`).
- `options` is fixed for one activation, and a change to it reloads the plugin and runs `register` again (`d.ts`, `index.d.ts:9302`).
- `on(pattern, hook)` registers a hook, and `on(pattern, matcher, hook)` registers a hook that narrows on the matcher (`d.ts`, `index.d.ts:6779`).
- A hook has the form `($, e, next)`, where `$` is the engine, `e` is the event, and `next` continues the chain (`d.ts`, `index.d.ts:1172`).
- `next(e)` runs the hooks beneath the hook, then core, and its result is the answer of the hook (`d.ts`, `index.d.ts:3952`).
- `next.to(e, tier)` continues at a tier, and skips every link between the hook and that tier (`d.ts`, `index.d.ts:6551`).
- The five tiers, outermost first, are `prepend`, `user`, `append`, `builtin`, and `core` (`d.ts`, `index.d.ts:12618`).
- `TargetTier` is `append`, `builtin`, or `core`, so `next.to` never names `prepend` or `user` (`d.ts`, `index.d.ts:12322`).
- A managed hook may name `append`, `builtin`, or `core`, and it never skips a tier with more authority (`d.ts`, `index.d.ts:6554`).
- `prepend` and `append` are the managed plugins that an administrator lists, and `builtin` holds the plugins in the binary (`d.ts`, `index.d.ts:12604`).
- A field that the event marks as pinned is refused on a rewrite, such as `provider` in `AgentOfferInput` (`d.ts`, `index.d.ts:231`).
- A rewrite of a field that the matcher names may change that field, and the type keeps the matched members (`d.ts`, `index.d.ts:5616`).
- A hook that throws, returns a wrong shape, or overruns its budget is skipped, and the hooks beneath or core answer in its place (`d.ts`, `index.d.ts:3943`).
- For a classic settings hook, a field of the wrong shape fails the hook, and the hook is skipped (`d.ts`, `index.d.ts:1280`).
- `HookFailure.kind` is `throw`, `timeout`, or `re-entry` (`d.ts`, `index.d.ts:5151`).
- A `re-entry` failure is not a fault, and the hook is not run beneath its own frame (`d.ts`, `index.d.ts:5145`).
- A guard fails open unless its registration carries a `.catch` that refuses in its place (`d.ts`, `index.d.ts:3947`).
- The `.catch` handler runs with `next.error` and `next.called`, and it is run afresh when the hook fails (`d.ts`, `index.d.ts:1172`, `1188`).
- A second `.catch` on one registration throws, and so does a `.catch` added after `register` returns (`d.ts`, `index.d.ts:9326`).
- The budget is 10 s per dispatch, from the call of the hook to its return (`d.ts`, `index.d.ts:5116`).
- A streaming hook counts only while its own code runs, so `turn.step` sums its response (`d.ts`, `index.d.ts:5112`).
- The `.catch` grace is 1 s, on a fresh budget from the moment the handler is called (`d.ts`, `index.d.ts:5124`).
- `engine.create` has no budget (`d.ts`, `index.d.ts:5122`).
- A hook may keep running for 5 s after `next.signal` aborts, and past that it is reported as lingering (`d.ts`, `index.d.ts:5132`).
- A timer of the plugin is cancelled by a hot reload of the plugin, with the old environment (`d.ts`, `index.d.ts:3430`).
- A hot reload runs the hooks of the changed modules alone, or all of them when a hook answers `engine.create` or `plugin.register` (`d.ts`, `index.d.ts:4335`).
- `claude plugin validate <dir>` reads the manifest and the module source before any session loads the plugin (`d.ts`, `index.d.ts:9`).
- `claude plugin validate` lists each gating hook, with or without a `.catch` (`d.ts`, `index.d.ts:9344`).
- `claude plugin test <dir>` runs each `*.test.ts` and `*.test.tsx` file with no fs, network, or process (`d.ts`, `index.d.ts:30`).

## Changed since 2.1.293

The `mods-api.md` map of 0.28.0 is the 2.1.293 source here.
Each line below names what changed or what stayed.

- The 46 engine event names are unchanged: the keys of `EngineEventOf` equal the hook list of `mods-api.md`, name by name (`d.ts`, `index.d.ts:3950`).
- Each of the 46 names is a quoted string in the 2.1.296 bundle (`bundle`, `external/cc-2.1.296/strings.txt`).
- The `effort` of `TurnStepInput` types `'low' | 'medium' | 'high' | 'xhigh' | 'max' | number`, and `mods-api.md` listed only the five strings (`d.ts`, `index.d.ts:13457`, map line 41).
- `$.prompt.submit` takes `asUser`, which is true when the plugin submits the words of the person, and `mods-api.md` did not list it (`d.ts`, `index.d.ts:8982`).
- Every hook sees the origin `{ kind: 'plugin', name, asUser: true }` for such a prompt, and the model reads the text bare (`d.ts`, `index.d.ts:9026`).
- The input of `prompt.submit` takes `attachments?` and `turnId?`, and `mods-api.md` listed only `text`, `origin`, `wait?`, and `context?` (`d.ts`, `index.d.ts:9067`, `9085`).
- The input of `session.start` takes `surface` (`RenderSurface | null`) and `isInteractive`, and `mods-api.md` did not list either field (`d.ts`, `index.d.ts:11679`–`11693`).
- `session.start` does not fire on `/clear` (`d.ts`, `index.d.ts:4331`), as `mods-api.md` also said.
- `mods-api.md` also said that `session.start` does not fire on `/resume` or on compaction, and the `d.ts` names neither case (`d.ts`, `index.d.ts:4331`).
- The `model` of an `agent.spawn` result is the resolved id from core, or an alias such as `haiku` or an id from a hook (`d.ts`, `index.d.ts:401`, `403`–`404`, `406`).
- `mods-api.md` listed the `model` of the spawn result as a string only, so the alias or id rule is new in the doc (`d.ts`, `index.d.ts:406`).

## Open for experiment

- What fires after `/clear`: `session.end` names reason `clear` (`d.ts`, `index.d.ts:4434`), and the test is a hooks-lab run that logs each event after a `/clear` in a live session.
- When `$.prompt.submit` can run after `/clear`: the test is a plugin that calls it on `session.end` with reason `clear`, then logs whether the prompt reaches `turn.start` (`inferred`).
- Whether `$.session.send({ to: { agentId }, text })` reaches a running subagent: the example at `index.d.ts:2894` shows the call (`d.ts`), and the test is a long subagent that logs `session.receive` after the send (`inferred`).
- Whether the subagent follows the text sent to it: the test is a subagent that the send tells to stop after its next file, then a count of its `tool.call` events after the send (`inferred`).
- Whether `turn.step` carries `usage` for each request: `TurnStepResult` types `usage` as `TurnUsage | null` (`d.ts`, `index.d.ts:13538`), and the test is a turn with two tool calls that logs the `usage` of each `turn.step` (`inferred`).
- Whether `tool.call` fires for an `Agent` call with no `subagent_type`: the `agent.offer` doc names `subagent_type` as the key at dispatch (`d.ts`, `index.d.ts:211`), and the test is a call with no `subagent_type` that logs each `tool.call` event (`inferred`).
