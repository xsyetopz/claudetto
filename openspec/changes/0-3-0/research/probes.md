# Stub Probes on a Vanilla Install

Date: 2026-10-21.
Claude Code `2.1.306` (`claude --version`).
Cost: $0, because no request reached the API.

## Method

- The proxy `plugins/claudetto-lab/bin/claudetto-capture --port 8799 --upstream http://127.0.0.1:9 --no-count` saves each `/v1/messages` body before it forwards it.
  The upstream is a closed port, so each request fails with `500`, and Claude Code exits.
- Each probe runs `claude -p "say hi"` under `env -i`, with a new empty `CLAUDE_CONFIG_DIR`, `ANTHROPIC_API_KEY=sk-ant-dummy`, `ANTHROPIC_BASE_URL=http://127.0.0.1:8799`, `CLAUDE_CODE_MAX_RETRIES=0`, and `timeout 60`.
  So the install has no plugins, no user settings, and no login.
- The project is an empty `git init` folder.
- A probe that needs settings, an agent, or a style copies a setup folder into the new config first.
- The sizes are characters of the first request body (`json.dumps`), not tokens.
  The differences come from a shell `echo $((a-b))` of the analyzer output.

## Results

| Probe | Change | Request result |
| --- | --- | --- |
| `base` | none | `system` blocks of 74, 62, and 6,138 characters, 12 tools of 28,653 characters, messages of 10,529 characters. The tools are `Agent`, `Bash`, `Edit`, `ListAgents`, `Read`, `ReportFindings`, `ScheduleWakeup`, `Skill`, `ToolSearch`, `Workflow`, `DeferredToolPlaceholder`, and `Write`. No `Glob` and no `Grep`. |
| `attr0` | `CLAUDE_CODE_ATTRIBUTION_HEADER=0` | `system[0]` (the `x-anthropic-billing-header` line) is gone. The body is 103 characters smaller. Nothing else changes. |
| `globgrep` | `--allowedTools Glob,Grep` | Adds `Glob` and `Grep`: 14 tools of 32,758 characters, so 4,105 characters more. The alias `claude --allowedTools Glob,Grep` of the user adds them to each session. |
| `plan` | `--permission-mode plan` | The plan text goes into the messages, 4,992 characters more than `base`. It says `Launch up to 3 Explore agents IN PARALLEL` and `You can launch up to 1 agent(s) in parallel` (the API key has no Max plan, so the plan agent count is 1). |
| `plan1` | `plan` with both `CLAUDE_CODE_PLAN_V2_*` set to `1` | `Launch up to 1 Explore agents`. The length is the same as `plan`, because only one digit changes. |
| `plan5` | `plan` with both set to `5` | 548 characters more than `plan1`: the counts change, and a "Multiple agents" block with examples is added. So the vars work on 2.1.306. |
| `plandeny` | `plan` with `permissions.deny` of `EnterPlanMode` and `ExitPlanMode` | Plan mode is still active, with `Launch up to 3 Explore agents`. The deny stops only the tools of the model, not the plan mode of the user. |
| `styleonly` | `outputStyle: "Terse"` (a file in `output-styles/`, `keep-coding-instructions: false`) | The style text goes into `system[2]` (6,181 characters) with `# Output Style: Terse`, and a reminder `Terse output style is active` goes into the messages. |
| `styleagent` | `styleonly` with `agent: "tiny"` (`model: haiku`) | The model is `claude-haiku-5-5`. `system[2]` is only the agent body (31 characters). The style still applies: `# Output Style: Terse` and the style text are in a `system` message part, and the reminder is in the messages. |

## Decisions

- `CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT`: `set 1`.
  The default is 3 also on an account with no Max plan, and the deny of the plan tools does not turn plan mode off.
  So each plan that the user starts can run 2 fewer Explore agents.
- `CLAUDE_CODE_PLAN_V2_AGENT_COUNT`: `set 1`.
  The docs give 3 on Max 20x (`configure/env-vars/agents-and-teams.md:75`), and this probe shows that the var takes effect.
  A probe with a Max login is not free, so the Max default is from the docs only.
- `CLAUDE_CODE_ATTRIBUTION_HEADER`: keep the default.
  The saving is 103 characters of one block (proposed: less than $0.01 for each session).
  Its effect on the billing of a subscription has no free test.
- `Glob` and `Grep`: the vanilla main session has neither, so a replacement tool replaces nothing in the main session.
  The `--allowedTools Glob,Grep` alias costs 4,105 characters in each request, and setup tells the user so.
- The output style applies when `agent` is set, so `claudetto:Concise` can stay a style file, and the risk in `design.md` is closed.
- `agent` sets the main-thread model (`styleagent` ran on `claude-haiku-5-5` from `model: haiku`), which closes the "Dropped `model`" item of `p2-settings-perms-cli.md`.

## Batch 2: Settings Levers

Same method, run folder `b2`.
The base body is 46,208 characters.
Each delta is from a `python3` pass over the saved bodies.

| Probe | Change | Delta | What changes |
| --- | --- | --- | --- |
| `nowf` | `enableWorkflows: false` | -5,729 | The `Workflow` tool and its workflow text go. |
| `nomem` | `autoMemoryEnabled: false` | -2,151 | `system[2]` goes from 6,138 to 4,030 characters. |
| `nogit` | `includeGitInstructions: false` | -1,667 | The git status in the messages and the git text of `Bash` go. |
| `gitenv` | `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` | -1,666 | The same as `nogit`, so the snippet sets only the settings key. |
| `denytools` | `permissions.deny` of `Workflow`, `ScheduleWakeup`, `ReportFindings`, `ListAgents` | -13,972 | 8 tools of 14,676 characters are left. |
| `noauto` | `permissions.disableAutoMode: "disable"` | +2 | No change in the request. The classifier cost is in its own requests, which a stub probe cannot show. |
| `noexplore` | `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` | -911 | The built-in agent list in the messages gets shorter. |
| `nodyn` | `--exclude-dynamic-system-prompt-sections` | -122 | `system[2]` goes from 6,138 to 3,726 characters, and the moved sections go into the messages. This helps the cache across projects, not the size. It is a flag only. |
| `combo` | `nowf`, `nomem`, `nogit`, `denytools`, `noexplore`, and `CLAUDE_CODE_TOTAL_TOKENS_REMINDER=off` | -18,966 | 27,242 characters: 8 tools of 14,285 characters, `system[2]` of 4,030 characters, messages of 8,082 characters. |

`enableWorkflows: false` and the deny of `Workflow` overlap, so the sum of the rows is more than the `combo` delta.
The `combo` row is the number for the snippet.

## Batch 3 and 4: Subagents and the Main Agent

The stub `/tmp/claude-501/stubcap/bin/stub.ts` answers the first main request with one call of `Agent` from a file, and each other request with the text `done`.
A second capture proxy on port `8797` sits in front of it.
So Claude Code starts the subagent, and the subagent request is captured, still with no model call.
The Agent call runs async by default: the tool result is `Async agent launched successfully`.

| Probe | Request | Model | Effort | Tools (count/characters) | `system[2]` | Total |
| --- | --- | --- | --- | --- | --- | --- |
| `sub` | custom `tiny` (`model: haiku`, `effort: low`, `tools: Read`, `maxTurns: 2`) | `claude-haiku-5-5` | `low` | 1 | 1,266 | 5,788 |
| `explore` | built-in `Explore` | `claude-opus-5-5` | `medium` | 5/8,881 | 3,212 | 21,144 |
| `gp` | built-in `general-purpose` | `claude-opus-5-5` | `medium` | 8/14,676 | 2,669 | 27,028 |
| `leanmain` | main, `agent: lean` with 7 tools and a 65-character body, plus the `combo` settings | `claude-opus-5-5` | `medium` | 6/12,526 | 65 | 22,030 |
| `v020` | main, `--plugin-dir plugins/claudetto` of `v0.2.0`, no other settings | `claude-opus-5-5` | `medium` | 12/27,171 | 10,465 | 49,666 |

Facts from these rows:

- The frontmatter `model`, `effort`, and `tools` of a custom agent reach its request.
- The built-in `Explore` inherits Opus and the main effort. So a claudetto search agent on Haiku with `effort: low` replaces it, and `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` hides the built-in one.
- Claude Code appends a fixed text of about 1,200 characters to each subagent body (the "Messages from the agent that launched you" and "Notes" parts in `tiny`). A plugin cannot change it.
- With `agent` set, `system[2]` is only the agent body, so the default system prompt of 6,138 characters is gone. The `agent` route must carry each rule of the default prompt that claudetto keeps.
- `leanmain` lists 7 tools, and 6 reach the request: `Agent`, `Bash`, `Edit`, `Read`, `Skill`, `Write`.
  `ToolSearch` and `DeferredToolPlaceholder` are absent.
  The probe `leandef` adds the deferred tool `WebFetch` to the same list: then `ToolSearch` and `DeferredToolPlaceholder` come back, and `WebFetch` is in the deferred list of the messages.
  So a `tools` list keeps `ToolSearch` only when it names a deferred tool, and each deferred tool that the agent needs, such as an MCP tool, must be in the list by name.
- `v020` is 3,458 characters more than `base`. The dummy key gets no server flags, so the mods of 0.2.0 may not run here, and the number is for the plugin with no mods.

## Batch 5: Subagent `CLAUDE.md` and Skills

Project `proj-md` has a `CLAUDE.md` of about 2,000 characters with a marker.
The subagent is `tiny` (`model: haiku`, `effort: low`, `tools: Read`).

| Probe | Subagent change | Subagent request | Marker of `CLAUDE.md` | Marker of the skill body |
| --- | --- | --- | --- | --- |
| `keepmd` | none | 8,101 | 1 | 0 |
| `omit` | `omitClaudeMd: true` | 5,796 | 0 | 0 |
| `skillsub` | `tools: Read, Skill` and `skills: probeskill` | 16,415 | 1 | 1 |

- `omitClaudeMd: true` keeps `CLAUDE.md` out of the subagent, so each claudetto agent that needs no project rules sets it.
- `skills:` puts the whole skill body into the first subagent request, and the `Skill` tool adds its schema.
  So an agent preloads a skill only when each run of that agent uses it.

## Batch 6: Deferral of Any Tool

The probe plugin `/tmp/claude-501/stubcap/pdefer` is a mod: `hooks/hooks.json` holds `{"modules":["./register.ts"]}`, and `register.ts` has two `tool.describe` hooks.
One returns `isDeferred: true` for `Edit`, `Write`, and `Skill`, and one returns `isDeferred: false` for `WebFetch`.
The first probe `defer` had no `hooks/hooks.json`, and the hooks did not load, so a mod needs that file (`extend/mod-api/index.md:53`).
The debug log of `defer2` shows `hooks module pdefer@inline loaded (worker, environment 1, tier user); events: tool.describe`, so mods load with the dummy key and no login.

| Probe | Result |
| --- | --- |
| `defer2` | `Edit`, `Write`, and `Skill` leave the tool list, and `WebFetch` joins it. The tool list goes from 28,653 to 26,254 characters, and the body goes from 46,208 to 43,811. The first deferred list does not name `Edit`, `Write`, or `Skill`. |
| `tsload` | A stub answers with `ToolSearch` `select:Edit,Write`. The next request has `Edit` and `Write` with `defer_loading: true`, and a new deferred-list message names `Skill`. |

Facts:

- A mod can defer any built-in tool and can bring a deferred built-in tool to the front (`extend/mod-api/types/tool-command-config.md:290`).
  A plugin tool from `$.tool.register` takes `isDeferred` too (`tool-command-config.md:361`), and an MCP tool is deferred unless `alwaysLoad` is set (`reference/tools/index.md:79`).
- A mod-deferred built-in tool is missing from the first deferred list, and it shows up in a later one.
  So in the first turn the model can load it only by an exact name, such as from the agent body.
- The floor, from the probe `floor`: a hook that returns `isDeferred: true` for `ToolSearch`, `Agent`, `Bash`, and `Read` defers `Agent`, `Bash`, and `Read`, and `ToolSearch` stays in front (9 tools of 19,230 characters).
  So the never-defer set wins over the hook for `ToolSearch`, and no documented surface moves it.
  A lower floor needs a patch of Claude Code, which the terms forbid (`CLAUDE.md`, "Never patch").
- The cache effect of a tool that `ToolSearch` loads is not measured here, because the stub has no cache.

## Batch 7: The Floor of the Main Request

`mainfloor` stacks each lever that needs no mod:
the `combo` settings, `agent: lean` with `tools: Agent(tiny), Bash, Edit, Read, Write`, `skillOverrides` with `"off"` for the 12 bundled skills of the listing (`dataviz`, `update-config`, `keybindings-help`, `code-review`, `simplify`, `fewer-permission-prompts`, `loop`, `claude-api`, `run`, `plugin-authoring`, `init`, `security-review`), the env vars `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1`, `CLAUDE_CODE_ATTRIBUTION_HEADER=0`, and `CLAUDE_CODE_TOTAL_TOKENS_REMINDER=off`, and the flag `--exclude-dynamic-system-prompt-sections`.
`descfloor` adds the mod `pdesc`, with a `tool.describe` hook that returns the description `X.` for `Agent`, `Bash`, `Edit`, `Read`, and `Write`.

| Probe | `system` | Tools (count/characters) | Messages | Total | Against `base` (46,208) |
| --- | --- | --- | --- | --- | --- |
| `leanmain` (batch 4) | 74, 62, 65 | 6/12,526 | 8,657 | 22,030 | 48% |
| `mainfloor` | 62, 65 | 6/10,628 | 1,269 | 12,640 | 27% |
| `descfloor` | 62, 65 | 6/6,359 | 1,269 | 8,371 | 18% |

Facts:

- `skillOverrides` `"off"` takes the bundled skills out of the listing, which was 5,745 characters in `leanmain`.
  With no skill left, the `Skill` tool is gone too.
- `Agent(tiny)` in the `tools` list cuts the agent list to the named agents (239 characters) and the `Agent` text from 4,070 to 3,804 characters.
- `tool.describe` replaces the text of a built-in tool, so the "No override" line of `docs/prompts/override.md:125` does not hold for the description on 2.1.306.
- The floor that no documented surface goes under:
  - the input schemas of the kept tools (5,856 characters for the 5 tools in `descfloor`), because `tool.describe` returns only `description` and `isDeferred`,
  - `system[1]`, the fixed 62 characters `You are a Claude agent, built on Anthropic's Claude Agent SDK.`,
  - the environment block of 832 characters, which batch 8 shows a mod can rewrite or drop, so it is not a floor,
  - `DeferredToolPlaceholder` (214 characters).
- `X.` is not a usable text, so the real target is between `descfloor` and `mainfloor`: an ASD-STE100 rewrite of each tool text that keeps each rule that the model needs.

## Batch 8: Prompt Mods

| Probe | Mod | Setup | Result |
| --- | --- | --- | --- |
| `compvan` | `prompt.compose`, each section text replaced by `[id/scope/length]` | vanilla | `system[2]` shows the sections in order: `lean_body` (shared, 2,025), `communication` (94), `pronouns` (357), `action_caution` (520), `session_guidance` (163), `memory` (2,109), `env_info_simple` (579), and `context_management` (280), each `session`. So a mod reaches each section, `lean_body` too. |
| `comp` | the same | `mainfloor` | No change against `mainfloor` (12,640). With `agent` set, the agent body is the whole `system[2]`, and the sections do not render. |
| `att` | `prompt.attachment` returns `[ATT <type>]`, and `prompt.context` labels its blocks | `mainfloor` | 11,748 characters. The attachments are `context_sections`, `environment`, `model`, `agent_listing_delta`, and `date`. So each part of the messages except the prompt of the user is an attachment that a mod can rewrite or drop. |

So the floor of the main request is:

- `system[1]`, the 62 fixed characters,
- the body of the main agent, which claudetto writes,
- the input schemas of the kept tools, and `DeferredToolPlaceholder`,
- the prompt of the user.
Each other part has a documented surface that removes or rewrites it.
A part that the model needs, such as the working directory of `environment`, gets a short rewrite and not a drop.

## Batch 9: An Installed Mod

`claude plugin marketplace add` of a local marketplace and `claude plugin install pdefer@stubmkt` in a new config, with the dummy key, then one stub run.
The debug log shows `hooks module pdefer@stubmkt tool.describe settled in 2.6ms`, and the request is the same as `defer2`: 10 tools of 26,254 characters.
So on this machine an installed mod runs with no login, and the server flag `tengu_plugin_hooks_modules` does not block it.
The flag is a remote switch (`extend/mod-api/index.md:136`), so it can still be off for another account.
claudetto keeps each cut that needs no mod in the settings snippet and the agent files, and uses a mod only for a cut that no other surface makes, so a session with the flag off loses only those cuts.

## Batch 10: Bundled Skills and Effort

| Probe | Change | Result |
| --- | --- | --- |
| `nobundled` | `disableBundledSkills: true` | 57,816 characters, 11,608 more than `base`. The skill listing gets shorter, but the `Workflow` text goes from 5,473 to 22,863 characters, because it inlines its full guide when the bundled skills are off. |
| `combonb` | `combo` with `disableBundledSkills: true` | 22,624 characters, 4,618 fewer than `combo` (27,242). With `Workflow` denied, the switch only saves. |
| `maineff` | `agent: lean` with `effort: low` and `disallowedTools: Workflow, ScheduleWakeup, ReportFindings, ListAgents` | `effort` stays `medium`, so the `effort` key of the main agent does not apply. The 4 denied tools are gone, so `disallowedTools` works on the main agent. |
| `effset` | `maineff` with `effortLevel: "low"` in settings | `effort` stays `medium`. |
| `efflevel` | `effortLevel: "low"` with no agent | `effort` stays `medium`. |
| `effenv` | `CLAUDE_CODE_EFFORT_LEVEL=low` | `effort` is `low`. The `Agent` text goes from 4,120 to 3,677 characters. |

Facts:

- `disableBundledSkills: true` (or `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS`) goes into the snippet only with the deny of `Workflow` or `enableWorkflows: false`, and a pin test checks the pair.
  The p4 row "`disableBundledSkills`: 2,210 tokens per session" holds only with that pair.
- The subagent `effort` key applies (batch 3), and the main agent `effort` key does not.
- In this print-mode run with an API key, `effortLevel` does not apply, against `configure/settings/*.md:25`.
  The docs say that it applies to "models without a saved level of their own", so an interactive session or a login can differ (proposed: one stub run in interactive mode checks it).
- `CLAUDE_CODE_EFFORT_LEVEL` sets the effort, and it wins over `/effort` (`configure/env-vars/*.md:82`), so it takes the control from the user.

## Batch 11: Background Tasks, Cache TTL, Effort Cap, and Styles

| Probe | Change | Result |
| --- | --- | --- |
| `bgoff` | `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` | 44,833 characters, 1,375 fewer than `base`: the tools go from 28,653 to 27,276 characters. |
| `ttl1h` | `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` | The 3 cache markers of the main request become `{"type":"ephemeral","ttl":"1h"}`. The base markers have no `ttl`, which is 5 minutes. |
| `subttl` | `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL=1h` with the `tiny` subagent | Only the subagent request gets `"ttl":"1h"`. The main requests keep the default. |
| `maxeff` | `maxEffortLevel: "low"` | `effort` is `low`. So the cap works where `effortLevel` did not (batch 10), and it is a settings route to the effort that leaves `/effort` to the user below the cap. |
| `concb` | `outputStyle: "Concise"` | A built-in `Concise` style exists on 2.1.306: 47,807 characters, 1,599 more than `base`. |
| `ctto` | `outputStyle: "claudetto:Concise"` with `--plugin-dir plugins/claudetto` of `v0.2.0` | 51,130 characters, 1,464 more than `v020`. |

## Batch 12: Auto Mode

A third stub answers with one `Bash` call (`ls /tmp`), behind a proxy on port `8793`.
Each run uses `--max-turns 2` or `1`, because the stub calls `Bash` again on each request.

| Probe | Change | Result |
| --- | --- | --- |
| `dflt` | none | Main requests of 46,209 and 46,663 characters, no `safeguards` field. |
| `auto` | `--permission-mode auto` | The first main request is 48,149 characters: a `safeguards` field of 1,750 characters and a reminder of 485 characters. The `Bash` call makes classifier requests with `system[1]` of 138,256 characters (142,739 in all), the first on `claude-sonnet-5` and the next on `claude-opus-5-5`. |
| `autoreal` | `auto` with the 236 `allow`, `ask`, and `deny` rules of `~/.claude/settings.json` | `safeguards` is 16,286 characters, and its `rules` part is 14,568 of them. |

The program printed, in the `auto` run: "We're changing auto mode to no longer charge for classifier requests in Claude Code. However, this session isn't eligible because your requests go through 127.0.0.1:8793".
The official page `https://code.claude.com/docs/en/auto-mode-classifier-billing` (fetched 2026-10-21) says:

- Where the server-side checks are on, "the server performs those checks as part of the session's own model requests, at no charge".
- "Pro, Max, and Team plans never show the notice", so on a direct connection with those plans the client classifier requests do not run.
- A gateway or proxy that drops the `safeguards` field makes Claude Code fall back to its own classifier requests, billed as before.
  `CLAUDE_CODE_AUTO_MODE_SERVER=0` forces that fallback.

Facts:

- On a direct Pro, Max, or Team connection, the 140,000-character classifier requests are not a cost.
  They are a cost behind a proxy, such as `just capture`, or with `CLAUDE_CODE_AUTO_MODE_SERVER=0`.
- The costs that stay in the session are the reminder (485 characters, an attachment) and the `safeguards` field.
  The field holds each permission rule, so each rule of the user adds to it.
  Whether the API counts the field as input tokens is not documented (proposed: one paid request with and without auto mode, compared by `usage.input_tokens`, decides it).
- The reminder tells the model to read and edit through `Bash` with `cat` and `sed`.
  That goes around the `Read` and `Edit` hooks, and in 0.2.0 it runs into the guard that denies a `Bash` command that only prints a file, which costs a denied call each time (two in the session of 2026-10-21).
  The reminder is a `prompt.attachment` of type `auto_mode` (`reference/transcript-format.md:221`), so a mod can rewrite it.
- The second main request of `auto` had no `safeguards`, after the stub broke the server check, so the probe does not show whether a working session sends the field on each request.

## Batch 13: Models, Modes, Plugins, the Interactive Session, and the Nag

The print-mode probes use the stub of port `8799`, as in batch 11.
The interactive probes use `bin/tui.py`, which runs `claude` in a pty against a stub, types the given keys, and saves the screen text.
Each size is in characters of the first main request.

| Probe | Change | Result |
| --- | --- | --- |
| `base` | none | 46,209 in all. `system[2]` is 6,139. `Bash` is 3,345. 12 tools. |
| `haiku`, `fable` | `--model` of the family | `system[2]` is 8,932 and 12,212: the model-specific sections. |
| `haikulean`, `fablelean` | the same models, with an agent as the main thread | `system[2]` is 65, 23,287 and 23,282 in all, 6 tools. So the agent route drops the model-specific sections. |
| `dontask` | `--permission-mode dontAsk` | No added text. |
| `bypass` | `--permission-mode bypassPermissions` | The text `While bypass permissions mode is active:` with the `cat` and `sed` advice. `Bash` is 311 shorter. |
| `sandbox` | `sandbox.enabled: true` | 54,938 in all. `Bash` is 854 longer, with the `## Bash command sandbox` text. |
| `plugoff`, `plugon` | the built-in plugins off and on | 45,944 and 46,211. Only the `plugin-authoring` skill line goes. |
| `tuibase2` | an interactive session, no settings | 87,472 in all, 15 tools. Added: `Artifact` (25,693), `SendFeedback` (5,587), `AskUserQuestion` (5,038), the deferred `ArtifactComments`, `ArtifactData`, `EndConversation`, `EnterPlanMode`, `ExitPlanMode`, the skills `artifact-design` and `artifact-diagramming`, the `While auto mode is active:` text, and a `safeguards` field of 2,459 with `permission_mode: "auto"`. The screen shows `auto mode on`. |
| `nagdef` | interactive, `defaultMode: "default"`, a stub `Bash` call `touch /tmp/claude-501/nag/x` | The dialog has the row `3. Yes, and switch to auto mode · auto mode handles these prompts for you`. |
| `nagoff` | `nagdef` with `disableAutoMode: "disable"` | The dialog has 3 rows: `Yes`, `Yes, and always allow access to ...`, `No`. No tip. |
| `nagask` | `nagdef` with the `ask` rule `Bash(touch *)` | The dialog has 2 rows: `Yes`, `No`. No tip. |
| `goalproj` | interactive, a project skill `goal`, then `/goal run tests` | The skill runs: its body goes to the model, and the built-in `/goal` does not. A project skill with `disable-model-invocation: true` adds no description to the request. |
| `goalplug`, `goalplugp` | a plugin skill `goal` with `--plugin-dir` | The skill is `pg:goal` in the listing (print mode). In the interactive run, `/goal run tests` runs the built-in: `Goal set: run tests` and `/goal active`. |

The banner `Auto mode is now Claude Code's default permission mode` shows in each interactive run with no `defaultMode`, and in no run with `defaultMode: "default"`.

Facts:

- An interactive session with no settings starts in auto mode on 2.1.306, so it sends `safeguards` and the auto-mode text with each session.
  The D5 snippet (`defaultMode: "default"`, `disableAutoMode: "disable"`) removes the mode, the banner, and the tip.
- A plugin skill cannot replace a built-in command, because the plugin name is its prefix.
  The documented route is a Mod API `command.run` hook on `goal`, which can "return `{ text }` to answer in its place" (cc-docs `extend/mod-api/tool-command-config`).
  No setting turns off `/goal` (cc-docs `extend/skills-and-commands/slash-commands`).
- `tool.check` gives only a decision: `decision`, `reason`, `rule`, `hook`, `setting`, and `decider` (`plugins/claudetto/.claude-plugin/types/claude-code/index.d.ts:13710`).
  A rewrite of the input goes in `tool.call` ("`tool.call` rewrites a call", `index.d.ts:13651`) or in the `PreToolUse` `updatedInput`, which 2.1.300 and later check like the input of the model (cc-docs `start/what-changed`).
- A hook `ask` with `decider: "person"` can be settled only by the dialog, and it is a deny where nobody can be asked (cc-docs `extend/mod-api/tool-command-config`, new in 2.1.304).
  This is the gate prompt that no mode and no classifier can approve.
- macOS 27.0.1 has `/usr/bin/trash`, which moved a test file out of its folder, so a move to the Trash needs no install.
- The attachment kinds of the session transcripts, with the JSON size of each kind in the transcript (not in the request):
  `attbase` (print mode) has `agent_listing_delta` 1,795, `context_sections` 83, `date` 38, `deferred_tools_delta` 575, `environment` 245, `model` 258, `prompt_snapshot` 6,381, `remote_session_change` 269, `session_context` 347, and `skill_listing` 6,616.
  `tuibase2` (interactive) has no `context_sections`, a larger `agent_listing_delta` (2,913), `deferred_tools_delta` (724), and `skill_listing` (7,105), and adds `auto_mode` (135).
  `nagdef` has no `auto_mode`, so `defaultMode: "default"` removes the reminder.
  `goalproj` adds `command_permissions` (51) after a typed command.
- Not probed in this batch: `nested_memory`, `edited_text_file`, `queued_command`, the title and naming requests, and the `WebFetch` summary.
  Each needs a model that answers, so the alpha test measures them with `just capture`.

## Batch 14: Whether `safeguards` Counts (Task 10.3)

The user approved this paid run on 2026-10-22, with the other paid runs of the apply session.

Method: two headless sessions on Claude Code `2.1.308` with the login of the host, through `just capture --port 8799`, with `ANTHROPIC_BASE_URL` set to the proxy.
Each session ran `just sandbox --dir <fresh root> --model claude-sonnet-5-5 --output-format stream-json --verbose -p "Reply with OK."`, with `--permission-mode default` in one and `--permission-mode auto` in the other.
The billed size is `input_tokens` plus `cache_creation_input_tokens` plus `cache_read_input_tokens` of the one `assistant` message.

| Session | Body keys | `safeguards` | `system`, `messages`, `tools` (characters) | Billed input tokens |
| --- | --- | --- | --- | --- |
| `default` | 10 | none | 9,485, 10,977, 18,879 | 2 + 6,757 + 6,973 = 13,732 |
| `auto` | 11 | 1,708 characters | 9,485, 10,977, 18,879 | 2 + 3,346 + 10,383 = 13,731 |

- The two bodies differ only in the `safeguards` key.
  The `messages` of the `auto` session had no `auto_mode` reminder, with the claudetto plugins of the checkout loaded.
- The billed input differs by 1 token, so the `safeguards` field does not count in `usage.input_tokens`, and it takes no room in the context window.
- The two sessions cost $0.0423 in all, from their `total_cost_usd`.
- Limit: one session in each mode, and one prompt with no tool call.
  A token count of the same body does not change between runs, so one session in each mode is enough for this question.
