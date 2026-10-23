# Matrix P3: Mod API (`extend/mod-api/`)

Target: Claude Code 2.1.306, claudetto 0.3.0-alpha.1.
`D` means `claude-code-docs/docs/extend/mod-api/`.
`vanilla-inventory.md` is `openspec/changes/0-3-0/research/vanilla-inventory.md`.
`A` means `openspec/changes/0-3-0/architecture.md`.
Sizes are characters unless the cell says tokens.
"0.2.0 uses" comes from `grep` of `src/plugins/*/slices/*/adapters/mod.ts`.
No `claude` run and no model call was made.
A saving that has no source says "unmeasured".

## Rules That Apply to Every Row

- Mods load only behind the server flag `tengu_plugin_hooks_modules` (`D index.md:22`, `D index.md:136`).
  `D nouns-and-gates.md:91` says the flag name is not shown in the program strings, so the name is a docs claim and not a local switch.
  A thrown or slow hook fails open (`D hooks.md:60-62`).
  So every gate in this table has a static fallback, and every text cut that matters has a cheaper lever that works with no mod.
- A text cut with a lever that needs no mod uses that lever first.
  The mod hook only rewrites text that no setting, env var, or agent file can reach.
- Each kept gate ends with `.catch` (`D hooks.md:35`).
- The tool list stays the same during a session.
  `$.tool.register` and `$.agent.register` work "from the next prompt on" (`D tool-command-config.md:42`, `D agent.md:32`), so they change the tool list or agent list mid-session and break the cache.
  A register at `session.start` is awaited and listed by turn one, so it is the only safe time.

## Table 1: Events and APIs

### Engine Events

| Event or API | Source | Decision | Reason and saving |
| --- | --- | --- | --- |
| `tool.check` | `D tool-command-config.md:54` | use (new in 0.3.0 for the gates, 0.2.0 uses it in `guard`) | The one gate for `Bash` `rm`, secrets, destructive `git`. Returns `{decision, reason, decider}`. `decider:"person"` hides the "always allow" row. Replaces 92 `rm` `ask` globs (`architecture.md:69`) and the auto-mode classifier, 19k to 35k tokens each review (`architecture.md:126`). Needs `.catch` that refuses. Static `deny` rules stay as fallback. Docs: `decider` is new in 2.1.304 |
| `tool.call` | `D tool-command-config.md:53` | keep for `sembr` rewrite, `decide` on `AskUserQuestion`, and browser search. Drop for `advise`, `patch`, and the print guard | 0.2.0 has 11 `on("tool.call"` sites. A rewrite of `Write` and `Edit` input costs 0 tokens. A guard that fails is skipped, so no safety gate sits here. Gates go to `tool.check` |
| `tool.describe` | `D tool-command-config.md:55` | use | Rewrite of tool descriptions in ASD-STE100. Input has `tool`, `description`, `isDeferred`, `provider` (`D types/tool-command-config.md:277`). Sizes of description plus schema are in Table 2. The ceiling is the schema JSON of the 12 tools (`vanilla-inventory.md:24`). Gain: unmeasured. A rewrite shortens the description, not the JSON schema. The answer is cached until `$.ui.invalidate`, so the list is stable. Docs conflict: `docs/prompts/override.md:125` says "No override" (`vanilla-inventory.md:122`). Test first |
| `tool.describe` with `isDeferred:true` on a built-in | `D types/tool-command-config.md:277` | n/a | Would move a schema behind `ToolSearch`. Unverified on built-ins (`vanilla-inventory.md:123`, `vanilla-inventory.md:244`) and a placement change. Open item 3 |
| `prompt.compose` | `D turn-prompt.md:48` | drop (0.2.0 uses it in `prompt`) | The `agent: "claudetto:main"` body replaces all of `system[2]` (`vanilla-inventory.md:44`, `vanilla-inventory.md:150`). One version only. When mods do not load, the whole default prompt comes back, so the hook is no fallback for the agent (`architecture.md:143`). The read call `$.prompt.compose()` stays for the lab |
| `prompt.section` | `D turn-prompt.md:46` | drop (0.2.0 uses it, 8 sites) | Status Differs: the program skips shared sections such as `lean_body`. The agent body covers them. Saves the section transforms of the `prompt` slice, 1,430 lines (`architecture.md:39`) |
| `prompt.context` | `D turn-prompt.md:47` | use | Runs once for each conversation. Drops or shortens `userEmail`, `attachedProject`, `currentDate`, and the `claudeMd` wrapper. The engine may still send `gitStatus` and `currentDate` (`D types/turn-prompt.md`, `PromptContextResult`), so the git block goes by `includeGitInstructions:false` (-348 tokens, `vanilla-inventory.md:56`). Gain of the hook: small, unmeasured. Open item 4 |
| `prompt.attachment` | `D turn-prompt.md:49` | use, narrowly | Typed `detail` exists only for `plan_mode`, `plan_mode_reentry`, `plan_mode_exit` (`D types/turn-prompt.md:79`, `:118`). The plan-mode text is longer than the base attachment message (`vanilla-inventory.md:72`), so the plan reminder is the one proven target. Reminders with an env lever use it (`CLAUDE_CODE_TOTAL_TOKENS_REMINDER=off`, `CLAUDE_CODE_TODO_REMINDER_MODE=off`, `vanilla-inventory.md:70-71`). `CLAUDE_CODE_DISABLE_ATTACHMENTS=1` is out because it also stops `@` mentions (`vanilla-inventory.md:79`). That `environment` and `deferred_tools_delta` go through this hook is not proven (`vanilla-inventory.md:76-78`). Open item 1 |
| `prompt.submit` | `D turn-prompt.md:40` | keep for `goal`, then drop with it | The `goal` rebuild is a `Stop` check (`architecture.md:42`), so the submit hook goes. Saving: code only |
| `prompt.fill` | `D turn-prompt.md:41` | keep (`reply` uses it) | Small, 127 lines (`architecture.md:49`). Fills the draft box. 0 tokens |
| `prompt.suggest`, `prompt.edit`, `prompt.change`, `prompt.autocomplete` | `D turn-prompt.md:42-45` | n/a | UI-only events of the prompt box, no model text. `prompt.edit` has a 50 millisecond budget. `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION` stops the suggestion call by env (`vanilla-inventory.md:208`) |
| `prompt.mention` | `D turn-prompt.md:50` | n/a | A secrets gate on `@.env` could use it as a second layer to `tool.check`. Not needed while `permissions.deny` `Read(.env*)` covers it. Unmeasured |
| `skill.prompt` | `D turn-prompt.md:51` | n/a | Rewrites a skill body at expansion. Built-in skills are cut by `skillOverrides`, `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS`, and `CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL` (`vanilla-inventory.md:85-98`). claudetto skills are written short. Open item 5 |
| `attribution.text` | `D turn-prompt.md:52` | replace | Built-in: the commit trailer and PR footer. Cheaper: the `attribution` settings key set to empty (`vanilla-inventory.md:222`). The hook only rewrites the `exemption` and `remedy` sentences, if a capture shows them. The attribution reminder in `messages[0]` is another text (`vanilla-inventory.md:21`, `vanilla-inventory.md:55`), and `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` removes it |
| `turn.start` | `D turn-prompt.md:53` | n/a | Observe only. No cut |
| `turn.step` | `D turn-prompt.md:54` | drop (0.2.0 uses it in `handoff`) | Streaming hook. `next({ ...e, model })` could route a step to a cheaper model, but no capture shows a net saving, and a model change breaks the cache prefix. Open item 6 |
| `turn.complete` | `D turn-prompt.md:55` | drop (0.2.0 uses it in `goal` and `handoff`) | Changes only the display, never the transcript, and cannot block the stop. The goal check is a `Stop` hook instead |
| `agent.offer` | `D agent.md:38` | use | Hides `general-purpose`, `Explore`, `Plan`, `claude`, `statusline-setup` from the agent list (`vanilla-inventory.md:68`) and refuses dispatch. Cheaper first: `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` (-324 tokens, `vanilla-inventory.md:68`) and `permissions.deny` `Agent(name)`. The hook covers the types those two do not reach. Needs mods, so the deny rules are the fallback (`architecture.md:129`) |
| `agent.spawn` | `D agent.md:39` | keep (0.2.0 uses it in `prompt`) | Maps a call with no `subagentType` to the claudetto default agent (`architecture.md:67`) and picks the model. Needs `.catch`. Saving: unmeasured |
| `command.run` | `D tool-command-config.md:56` | drop (0.2.0 uses it in `goal`) | The goal command goes. Built-in `/goal` is off and a `Stop` check replaces it |
| `command.describe` | `D tool-command-config.md:57` | drop (0.2.0 uses it in `prompt` and `goal`) | Typeahead and `/help` text only. The model does not read it. No token saving |
| `config.set`, `config.describe` | `D tool-command-config.md:58-59` | n/a | `/config` rows. The model reads neither |
| `session.start` | `D session.md:51` | drop (0.2.0 uses it in `advise`) | Only `advise` needed it, to register the tool and set env |
| `session.compact` | `D session.md:55` | keep, pending the `handoff` comparison (`architecture.md:44`) | Input has `instructions` and `messages` (`D types/session.md:234`). `next({...e, instructions})` aims the summary. Filtering `messages` cuts the summarizer input. The final compaction message is fixed (`vanilla-inventory.md:203`) and is not reachable here. Gain: unmeasured |
| `session.append` | `D session.md:53` | n/a | Rewrites rows before store. Would change the transcript and break the cache prefix |
| `session.send`, `session.receive`, `session.attach`, `session.detach`, `session.measure`, `session.end` | `D session.md:52`, `:54`, `:56-59` | n/a | Messaging, remote clients, and exit. No model text. `session.end` runs under a 1.5 second bound |
| `session.cwd`, `session.root`, `session.model`, `session.id`, `session.turns`, `session.repo`, `session.surface`, `session.surfaces`, `session.messages`, `session.identity`, `session.authorize`, `session.usage`, `session.version` as events | `D session.md:67-76` | n/a | Hooks on these events serve tests and mocks. 0.3.0 registers none. 0.2.0 has `on("session.model"` and 4 more such sites |
| `plugin.register`, `engine.create` | `D plugin.md:44-45` | n/a | Refuse a module or add nouns to `$`. claudetto loads alone |
| `ui.render` | `D ui-events.md:36` | keep (0.2.0 uses it in `reply`) | Draws the reply banner. 0 tokens |
| `ui.resolve`, `ui.press`, `ui.input`, `ui.select`, `ui.message`, `ui.fault`, `ui.scroll`, `ui.focus` | `D ui-events.md:37-44` | n/a | Draw and input events. No model text |
| `telemetry.log`, `telemetry.mark` | `D telemetry.md:33-34` | n/a | Analytics only. `DISABLE_TELEMETRY` and `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` stop them by env (`vanilla-inventory.md:212`). The hook needs the filter `{ to: 'collector' }` |

### Classic Events (`classic.*`)

All 33 events share one rule.
A mod `classic.X` hook costs 0 processes, and a command hook costs one process for each fire.
But the mod needs the server flag and a settings hook does not.
So a check that must work has a settings hook, and a mod `classic.*` hook on the same event is a second version of the capability.

| Event or API | Source | Decision | Reason and saving |
| --- | --- | --- | --- |
| `classic.Stop` | `D classic-events.md:56` | use as a command hook in settings, not as a mod | Carries `last_assistant_message`, and the result can block the stop. Replaces built-in `/goal` (off) and the `goal` slice, 1,217 lines (`architecture.md:42`). One process for each stop, 0 tokens. Works with the flag off. Open item 8 |
| `classic.PreToolUse` | `D classic-events.md:51` | n/a | `tool.check` and `permissions.deny` do the same work. A second gate is a second version |
| `classic.PostToolUse` | `D classic-events.md:48` | n/a | `updatedToolOutput` could shrink a result, but A8 forbids a `Bash` output compressor, +7.6% in a paired test (`architecture.md:139-140`). Open item 7 |
| `classic.PreCompact`, `classic.PostCompact` | `D classic-events.md:49`, `:44` | n/a | `session.compact` `instructions` does the same work |
| `classic.SessionStart`, `classic.UserPromptSubmit`, `classic.UserPromptExpansion`, `classic.SubagentStart`, `classic.SubagentStop`, `classic.PostToolBatch`, `classic.PostToolUseFailure`, `classic.Setup` | `D classic-events.md:53`, `:63`, `:62`, `:57-58`, `:46-47`, `:54` | n/a | Their results add `additionalContext`, which adds tokens to each fire. The `codegraph install` `UserPromptSubmit` hook is the cost case (`architecture.md:160-161`). `claudetto-setup` removes it |
| `classic.PermissionRequest`, `classic.PermissionDenied` | `D classic-events.md:43`, `:42` | n/a | `tool.check` with `decider:"person"` covers it |
| `classic.PreModelSwitch`, `classic.PostModelSwitch` | `D classic-events.md:50`, `:45` | n/a | `PreModelSwitch` could refuse a switch that breaks the cache (input has `context_tokens` and `pricing`). Unmeasured. Open item 6 |
| `classic.InstructionsLoaded`, `classic.MessageDisplay`, `classic.ConfigChange`, `classic.CwdChanged`, `classic.DirectoryAdded`, `classic.FileChanged`, `classic.Notification`, `classic.StopFailure`, `classic.SessionEnd`, `classic.Elicitation`, `classic.ElicitationResult`, `classic.TaskCompleted`, `classic.TaskCreated`, `classic.TeammateIdle`, `classic.WorktreeCreate`, `classic.WorktreeRemove` | `D classic-events.md:33-65` | n/a | No claudetto need. Observe events or display only. `WorktreeCreate` and `WorktreeRemove` stay with the built-in worktree (`architecture.md:46`) |

### `$.` APIs

| Event or API | Source | Decision | Reason and saving |
| --- | --- | --- | --- |
| `$.ui.log` | `D ui.md:33` | keep (19 uses in 0.2.0) | A dim transcript line. 0 tokens, the model does not read it. Shows a gate reason or a fail-open to the person |
| `$.ui.status`, `$.ui.resolve` | `D ui.md:37`, `:32` | keep only where the slice stays (`handoff`, `reply`) | 0 tokens |
| `$.ui.ask` | `D ui.md:34` | use for `decide` | Opens the engine's own `AskUserQuestion` dialog from a hook, with no model round trip. Unmeasured |
| `$.ui.notice`, `$.ui.invalidate`, `$.ui.blit`, `$.ui.toast`, `$.ui.notify`, `$.ui.open`, `$.ui.close`, `$.ui.panes`, `$.ui.scroll`, `$.ui.focus`, `$.ui.copy`, `$.ui.selection`, `$.ui.view`, `$.ui.mount` | `D ui.md:29-45`, `D testing.md:43` | n/a | Display only. `$.ui.invalidate("tool.describe")` clears a cache and must not run mid-session (cache break) |
| `$.tool.check` | `D tool-command-config.md:41` | use | A dry run of the gate with no dialog. The lab and tests call it to pin each gate. 0 tokens |
| `$.tool.call` | `D tool-command-config.md:40` | keep (14 uses in 0.2.0, `advise` and `patch` go) | Runs a tool through the hooks and the permission check. Used by `decide` and browser |
| `$.tool.list` | `D tool-command-config.md:39` | use in the lab | A test that pins "same tool list at each start" (`architecture.md:117`) calls it |
| `$.tool.register` | `D tool-command-config.md:42` | drop (0.2.0 uses it only in `advise`) | Removes the `mcp__claudetto__advise` schema and the claudetto MCP instructions block from each session. Saving: unmeasured. A13 (`architecture.md:150`) allows a claudetto tool only with a measured net saving, and only at `session.start` |
| `$.command.register`, `$.command.list`, `$.command.run` | `D tool-command-config.md:43-45` | n/a | A skill does the same work for the description cost only |
| `$.config.list`, `$.config.set` | `D tool-command-config.md:46-47` | n/a | `claudetto-setup` writes settings, which is cheaper and visible |
| `$.agent.register` | `D agent.md:32` | n/a | A2 (`architecture.md:127`): the agent file route is documented. Also "from the next turn on" changes the agent list |
| `$.agent.spawn` | `D agent.md:30` | keep (2 uses in 0.2.0) | Only if a kept slice needs it |
| `$.agent.list` | `D agent.md:31` | use in the lab | Counts agents against `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` (`architecture.md:87`). 0 tokens |
| `$.session.messages` | `D session.md:30` | keep (`ground`) | The claim check reads the transcript. The newest entries only, with a cap in the doc. 0 tokens |
| `$.session.cwd`, `$.session.root` | `D session.md:31-32` | keep | Full-path match for `ground` and the `rm` gate (`architecture.md:47`) |
| `$.session.model`, `$.session.id`, `$.session.turns`, `$.session.repo`, `$.session.version`, `$.session.surfaces` | `D session.md:33-37`, `:40` | keep only for the slice that reads it | Read only. 0 tokens |
| `$.session.surface` | `D session.md:38` | n/a | Deprecated. Use `surfaces()` |
| `$.session.usage` | `D session.md:39` | use | A plain call costs nothing. `breakdown:"full"` calls the token-count API, so avoid it. Gives context fill, rate-limit windows, and cost, for the `Stop` budget and the weekly-share figure the project rules ask for before a paid run |
| `$.session.compact` | `D session.md:41` | keep, pending the comparison | Compacts at a chosen time. Rejects while a turn runs. Unmeasured |
| `$.session.send`, `$.session.append`, `$.session.identity`, `$.session.authorize` | `D session.md:42-45` | n/a | `append` changes the transcript. `identity` is for managed mods |
| `$.model.complete` | `D model-audio-mcp.md:37` | drop (0.2.0 uses it in `advise`) | A model call each time. Advisor is off |
| `$.model.fork` | `D model-audio-mcp.md:38` | keep, pending the `handoff` comparison | Completes over the main transcript prefix, so the API serves it from cache. The cheapest model call a mod can make. Gain: unmeasured |
| `$.model.classify` | `D model-audio-mcp.md:39` | n/a | A model call each time. A rule or a regex costs 0 |
| `$.audio.play`, `$.audio.speak` | `D model-audio-mcp.md:40-41` | n/a | No need |
| `$.mcp.call`, `$.mcp.connect` | `D model-audio-mcp.md:42-43` | n/a | `call` has no permission prompt. No MCP need in 0.3.0 |
| `$.prompt.compose` | `D turn-prompt.md:34` | use in the lab | `(await $.prompt.compose()).sections` lists each section and its size, without a send. Pins the size of the agent route against the default. 0 tokens |
| `$.prompt.submit` | `D turn-prompt.md:29` | keep, then drop with `goal` | See the event row |
| `$.prompt.fill` | `D turn-prompt.md:32` | keep (`reply`) | See the event row |
| `$.prompt.read`, `$.prompt.media`, `$.prompt.suggest` | `D turn-prompt.md:30-31`, `:33` | n/a | `media` is for managed mods only |
| `$.turn.abort` | `D turn-prompt.md:28` | n/a | A budget stop is a `Stop` check, not an abort |
| `$.fs.read`, `$.fs.exists`, `$.fs.list`, `$.fs.stat` | `D fs-store-state.md:31`, `:34`, `:33`, `:35` | keep where a kept slice reads (`ground`, `sembr`, `guard`, browser) | In process, with no `Read` tool call, so 0 tokens and 0 requests |
| `$.fs.write` | `D fs-store-state.md:32` | keep for `goal` state only if `goal` needs a file, else drop | 0 tokens. Prefer `$.store` |
| `$.fs.ancestors` | `D fs-store-state.md:36` | n/a | `prompt.context` already carries `instructionFiles` |
| `$.store.get`, `$.store.set`, `$.store.delete`, `$.store.keys` | `D fs-store-state.md:37-40` | use | The plugin key-value store lasts across sessions and reloads. Holds goal and gate counters in place of a file in the project. 0 tokens |
| `$.state.get`, `$.state.set` | `D fs-store-state.md:41-42` | n/a | For UI atoms. `$.store` is enough |
| `$.clock.now` | `D clock-http-process-env-settings.md:35` | keep (`goal`, `handoff`) | 0 tokens |
| `$.clock.sleep`, `$.clock.after`, `$.clock.every` | `D clock-http-process-env-settings.md:36-38` | n/a | `sleep` counts against the 10 second hook budget |
| `$.http.fetch` | `D clock-http-process-env-settings.md:39` | n/a | No network need |
| `$.process.run` | `D clock-http-process-env-settings.md:40` | keep (`decide`, browser) | Runs `argv` with no shell, 30 second default. CLI only. 0 model tokens against a `Bash` tool call |
| `$.process.spawn` | `D clock-http-process-env-settings.md:41` | n/a | Streaming. No need |
| `$.env.get` | `D clock-http-process-env-settings.md:42` | keep | Reads `CLAUDETTO_*` and Claude Code env |
| `$.env.set` | `D clock-http-process-env-settings.md:43` | drop (0.2.0 uses it only in `advise`) | Env goes in `settings.json` `env` by `claudetto-setup`. `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` is a setting |
| `$.settings.read` | `D clock-http-process-env-settings.md:44` | use in the lab and the gate | Read only, merged over all sources. A check that the static `deny` rules and the `agent` key are in place. 0 tokens |
| `$.telemetry.log`, `$.telemetry.mark` | `D telemetry.md:33-34` | n/a | See the event row |
| `$.plugin.name`, `$.plugin.root` | `D plugin.md:37-38` | keep | Path of `scripts/` and prompt files. 0 tokens |

### Hook Machinery, Gates, and Tools for Authors

| Event or API | Source | Decision | Reason and saving |
| --- | --- | --- | --- |
| `register(on, options)`, `on(pattern, hook)`, `on(pattern, matcher, hook)` | `D hooks.md:32-34` | keep | One module, one `register`. A matcher such as `{ tool: "Bash" }` skips the hook for other tools |
| `on(...).catch(handler)` | `D hooks.md:35` | keep | Required on every gate. 1 second grace |
| Pattern `*` and `!x` | `D hooks.md:36` | n/a | A glob hook runs on every event. Cost without benefit |
| `next`, `next.called` | `D hooks.md:47`, `:56` | keep | `next.called ? next(e) : { deny }` is the fail-closed pattern |
| `next.to`, `next.signal`, `next.origin`, `next.is`, `next.event`, `next.trace`, `next.budget` | `D hooks.md:48-54` | n/a | `next.to` is for managed hooks only |
| `next.error` | `D hooks.md:55` | use in `.catch` | Differs: the docs add the kind `re-entry`. Log the kind with `$.ui.log` so a fail-open shows |
| Hook budgets (10 seconds, 50 milliseconds for `prompt.edit`, 1 second `.catch`) | `D hooks.md:92-96` | keep as limits | A slow gate fails open. Gate code must stay under the budget |
| `disableAllHooks`, `--safe-mode`, `--bare`, `allowManagedHooksOnly` | `D nouns-and-gates.md:84-85`, `:90` | n/a (not set) | They stop all mods, so `deny` rules and the `agent` key carry the base. `disableAllHooks` also stops the `statusLine` command (Differs) |
| Rollout switch `tengu_plugin_hooks_modules` | `D nouns-and-gates.md:91`, `D index.md:22` | n/a | Gated. Remote, no local switch. Every mod hook has a fallback |
| `allowManagedModsOnly`, `allowModsToOverrideDenyRules`, `prependPlugins`, `appendPlugins`, `disableSideloadFlags` | `D nouns-and-gates.md:86-89` | n/a | Managed settings only. `prependPlugins` and `appendPlugins` Differs (user or managed scope) |
| `CLAUDE_CODE_PLUGIN_DIRS`, `CLAUDE_CODE_PLUGIN_DIR_WATCH` | `D nouns-and-gates.md:92` | n/a | For the sandbox and the lab only |
| Manifest keys `types`, `dependencies`, `userConfig` | `D nouns-and-gates.md:32-34` | n/a | A settings value is cheaper than `userConfig` |
| Built-in mods `cc-plugin-agents-md`, `cc-plugin-diff`, `cc-plugin-plugin-authoring`, `cc-plugin-sec-default`, `cc-plugin-telemetry`, `cc-plugin-you-should-know` | `D nouns-and-gates.md:123-128` | n/a | They load always. `cc-plugin-plugin-authoring` adds the `plugin-authoring` skill (`vanilla-inventory.md:91`), and `skillOverrides` turns it off |
| `claude plugin validate`, `claude plugin test`, `claude-code/testing` | `D index.md:91-92`, `D testing.md:38-43` | use | `validate` lists the events and `$` calls a module uses, so a test can pin the 0.3.0 list. `plugin test` runs the hook lab. Saving: test code, unmeasured |
| `--plugin-dir`, `/reload-plugins`, `--debug-file` | `D index.md:90`, `:94-95` | use | Sandbox and lab. `--debug-file` shows whether a module loaded or the flag blocked it |
| Type tables (`AgentSpec`, `AgentSpawnInput`, `AgentInfo`, `PromptAttachmentDetailOf`, `Origin`, and more) | `D agent.md:48-135`, `D types/*.md` | n/a | Types only. Use is under the matching event |

## Table 2: Built-In Texts That a Mod Can Reach

Each size has its inventory line in the same cell.
The hook rewrites only what a lever with no mod leaves.

| Built-in text | Size | Hook | Rewrite goal |
| --- | --- | --- | --- |
| `system[2]` body (all sections) | see `vanilla-inventory.md:20` and `vanilla-inventory.md:44` | none. Agent route first. `prompt.compose` dropped | `agent: "claudetto:main"` body replaces it (`vanilla-inventory.md:150`) |
| Model-specific extra | see `vanilla-inventory.md:47` | none. Agent route (inferred, unverified) | Same agent body, then verify with a capture |
| Environment message | see `vanilla-inventory.md:66` | `prompt.attachment` (unproven for this type), else the agent body | Short STE lines: cwd, date, platform. Drop the model-ID table |
| Context blocks `claudeMd`, `userEmail`, `attachedProject`, `currentDate` | small (`vanilla-inventory.md:58`) | `prompt.context` | Drop `userEmail`. Shorten the wrapper. Keep `claudeMd` |
| Git status block | see `vanilla-inventory.md:25` | none. `includeGitInstructions:false` | -348 tokens (`vanilla-inventory.md:56`) |
| Attribution reminder in `messages[0]` | see `vanilla-inventory.md:21` and `vanilla-inventory.md:55` | none. `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` | Removed by env |
| Commit trailer and PR footer | not sized | `attribution.text` kinds `commit`, `pr`. Settings `attribution` first | Empty, or one line |
| Commit gate text (`exemption`, `remedy`) | not sized | `attribution.text` kinds `exemption`, `remedy` | One STE sentence each. Unverified in a capture |
| Plan-mode reminder | see `vanilla-inventory.md:72` (plan text against the base attachment message) | `prompt.attachment` types `plan_mode`, `plan_mode_reentry`, `plan_mode_exit` | Short STE phases. Or never enter plan mode. `--plan-mode-instructions` is a hidden flag (`vanilla-inventory.md:227`) |
| `<total_tokens>` reminder | see `vanilla-inventory.md:70` | none. `CLAUDE_CODE_TOTAL_TOKENS_REMINDER=off` | Removed by env |
| Todo reminder | each idle turn (`vanilla-inventory.md:71`) | none. `CLAUDE_CODE_TODO_REMINDER_MODE=off` | Removed by env |
| Deferred tools list | see `vanilla-inventory.md:67` | `prompt.attachment` kind `deferred_tools_delta` (unproven) | Names only, one line |
| Agent types list | see `vanilla-inventory.md:68` | `agent.offer` | Hide 5 built-ins. Env `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` first (-324 tokens) |
| Skill listing | see `vanilla-inventory.md:69` | none. `skillOverrides`, `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS`, `skillListingMaxDescChars` (`vanilla-inventory.md:98-99`). `skill.prompt` only for a body | Off or name-only for the bundled skills. claudetto skills keep one-line descriptions |
| Tool `Agent` | see `vanilla-inventory.md:113` | `tool.describe`. Or deny `Agent` if no subagent is used, -1,320 tokens | Drop the wait-for-agent text (`architecture.md:85`) |
| Tool `Bash` | see `vanilla-inventory.md:119` | `tool.describe` | Shorter. Git text goes with `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` (tools JSON shrinks, `vanilla-inventory.md:119`) |
| Tools `Read`, `Edit`, `Write` | see `vanilla-inventory.md:115`, `vanilla-inventory.md:117`, `vanilla-inventory.md:118` | `tool.describe` | STE, same rules |
| Tool `Skill` | see `vanilla-inventory.md:101` | `tool.describe`. Do not deny `Skill` (+5,599 tokens) | Shorter |
| Tool `ToolSearch` | see `vanilla-inventory.md:120` | `tool.describe`. Do not deny it (+15,898 tokens) | Shorter |
| Tools `Workflow`, `ScheduleWakeup`, `ReportFindings`, `ListAgents` | see `vanilla-inventory.md:111-116` | none. `CLAUDE_CODE_DISABLE_WORKFLOWS=1`, `permissions.deny` | Deny: -1,969, -1,675, -807, -345 tokens. Cheaper than any rewrite |
| `DeferredToolPlaceholder` | see `vanilla-inventory.md:121` | `tool.describe` (unverified) | No lever found |
| Decide tool text (`AskUserQuestion`) | not sized | `tool.describe` (0.2.0 uses it in `decide`) | Name the tool for a decision (`architecture.md:85`) |
| Compaction instruction to the summarizer | see `vanilla-inventory.md:203` | `session.compact` field `instructions` | Aim the summary at the task. The fixed base text is not reachable |
| Compaction input | the transcript | `session.compact` field `messages` | Drop low-value rows before the summary. Unmeasured |
| Skill body at expansion | per skill | `skill.prompt` | Not used. Open item 5 |
| Subagent fixed append | see `vanilla-inventory.md:180` and `vanilla-inventory.md:188-192` | none found | No lever (proposed in `vanilla-inventory.md:192`). Agent body only |
| Memory section | see `vanilla-inventory.md:41` | none. `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` | Off by env |
| Session sections `task_continuity`, `tsr`, and 14 more | not shown (`vanilla-inventory.md:49`) | `prompt.compose` only (dropped) | Covered by the agent body |

## Open

1. Does `prompt.attachment` see `environment`, `model`, `deferred_tools_delta`, `total_tokens`, and todo kinds?
   The docs type only `plan_mode`, `plan_mode_reentry`, and `plan_mode_exit` (`D types/turn-prompt.md:118`, `:124`).
   A stub lab cannot prove it.
   A `--debug-file` capture in a sandbox session can.
   That session is a paid run, so ask the user first.
2. The server flag `tengu_plugin_hooks_modules` has no local switch, and its state for this account is unknown.
   The first lab check is `claude --debug-file` with a one-line module.
3. `tool.describe` on built-ins: whether it works, whether `isDeferred:true` works on a built-in, and whether `docs/prompts/override.md:125` ("No override") is right.
   Needs a capture of the tool JSON.
4. `prompt.context`: can it drop `gitStatus` and `currentDate`?
   The docs say the engine sends its own.
   Use the git setting.
5. `skill.prompt`: the size of the largest bundled skill body, to decide if a rewrite pays.
   Unmeasured.
6. Model routing by `turn.step` `next({...e, model})` or `classic.PreModelSwitch`: the cache-break cost is not measured.
   Dropped until measured.
7. `classic.PostToolUse` `updatedToolOutput`: A8 forbids a compressor.
   A narrow use is unmeasured and not planned.
8. `classic.Stop` as a command hook against a mod hook: the architecture picks the command hook because it works with the flag off.
   The mod version costs 0 processes.
   Decide if the goal check may fail open.
9. Does `agent.offer` run when `Agent(name)` is denied?
   Both stay, so order is no issue, but it is untested.
10. The type file is `2.1.303`, checked against `2.1.305`.
    The docs say 2.1.306 was not rechecked (`D index.md:12`).
    Run `claude plugin validate` on the 0.3.0 module in 2.1.306 before release.
11. Status Differs rows are `prompt.section`, `next.error`, `disableAllHooks`, `prependPlugins`, `appendPlugins`, and the `vscode` surface.
    Gated: only the rollout switch.
    Deprecated: `$.session.surface`.
    No row in this part is marked undocumented.
