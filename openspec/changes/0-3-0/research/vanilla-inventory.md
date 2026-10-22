# Vanilla Claude Code 2.1.306 Inventory

This report lists each default text that Claude Code 2.1.306 sends to the model in a claudetto session.
The only sources are `claude-code-docs/docs/` and `claude-code-docs/captures/2.1.306/`.
No `claude` run and no model call was made for this report.
`D` means `/Users/krystian/Downloads/CodeProjects/xsyetopz/claude-code-docs/docs/`.
`C` means `/Users/krystian/Downloads/CodeProjects/xsyetopz/claude-code-docs/captures/2.1.306/`.
`S` means `C` + `strings.txt`, the minified program text.
Sizes are characters unless the cell says tokens.
Character sizes of the base case were measured from `C prompts/default-lean/requests.jsonl` (Opus 5.5, short `lean_body` prompt).
Token deltas come from `D how-it-works/context-budget.md`.
A claim with no citation is marked "proposed".

## Request layout (base case)

| Part | Size | Where | Citation |
| --- | --- | --- | --- |
| Billing header | 74 | `system[0]` | `C prompts/default-lean/requests.jsonl` |
| Identity line | 62 | `system[1]` | same |
| Body | 5,656 | `system[2]` | same |
| Attribution reminder | 580 | `messages[0]` block 0 | same |
| User prompt | 16 in the probe | `messages[0]` last block | same |
| Attachment message | 8,874 | `messages[1]`, role `system` | same |
| Tool schemas | 28,567 for 12 tools | `tools` | same |
| Git status | 573 | extra `messages[0]` block in a git repo | `C prompts/git-repo/requests.jsonl` |
| `CLAUDE.md` | 366 for the test file | extra `messages[0]` block | `C prompts/claude-md/requests.jsonl` |

The empty session costs 12,524 tokens.
The split is system prompt 2,407, loaded tools 7,897, and skills 2,210.
Deferred tools would add 13,425 tokens (`D how-it-works/context-budget.md:30-35`).

## Part table: `system[2]`

The capture splits at the `#` headings of the body.

| Part | Size | Lever | Works without mods | Status | Citation |
| --- | --- | --- | --- | --- | --- |
| Intro, security paragraph, and code-style lines | 560 | `--agent` replaces all of `system[2]`. `prompt.compose` drops the `lean_body` section | Agent yes, compose no | Documented | `D prompts/agent-main.md`, `D how-it-works/system-prompt.md:147` |
| `# Harness`, with the pronoun rule and action-caution text | 1,646 | Same | Agent yes, compose no | Documented | `D how-it-works/system-prompt.md:147`, `S:676940` |
| `# Session-specific guidance` | 164 | `--agent`. `prompt.section` | Agent yes, hook no | Documented | `D how-it-works/system-prompt.md:164` |
| `# Memory` | 2,091 (691 tokens) | `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` or `autoMemoryEnabled:false`. The capture drops `system[2]` from 5,656 to 3,564 | Yes | Documented | `D configure/env-vars/context-and-compaction.md:38`, `D configure/settings/core.md:26`, `C prompts/memory-off/requests.jsonl` |
| `# Environment` (model IDs, fast mode) | 580 | `--agent`. `prompt.section` | Agent yes, hook no | Documented | `D how-it-works/system-prompt.md:164` |
| `# Context management`, with the `act_dont_rederive` paragraph and the `<total_tokens>` line | 610 | `--agent`. `CLAUDE_CODE_TOTAL_TOKENS_REMINDER=off` for the line. `CLAUDE_CODE_ACT_DONT_REDERIVE` for the paragraph (proposed, gate unverified) | Yes | Documented for the first two | `D configure/env-vars/context-and-compaction.md:62`, `S:676940` |
| All of `system[2]` | 5,656 | `--agent` with a short body. The probe body was 58 characters. Net change -5,499 | Yes | Documented | `D prompts/agent-main.md:117` |
| All of `system[2]` | 5,656 | One `prompt.compose` hook that returns a short `sections` list | No | Documented | `D extend/mod-api/turn-prompt.md:48` |
| Dynamic sections moved to `messages[0]` | 2,245 | `exclude-dynamic` flag form. `system[2]` falls to 3,260 | Yes | Documented | `C prompts/exclude-dynamic/requests.jsonl` |
| Model-specific extra | Haiku 8,491, Opus 5 9,079, Fable 5 9,992, Fable 5.1 11,771, Mythos 5 9,414, Mythos 5.1 11,084 | `--agent` (inferred). `prompt.compose` | Agent yes (unverified), compose no | Documented sizes | `D how-it-works/system-prompt.md:94-101` |
| Full prompt | 26,944 for `claude-sonnet-5` | Avoid `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0` | Yes | Documented | `D how-it-works/system-prompt.md:103`, `D configure/env-vars/models-and-effort.md:95` |
| Session sections `task_continuity`, `tsr`, `tool_param_json`, `bg-session`, `system_messages`, `brief`, `focus_mode`, `delivering_work_max`, `overcorrection`, `subagent_steer_delegation`, `opus5_reduced_delegation`, `heron_brook`, `brook_heron`, `willow_tern`, `autonomy_append`, `endconv_deferred_hint` | not shown | Gated by model and experiment envs `CLAUDE_CODE_BISON_CAIRN`, `CLAUDE_CODE_LARCH_CISTERN`, `CLAUDE_CODE_WILLOW_TERN`, `CLAUDE_CODE_AMBER_ASTROLABE` | Env yes (effect proposed) | Undocumented | `S:676940-676975` |

## Part table: `messages[0]`

| Part | Size | Lever | Works without mods | Status | Citation |
| --- | --- | --- | --- | --- | --- |
| Attribution reminder (`remote_session_change`) | 580 | `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` removes it in the capture. Whether `attribution:false` does the same is unverified | Env yes | Documented for the env var | `D configure/env-vars/context-and-compaction.md:41`, `C prompts/git-instructions-off/requests.jsonl` |
| Git status | 573 | `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` or `includeGitInstructions:false` (-348 tokens in the budget run) | Yes | Documented | `D configure/settings/core.md:45`, `D how-it-works/context-budget.md:115` |
| `CLAUDE.md` block | file size | `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1`. `claudeMdExcludes`. `omitClaudeMd` has no effect on the main agent | Yes | Documented | `D configure/memory-and-rules.md:72` |
| Context blocks `claudeMd`, `userEmail`, `attachedProject`, `currentDate` | small | `prompt.context` appends, drops, or rewrites. The engine may still send `gitStatus` and `currentDate` | No | Documented, partly unverified | `D extend/mod-api/turn-prompt.md:47` |

## Part table: `messages[1]` (8,874 characters)

The parts below are from the capture split by block.

| Part | Size | Lever | Works without mods | Status | Citation |
| --- | --- | --- | --- | --- | --- |
| `# Environment` block with the model line | 825 | `prompt.attachment` returns `{text:null}` for `environment` and `model`. `CLAUDE_CODE_DISABLE_ATTACHMENTS=1` | Env yes, hook no | Documented | `D extend/mod-api/turn-prompt.md:49`, `D configure/env-vars/context-and-compaction.md:37` |
| Deferred tools list | about 360 | `prompt.attachment` kind `deferred_tools_delta` | No | Documented | `S:678480-678620` |
| Agent types list | 1,638 | `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` (8,874 to 7,969, -324 tokens). `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` (8,874 to 7,236, print mode only). `agent.offer` returns `{isOffered:false}`. `permissions.deny` `Agent(name)` | Env and deny yes, `agent.offer` no | Documented | `D configure/env-vars/agents-and-teams.md:55`, `:28`, `D extend/mod-api/agent.md:38`, `C prompts/disable-explore-plan/requests.jsonl`, `C prompts/disable-builtin-agents/requests.jsonl` |
| Skill listing | 6,049 (2,210 tokens) | See the skill table | Mostly yes | Documented | `D how-it-works/context-budget.md:33` |
| `<total_tokens>` reminder | 78 in the capture | `CLAUDE_CODE_TOTAL_TOKENS_REMINDER=off` | Yes | Documented | `D configure/env-vars/context-and-compaction.md:62` |
| Todo reminder | per turn when idle | `CLAUDE_CODE_TODO_REMINDER_MODE=off` | Yes | Documented | `D configure/env-vars/features-and-toggles.md:78` |
| Plan mode text | 13,784 vs 8,874 | Do not enter plan mode. `--plan-mode-instructions` replaces the phases | Yes | Documented sizes, hidden flag | `C prompts/mode-plan/requests.jsonl` |
| Output style text | 10,376 (concise) to 13,882 (learning) | Choose no style | Yes | Documented | `C prompts/style-concise/requests.jsonl`, `C prompts/style-learning/requests.jsonl` |
| Slash command blocks | added as user blocks | Use fewer commands | Yes | Documented | `C prompts/command-debug/requests.jsonl` |

Attachment kinds that the renderer knows are in `S:678480-678620`.
Whether each kind goes through `prompt.attachment` is not proven.
The docs name typed `detail` only for `plan_mode`, `plan_mode_reentry`, and `plan_mode_exit`.
`CLAUDE_CODE_DISABLE_ATTACHMENTS=1` also stops `@` mentions and kept deferred tools, and it is ignored in project and local settings.

## Part table: skills

| Part | Size | Lever | Works without mods | Status | Citation |
| --- | --- | --- | --- | --- | --- |
| `dataviz` | 1,447 (482 tokens) | `skillOverrides` `off` or `name-only` | Yes | Documented | `D configure/settings/hooks-and-plugins.md:45` |
| `claude-api` | 1,082 (361 tokens) | `CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL=1` | Yes | Documented | `D configure/env-vars/plugins-and-mcp.md:41` |
| `update-config` | 707 (236 tokens) | `skillOverrides` | Yes | Documented | same as `dataviz` |
| `code-review` | 642 (331 tokens) | `skillOverrides` | Yes | Documented | same |
| `run` | 368 (123 tokens) | `skillOverrides` | Yes | Documented | same |
| `loop` | 344 (115 tokens) | `skillOverrides` | Yes | Documented | same |
| `plugin-authoring` | 266 (89 tokens) | `skillOverrides` | Yes | Documented | same |
| `workflow-authoring` | 252 (84 tokens) | `skillOverrides` | Yes | Documented | same |
| `keybindings-help` | 248 (83 tokens) | `skillOverrides` | Yes | Documented | same |
| `fewer-permission-prompts` | 191 (64 tokens) | `skillOverrides` | Yes | Documented | same |
| `simplify` | 188 (63 tokens) | `skillOverrides` | Yes | Documented | same |
| `security-review` | 170 (30 tokens) | `skillOverrides` | Yes | Documented | same |
| `init` | 67 (22 tokens) | `skillOverrides` | Yes | Documented | same |
| All bundled skills | 6,049 with the 64-character header | `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` or `disableBundledSkills:true` | Yes | Documented | `D configure/env-vars/plugins-and-mcp.md:39`, `D configure/settings/hooks-and-plugins.md:29` |
| Listing budget | cap | `skillListingBudgetFraction`, `skillListingMaxDescChars`, `SLASH_COMMAND_TOOL_CHAR_BUDGET` | Yes | Documented | `D configure/settings/hooks-and-plugins.md:43-44` |
| Plugin skills such as `claudetto:dry` | per skill | `disable-model-invocation` frontmatter key. `skillOverrides` | Yes | Documented | `D configure/settings/hooks-and-plugins.md:45` |
| `Skill` tool | 1,417 + 345 | Do not deny it. Denying `Skill` adds 5,599 tokens, because the `Workflow` text grows | n/a | Documented | `D how-it-works/context-budget.md:73` |

`--disable-slash-commands` makes the request 9,057 bytes larger, so do not use it (`D how-it-works/context-budget.md:125`).

## Part table: tools

Sizes are description plus schema characters from the capture JSON.

| Part | Size | Lever | Works without mods | Status | Citation |
| --- | --- | --- | --- | --- | --- |
| `Workflow` | 3,480 + 1,833 (-1,969 tokens) | `CLAUDE_CODE_DISABLE_WORKFLOWS=1`, `disableWorkflows`, or `permissions.deny` | Yes | Documented | `D configure/env-vars/plugins-and-mcp.md:48`, `D how-it-works/context-budget.md:64` |
| `ScheduleWakeup` | 3,396 + 1,423 (-1,675 tokens) | `permissions.deny` | Yes | Documented | `D how-it-works/context-budget.md:65`, `D reference/tools/agents-and-tasks.md:20` |
| `Agent` | 1,989 + 2,010 (-1,320 tokens) | `permissions.deny` `Agent`. `--tools` | Yes | Documented | `D how-it-works/context-budget.md:66` |
| `ReportFindings` | 574 + 1,646 (-807 tokens) | `permissions.deny` | Yes | Documented | `D how-it-works/context-budget.md:67`, `D reference/tools/agents-and-tasks.md:41` |
| `Read` | 790 + 1,112 (-706 tokens) | `--tools` | Yes | Documented | `D how-it-works/context-budget.md:68` |
| `ListAgents` | 777 + 336 (-345 tokens) | `permissions.deny`. Gated by cross-session messaging (`CLAUDE_CODE_HARBOR_KITE`) | Yes | Documented | `D reference/tools/agents-and-tasks.md:23`, `D configure/env-vars/agents-and-teams.md:66` |
| `Edit` | 360 + 584 (-340 tokens) | `--tools` | Yes | Documented | `D how-it-works/context-budget.md:70` |
| `Write` | 240 + 367 (-230 tokens) | `--tools` | Yes | Documented | `D how-it-works/context-budget.md:71` |
| `Bash` | 1,406 + 1,783 | `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` cuts the tools JSON from 28,567 to 28,176. Denying `Bash` adds 384 tokens | Yes | Documented | `C prompts/git-instructions-off/requests.jsonl`, `D how-it-works/context-budget.md:72` |
| `ToolSearch` | 953 + 427 | Do not deny it. Denial adds 15,898 tokens | n/a | Documented | `D how-it-works/context-budget.md:74` |
| `DeferredToolPlaceholder` | 83 + 36 | No lever found | n/a | Unverified | `C prompts/default-lean/requests.jsonl` |
| Any tool description | up to the tool size | `tool.describe` returns `{description, isDeferred}`. `D prompts/override.md:125` says "No override" and contradicts it | No | Documented, in conflict | `D extend/mod-api/tool-command-config.md:55` |
| Deferral of built-in tools | schema size | `tool.describe` with `isDeferred:true` | No | Unverified | `D reference/tools/index.md:76-85` |
| Tool search mode | adds 15,327 tokens when off | Keep `ENABLE_TOOL_SEARCH` at its default | Yes | Documented | `D configure/env-vars/tools-and-bash.md:115` |
| Task tools | variable | `CLAUDE_CODE_ENABLE_TASKS=0` falls back to `TodoWrite` | Yes | Documented | `D configure/env-vars/agents-and-teams.md:57` |
| Cron tools (deferred) | names only | `CLAUDE_CODE_DISABLE_CRON=1` | Yes | Documented | `D configure/env-vars/agents-and-teams.md:54` |
| `Advisor` tool | variable | `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` | Yes | Documented | `D configure/env-vars/tools-and-bash.md:60` |
| All tools | 28,567 | `--tools "Read,Edit,Bash"` gives 5,358 tokens in all. `--tools ""` gives 2,532 | Yes | Documented | `D how-it-works/context-budget.md:110-111` |

Denying `Workflow` and `ScheduleWakeup` together gives 8,852 tokens (`D how-it-works/context-budget.md:144`).
Bare mode has 3 tools and 3,488 characters of tools JSON (`C prompts/bare/requests.jsonl`).
It stops plugins and hooks, so it is out for claudetto.

## Main agent vs compose

The main agent route is the `agent` key in a plugin `settings.json`, or `--agent`.
Plugin manifest `settings` accepts only `agent` and `subagentStatusLine` (`D extend/plugins/manifest.md:39`).
So a plugin cannot set `env` or `permissions.deny` by this key.
The function `Fir` at `S:677294` works as follows.
If `overrideSystemPrompt` is set, only that text is used.
Otherwise the agent body replaces the default prompt.
`--append-system-prompt` still applies.
The default prompt is built and then dropped.
A missing agent gives a warning and the default behavior.
A short name matches a plugin agent through the `:name` suffix.
An agent from an untrusted folder is dropped (`S:526308`).

| Question | Answer | Status | Citation |
| --- | --- | --- | --- |
| What does the route replace? | `system[2]` only. The probe body is 58 characters. Net change -5,499 | Documented | `D prompts/agent-main.md:117` |
| What stays? | `messages[1]` (8,920), the attribution block (592), 12 tool schemas, the skill list, the agent roster, deferred tools | Documented | `D prompts/agent-main.md:16-18` |
| Does `CLAUDE.md` still load? | Yes. `omitClaudeMd` has "No effect on the main session agent" | Documented | `S` schema text |
| Does `<total_tokens>` stay? | The line in `system[2]` goes. The attachment may stay | Documented for `system[2]`, proposed for the attachment | `D prompts/agent-main.md` |
| Do `tools` in the agent file cut tool schemas? | Not shown | Unverified | `D prompts/tools-per-variant.md` |
| Does the agent `model` beat `/model`? | Not shown | Unverified | `D configure/settings/agents-and-remote.md:20` |
| Do plugin agent `hooks` and `permissionMode` apply? | They are ignored | Documented | `D extend/subagents/frontmatter.md:59` |
| Does it work with `tengu_plugin_hooks_modules` off? | Yes. It needs no mod | Documented | `D extend/mod-api/index.md:136` |

Can one `prompt.compose` hook drop all sections?
Yes, by the docs.
The hook sees every shared and session section, and returns `{sections}` in send order (`D extend/mod-api/turn-prompt.md:48`).
Shared sections must come before session sections, and a wrong order skips the hook.
`prompt.section` is not enough, because it skips shared sections such as `lean_body` (`D extend/mod-api/turn-prompt.md:46`).
If the dispatch fails, the engine composes the prompt itself (`S:537074`).
So a thrown hook gives back the vanilla prompt, not an empty one.
The hook needs the server flag `tengu_plugin_hooks_modules`, and no local setting controls it.
Built-in and organization plugins load regardless (`D extend/mod-api/nouns-and-gates.md:91`).
The input has `model`, `promptModel`, `surfaces`, `tools`, `outputStyle`, and `traits`.
So one hook can serve every model (proposed).
The hook does not reach `messages[0]`, `messages[1]`, or tool text.
`prompt.context`, `prompt.attachment`, and `tool.describe` reach those.

## Subagent vanilla text

| Subagent | `system[2]` | Tools | Citation |
| --- | --- | --- | --- |
| `general-purpose` | 2,720 | 8 | `D prompts/subagent-general-purpose.md:15` |
| `Explore` | 3,263 | 5 | `D prompts/subagent-explore.md:15` |
| `Plan` | 3,570 | 5 | `D prompts/subagent-plan.md:15` |
| Custom or plugin agent | 1,344 plus the agent body | 8 | `D prompts/subagent-custom.md:15` |
| `statusline-setup` | 14,276 | 2 | `D prompts/subagent-statusline-setup.md:15` |
| `claude` guide | 3,119 | 8 | `D prompts/subagent-claude.md:15` |
| `web-fetch` | 4,098 | 1 | `D prompts/subagent-web-fetch.md:15` |

A subagent `messages[1]` is 7,117 to 7,130 characters, and it has no agent list.
The 592-character attribution block stays.
The billing header grows to 99 characters.
A custom agent body is followed by a fixed append (`D prompts/subagent-custom.md:43-52`).
The append starts with "Messages from the agent that launched you...".
Then come five bullets and a `<total_tokens>` line.
Levers: `omitClaudeMd` frontmatter (`D extend/subagents/frontmatter.md:44`), `tools` (`:33`), `CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`.
No lever removes the fixed append (proposed).
The docs claim a sibling roster and git status in a subagent.
Neither shows in the capture, so both are doc claims.

## Background calls

| Call | Size | Lever | Works without mods | Status | Citation |
| --- | --- | --- | --- | --- | --- |
| Title and branch name | own prompt | `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1` stops the title request. No prompt override | Yes | Documented | `D configure/env-vars/ui-and-terminal.md:49`, `D prompts/title-and-branch-name.md` |
| Session naming | own prompt | None | n/a | Documented | `D prompts/session-naming.md` |
| Memory selection and extraction | own prompts | `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` (proposed for these two) | Yes | Documented prompts | `D prompts/memory-selection.md`, `D prompts/memory-extraction.md` |
| Compaction | final message 6,361 (6,445 custom). Full prompt and tools still sent | `DISABLE_COMPACT`, `DISABLE_AUTO_COMPACT`. Append only through `/compact` text and `PreCompact` | Yes | Documented | `C prompts/compact/requests.jsonl`, `C prompts/compact-custom/requests.jsonl`, `D prompts/compact.md` |
| Auto-mode classifier | `system[1]` 140,015, 0 tools | Do not use auto mode. `CLAUDE_CODE_CLASSIFIER_SUMMARY` | Yes | Documented | `D prompts/auto-classifier.md:14` |
| Prompt hook | `system[2]` 798, `messages[0]` 427, 0 tools | Fixed | n/a | Documented | `D prompts/hook-prompt.md:15` |
| Agent hook | `system[2]` 1,003, 10 tools | Fixed | n/a | Documented | `D prompts/hook-agent.md:15` |
| Observer agents | own prompt | `CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS` (off) | Yes | Documented | `D prompts/observer.md` |
| Prompt suggestion | small | `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION`, `promptSuggestionEnabled` | Yes | Documented | `D configure/env-vars/ui-and-terminal.md:53` |
| Away summary | small | `CLAUDE_CODE_ENABLE_AWAY_SUMMARY`, `awaySummaryEnabled` | Yes | Documented | `D configure/env-vars/ui-and-terminal.md:51` |
| Web-fetch agent | `system[2]` 4,098, 1 tool | `CLAUDE_CODE_WEB_FETCH_AGENT` (off) | Yes | Documented | `D prompts/subagent-web-fetch.md:15` |
| Small fast model | n/a | `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Yes | Documented | `D configure/env-vars/models-and-effort.md:41` |
| All non-essential traffic | n/a | `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `DISABLE_TELEMETRY` | Yes | Documented | `D configure/env-vars/` telemetry page |

A map from each background call to a model and an env var is not in the docs (proposed).

## Other switches

| Switch | Effect | Status | Citation |
| --- | --- | --- | --- |
| `CLAUDE_CODE_DISABLE_ATTACHMENTS=1` | Stops `total_tokens`, MCP instruction tokens, `@` mentions, and kept deferred tools. User settings only | Documented | `D configure/env-vars/context-and-compaction.md:37`, `S:676975` |
| `CLAUDE_CODE_DISABLE_ATTRIBUTION_CROSS_REPO` | Seen in the program only | Undocumented | `S` |
| `attribution` key and `attribution.text` event | Change commit and PR text. The event needs mods | Documented | `D configure/settings/core.md:21`, `D extend/mod-api/turn-prompt.md:52` |
| `CLAUDE_CODE_DISABLE_THINKING`, `MAX_THINKING_TOKENS`, `CLAUDE_CODE_DISABLE_FAST_MODE`, `CLAUDE_CODE_DISABLE_WEB_FETCH` | Remove one text or budget each | Documented | `D configure/env-vars/` |
| `DISABLE_PROMPT_CACHING*` | Do not use. It raises cost | Documented | `D configure/env-vars/` |
| `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS` | Skips plugin MCP servers | Documented | `D configure/env-vars/plugins-and-mcp.md` |
| `CLAUDE_CODE_SILENT_TURN_REMINDER*`, `CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT` | Gate two attachment kinds | Undocumented | `S:678480-678620` |
| `--plan-mode-instructions <text>` | Hidden flag. Replaces the plan phases | Undocumented | `S` |
| `CLAUDE_CODE_REPORT_FINDINGS` | Review mode for `ReportFindings`. No visible effect in a probe | Undocumented | `D configure/env-vars/tools-and-bash.md:92` |
| `--safe-mode`, `--bare`, `disableAllHooks`, `allowManagedHooksOnly` | Stop mods and plugins, so out | Documented | `D extend/mod-api/index.md:136` |
| Model choice | Haiku 5.5 adds 1,182 tokens and Sonnet 5.5 adds 402 | Documented | `D how-it-works/context-budget.md:121-122` |

## Levers that work with `tengu_plugin_hooks_modules` off

Work without mods: env vars, settings keys, CLI flags, the `agent` key and `--agent`, agent-file fields, `permissions.deny`, `skillOverrides`, and `disable-model-invocation`.
Need mods: `prompt.compose`, `prompt.section`, `prompt.context`, `prompt.attachment`, `tool.describe`, `agent.offer`, `skill.prompt`, and `attribution.text`.
A built-in or organization-managed plugin keeps its mods (`D extend/mod-api/nouns-and-gates.md:91`).
Whether claudetto counts as one of those is unverified.

## Unverified

- Whether the main agent `model` beats `/model`.
- Whether the main agent `tools` list cuts the tool schemas.
- Whether the Haiku and Fable extras go away under the agent route (inferred from `S:677294`, no capture).
- Whether `tool.describe` with `isDeferred:true` works on built-in tools.
- Whether every attachment kind goes through `prompt.attachment`.
- Whether `prompt.context` can drop `gitStatus` and `currentDate`.
- Whether `attribution:false` removes the 580-character attribution block.
- The sibling roster and git status in a subagent are doc claims only.
- The model and env var of each background call.
- Whether all events in the program table at `S:678642` are live.
- Whether the gated experiment envs work without a server flag.
- Whether `DeferredToolPlaceholder` has any lever.
- No main-thread agent capture covers tools or models, so those agent-route claims rest on `D prompts/agent-main.md` alone.
