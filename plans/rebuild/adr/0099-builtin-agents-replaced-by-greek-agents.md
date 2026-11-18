---
status: accepted
date: 2026-11-17
---
# Built-In Agents Replaced by Greek Agents

## Context and Problem Statement

Drafts disagreed on the agents. D321 named them `search`, `plan`, `work`, `sweep` and denied off-form `Agent` calls with a hook (`delegation.ts`); commit 378782f3 made that rename without the user's consent. The 2.1.319 design and D323 name them `Artemis`, `Metis`, `Athena`, `Heracles`. The Mod route (approved by the user on 2026-11-05) hid the built-ins with `agent.offer` and mapped `Explore`, `Plan`, `general-purpose` and an untyped call to claudetto agents with a `tool.call` rewrite. Which names do the agents carry, and which route replaces the built-in agents?

## Considered Options

- `search/plan/work/sweep` with an `Agent` hook that denies off-form calls (D321).
- Greek names with no route: built-ins stay listed beside them (D323).
- Greek names, built-ins turned off by `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` and `permissions.deny Agent(<name>)`.
- Greek names plus the Mod route with a `tool.call` rewrite (`agent.offer`, `tool.describe`, `tool.call`).
- Greek names plus the Mod route without a rewrite (`agent.offer`, `tool.describe`).
- Same-named files `Explore.md` and `Plan.md` in the user or project agents folder that override the built-ins.

## Decision Outcome

Chosen: Greek names plus the Mod route without a rewrite. Decided by the user on 2026-11-17 (Greek names, Mod route, plan mode unused so no plan-mode tools are used, override allowed if mapping works badly, the most effective variant left to the lead); the variant was chosen by the probes below on claude 2.1.326.

- `agent.offer` returns `{ isOffered: false }` for each agent whose `source` is `built-in`, except `fork`, and passes the rest to `next(e)`.
- `tool.describe` gives `Agent` a short text that names the four Greek agents and their jobs.
- No `tool.call` hook changes `Agent` input. A call to a hidden type gets the engine's own answer, which names the offered agents, and the model calls again with one of them.
- `permissions.deny` holds `EnterPlanMode` and `ExitPlanMode`, so no plan-mode tool reaches a request.

Probes (cc-inspect `cli`, claude 2.1.326, one throw-away plugin `t` with `hooks/hooks.json` `{"modules":["./register.js"]}`):

1. `agent.offer` alone, `subagent_type` `Explore`: the tool result is "Agent type 'Explore' not found. Available agents: t:Artemis, t:Metis". An untyped call gives "Agent type 'general-purpose' not found. Available agents: t:Artemis".
2. A `tool.call` hook reads the tool's own arguments flat on the event (`e.subagent_type`); `e.input` is `undefined` (a `{ deny }` hook echoed `undefined`). With `next({ ...e, subagent_type: "t:Artemis" })` the run's `task_started` names `t:Artemis`, and `Plan` mapped to `t:Metis` the same way.
3. In auto mode the same rewrite returns "The server-side auto mode classifier gave no verdict for Agent: a hook changed this call's input after auto mode reviewed it", and asks the model to issue the call again with the hook's input. An unchanged `t:Artemis` call in the same run started its subagent.
4. A bare `permissions.deny` of `WebFetch` keeps it out of the request after `ToolSearch select:WebFetch`; without the rule the tool is sent. Print mode sends neither plan-mode tool in any case, so for `EnterPlanMode` and `ExitPlanMode` the rule's effect is inferred from this probe, not measured.

Why not the rewrite: in auto mode it costs the same extra turn as the engine's own answer, and the accepted record "Deny With the Exact Form, Do Not Rewrite Tool Input" forbids changed input. Outside auto mode the rewrite saves one turn only for a stray call to a hidden type, which the listing no longer shows. Why not same-named files: the mapping works, so the override fallback the user allowed is not needed; such files would stay after uninstall and clash with a user's own `Explore.md`. Why not `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`: an env key turns the agents off, but the Mod hides them with no setting to write.

## Consequences

- Good: the listing names only the Greek agents, so each built-in listing line is gone from every request.
- Good: no hook changes tool input, so auto mode reviews each `Agent` call as the model wrote it.
- Bad: a call to `Explore`, `Plan`, `general-purpose`, `claude` or an untyped call costs one extra turn.
- Bad: `fork` stays offered; it is selected only by name, when its gate is on.
- `agent.offer` fires with `{ agent, description, source, provider }` (claude 2.1.327 `chunk-m14bt1pz.js@81306`); the engine refuses a hook result that changes `agent`, `source` or `provider` (`chunk-b0yr0k8v.js@209229`). Explore and Plan carry `source:"built-in"` (`chunk-m14bt1pz.js@242181`, `@243435`).
- `tool.call` pins only `tool`, `tool_use_id` and `agentId` (`chunk-b0yr0k8v.js@212201`).
- `EnterPlanMode` is deferred (`shouldDefer:!0`) and shares the enable gate of `ExitPlanMode` (`chunk-6p2zxmr3.js@35363`, `chunk-e7a91x6y.js@10642`).
- The register sketch written by the agent-route worker read `e.input.subagent_type` and set `input`, so it never mapped a call; this record replaces it.

Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:87; openspec/changes/archive/2026-11-16-2-1-323/design.md:99; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:89 (task 8.8); plugins/claudetto/agents/@088a227c; openspec/specs/surface-trim/spec.md:147; openspec/changes/archive/2026-11-16-2-1-323/specs/surface-trim/spec.md:38; openspec/specs/surface-trim/spec.md:208; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:98; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2122; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2250; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2395; clawdipedia.cc extend/mod-api/calls/agent (claude 2.1.323); clawdipedia.cc extend/mod-api/types/tool-command-config/tool-calls; cc-inspect `cli` probes on claude 2.1.326, 2026-11-17. Basis: user decision, 2026-11-05 and 2026-11-17 (AskUserQuestion); measured.
