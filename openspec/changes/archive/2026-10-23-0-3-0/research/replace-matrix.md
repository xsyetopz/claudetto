# Replace Matrix: Built-In Parts of Claude Code 2.1.306

Target: Claude Code 2.1.306, claudetto 0.3.0-alpha.1.
This file answers the requirement "Built-In Matrix" in `specs/lean-surface/spec.md:58-61`.
Each row has a cost, one decision, the lever that applies it, and the source of each fact.
This is planning text only.
No `claude` session, no model call, and no network call was made for it.

## Decision Rules

- `keep`: the built-in part works, and claudetto adds no copy of it.
- `replace and disable`: a cheaper claudetto part does the work for equal or better result.
  The row names the replacement, and the lever turns the built-in part off.
- `disable`: the built-in part has no use in claudetto.
  A part for claude.ai, the desktop app, or the web only is `disable`, because claudetto targets the CLI only.
- Cost means tokens and characters in the context, not only money.
  A size is a measured size from a source file.
  A size in characters is not a size in tokens.
  This file does not convert one into the other and does not add sizes.
- Where a cell says "size at `V:N`", the size is in that source line and this file does not copy it.
- `[NEEDS CLARIFICATION: ...]` marks a fact that no source file gives.
  Each such row is also in "Open Rows".
- Decisions fixed by the user: auto mode is off, with the gate of `D4` in its place.
  The advisor is off.
  A `command.run` hook answers `/goal` in place of the built-in, with a `Stop` hook for the check.
  `/loop` and cron are off.
  OpenSpec is replaced by MiniSpec (`D10`).
  `ToolSearch` cannot be deferred, and any other tool can be deferred with `tool.describe` `isDeferred`.

## Source Key

- `V` is `research/vanilla-inventory.md`.
- `P bN` is batch N of `research/probes.md`.
- `X` is `research/external-sweep.md`.
- `p1`, `p2`, `p3`, `p4`, `p5a`, and `p5b` are the files `p1-env-vars.md`, `p2-settings-perms-cli.md`, `p3-mod-api.md`, `p4-hooks-skills-agents-plugins-mcp.md`, `p5a-tools.md`, and `p5b-internals.md` in `research/matrix/`.
- `A` is `architecture.md`, and `D` is `design.md`.
- `S` is `specs/lean-surface/spec.md`.
- `T11` is the section "Open Rows Sized (Task 1.1)" of `evidence.md`.
- `file:N` is a line number in that file.
- A row that lists several names in the `Part` cell has one decision for all of them.

## Tools

| Part | Cost | Decision | Lever | Source |
| --- | --- | --- | --- | --- |
| `Read` | 790 + 1,112 characters of description and schema. -706 tokens when removed. | keep | `tool.describe` rewrite of the text only. | `V:115`, `p3:175`, `P b7` |
| `Edit` | 360 + 584 characters. -340 tokens when removed. | keep | `tool.describe` rewrite of the text only. | `V:117`, `p3:175`, `P b7` |
| `Write` | 240 + 367 characters. -230 tokens when removed. | keep | `tool.describe` rewrite of the text only. | `V:118`, `p3:175`, `P b7` |
| `Bash` | 1,406 + 1,783 characters. A deny adds 384 tokens. | keep | `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` cuts the git text, and the tools JSON goes from 28,567 to 28,176 characters. | `V:119`, `p1:24` |
| `Glob` | Not loaded in the vanilla session. `--allowedTools Glob,Grep` adds 4,105 characters for both tools. | keep | none. | `P b1`, `V:128`, `p5a:15` |
| `Grep` | Same as `Glob`. | keep | none. | `P b1`, `p5a:15` |
| `Agent` | 1,989 + 2,010 characters. -1,320 tokens when removed. The text goes from 4,070 to 3,804 characters with `Agent(tiny)` in the `tools` list. | keep | `tools: Agent(<names>)` in the `claudetto:main` agent file. `tool.describe` rewrite. | `V:113`, `P b7`, `p3:173` |
| `Skill` | 1,417 + 345 characters. A deny adds 5,599 tokens. With no skill left, the tool is gone. | keep | none. Do not deny it. | `V:101`, `P b7` |
| `ToolSearch` | 953 + 427 characters. A deny adds 15,898 tokens. | keep | none. No hook can defer it. | `V:120`, `P b6` |
| `DeferredToolPlaceholder` | 83 + 36 characters in `V`. 214 characters in `P b7`. | keep | none. No lever found. | `V:121`, `P b7` |
| `AskUserQuestion` | Loaded in an interactive session, 5,038 characters. Not in `-p` (`probes.md` batch 13, `tuibase2`). | keep | none. `D9` needs it for each decision. | `probes.md` b13, `p5a:19` |
| `ListAgents` | 777 + 336 characters. -345 tokens when removed. | keep | none. A deny is the other option (`p3:178`). | `V:116`, `p5a:20` |
| `Workflow` | 3,480 + 1,833 characters. -1,969 tokens when removed. -5,729 characters with `enableWorkflows: false`. | disable | `enableWorkflows: false` and `permissions.deny` `Workflow`. | `V:111`, `P b2`, `p2:41`, `A:174` |
| `ScheduleWakeup` | 3,396 + 1,423 characters. -1,675 tokens when removed. | disable | `permissions.deny` `ScheduleWakeup`. | `V:112`, `p5a:22`, `p2:191` |
| `ReportFindings` | 574 + 1,646 characters. -807 tokens when removed. | disable | `permissions.deny` `ReportFindings`. | `V:114`, `p5a:23`, `p2:191` |
| `SubagentHandback` | Only inside a subagent. Not in the main request. | keep | none. | `p5a:24` |
| `StructuredOutput` | Only for `--json-schema` runs. Not in the main request. | keep | none. | `p5a:25` |
| `Monitor` | Name only in the deferred list until `ToolSearch` loads it. | keep | none. `D9` needs it to wait for a background command. | `p5a:6`, `p5a:31` |
| `TaskStop` | Name only in the deferred list. | keep | none. Drop the 0.2.0 deny. | `p5a:32` |
| `WebFetch` | Name only in the deferred list. | keep | none. A claudetto fetch tool would send the raw page to the main model, so the replace is rejected. | `p5a:33` |
| `WebSearch` | Name only in the deferred list. | keep | none. | `p5a:34` |
| `SendMessage` | Name only in the deferred list. | keep | none. | `p5a:35` |
| `EnterWorktree`, `ExitWorktree` | Name only in the deferred list. | keep | none. They replace the 0.2.0 `patch` skill. | `p5a:36`, `A:54` |
| `NotebookEdit` | Name only in the deferred list. | keep | none. | `p5a:36` |
| `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate` | Name only in the deferred list. Unmeasured. | disable | `permissions.deny` for each name. | `p5a:37`, `p2:194` |
| `TodoWrite` | Gated by `CLAUDE_CODE_ENABLE_TASKS`. Unmeasured. | keep | none. `p1` keeps `CLAUDE_CODE_ENABLE_TASKS` at its default. | `p5a:38`, `p1:62` |
| `EnterPlanMode`, `ExitPlanMode` | Name only in the deferred list. | disable | `permissions.deny` for each name. The deny stops the tools of the model and not the plan mode of the user. | `p5a:39`, `P b1` |
| `CronCreate`, `CronDelete`, `CronList` | Name only in the deferred list. | disable | `CLAUDE_CODE_DISABLE_CRON=1`. | `p5a:40`, `p1:15` |
| `DesignSync`, `RemoteTrigger` | Name only on each request. Unmeasured. | disable | `permissions.deny` for each name (proposed). | `p5a:41`, `p2:198` |
| `PushNotification`, `EndConversation` | Name only in the deferred list. | keep | none. | `p5a:42` |
| `ProposeGoal` | Name only in the deferred list. | disable | `modelProposedGoals: "disabled"`. | `p5a:43`, `p2:33` |
| `LSP` | Only with an LSP plugin. Setup offers none. | keep | none. | `p5a:44` |
| `memory_read`, `memory_write`, `memory_list` | Gated. Unmeasured. | disable | `autoMemoryEnabled: false`. | `p5a:45`, `p2:31` |
| `mcp__computer-use` | Name only. Unmeasured. | disable | `permissions.deny` `mcp__computer-use`. | `p5a:46`, `p2:189` |
| `Advisor` | One tool schema on each request. Unmeasured. | disable | `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`. | `p5a:47`, `p1:14` |
| `Artifact` | Publishes to claude.ai. Unmeasured. | disable | `enableArtifact: false` and `permissions.deny` `Artifact`. | `p5a:48`, `p2:42`, `A:174` |
| `PowerShell`, `WaitForMcpServers`, MCP resource tools | Not loaded on macOS and Linux, with tool search on, or with no MCP resources. | keep | none. | `p5a:49` |
| `SearchMcpRegistry`, `ListConnectors`, `SuggestConnectors` | Gated. Connector tools are a large part of the start context of an account with connectors. | disable | `disableClaudeAiConnectors: true`. | `p5a:50`, `p4:199`, `p2:36`, `X:78` |
| `ReadNotifications`, `SendUserMessage`, `SendFeedback`, `SuggestPluginInstall`, `SuggestSkills`, `FetchInboxMessage`, `PublishPlugin`, `SendFile`, `SendUserFile`, `Poll`, `propose_skills`, `GetTask` | Behind server flags. Unmeasured. | keep | none. | `p5a:50` |
| `OfferChromeSetup` | Behind a server flag. Unmeasured. | keep | none. `CLAUDE_CODE_DISABLE_CFC_PROMPT=1` removes the Chrome prompt section. | `p5a:50`, `p1:36` |
| `ShareOnboardingGuide`, `ShowOnboardingRolePicker`, `AppifactRepl`, `ClaudeDesign`, `Projects` | Behind a hidden server-side flag (cc-docs). Not in any capture of batch 13. | keep | none. No lever, and no capture shows a cost. | `p5a:50`, cc-docs |
| Task tool state after the `Task*` denies | No task tool is loaded in an interactive session of 2.1.308: `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, and `TodoWrite` are in neither the `tools` list nor the deferred list. `CLAUDE_CODE_ENABLE_TASKS=1` changes nothing. `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` adds the four `Task*` names to the deferred list. The four denies add 178 characters to the request (87,802 to 87,980) and remove no tool. | keep | none. The denies of the `Task*` row cost 178 characters and remove nothing in this build. | `p5a:37-38`, `p1:62`, `T11` |

## Skills and Commands

Bundled skills.
`disableBundledSkills: true` removes them from the listing.
It is safe only with the `Workflow` deny, because the `Workflow` text grows from 5,473 to 22,863 characters without it (`P b10`).

| Part | Cost | Decision | Lever | Source |
| --- | --- | --- | --- | --- |
| Skill `dataviz` | 1,447 characters (482 tokens). | disable | `disableBundledSkills: true`. | `V:85`, `p2:40` |
| Skill `claude-api` | 1,082 characters (361 tokens). | disable | `disableBundledSkills: true`. `CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL=1` is the same lever for this skill. | `V:86`, `p4:204` |
| Skill `update-config` | 707 characters (236 tokens). | disable | `disableBundledSkills: true`. | `V:87` |
| Skill `code-review` | 642 characters (331 tokens). | disable | `disableBundledSkills: true`. | `V:88` |
| Skill `run` | 368 characters (123 tokens). | disable | `disableBundledSkills: true`. | `V:89` |
| Skill `loop` | 344 characters (115 tokens). | disable | `disableBundledSkills: true` and `CLAUDE_CODE_DISABLE_CRON=1`. | `V:90`, `D:102` |
| Skill `plugin-authoring` | 266 characters (89 tokens). A built-in mod adds it even when bundled skills are off. | disable | `skillOverrides` `{"plugin-authoring":"name-only"}`. | `V:91`, `p3:147`, `p2:48` |
| Skill `workflow-authoring` | 252 characters (84 tokens). | disable | `disableBundledSkills: true`. | `V:92` |
| Skill `keybindings-help` | 248 characters (83 tokens). | disable | `disableBundledSkills: true`. | `V:93` |
| Skill `fewer-permission-prompts` | 191 characters (64 tokens). | disable | `disableBundledSkills: true`. | `V:94` |
| Skill `simplify` | 188 characters (63 tokens). | disable | `disableBundledSkills: true`. | `V:95` |
| Skill `security-review` | 170 characters (30 tokens). | disable | `disableBundledSkills: true`. | `V:96` |
| Skill `init` | 67 characters (22 tokens). | disable | `disableBundledSkills: true`. | `V:97` |
| Skill `schedule` | 127 tokens. No size in characters. | disable | `disableBundledSkills: true`. | `p4:128` |
| Skills `debug`, `batch`, `run-skill-generator`, `verify`, `claude-in-chrome`, `design-sync`, `artifact-components` | 0 characters in the stub listing of an interactive session and of `-p`. The listing has 16 skills, and none of these. In the bundle, `debug`, `run-skill-generator`, and `design-sync` set `disableModelInvocation`, so the listing never holds them. `batch` and `claude-in-chrome` have a `whenToUse` text and no entry in the stub listing. The bundle has no `verify` skill entry. `batch` starts 5 to 30 worktree agents. | disable | `disableBundledSkills: true`. | `p4:128`, `T11` |
| All bundled skills, listing | 6,049 characters with a 64-character header (2,210 tokens). 5,745 characters in the `leanmain` probe. | disable | `disableBundledSkills: true`. | `V:98`, `V:69`, `P b7` |
| `/doctor` subcommands `prompt-audit` and `cost-optimize` | Not sized. The bundle text of `/doctor prompt-audit` says it hands off to the prompt audit of the bundled `claude-api` skill. With that skill off, the command tells the user that the skill is not available. `cost-optimize` is a subcommand name of the `claude-api` skill (the list `L` in the bundle), and the bundle has no `/doctor cost-optimize` text. | disable | `disableBundledSkills: true`. `/doctor` stays (`p2:40`), and its `prompt-audit` goes with the `claude-api` skill. | `X:73`, `p2:40`, `T11` |
| Built-in plugins: `cc-plugin-agents-md`, `claude-test`, `diff`, `easel`, `mermaid`, `mods-guide`, `plugin-authoring`, `responsive-mode`, `sec-default`, `telemetry`, and `tips` (the snippet leaves `you-should-know` to the user, 2026-10-22) | 265 characters: with them off, only the `plugin-authoring` skill line goes (`plugoff` 45,944, `base` 46,209). | disable | `enabledPlugins` with each entry `false`. | `probes.md` b13, cc-docs |
| Skill listing limits | Cap on the listing. | keep | none. `skillListingBudgetFraction`, `skillListingMaxDescChars`, and `SLASH_COMMAND_TOOL_CHAR_BUDGET` stay at the default until the listing is measured. | `V:99`, `p2:82` |

Slash commands.
The cost of a command is 0 until the user types it (`p4:201`).

| Part | Cost | Decision | Lever | Source |
| --- | --- | --- | --- | --- |
| `/goal` | 0 until typed. | replace | A Mod API `command.run` hook on `goal` that answers in place of the built-in, with a `Stop` hook that runs one check with no model call. A plugin skill `goal` does not replace it: it is `claudetto:goal`, and `/goal` still runs the built-in. Only a project or user skill replaces it. No setting turns `/goal` off. | `probes.md` b13 (`goalproj`, `goalplug`), cc-docs `extend/mod-api/tool-command-config` |
| `/loop` | Skill `loop` is 344 characters (115 tokens). | disable | `CLAUDE_CODE_DISABLE_CRON=1` and `disableBundledSkills: true`. | `V:90`, `D:102` |
| `/fast` | Fast mode bills at a premium rate. No size. | disable | `CLAUDE_CODE_DISABLE_FAST_MODE=1`. | `p4:117`, `p1:16` |
| `/advisor` | 0 until typed. | disable | `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`. | `p4:118`, `p1:14` |
| `/auto-mode-setup` | 0 until typed. | disable | `permissions.disableAutoMode: "disable"`. | `p4:123`, `p2:17` |
| `/statusline` | The built-in starts the `statusline-setup` agent. Size of its system text at `V:181`. | keep | none: the command costs no context until the user types it. `claudetto-statusline` sets `statusLine`, and the `command.describe` hook stays dropped (`p3:51`, `D:96`). | `p4:124`, `V:181`, `p2:28`, `p3:51` |
| `/chrome` | Claude in Chrome adds MCP tool schemas. No size. | replace and disable | `claudetto-browser:browse` in its place. `CLAUDE_CODE_DISABLE_CFC_PROMPT=1`. | `p4:125`, `p1:36`, `A:65` |
| `/workflows` | `Workflow` is -1,969 tokens when removed. | disable | `enableWorkflows: false`. | `p4:126`, `V:111` |
| `/compact` | One summary call for each use. | keep | `session.compact` hook aims the summary. | `p4:114`, `p3:54` |
| `/context` | A count-tokens call with no model turn. | keep | none. | `p4:115` |
| `/doctor` | 0 until typed. Stays on when bundled skills are off. | keep | none. | `p4:127` |
| `/skill-doctor` | 0 until typed. May be absent. | keep | none. | `p4:120` |
| `/status`, `/usage` | 0 until typed. | keep | none. | `p4:121-122` |
| `/permissions`, `/hooks`, `/mcp`, `/plugin`, `/skills` | 0 until typed. | keep | none. | `p4:119` |
| `/init` | Skill `init` is 67 characters (22 tokens). | keep | none. | `p4:201`, `V:97` |
| `/add-dir`, `/cd`, `/clear`, `/autocompact`, `/resume`, `/rename`, `/branch`, `/background`, `/stop`, `/plan`, `/recap`, `/btw`, `/export`, `/copy`, `/exit`, `/restart`, `/rewind`, `/tasks`, `/list-agents`, `/focus`, `/diff` | 0 until typed. | keep | none. | `p4:201` |
| `/model`, `/effort`, `/config`, `/memory`, `/reload-skills`, `/output-style`, `/theme`, `/tui`, `/color`, `/brief`, `/scroll-speed`, `/terminal-setup`, `/keybindings`, `/ide`, `/import`, `/help`, `/release-notes`, `/sandbox`, `/insights` | 0 until typed. | keep | none. | `p4:201` |
| `/fork`, `/subtask` | 0 until typed. They need fork mode. | disable | `CLAUDE_CODE_FORK_SUBAGENT=0`. | `p4:201`, `p1:20` |
| `/privacy-settings`, `/login`, `/logout`, `/install`, `/upgrade`, `/pro-trial-expired`, `/rate-limit-options`, `/passes`, `/install-slack-app`, `/setup-bedrock`, `/setup-vertex` | 0 until typed. `DISABLE_UPGRADE_COMMAND` works only behind a server gate, so it stays unset (the user, 2026-10-22). | keep | none. | `p4:202`, cc-docs `configure/env-vars/ui-and-terminal` |
| `/feedback`, `/bug`, `/extra-usage`, `/usage-credits`, `/install-github-app` | 0 until typed. The user keeps only the commands that a session needs (the user, 2026-10-22). | disable | `DISABLE_FEEDBACK_COMMAND=1`, `DISABLE_EXTRA_USAGE_COMMAND=1`, and `DISABLE_INSTALL_GITHUB_APP_COMMAND=1`. | `p1:39-42` |
| `/voice`, `/powerup`, `/stickers`, `/radio`, `/team-onboarding`, `/heapdump`, `/mcp__<server>__<prompt>` | 0 until typed. | keep | none. | `p4:202` |
| `/artifacts`, `/design-consent`, `/design-login` | 0 until typed. Artifacts are off. | disable | `enableArtifact: false` and `permissions.deny` `DesignSync`. | `p4:202`, `p1:75`, `p2:198` |
| `/web-setup`, `/cloud-plugins`, `/remote-env`, `/teleport`, `/session`, `/desktop`, `/mobile`, `/remote-control`, `/ultraplan`, `/ultrareview`, `/autofix-pr`, `/daemon` | 0 until typed. Paid cloud commands run only when the user types them. | keep | none: a command that costs no context until the user types it needs no lever, so the CLI-only rule (A17) does no work here. | `p4:202`, `p2:56` |

## Agents

For the agent rows, the size of each system text and the tool count are in `V:177` to `V:183` and in `P b3`.
This file does not copy them.

| Part | Cost | Decision | Lever | Source |
| --- | --- | --- | --- | --- |
| `general-purpose` | System text and 8 tools: size at `V:177`. Probe size at `P b3`. | replace and disable | `claudetto:worker` in its place. `agent.offer` returns `{isOffered: false}`. `permissions.deny` `Agent(general-purpose)`. `agent.spawn` maps a call with no type to the worker. | `V:177`, `P b3`, `D:37-39`, `p4:71` |
| `Explore` | System text and 5 tools: size at `V:178`. Probe size at `P b3`. It runs on the main model. | replace and disable | `claudetto:scout` in its place. `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1`. `agent.offer`. | `V:178`, `P b3`, `p4:69`, `p1:19` |
| `Plan` | System text and 5 tools: size at `V:179`. | disable | `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1`. | `V:179`, `p4:70` |
| `claude` (built-in guide type) | System text and 8 tools: size at `V:182`. | disable | `permissions.deny` `Agent(claude)`. `agent.offer`. | `V:182`, `D:38`, `p4:72` |
| `claude-code-guide` | Runs on `haiku`. Costs tokens only when called. | disable | `agent.offer` hides it with the other engine agents (D2), and `Agent(claude-code-guide)` in `permissions.deny` for a session with no mods. The type name is documented (cc-docs `extend/subagents/runtime`). | `p4:74`, `p2:187`, `p2:242`, `D:38` |
| `statusline-setup` | System text and 2 tools: size at `V:181`. It is the largest of the built-in agent texts. | disable | `permissions.deny` `Agent(statusline-setup)`. `agent.offer`. | `V:181`, `p4:73`, `D:38` |
| `fork` | A fork copies the whole parent context. | disable | `CLAUDE_CODE_FORK_SUBAGENT=0` and `permissions.deny` `Agent(fork)`. | `p4:75`, `p1:20`, `X:64` |
| `web-fetch` agent | System text and 1 tool: size at `V:210`. Exists only behind `CLAUDE_CODE_WEB_FETCH_AGENT`. | disable | Leave `CLAUDE_CODE_WEB_FETCH_AGENT` unset. Default is off. | `V:210`, `p4:177` |
| `workflow-subagent`, `comment-thread-analyst` | Not sized. Used by workflows and artifacts. | disable | `enableWorkflows: false` and `enableArtifact: false`. | `p4:177`, `p2:41-42` |
| Custom or plugin agent, base prompt | Base text plus the agent body: size at `V:180`. A fixed append follows the body: size at `P b4` and `P b5`. | keep | `omitClaudeMd: true`, `tools`, `model`, and `effort` in the agent file. | `V:180`, `P b4`, `P b5` |
| Agent types list in the messages | 1,638 characters. -324 tokens and -911 characters with the Explore and Plan switch. 239 characters with `Agent(tiny)`. | keep | The list stays for the claudetto roster. The built-in entries go by the rows above. | `V:68`, `P b2`, `P b7` |

## Reminders and Attachments

| Part | Cost | Decision | Lever | Source |
| --- | --- | --- | --- | --- |
| `system[0]` billing header | 74 characters. 103 characters smaller with `CLAUDE_CODE_ATTRIBUTION_HEADER=0`. | keep | none. `p1:13` says `set 0`, and the review of `p1:111` and `P b1` keep the default. | `V:18`, `P b1`, `p1:13`, `p1:111` |
| `system[1]` identity line | 62 characters. It is a floor. | keep | none. No documented surface changes it. | `V:19`, `P b7` |
| `system[2]` body, all sections | 5,656 characters in `V`. 6,138 characters in `P b1`. | replace and disable | `agent` set to `claudetto:main` in the plugin `settings.json`. The agent body replaces the whole text. | `V:20`, `P b1`, `V:44`, `p2:25`, `A:107` |
| Memory section | 2,091 characters (691 tokens). -2,151 characters with the switch. | disable | `autoMemoryEnabled: false`. `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` is the same lever. | `V:41`, `P b2`, `p2:31` |
| Model-specific extra sections | 8,932 (Haiku) and 12,212 (Fable) characters in `system[2]`, against 6,139 for the default. | replace and disable | The agent route: with an agent as the main thread, `system[2]` is 65 for both models. | `probes.md` b13 (`haikulean`, `fablelean`) |
| Gated session sections (`task_continuity`, `tsr`, and 14 more) | None renders in a stub session, with the default `claude-opus-5-5` or in a terminal. Sizes are the static text of 2.1.308, read from the bundle: `task_continuity` 457, `tool_param_json` 117, `delivering_work_max` 2,015 (1,670 in the `b` form), `overcorrection` 1,244 (1,544 in the `b` form), `subagent_steer_delegation` 1,430, `opus5_reduced_delegation` 112, `heron_brook` 2,786 (a server text replaces it when set), `willow_tern` 1,815, `autonomy_append` 1,361, `focus_mode` 417, `bg-session` 552 (211 and 248 in the other forms), and `system_messages` 261 or 225. The stub check: `CLAUDE_CODE_BISON_CAIRN=1` adds 2,019 characters to `system[2]` and the text `# Delivering work`. Not sized: `brief` (the text follows `isBriefEnabled`), `brook_heron` (a server text), `endconv_deferred_hint` (the text follows the `EndConversation` tool), and `tsr` (no section of that name in 2.1.308). | replace and disable | The agent body. The experiment env vars stay at the default. | `V:49`, `p1:58`, `P b8`, `T11` |
| Tool description texts | `mainfloor` has 6 tools of 10,628 characters. `descfloor` has 6 tools of 6,359 characters. | replace and disable | `tool.describe` rewrite in ASD-STE100. The input schemas stay. | `P b7`, `A:170` |
| `# Environment` attachment, `model` attachment, and `date` attachment | 825 characters in `V`. 832 characters in `P b7`. | replace and disable | `prompt.attachment` returns a short text for `environment`, `model`, and `date`. | `V:66`, `P b7`, `P b8`, `p3:161` |
| `context_sections` and context blocks `claudeMd`, `userEmail`, `attachedProject`, `currentDate` | Small. Not sized. | replace and disable | `prompt.context` drops `userEmail` and shortens the wrapper. It keeps `claudeMd`. | `V:58`, `p3:162`, `P b8` |
| `CLAUDE.md` block | The file size. 366 characters for the test file. | keep | `omitClaudeMd: true` on the agents that need no project rules. | `V:57`, `V:26`, `P b5` |
| Git status block | 573 characters. | disable | `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1`. | `V:25`, `V:56`, `p1:24` |
| Attribution reminder (`remote_session_change`) | 580 characters in `V:21`. 592 characters in `V:151`. | disable | `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1`. | `V:21`, `V:55`, `V:151` |
| Commit trailer, PR footer, and commit gate text | The trailer is 55 characters (`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), and the PR footer is 62 characters. Both sit in the attribution reminder of `messages[0]`, which is 580 characters (612 in the JSON). The sentence about the exemption is 176 characters inside that reminder. `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` removes the reminder and the `gitStatus` block (10,444 to 9,210 characters of `messages`) and the `# Git` text of `Bash` (385 characters). `attribution: {commit: "", pr: ""}` and `includeCoAuthoredBy: false` both remove the 580-character reminder (10,444 to 9,832 characters of `messages`) and leave the `Bash` text as it is. In the bundle, `attribution.text` has two call sites, kinds `commit` and `pr`. It has none for `exemption` or `remedy`, so no commit gate text exists to size in 2.1.308. | replace and disable | `attribution.text` mod hook. The `attribution` setting is the cheaper lever first. `p2:78` keeps the default and `p3:44` says replace. | `p3:44`, `p3:165`, `p2:78`, `A:170`, `T11` |
| `total_tokens` reminder | 78 characters in the capture. | disable | `CLAUDE_CODE_TOTAL_TOKENS_REMINDER=off`. | `V:70`, `p1:25` |
| Todo reminder | On each idle turn. Not sized. | disable | `CLAUDE_CODE_TODO_REMINDER_MODE=off`. | `V:71`, `p1:26` |
| `deferred_tools_delta` list | 395 characters in `-p` and 438 in a terminal run. | keep | none. `prompt.attachment` sees this kind: a logging hook got `type: "deferred_tools_delta"`, `origin.kind: "engine"`, and the text. The types file of the mod API lists the kind. | `V:67`, `p3:170`, `p3:190`, `T11` |
| `agent_listing_delta` | See "Agent types list" in the Agents section. | keep | none. | `P b8` |
| Skill listing | 6,049 characters (2,210 tokens). | keep | The listing stays for claudetto skills. Built-in entries go by the Skills rows. | `V:69`, `V:98` |
| `plan_mode`, `plan_mode_reentry`, and `plan_mode_exit` | The plan text is 13,784 characters against 8,874. It adds 4,992 characters in `P b1`. | replace and disable | `prompt.attachment` rewrite of the three types. `CLAUDE_CODE_PLAN_V2_AGENT_COUNT=1` and `CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT=1`. | `V:72`, `P b1`, `p3:167`, `p1:22-23` |
| `auto_mode` reminder and `safeguards` field | 485 characters of reminder. 1,750 characters of `safeguards`. 16,286 characters with 236 rules of the user. | replace and disable | `permissions.disableAutoMode: "disable"`. The gate of `D4` replaces the classifier. | `P b12`, `D:73`, `p2:17` |
| Output style text and `output_style` reminder | The built-in `Concise` text is 10,376 characters. The reminder is 83 characters plus the style name: 88 for `terse`, and 100 for `claudetto:Concise`. It sits once in the first `system` message and again as its own `system` message after each tool round (at message 4 of a one-tool run). | keep | `outputStyle: "claudetto:Concise"` keeps the reminder. | `V:73`, `P b1`, `X:146`, `T11` |
| Slash command blocks | Added as user blocks, one for each command typed. | keep | none. | `V:74` |
| `nested_memory`, `queued_command`, `edited_text_file`, and `deferred_tools_record` | `nested_memory`: 143 characters for a 39-character `CLAUDE.md` (the text is `Contents of <path>:`, a blank line, and the file, so 15 characters and the path of fixed text). `queued_command`: 302 characters for a 20-character message, so 282 characters of fixed text. `edited_text_file`: the bundle text is a fixed note of 233 characters plus the path, then 58 characters and the changed lines, or 74 characters of "changes are not shown". A stub did not trigger it in 3 runs. `deferred_tools_record`: 0 characters. The engine filters it out of the request. | keep | `prompt.attachment` sees `nested_memory` and `queued_command` (a logging hook got both). The types file also lists `edited_text_file`. `deferred_tools_record` needs none. | `p5b:35`, `p3:38`, `T11` |
| Other attachment kinds in the program text | A session of batch 13 sends `agent_listing_delta`, `context_sections`, `date`, `deferred_tools_delta`, `environment`, `model`, `remote_session_change`, `session_context`, `skill_listing`, `auto_mode` (auto mode only), and `command_permissions` (after a typed command). The program may have more kinds. | keep | none. | `probes.md` b13 |
| `CLAUDE_CODE_SILENT_TURN_REMINDER` reminder | An extra nudge after a quiet turn. Not sized. | disable | `CLAUDE_CODE_SILENT_TURN_REMINDER=0`. | `p1:29`, `V:226` |
| Token usage attachment | Off by default. | keep | `CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT` stays unset. | cc-docs `configure/env-vars/context-and-compaction` |
| `Bash` output audience note | A note that a rollout can add to each `Bash` result. Not sized. | disable | `CLAUDE_CODE_BASH_OUTPUT_AUDIENCE_NOTE=0`. | `p1:27` |
| `Bash` edit diff attachment | Not sized. It shows the files that a `Bash` command changed, so `CLAUDE_CODE_BASH_EDIT_DIFF=0` cuts a capability (D8, and the never-set list of `tests/support/settings-pin.ts`). | keep | none. | `p1:28` |
| IDE context attachments | Not sized. | disable | `CLAUDE_CODE_AUTO_CONNECT_IDE=false`. | `p1:33` |
| `@` mentions and MCP instruction delta | Stopped by `CLAUDE_CODE_DISABLE_ATTACHMENTS=1`. | keep | none. The switch is out, because it also stops `@` mentions. | `V:79`, `V:220`, `p1:54` |
| Memory block in each subagent prompt | One extra block. Not sized. | disable | `CLAUDE_CODE_MEMORY_SUBAGENT_APPEND=1`, on trial. | `p1:21`, `p1:115` |
| Subagent fixed append | Size at `P b4`. | keep | none. No lever removes it. | `P b4`, `V:188-192` |
| Files and skills kept after a compaction | Up to five files of under 5,000 tokens each. Skills at 5,000 tokens each, within 25,000 in all. | keep | none. Short skill bodies keep the cost low. | `p5b:25-26` |

## Background Model Calls

| Part | Cost | Decision | Lever | Source |
| --- | --- | --- | --- | --- |
| Terminal title and branch name | 4,033 characters in all (system 3,188, messages 288, the rest the schema) for the prompt `fix the login bug in auth.ts`, `source=generate_session_title`, 0 tools. It runs in a terminal session only, not in `-p`. `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1` removes the request (1 request in place of 2). A stub run saw no request for a branch name. | disable | `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1`. | `V:200`, `p1:34`, `T11` |
| Session naming | The automatic name is the title request of the row above. `/rename` with no name adds a second request: 1,184 characters in all (system 507, messages 128), `source=rename_generate_name`. | keep | none. No lever. | `V:201`, `T11` |
| Memory selection and memory extraction | A stub did not trigger either call: no `source=memory` and no `extract_memories` request came in `-p` or in a terminal run with 2 topic files and a `MEMORY.md`. Sizes from the bundle: the selection system text is 1,319 characters, with a user text `Select memories relevant to:` and the query, a JSON schema, and the file index. The extraction instruction is about 2,000 characters, and it runs as a fork that shares the cache prefix of the main request (88,000 characters in a terminal). `autoMemoryEnabled: false` cuts the memory index from the main request: 622 characters of `messages` and 2,186 of `system` with a seeded memory. | disable | `autoMemoryEnabled: false`. | `V:202`, `p2:31`, `T11` |
| Auto dream (memory consolidation) | A stub did not trigger it (the gates are time and session count, with `autoDreamEnabled: true` and a seeded memory). The prompt function is 2,974 characters of bundle source. The run is a fork that shares the main request prefix, `source=auto_dream`, with shell limited to read-only commands. | disable | `autoDreamEnabled: false`. | `p2:32`, `T11` |
| Compaction summary | Size of the final message, with and without custom text: `V:203`. The full prompt and tools still go. | keep | `session.compact` aims the summary. The fixed base text is not reachable. `A:170` lists the compaction text, and `p3:54` says it is not reachable. | `V:203`, `p3:54`, `A:170` |
| Auto compaction window | Each turn reads the whole cached context. | keep | `autoCompactWindow`. The eval sets the value. | `p5b:22`, `p2:34` |
| Idle compaction | Makes the context small before the cache ends. | keep | none. Default on. | `p5b:24` |
| Precompute compaction | The setting `precomputeCompactionEnabled` defaults to `true` in the bundle, but the precompute needs the server flag `tengu_sepia_moth` (default `false`) and also `tengu_amber_packet` (default `false`). So it is off by default with no server flag. A stub run with 760,000 reported tokens made no extra request. The size is not measurable in a stub: the run is a fork of the main request plus the compaction prompt. | keep | `precomputeCompactionEnabled` stays at the default until an eval shows a gain. | `p2:76`, `T11` |
| Auto mode classifier | 140,015 characters in `V`. 138,256 characters (142,739 in all) in `P b12`, with 0 tools. A cost behind a proxy. | replace and disable | `permissions.disableAutoMode: "disable"`. The gate of `D4` in its place. | `V:204`, `P b12`, `D:73` |
| Prompt hook | System text and messages with 0 tools: size at `V:205`. One call for each fire. | keep | none. claudetto ships no `prompt` hook. | `V:205`, `p4:155` |
| Agent hook | System text and 10 tools: size at `V:206`. Up to 50 turns for each fire. | keep | none. claudetto ships no `agent` hook. | `V:206`, `p4:156` |
| Observer agents | With `CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS=1` and an agent file with `observer: watcher`, one `Agent` call adds 2 requests to the run: 1 request of the observer (23,217 characters: system 1,394, messages 10,180, 8 tools of 11,356) and 1 more request of the main thread (49,421 against 48,090) that carries the relay. The observed agent request is 26,242 characters. Without the var the run has 4 requests, and with it 5. | disable | Leave `CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS` unset. Default is off. | `V:207`, `p4:65`, `T11` |
| Prompt suggestion | Small. One request after a turn. | disable | `promptSuggestionEnabled: false`. | `V:208`, `p2:43` |
| Away summary | Small. One request when the user comes back. | disable | `awaySummaryEnabled: false`. | `V:209`, `p2:44` |
| Feedback survey and feedback drafts | No model tokens. The user keeps only the parts that a session needs (the user, 2026-10-22). | disable | `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY=1` and `feedbackDrafts: "off"`. | cc-docs `configure/env-vars/ui-and-terminal` |
| Error reports | No model tokens. The user keeps only the parts that a session needs (the user, 2026-10-22). | disable | `DISABLE_ERROR_REPORTING=1`. | cc-docs `configure/env-vars/telemetry-and-debug` |
| Spinner tips | No model tokens. The user keeps only the parts that a session needs (the user, 2026-10-22). | disable | `spinnerTipsEnabled: false`. | cc-docs settings schema |
| IDE extension auto install | No model tokens. The user keeps only the parts that a session needs (the user, 2026-10-22). | disable | `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL=1`. | cc-docs `configure/env-vars/ui-and-terminal` |
| `WebFetch` page summary | 3,973 characters for a 2,818-character page: system 196, a user text of 3,363 (the page, the prompt, and 527 characters of fixed text with the quote rules), 0 tools, `source=web_fetch_apply`. So 1,155 characters beyond the page. The stub request names `claude-opus-5-5` for this call, so the stub does not show that a small model reads the page. | keep | none. | `p5a:33`, `T11` |
| Small fast model calls | Not sized. | keep | none. `ANTHROPIC_DEFAULT_HAIKU_MODEL` stays at the default. | `V:211`, `p1:64` |
| Telemetry and non-essential traffic | No model tokens. | keep | none. `DISABLE_TELEMETRY` and `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` stay unset until a probe shows they keep the mod flag on. | `V:212`, `p1:65`, `p1:93` |

## Modes

| Part | Cost | Decision | Lever | Source |
| --- | --- | --- | --- | --- |
| Permission mode `default` | No `safeguards` field. The main requests are 46,209 and 46,663 characters. | keep | `permissions.defaultMode: "default"` (D5). The gate of D4 also checks `Edit` and `Write`, so `acceptEdits` (`p2:20`) adds nothing. | `P b12`, `D:73`, `p2:20` |
| Permission mode `acceptEdits` | Not sized. | keep | none: the user can pick it with `Shift+Tab`. | `p2:20` |
| Permission mode `dontAsk` | Adds no text. | keep | none. | `probes.md` b13 (`dontask`) |
| Permission mode `bypassPermissions` | Adds `While bypass permissions mode is active:` with the `cat` and `sed` advice, and `Bash` is 311 characters shorter. | keep | none. The mode is the user's choice. | `probes.md` b13 (`bypass`) |
| Permission mode `plan` | Adds 4,992 characters to the messages. | keep | The plan text rewrite is in the Reminders table. | `P b1`, `p2:87` |
| Permission mode `auto` | 48,149 characters in the first request, with `safeguards` and a reminder. | replace and disable | `permissions.disableAutoMode: "disable"` and `useAutoModeDuringPlan: false`. The gate of `D4` in its place. | `P b12`, `D:73`, `p2:17-19` |
| Fast mode | Bills at a premium rate. No size. | disable | `CLAUDE_CODE_DISABLE_FAST_MODE=1`. | `p1:16` |
| Fork mode | Copies the whole parent context. | disable | `CLAUDE_CODE_FORK_SUBAGENT=0`. | `p1:20`, `D:38` |
| Agent teams | Off unless `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` or `--agent-teams`, and also behind a server gate. | disable | none. Leave the env var unset. | cc-docs `configure/env-vars/agents-and-teams` |
| Remote control and cloud sessions | Not sized. Cloud and desktop only. | disable | `disableRemoteControl: true` turns off `/remote-control`. | cc-docs `configure/settings/agents-and-remote` |
| Tool search mode | 15,327 tokens more when off. | keep | none. Keep `ENABLE_TOOL_SEARCH` at the default. | `V:124` |
| Background tasks | 1,375 characters fewer with `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`. | keep | none. `X:63` and `X:119` suggest the switch, `p1:62` and `p4:79` keep the default, and `D9` needs background commands. | `P b11`, `p1:62`, `X:63`, `D:126` |
| Proactivity (`--proactivity`, `CLAUDE_CODE_DISABLE_PROACTIVITY`) | `[Undocumented]` flag with no help text. Not in any capture of batch 13. | keep | none. | cc-docs `configure/cli/flags` |
| Sandbox | 8,729 characters more in all: `Bash` is 854 longer, with the `## Bash command sandbox` text. | keep | none. claudetto writes no `sandbox` key. | `probes.md` b13 (`sandbox`) |
| Bare mode and safe mode | Bare has 3 tools. Size of its tools JSON at `V:131`. Both stop plugins and hooks. | keep | none. claudetto does not use them. | `V:131`, `p1:54` |
| Worktree isolation | No token effect. | keep | `worktree` `{"baseRef":"head"}`. | `p2:39` |
| Output style `Concise` (built-in) | 1,599 characters more than `base` in `P b11`. | replace and disable | `outputStyle: "claudetto:Concise"`. That style is 1,464 characters more than `v020`. | `P b11`, `p2:29-30`, `A:48` |
| Output styles `Proactive`, `Explanatory`, `Learning` | `Learning` is 13,882 characters. `Proactive` removes plan mode. | keep | none. Not selected. | `V:73`, `p2:86` |
| Output style `default` | The base text. | keep | none. | `p2:86` |

## Open Rows

No row is open now.
Task 1.1 sized the rows that were open, and `evidence.md` has the method.
The rows had `[NEEDS CLARIFICATION` before that task.

These facts stay unmeasured, with the reason:

- Gated sections `brief`, `brook_heron`, `endconv_deferred_hint`, and `tsr`: the text follows a tool or a server value.
- `edited_text_file`: a stub did not trigger the attachment in 3 runs, so only the bundle text is sized.
- Memory selection, memory extraction, auto dream, and precompute compaction: a stub did not trigger the call, so the size comes from the bundle.
- Branch name request: a stub run showed none.
