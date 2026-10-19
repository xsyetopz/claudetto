# Mod API: Agent

`$.agent` starts and lists subagents and teammates, and it registers new agent types.
`agent.offer` decides which agent types the model sees.
`agent.spawn` picks the model of a new agent or refuses it.
Example: `const { agentId } = await $.agent.spawn({ prompt: "Read README.md." })`.

In the "Where" column, **Run time** means in a hook, in a closure that a hook drew, or in a timer callback.
It does not mean inside `register`.

## Members of `$.agent`

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `$.agent.spawn` | Spawns a subagent: the event `agent.spawn`, the same call the engine makes when the Agent tool starts one, the engine fills the rest. | Type: `(input: AgentSpawnArgs) => Promise<AgentSpawnResult>`. Starts a subagent in the background and resolves `{ model, agentId }` or `{ deny }`. Example: `await $.agent.spawn({ prompt: "Read README.md." })`. | Run time. | `CoreEngineInterface` line 3260, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.agent.list` | Returns the session's agents so far, subagents and teammates: the ones the model spawned and the ones plugins did alike. | Type: `() => Promise<AgentInfo[]>`. One entry for each agent until the engine drops its task. A workflow's agents are not listed. | Run time. | `CoreEngineInterface` line 3269, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `$.agent.register` | Defines an agent type the Agent tool dispatches from the next turn on, named `<plugin>:<name>`: the event `agent.register`. | Type: `(spec: AgentSpec) => Promise<OpValueOf['agent.register']>`. Takes the same fields as an agent file. A second call with the same name replaces the first. Rejects on an invalid spec. | After the session binds at `session.start` (rejects before). | `CoreEngineInterface` line 3295, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |

## Engine Events

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `agent.offer` | Fires when the engine offers an agent type to the model, in the agent listing and again at dispatch, `next(e)` resolves to `{ isOffered: true }`. | Input `AgentOfferInput`. Result `AgentOfferResult`. Hook result: `{ isOffered }`. Return `{ isOffered: false }` to hide the agent type from the model and refuse its dispatch. | Hook via `on('agent.offer', ...)`. Also callable as `$.agent.offer(...)`. | `EngineEventOf` line 4176, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `agent.spawn` | Fires when the Agent tool, or a workflow script's `agent()` (`e.workflow`), is about to start an agent, its model not yet resolved. | Input `AgentSpawnInput`. Result `AgentSpawnResult`. Hook result: `{ model }` or `{ deny }`. A guard that fails is skipped and the subagent starts. | Hook via `on('agent.spawn', ...)`. Also callable as `$.agent.spawn(...)`. | `EngineEventOf` line 4188, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |

## Events Raised by `$.agent` Calls

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `agent.list` | The argument of `$.agent.list()`. | Input: `NoArgs`. Value: `AgentInfo[]`. A hook above the caller returns `next(e)`, `{ deny: reason }` or `{ value }`. | Hook via `on('agent.list', ...)`. Raised by the call `$.agent.list(...)`. | `OpEventOf` line 7115, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `agent.register` | The argument of `$.agent.register(spec)`: the agent type as the plugin defined it. A hook above rewrites any of it, the type stays the caller's. | Input: `AgentSpec`. Value: `{ agent: string, }`. A hook above the caller returns `next(e)`, `{ deny: reason }` or `{ value }`. | Hook via `on('agent.register', ...)`. Raised by the call `$.agent.register(...)`. | `OpEventOf` line 7120, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |

## Types

| Mark | Item | What it is for | Shape and limits | Source |
| --- | --- | --- | --- | --- |
| ✅ | `AgentCallRecord` | What an Agent call a plugin raised (`$.tool.call({ tool: "Agent", ... })`) answers as `result` once the agent settles, `text` is its final answer. | Object. Its fields have rows below. A plugin's spawn always runs in the background, so the call resolves with this record. | d.ts line 109 |
| ✅ | `AgentCallRecord.agentId` | The spawned agent's id, as `$.agent.list()` names it. | Type: `string`. | d.ts line 109 |
| ✅ | `AgentCallRecord.resolvedModel` | The model the agent resolved to, when one is known. | Type: `string`. Optional. | d.ts line 109 |
| ✅ | `AgentInfo` | One agent loop of this session as `$.agent.list()` returns it: a subagent or a teammate. | Object. Its fields have rows below. Used by `$.agent.list`, `agent.list`. | d.ts line 124 |
| ✅ | `AgentInfo.id` | The agent's one id: `agent.spawn` answers it as `agentId`, its loop's events carry it as `agentId`, a spawn inside it as `parentAgentId`. | Type: `string`. The Agent tool calls it `agentId`. The classic events call it `agent_id`. A teammate in its own terminal pane uses its address as the id. | d.ts line 124 |
| ✅ | `AgentInfo.teammateId` | A teammate's address in its team, `<name>@<team>`, which the roster keys it by, absent for any other agent. | Type: `string`. Optional. It joins `agent.spawn`'s `teammateId` and the Agent tool's `teammate_id`, and no event's `agentId`: that is `id`. A respawn under the name keeps it. | d.ts line 124 |
| ✅ | `AgentInfo.description` | The Agent call's own `description` of the task (a few words), as an `agent.spawn` hook left it. | Type: `string`. | d.ts line 124 |
| ✅ | `AgentInfo.type` | The agent type it was spawned as, `agent.spawn`'s `subagentType` (`general-purpose`, `Explore`, ...), `teammate` for one spawned as none. | Type: `string`. A teammate's classic events give its `name` as `agent_type`, not this. | d.ts line 124 |
| ✅ | `AgentInfo.status` | Where its loop stands now (AgentStatus): a teammate that waits for a message is `idle`, not `running`. | Type: `AgentStatus`. For a teammate in its own pane, this is the last word it wrote in the team roster. A closed pane leaves the word as it was. | d.ts line 124 |
| ✅ | `AgentInfo.parentId` | The id of the agent whose loop spawned it, absent when the main loop did. | Type: `string`. Optional. | d.ts line 124 |
| ✅ | `AgentInfo.spawnedBy` | The plugin whose `$.agent.spawn` (or Agent `$.tool.call`) started it, absent when the model or the person did. | Type: `string`. Optional. The origin axis: which plugin caused it, whichever loop that hook ran in. | d.ts line 124 |
| ✅ | `AgentInfo.name` | What SendMessage addresses it by (`Agent({ name })`, or the engine's own for a background agent), when it has one, not `description` or `type`. | Type: `string`. Optional. A teammate's is its name in the team, with a suffix when the call's was taken. Two agents may hold one name: `id` tells them apart. | d.ts line 124 |
| ✅ | `AgentLoop` | Which model loop an event happened in: the loop's agent id inside a subagent's or a teammate's loop, absent on the main loop. | Object. Its fields have rows below. It names the loop. `next.origin` names the plugin that caused the call. | d.ts line 193 |
| ✅ | `AgentLoop.agentId` | The id of the loop this call runs in: for a subagent or a teammate, the `id` `$.agent.list()` gives it, absent on the main loop. | Type: `string`. Optional. Pinned: a different value is refused. It names the loop, not the plugin that caused the call. | d.ts line 193 |
| ✅ | `AgentOfferInput` | The input of `agent.offer`: one agent type, at the moment the engine offers it to the model. | Object. Its fields have rows below. The same event fires when the model sees the agent list and when it names an agent at dispatch. Used by `agent.offer`, `$.agent.offer`. | d.ts line 213 |
| ✅ | `AgentOfferInput.agent` | Which type (`Explore`, `Plan`, a plugin's agent), the key a matcher narrows on. | Type: `string`. | d.ts line 213 |
| ✅ | `AgentOfferInput.description` | Its listing line's text as the definition states it (`whenToUse`). | Type: `string`. | d.ts line 213 |
| ✅ | `AgentOfferInput.source` | Where the definition came from (`built-in`, `plugin`, a settings source), so a matcher tells a built-in from a user's agent of its name. | Type: `string`. | d.ts line 213 |
| ✅ | `AgentOfferInput.provider` | Who provides this agent: the plugin and its tier, `{ plugin: "engine", tier: "core" }` for a built-in. Pinned: a rewrite is refused. | Type: `Origin`. | d.ts line 213 |
| ✅ | `AgentOfferResult` | What an `agent.offer` hook returns: whether the model is offered the agent type, in its listing and at dispatch. | Object. Its fields have rows below. Used by `agent.offer`, `$.agent.offer`. | d.ts line 239 |
| ✅ | `AgentOfferResult.isOffered` | A field of `AgentOfferResult`. | Type: `boolean`. | d.ts line 239 |
| ✅ | `AgentSpawnArgs` | `agent.spawn`'s input as the call takes it: what the Agent tool's caller says, the engine fills the rest. | Alias of the `prompt` field of `AgentSpawnInput` plus optional `description`, `subagentType`, `model`, `name`, and `cwd`. Used by `$.agent.spawn`. | d.ts line 250 |
| ✅ | `AgentSpawnInput` | The input of `agent.spawn`: what is decided about an agent about to start, before its model is resolved. | Object. Its fields have rows below. A hook may rewrite the content keys. Every other key is pinned. Used by `agent.spawn`. | d.ts line 260 |
| ✅ | `AgentSpawnInput.tool_use_id` | The Agent tool call this spawn belongs to (for `$.ui.notice`). Pinned: the spawn's identity. | Type: `string`. For a workflow agent, the Workflow tool call that started its run, shared by all of the run's agents and possibly empty on a resumed or server-launched run. | d.ts line 260 |
| ✅ | `AgentSpawnInput.prompt` | The task the subagent is given: the Agent tool's `prompt` parameter. A rewrite is the prompt the subagent runs with. | Type: `string`. On a workflow run that hides its script, the prompt is a placeholder. A rewrite of it is not applied. | d.ts line 260 |
| ✅ | `AgentSpawnInput.description` | The Agent tool's short `description` of the task (a few words). A rewrite is what the task shows as. | Type: `string`. | d.ts line 260 |
| ✅ | `AgentSpawnInput.subagentType` | The resolved agent type (`general-purpose`, `Explore`, a plugin's agent, `fork`). A rewrite names another agent this call can dispatch, exactly. | Type: `string`. Names the agent definition to start. A name that matches none refuses the spawn. | d.ts line 260 |
| ✅ | `AgentSpawnInput.provider` | Who provides this agent: the plugin and its tier, `{ plugin: "engine", tier: "core" }` for a built-in. Pinned with the spawn's identity. | Type: `Origin`. | d.ts line 260 |
| ✅ | `AgentSpawnInput.model` | The Agent tool's `model` parameter as given, an alias (`haiku`) or a full id, undefined lets the agent's own model, then the parent's, decide. | Type: `string`. Optional. A hook sets it to pick the model. Forks always inherit the model, so it is ignored for them. | d.ts line 260 |
| ✅ | `AgentSpawnInput.parentModel` | The parent's effective model, what `inherit` resolves to. Pinned: a fact of the parent (set `model` to change what the subagent runs on). | Type: `string`. | d.ts line 260 |
| ✅ | `AgentSpawnInput.parentAgentId` | The id of the loop the spawn happens in (its `tool.call` `agentId`, for a subagent or teammate its `$.agent.list()` id), absent from main. | Type: `string`. Optional. Pinned: a different value is refused. It names the model loop where the spawn happened. | d.ts line 260 |
| ✅ | `AgentSpawnInput.permissionMode` | The parent's permission mode (`default`, `acceptEdits`, `plan`, ...), which the subagent inherits. Pinned: a fact of the parent. | Type: `string`. Optional. | d.ts line 260 |
| ✅ | `AgentSpawnInput.background` | True when the subagent will run in the background (or remotely). A rewrite is read back as the call's `run_in_background`. | Type: `boolean`. The agent definition or remote isolation can force it on. Disabled background tasks force it off. A teammate's is always true. | d.ts line 260 |
| ✅ | `AgentSpawnInput.fork` | True for a fork of the parent: it inherits the parent's context and model, and `model` is ignored. Pinned: the spawn's identity. | Type: `boolean`. | d.ts line 260 |
| ✅ | `AgentSpawnInput.isTeammate` | Present, and true, when the call starts a teammate: a named agent of the session's team, which goes idle between turns and wakes on a message. | Type: `true`. Optional. Absent for any other agent. Pinned: the spawn's identity. | d.ts line 260 |
| ✅ | `AgentSpawnInput.workflow` | Present when a workflow script's `agent()` starts the agent, absent for any other. Pinned: the spawn's identity. | Type: `object`. Optional. A hook may rewrite `prompt` and `model` only. A deny becomes the error that the script's `agent()` call throws. | d.ts line 260 |
| ✅ | `AgentSpawnInput.resume` | Present when the run resumes a subagent or brings a teammate back from disk (`isTeammate` beside it), absent for a new agent. | Type: `object`. Optional. A hook can only refuse it. `prompt` is the resuming message. A deny leaves the agent parked. | d.ts line 260 |
| ✅ | `AgentSpawnInput.name` | Given by the call (`Agent({ name })`, addressable by SendMessage), undefined when unnamed. Pinned: the address the parent routes by. | Type: `string`. Optional. A teammate whose name the team has already gets a suffix (`scout-2`), which the answer's `teammateId` and `$.agent.list()` show. | d.ts line 260 |
| ✅ | `AgentSpawnInput.cwd` | The directory the subagent runs in when the call set one (`cwd`), undefined means the parent's. A rewrite is where the subagent runs. | Type: `string`. Optional. A teammate runs in the session's: a rewrite is left out, as `background`'s. | d.ts line 260 |
| ✅ | `AgentSpawnResult` | What an `agent.spawn` hook returns and what `next(e)` resolves to: the started subagent's `{ model, agentId }`, or `{ deny: reason }`, refusing it. | Object. Its fields have rows below. Resolves once the subagent starts. Its answer comes in its own `turn.complete` with this `agentId`. Used by `agent.spawn`, `$.agent.spawn`. | d.ts line 421 |
| ✅ | `AgentSpawnResult.model` | What the subagent runs on: from core the resolved id, from a hook an alias (`haiku`) or an id. | Type: `string`. | d.ts line 421 |
| ✅ | `AgentSpawnResult.agentId` | The started subagent's id: the same string its loop's `tool.call` events carry as `agentId` and `$.agent.list()` lists it by. | Type: `string`. Optional. A workflow's remote agent has no local loop, so nothing else carries it. Set by core, a hook that answers without `next` started none. | d.ts line 421 |
| ✅ | `AgentSpawnResult.teammateId` | A started teammate's address in its team, `<name>@<team>`, as `$.agent.list()` gives it, absent for any other agent. | Type: `string`. Optional. Set by core. It joins the list's `teammateId` and the tool's `teammate_id`, every event of the teammate's loop carries `agentId`. | d.ts line 421 |
| ✅ | `AgentSpawnResult.deny` | A field of `AgentSpawnResult`. | Type: `undefined`. Optional. | d.ts line 421 |
| ✅ | `AgentSpawnResult.deny` | Refuses the spawn, so nothing starts, the text is the Agent tool's error, or the error a workflow script's `agent()` call throws. | Type: `string`. Returned after a `next(e)` was answered it fails the hook: its `.catch` is asked (a deny from it fails too), or it is skipped by name and its last `next` stands. | d.ts line 421 |
| ✅ | `AgentSpawnResult.model` | A field of `AgentSpawnResult`. | Type: `undefined`. Optional. | d.ts line 421 |
| ✅ | `AgentSpawnResult.agentId` | A field of `AgentSpawnResult`. | Type: `undefined`. Optional. | d.ts line 421 |
| ✅ | `AgentSpawnResult.teammateId` | A field of `AgentSpawnResult`. | Type: `undefined`. Optional. | d.ts line 421 |
| ✅ | `AgentSpec` | What `$.agent.register` takes: an agent type this plugin defines, spelled as an agent definition in settings JSON is, plus its `name`. | Object. Its fields have rows below. Takes every field that an agent file or a `--agents` entry takes. Used by `$.agent.register`, `agent.register`. | d.ts line 466 |
| ✅ | `AgentSpec.name` | The type's short name (letters, digits, `_`, `-`, up to 64), the type is `<plugin>:<name>`, as a plugin's agent file `agents/<name>.md` names one. | Type: `string`. | d.ts line 466 |
| ✅ | `AgentSpec.description` | When to delegate to this agent: the line the model reads in its listing of agent types, and `agent.offer`'s `description`. | Type: `string`. | d.ts line 466 |
| ✅ | `AgentSpec.prompt` | The agent's system prompt, whole: it replaces the session's. | Type: `string`. | d.ts line 466 |
| ✅ | `AgentSpec.tools` | What the agent may call, by tool name (`Read`, `Bash`, `mcp__x__y`), a call to any other is refused. Left out: every tool the parent has. | Type: `readonly string[]`. Optional. | d.ts line 466 |
| ✅ | `AgentSpec.disallowedTools` | Tools withheld from the agent, by name, out of whatever `tools` allows. | Type: `readonly string[]`. Optional. | d.ts line 466 |
| ✅ | `AgentSpec.model` | The agent's model: an alias (`haiku`, `sonnet`, `opus`), a full id, or `inherit` for the parent's. Left out: the session's subagent default. | Type: `string`. Optional. | d.ts line 466 |
| ✅ | `AgentSpec.effort` | The agent's effort: a level (`low`, `medium`, `high`, `xhigh`, `max`) or an integer budget. | Type: `string \| number`. Optional. | d.ts line 466 |
| ✅ | `AgentSpec.permissionMode` | How the agent's permission asks are decided, a mode: `default`, `acceptEdits`, `plan`, `auto`, `dontAsk` or `bypassPermissions`. | Type: `string`. Optional. Left out: the parent's. | d.ts line 466 |
| ✅ | `AgentSpec.mcpServers` | Servers connected over MCP for the agent's run: a configured server's name, or `{ "<name>": { command, args } }`, one server's config inline. | Type: `readonly (string \| Record<string, unknown>)[]`. Optional. | d.ts line 466 |
| ✅ | `AgentSpec.hooks` | Settings hooks in force while the agent runs, in settings.json's `hooks` shape (`{ PreToolUse: [{ matcher, hooks: [...] }] }`). | Type: `Record<string, unknown>`. Optional. | d.ts line 466 |
| ✅ | `AgentSpec.maxTurns` | The most turns the agent takes before it stops. | Type: `number`. Optional. | d.ts line 466 |
| ✅ | `AgentSpec.autoCompactWindow` | Token count, 100000 to 1000000, at which the agent compacts its own conversation as a subagent. It only lowers the window the agent would otherwise get. | Type: `number`. Optional. | d.ts line 466 |
| ✅ | `AgentSpec.skills` | Preloaded into the agent's context before its first turn: skill names. | Type: `readonly string[]`. Optional. | d.ts line 466 |
| ✅ | `AgentSpec.initialPrompt` | The agent's first user turn, `{{intent}}` in it takes the spawn's prompt. Left out: the spawn's prompt is the first turn. | Type: `string`. Optional. | d.ts line 466 |
| ✅ | `AgentSpec.memory` | A persistent memory the agent keeps between runs, and where: `user`, `project` or `local`. | Type: `'user' \| 'project' \| 'local'`. Optional. | d.ts line 466 |
| ✅ | `AgentSpec.background` | Set so that every spawn of the agent runs in the background. | Type: `true`. Optional. | d.ts line 466 |
| ✅ | `AgentSpec.omitClaudeMd` | Set so that the agent's context carries no CLAUDE.md block (the person's, the project's, the rules): it takes what it needs from its prompt. | Type: `true`. Optional. | d.ts line 466 |
| ✅ | `AgentSpec.isolation` | Where the agent runs apart from the session: `worktree`, a git worktree of its own, `remote`, a cloud session where the build allows one. | Type: `'worktree' \| 'remote'`. Optional. | d.ts line 466 |
| ✅ | `AgentStatus` | Where an agent's loop stands: `pending` (not started), `running` a turn, `waiting` (held), `idle` (between turns, until a message wakes it), or ended. | Alias of `'pending' \| 'running' \| 'waiting' \| 'idle' \| 'completed' \| 'failed' \| 'killed'`. A message may resume an ended agent under the same id. | d.ts line 565 |
| ✅ | `AgentTeammateRecord` | What an Agent call that started a teammate answers as `result` at `tool.call`: the started teammate's two ids, its name and its model. | Object. Its fields have rows below. The call answers once the teammate started, each of its turns ends in its own `turn.complete`, carrying `agentId` (none here from a terminal pane). | d.ts line 574 |
| ✅ | `AgentTeammateRecord.status` | A field of `AgentTeammateRecord`. | Type: `'teammate_spawned'`. | d.ts line 574 |
| ✅ | `AgentTeammateRecord.agentId` | The teammate's one id, as every Agent record spells it: `agent.spawn`'s `agentId`, its loop's events' `agentId`, its `$.agent.list()` `id`. | Type: `string`. Optional. For one in a terminal pane, which runs no loop here, its address. Absent from a record an earlier version wrote, which a resumed transcript holds. | d.ts line 574 |
| ✅ | `AgentTeammateRecord.agent_id` | The same id in this record's older spelling, which the classic events share (`classic.SubagentStop`'s `agent_id`). | Type: `string`. | d.ts line 574 |
| ✅ | `AgentTeammateRecord.teammate_id` | Its address in its team, `<name>@<team>`: `$.agent.list()`'s `teammateId`, and no event's `agentId`. | Type: `string`. | d.ts line 574 |
| ✅ | `AgentTeammateRecord.name` | What SendMessage addresses it by: the call's `name`, any `@` replaced, with a suffix (`scout-2`) when the team already has it. | Type: `string`. | d.ts line 574 |
| ✅ | `AgentTeammateRecord.team_name` | The team it joined: the session's own. | Type: `string`. Optional. | d.ts line 574 |
| ✅ | `AgentTeammateRecord.agent_type` | What it was spawned as, when the call named a type. | Type: `string`. Optional. | d.ts line 574 |
| ✅ | `AgentTeammateRecord.resolvedModel` | What it was started on, an alias resolved, as every Agent record spells it: `agent.spawn`'s `model`. | Type: `string`. Optional. Absent where `agentId` is: `model` has it then, an alias as spelled. | d.ts line 574 |
| ✅ | `AgentTeammateRecord.model` | The older spelling of that, an alias left as the call spelled it. | Type: `string`. Optional. | d.ts line 574 |
| ✅ | `AgentTeammateRecord.prompt` | The task it was given, as an `agent.spawn` hook left it. | Type: `string`. | d.ts line 574 |

## See Also

- [Claude Code Mod API](Claude-Code-Mod-API)
- [Mod API: Session](Claude-Code-Mod-API-Session)
- [Use the Mods API](https://code.claude.com/docs/en/plugins/mods/api)
- [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference)
