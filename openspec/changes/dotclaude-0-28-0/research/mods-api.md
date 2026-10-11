# Mods API of Claude Code 2.1.293

Source: `external/cc-2.1.293/strings.txt` (`strings -n 8`), read with `rg -b`.
Offsets are byte offsets in that file.
The `claude-code.d.ts` file and the `plugin-authoring` SKILL.md are not on this machine (no `.claude/types`, `find` of `~/.claude` found no copy), so input shapes come from the validators in the bundle (the `checkArgument` / `check` functions of each event "site").
Labels: **binary** (read in the bundle), **inference** (derived from binary code, not run), **web** (GitHub issue page).
Nothing here was run. The `d.ts` field lists may have more optional fields than the validators pin.

## 1. Event list

Hookable events (list `jVe`, offset 16064191 region, and shape table `tr` at 16114926):
`tool.call`, `tool.check`, `ui.render`, `ui.resolve`, `ui.press`, `ui.input`, `ui.select`, `ui.message`, `ui.fault`, `ui.scroll`, `ui.focus`,
`agent.offer`, `agent.spawn`,
`prompt.submit`, `prompt.fill`, `prompt.suggest`, `prompt.edit`, `prompt.autocomplete`, `prompt.section`, `prompt.context`, `prompt.attachment`, `prompt.mention`, `prompt.compose`,
`tool.describe`, `command.run`, `command.describe`, `config.set`, `config.describe`, `telemetry.log`, `telemetry.mark`,
`skill.prompt`, `attribution.text`,
`session.start`, `session.receive`, `session.append`, `session.send`, `session.compact`, `session.attach`, `session.detach`, `session.measure`, `session.end`,
`plugin.register`, `turn.start`, `turn.step`, `turn.complete`, `engine.create`,
and the calls (also hookable): `classic.<HookName>` (e.g. `classic.PreToolUse`), `model.complete`, `model.classify`, `model.fork`, `audio.*`, `mcp.call`, `mcp.connect`, `session.cwd|root|model|turns|id|messages|repo|surface|surfaces|authorize|usage|version`, `turn.abort`, `prompt.read`, `flag.value`, `tool.list|register`, `command.list|register`, `config.list`, `agent.list|register`, `ui.*` calls, `fs.*`, `store.*`, `state.*`, `clock.*`, `http.fetch`, `process.run`, `process.spawn`, `settings.read`, `env.get|set` (offset 16063854).
No `model.*`/`request.*` event exists that rewrites the main request. `model.complete|classify|fork` are calls a mod makes, not hooks that steer the engine.
Stream events (hook is an async generator, `yield* next(e)`): `turn.step`, `process.spawn` (`hgr`, offset 16064646).
The shape table `tr` lists the "refusal" shape: `tool.call {deny}`, `tool.check {decision}`, `agent.offer {isOffered:false}`, `agent.spawn {deny}`, `prompt.submit {drop}`, `prompt.mention {deny}`, `command.run` (answer without next), `config.set {deny}`, `telemetry.log|mark {deny}`, `plugin.register {refuse}`, `session.append {deny}`, `session.receive {consumed}`, `session.send {isDelivered:false}`, `session.compact {skip}`, `ui.scroll|focus {deny}`. All others (`undefined`) cannot refuse.

Shape rule for all events: the hook gets `($, e, next)`. `next(e)` passes a (possibly rewritten) argument down and returns the result. Pinned keys of `e` must not change (error "next() passed an argument with a changed ...", offset 16212400+ `yt`).

## 2. Tables per event (context cuts and routing)

Columns: name | input | return | can drop | can change model/effort | routed by sec-default | evidence.
"Skipped by sec-default" means: when `cc-plugin-sec-default` is seated, a user-tier hook is not run (section 3).

| name | input | return | can drop | model/effort | routed by sec-default | evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `prompt.section` | `{name, text}` (+ `scope`, origin per d.ts in wiki). Matcher `{name}`. Called once per section by the composer. | `{text: string}` or `{text: null}`. `name` pinned. | yes, `text:null` leaves the section out | no | yes, always to append tier (user skipped) | validator `Vi` at 16141860 (`"a text that is neither a string nor null"`, `"a changed name (the engine caches the section by it)"`); caller `Zzn` at 21316803; sec-default at 48200447 |
| `prompt.compose` | the facts `{tools, traits, model, surfaces, sections...}`; sees all sections at once | `{sections: [...]}` (list rewrite) | yes, drop or reorder sections | no (`model` is pinned, `pinnedKeys:["model"]`) | yes, always to append | `ci` at 16133616; core at 21315628 (`{sections:await n(s)}`); `$.prompt.compose` at 23155921 |
| `prompt.context` | `{blocks:[{name,text}], instructionFiles}` (claudeMd block, user-context blocks) | `{blocks, instructionFiles}` | yes, can remove or rewrite blocks and the `claudeMd` text. If both text and files change, the text stands and files read unknown | no | yes, always to append | `Bi` at 16141444; helpers `Fi`, `Gr` at 16140149 (log text at 16140904); caller `Jzn` at 21316682 |
| `prompt.attachment` | `{type, text, origin, agentId, detail?}`, matcher on `type` | `{text: string}` or `{text: null}`; `type, origin, agentId, detail` pinned | yes, `text:null` leaves the attachment out (reminders, listings, `sandbox_instructions`, `environment`, `model`, `proactivity`, `attention_budget`, `deferred_tools_delta`, `agent_listing_delta`, `mcp_instructions_delta`, `mcp_dropped_tools_delta`, `skill_listing`, `output_style_instructions`, `language`, `auto_mode`, `task_reminder`, `todo_reminder`: types from design.md and wiki, not re-verified here) | no | NO. Not on the sec-default list, so it runs for user tier under sec-default | `Mi` at 16139684; sec-default scan list at 48196952 (no `prompt.attachment`) |
| `tool.describe` | `{tool, description, isDeferred?, provider}` | `{description, isDeferred?}`; `tool`, `provider` pinned | rewrite only (empty string is a string; no null). `isDeferred` moves a tool to deferred | no | yes for items whose `provider.tier` is not user, builtin, or core (those go to append); user/builtin/core tools stay hookable by user tier | `Ma` at 16203778; sec-default fn `d` at 48199405 region |
| `command.describe` | `{command, immediate, provider, label/description fields}` | same object rewritten (description) | rewrite only | no | same as `tool.describe` | `fi` at 16131995 |
| `agent.offer` | `{agent, description, source, provider}` | `{isOffered: boolean}` (+ description rewrite) | yes, `isOffered:false` removes the agent from the listing and from dispatch | no | same as `tool.describe` (by provider tier) | `Ca` at 16205xxx (var in table at 16208xxx); shape table at 16114926 |
| `agent.spawn` | `{tool_use_id, prompt, description, subagentType, provider, model, parentModel, parentAgentId?, permissionMode, background, fork, isTeammate?, workflow?, name, cwd}`; matcher e.g. `{fork:true}` | the spawn object, rewritten, with `model` a string, or `{deny: string}`. `next(e)` result has `agentId` | deny only; can rewrite `prompt`, `description`, `subagentType` (retype; permission rules re-checked, teammates refused), `background`, `cwd` | model YES via `model` (string, applied as `Je=_e.model`; `model` is `void 0` for forks). No `effort` key | by provider tier like `tool.describe`: user hook runs for builtin, user and core agents; skipped for org (prepend/append) agents | `_a` and `Hn` at 16208061 region (`"a model that is neither a string nor undefined"`), pinned keys `d8t` = tool_use_id, name, fork, isTeammate, workflow, parentModel, permissionMode, parentAgentId, provider; spawn input built at 28498800 (`m=`); applied at 28711573 (`Je=_e.model`, `q=_e.prompt`) and 28705583 (teammates); workflow and teammate: only `background, cwd` (teammate) or nothing (workflow) apply (`Fn`) |
| `turn.step` | `{turnId, index, messageCount, agentId?, model, effort?}` (every model request of the main loop and of subagents); stream hook | async generator: `yield* next(e)` with a rewritten `e`. Result chunks give `{answer, toolUses, serverToolUses?, stopReason, usage}` | can rewrite the request model and effort; chunks can be filtered | YES: `e.model` (non-empty string) and `e.effort` (`low\|medium\|high\|xhigh\|max`, list `Dc` at 13372660) | NO (not on list) | `La` at 16207112; apply code `Is`/`as`/`ps` at 28519000-28526000: `model: as(s.model, n.model)` and `hookEffortValue: s.effort` |
| `prompt.submit` | `{text, origin, wait?, context?}` | `{text, context?}` or `{drop: string}` | yes, `drop` | no field for model or effort | classic path not rerouted; not on list | `Gi` at 16142244 |
| `prompt.mention` | `{mention, agentId, ...}` | `{type,...}` or `{deny}` plus `context` | deny | no | no | `Si` at 16136765 |
| `skill.prompt` | `{skill, text}` | `{text}` | rewrite `text` (not null) | no | yes, always to append | `zi` at 16142895; #96831 says not dispatched in 2.1.281 |
| `attribution.text` | `{kind, text}` | `{text}` | rewrite | no | yes, always to append | `Hi` at 16138579 |
| `tool.call` | `{tool, input, tool_use_id, agentId, ...}` | `{result}`, `{deny}`, `{context}`; may rewrite input | deny, replace the result | no | classic path not rerouted | `Ha` at 16202767 |
| `tool.check` | `{tool, input, tool_use_id, agentId, ceiling}` | `{decision: allow\|ask\|deny, reason, rule, hook}` | deny | no | yes, deny-rule guard (sec-default wraps it) | `Na` at 16203247; sec-default 48200675 |
| `classic.PreToolUse` | classic envelope `{tool, tool_use_id, agentId, ...tool input}` | `{deny}`, `{ask}`, `{allow:true}`, `updatedInput` | deny; `updatedInput` rewrites the tool input | on the `Agent` tool input: `model` and `effort` (see section 4) | yes, `classic.*` always to append for the mod handler | `Ia` at 16204xxx; `Kt`, `Pe` at 16208xxx; sec-default `classic.*` at 48200350 |
| `session.compact` | `{trigger, agentId, instructions?, messages}` | `{messages, tokensBefore, tokensAfter, usage}` or `{skip: reason}` | yes, replace messages; `skip` vetoes (only before `next`) | no | no | `ga` at 16118xxx (`"neither { messages } nor { skip }"`) |
| `session.append` | `{door, origin, agentId, uuid, message}` | `{message}` or `{deny}` (only plugin appends can be denied) | rewrite rows engine appends (message `type,name,role,isMeta` pinned) | no | no | `la` at 16117xxx |
| `session.send` / `session.receive` | `{to,text,origin,agentId}` / `{text,origin,event,agentId}` | `{isDelivered:false, reason}` / `{consumed: string}` or `{text}` | yes | no | no | `Ta`, `wa` at 16118xxx |
| `turn.start`, `turn.complete`, `session.*` others | ids, `answer`, `usage` | observe; `turn.complete` may return `{text}` to replace the answer | no | no | no | `xds` at 16114xxx, `Fa` at 16206695 |
| `settings.read` | call `$.settings.read({source?})`, sources `managed,user,project,local,memory` | the settings object (read only) | n/a | NO. It returns a source object to the mod. The engine does not read it back | yes, always to append | `eT` at 16310598, `wHo` at 23145631 |
| `model.complete`, `model.classify`, `model.fork` | calls: `{...}`, `(text, labels, options)`, fork args | model output / label | n/a | the mod can run a side model call (cost, latency) | no | 16305555 (`Nw`) |

Not examined in detail: `ui.*`, `prompt.fill|suggest|edit|autocomplete`, `config.set|describe`, `telemetry.*`, `plugin.register`, `engine.create`, `command.run`.

## 3. Tiers and routing

- Tiers (array `ux`, offset 16063xxx): `prepend`, `user`, `append`, `builtin`, `core`. Dispatch goes in this order.
- `next.to(e, "<tier>")` jumps the chain. Allowed targets from each tier (`MAt`): `prepend` to `append|builtin|core`, `user` to none, `append` to `core`. A user-tier hook cannot use `next.to` (error "next.to is available to managed plugins (prependPlugins / appendPlugins) only", offset 16214028). The target must be a string literal.
- `cc-plugin-sec-default` (offset 48196952 scan, 48200447 code) registers:
  - `classic.*`, `prompt.section`, `prompt.context`, `prompt.compose`, `skill.prompt`, `attribution.text`, `settings.read`: always `next.to(e,"append")`. User tier and everything between is skipped. Builtin and core still run.
  - `tool.describe`, `command.describe`, `agent.offer`, `agent.spawn`: `d(e,next)` = if `e.provider.tier` is in `["user","builtin","core"]` (`USER_REACHABLE_TIERS`) then `next(e)` (normal chain) else `next.to(e,"append")`. So the guard only skips user hooks for items an organization (prepend or append tier) provides.
  - `tool.register`, `tool.list`, `tool.check`, `plugin.register`: tool policy and the deny-rule guard.
  - NOT hooked: `prompt.attachment`, `turn.step`, `turn.start`, `turn.complete`, `prompt.submit`, `prompt.edit`, `tool.call`, `command.run`, `session.*`, `agent.spawn` for user-reachable agents (see above), `prompt.mention`.
- Seating (`far`, offset 18574856; `fq`, 18578174): sec-default is seated when `HX()` (managed `policySettings` has any key) or `aFn()` (a non-user-writable policy source), or the plan is team or enterprise. If the managed `prependPlugins` array exists, it is seated only if it lists `sec-default@builtin` (message "not seated: managed prependPlugins does not list it").
- sec-default itself: `enabledFromTrustedSettingsOnly:true, enabledFromPolicyOnly:true`. Its enabled state is read from policy sources only (`pn`, 16093799: `q7t()` and `policySettings`). **Inference:** `enabledPlugins["cc-plugin-sec-default@builtin"]:false` in user settings is ignored. Design D2 of the change assumes it works. It probably does not.
- `prependPlugins` / `appendPlugins` (settings schema text at 10670977 and 13581645): arrays of `plugin@marketplace` ids of managed plugins (managed `enabledPlugins` true). "Only honored from managed settings (or, on a machine with none, from user settings for your own plugins); ignored in project, local and --settings sources." Order: prepend list, other managed, then user/project/marketplace, then appendPlugins, then builtin plugins.
- A plugin from a marketplace (GitHub) gets the `user` tier. A plugin gets `prepend` or `append` tier only through those managed keys (plus the managed-marketplace rule in `wiki/design/Claude-Mods.md`, **official** docs, not re-read here).
- Under the seated guard, a user-tier mod runs for `turn.step`, `prompt.attachment`, `agent.spawn` (user/builtin/core agents), `tool.describe` and `agent.offer` (same), `prompt.submit`, `session.*`. It does NOT run for the `prompt.section|context|compose` family, `skill.prompt`, `attribution.text`, `classic.*` (mod handler).
- Measured on this machine in 2.1.292 (wiki, **official/measured**): the classic `PreToolUse` command hook of `hooks.json` still ran while the guard was seated. The `classic.*` reroute concerns the module handler.

## 4. Model and effort steering

| Route | Fields | Evidence |
| --- | --- | --- |
| `turn.step` hook (any mod) | rewrite `e.model` (string) and `e.effort` before `yield* next(e)`. Applies per request, main loop and subagents (`agentId` set on subagent steps; the telemetry mod skips them with `if(f.agentId!==void 0)`, offset 48177074). `index` counts requests of the turn | `La` 16207112; `Is` at 28519xxx; `turn.step` type text in `jo` list |
| limits of `turn.step` | model must pass the policy check `$7` (availableModels / allowed list), else the engine keeps its model and logs `turn.step: model X is not allowed by policy; the request keeps Y` (28516561). A request that resumes a truncated thought keeps its model (log at 28518111); the rewrite applies from the next request. `effort` must be one of `low, medium, high, xhigh, max`; a number is internal only. `effort` is applied only if it differs from the sent one (`hookEffortValue`) | `as`, `ps`, `Is` |
| `agent.spawn` hook | rewrite `model` (string) on the spawn object. No `effort` key. Not for `fork:true` (model is `undefined`; forks inherit the parent) | `Hn`, `_a`, 28711573 |
| Agent tool input (model-chosen or classic `PreToolUse` `updatedInput` on `Agent`) | `model` enum `sonnet\|opus\|haiku\|fable`, `effort` enum `low..max`, `subagent_type`, `prompt`, `description`, `run_in_background` (schema `Mo`, offset 28697991). The schema text says set `model` and `effort` "ONLY when the user ... explicitly ask" | 28697991 |
| classic hook `PreToolUse` | `hookSpecificOutput.updatedInput` (docs text at 7032316 and 7333093: "Modified tool input (PreToolUse only)"). A hook can set `model` and `effort` in the Agent input. Under sec-default the module handler for `classic.*` is skipped, the hooks.json command hook is not (measured 2.1.292) | 7333093, wiki |
| `UserPromptSubmit` classic hook / `prompt.submit` | can add context or drop, cannot set model/effort | `Gi` |
| `settings.read` | read only. Cannot override `model`, `effortLevel`, `maxEffortLevel` | 23145631 |
| `prompt.compose` / `model` in facts | `model` is pinned | `ci` |
| side calls | `$.model.classify(text, labels)`, `$.model.complete(...)` let a mod ask a model. Costs tokens | 16305555 |

Main-session model per turn: `turn.step` is the only event with a changeable `model`/`effort` for the main loop. A "single turn" route is the same event (`index===0` of each `turnId`, or all steps of the turn).

## 5. Task text before the model is chosen

- Main request: `prompt.submit` sees `{text}` first (before the turn). The mod stores the routing decision (`$.state` or module memory) and `turn.step` applies it to `index 0..n`. `turn.step` itself has only `messageCount`; the history is available through the call `$.session.messages()` (16309682).
- Subagent: `agent.spawn` sees the full `prompt`, `description`, `subagentType`, the current `model` and `parentModel`, before the model is chosen. It returns the new `model`. `await next(e)` returns `agentId`, so the mod can record `agentId -> effort` and apply it in `turn.step` (built-in mod does the same mapping for fork inheritance: `y.set(a.agentId, ...)`, 48214883; **inference** that the result carries `agentId` in all cases).
- Tool input: `tool.call`/`classic.PreToolUse` see `tool` and `input` before the tool runs.
- So a deterministic router `task text -> cheapest model + effort` is possible: `agent.spawn` for subagent model, `turn.step` for effort and for the main model. The model strings are not mapped by the engine except by the policy list (`$7`) and the alias resolver. **Not verified:** whether `agent.spawn` accepts a full model ID or only an alias (`sonnet|opus|haiku|fable`); the validator only checks `typeof string`.
- 2.1.293 adds `claude-haiku-5-5` (alias `haiku`, wiki design.md); `fable` appears in the Agent `model` enum.

## 6. Known limits

- #96831 (**web**, open, tested on 2.1.281): `classic.PreToolUse` and `skill.prompt` are documented but not dispatched to modules. Dispatched: `tool.call`, `tool.check`, `command.run`, `turn.*`, `session.*`. In 2.1.293 the `classic.*` and `skill.prompt` sites exist (sec-default routes them), but no run of 2.1.293 confirms dispatch. Treat both as unreliable until measured.
- #91870 (**web**): "still rapidly iterating on the interface"; breaking changes expected, fewer after week 1. Each dotclaude release pins one Claude Code version (wiki).
- Early access: "this surface may change between releases without notice" (d.ts header, **official**, wiki).
- Errors: a hook that throws, returns the wrong shape, or overruns its budget is skipped and logged (`hook failed: <plugin>: ... (<event>; <effect>)`, `jo("its answer stands")`, 16212400+). A hook without `.catch` fails open. A hook with `.catch` fails closed (the `.catch` answers). Overrun log after 5000 ms past budget (`MCe=5000`, 16212354). `prompt.edit` budget 50 ms (`Ki`, 16141500).
- A hook that calls `next(e)` and then denies is reported failed, by name, for `config.set|state.set|env.set|agent.spawn|prompt.submit` (changelog 30186988, 30199463). Deny must come before `next`.
- Long text is clipped and logged, not refused (changelog 30214667). Texts over the cap are accepted but logged (`NVe`).
- `turn.step`: a rewrite that names a model outside policy is ignored with a warning. A model fallback mid-response drops discarded tool calls from the result (fixed, changelog 30198216).
- Hot reload: the built-in skill text says the mod "hot-reloads in this session" (48262322). The log "hooks module ... unloaded ... the version loaded before is unloaded" appears when a reload fails (changelog 30199308). `claude plugin validate` follows `$` only into functions of the module file; destructured options named like a top-level function used to be refused (fixed, 30198449). Module caps: a second module entry is refused.
- `agent.spawn` limits: workflow agents accept only refusal; teammates accept only `background`, `cwd`; retyping a teammate is refused; a rewrite that a permission rule now rules is refused (28705583, 28711573).
- `session.start` does not fire after `/clear`, `/resume`, compaction (wiki d.ts note).
