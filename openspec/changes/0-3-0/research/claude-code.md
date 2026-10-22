# Claude Code 2.1.306 Levers for claudetto 0.3.0

Scope: extension points and settings that cut cost or friction.
Sources: the `claude-code-docs` repo (`docs/`, `captures/2.1.306/strings.txt`), cited as `path:line` or `path`.
A claim with no citation is marked "proposed".
Doc root: `/Users/krystian/Downloads/CodeProjects/xsyetopz/claude-code-docs/`.
Token figures are from `docs/how-it-works/context-budget.md` (2.1.305, Opus 5.5).
No paid run was made for this report.

## 1. Agents

### Frontmatter keys (`docs/extend/subagents/frontmatter.md`)

- `name`, `description`, `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `autoCompactWindow`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `omitClaudeMd`, `effort`, `isolation`, `color`, `initialPrompt`, `experimental.cacheTtl`.
- Gated and undocumented: `observer`, `observerMessage`, `observeSubagents` (need `CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS`).
- Keys are camelCase and case-sensitive.
- A plugin agent ignores `permissionMode`, `hooks`, and `mcpServers`.
- A plugin agent type is `plugin:folder:file`.
- A file with no `name` is skipped, except a plugin agent, which loads under its file name.
- `--agents` JSON takes the same fields, and `prompt` is required.

### Model and effort order

- Per-call `model`, then the agent `model`, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the main model (`docs/extend/subagents/frontmatter.md`).
- `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` forces one model for all.
- `CLAUDE_CODE_EFFORT_LEVEL` wins over every other effort source (`docs/configure/env-vars/`).
  So claudetto must not set it if agents carry their own `effort`.

### Can a plugin replace or disable built-ins?

- Priority: managed, `--agents`, `.claude/agents/`, `~/.claude/agents/`, then plugin agents (lowest) (`docs/extend/subagents/index.md`).
  A plugin agent therefore cannot shadow a built-in name.
  A user-level file named `Explore` does override the built-in.
- Ways to turn built-ins off:
  - `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` removes `Explore` and `Plan`. Saves 324 tokens.
  - `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` works in `-p` only.
  - `permissions.deny` with `Agent(<name>)` disables one type. `Agent(fork)` blocks forks.
  - The mod hook `agent.offer` returning `{isOffered:false}` hides a type and refuses its dispatch (`docs/extend/mod-api/agent.md`).
    Built-ins have provider `{plugin:"engine",tier:"core"}`.
  - `CLAUDE_CODE_FORK_SUBAGENT=0` turns off fork subagents (on by default since 2.1.302).
- A plugin cannot ship `permissions` or `env` in its `settings.json`.
  Only `agent` and `subagentStatusLine` take effect (`docs/extend/plugins/manifest.md:39`).
  So the denies and env vars must go through the user's settings, `/claudetto:setup`, or a mod hook (proposed).

### `subagent_type` resolution

- If omitted, the type is `general-purpose`.
- An unknown type returns `Agent type '<x>' not found. Available agents: ...` (`docs/reference/probes.md:227`).
- Proposed: a `agent.spawn` hook can rewrite `subagent_type` or `model` before dispatch.
  The docs example sets `model` when it is missing (`docs/extend/mod-api/agent.md`).
  A throwing guard lets the subagent start, so add `.catch`.

### Mod route for agents (`docs/extend/mod-api/agent.md`)

- `$.agent.register(spec)` defines `<plugin>:<name>` after `session.start`.
  `AgentSpec` lists `permissionMode`, `mcpServers`, and `hooks`.
  Whether the plugin-file ignore rule applies to registered specs is unverified (proposed: test with `claude plugin test`).

### What a subagent loads (`docs/extend/subagents/runtime.md`)

- Loads: the agent prompt, the task message, `CLAUDE.md` unless `omitClaudeMd`, git status (not for `Explore` or `Plan`), preloaded `skills` (at most 32, full text), and a roster of sibling agents.
- Does not load: the output style and auto memory.
- Tools removed from subagents: `AskUserQuestion`, `EnterPlanMode`, `ExitPlanMode`, `ScheduleWakeup`, `Workflow`, and `Agent` at the depth limit.

### Token cost

- `Agent` in the tool list costs 1,320 tokens. Removing it from sessions that never delegate saves that.
- One custom agent description costs about 29 tokens in the roster. A warning shows over 15,000 tokens.
- A 60-line `CLAUDE.md` costs 1,450 tokens per subagent unless `omitClaudeMd: true`.
- Built-in set of `Explore` and `Plan` costs 324 tokens in the main prompt.
- Subagent cache: `subagentPromptCacheTtl` or `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` (default 5m).
- Limits: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` (3), `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` (20).

### Proposal for 0.3.0

- Ship `scout` (read-only search), `planner`, and `worker` as plugin agents.
  Set `model`, `effort`, `omitClaudeMd: true`, a small `tools` list, and a low `maxTurns`.
- Hide `Explore`, `Plan`, `general-purpose`, and `claude` with an `agent.offer` hook, or deny them with `Agent(<name>)` in user settings.
- Proposed: the hook is the only route that works from inside the plugin.

## 2. Permissions

### Order of checks (`docs/how-it-works/permission-flow.md`, `docs/configure/permissions/rules.md`)

1. Explicit `deny` and `ask` rules.
2. `PreToolUse` hooks.
3. `tool.check` mod hooks (after `PreToolUse`, before the mode settles an ask).
4. Allow sources.
5. The mode.

- A hook `allow` never overrides a `deny` or `ask` rule.
- An `allow` in local settings does not outrank an `ask` from project or managed settings.
- `ask` and `deny` apply before trust. A project `allow` waits for trust.
- A bare tool name in `deny` hides the tool from the model.

### Rule syntax

- `Bash(git push *)` is preferred. `Bash(git push:*)` is the legacy prefix form.
- A pattern that ends in a space plus `*` also matches the bare command.
- `*` is a wildcard anywhere in the pattern.

### Why `Bash(rm -r*)` keeps prompting

- It is an `ask` rule from claudetto's own settings snippet (`src/plugins/claudetto/slices/prompt/slice.ts`, `tests/claudetto/settings-pin.test.ts:84`, `tests/claudetto/prompt/rm-rules.test.ts`).
  It sits in `~/.claude/settings.json` line 149 with variants such as `rm -R*`, `rm -fr*`, `rm * -r*`, and `rm --recursive*`.
- `ask` applies before any `allow`, so no later "always allow" can clear it.
  Each recursive `rm` of a temp or build folder prompts again.
- The Bash dialog row "don't ask again" writes a `Bash(<prefix>:*)` rule to local settings (`captures/2.1.306/strings.txt:696463`, proposed reading).
  That rule loses to the `ask`.
- Also built in: 2.1.304 added a mounted-drive `rm -r` prompt that rules cannot auto-allow.
  `CLAUDE_CODE_DISABLE_MOUNTED_DRIVE_RM_PROMPT` skips it.
  The `dangerousRemoval` safety check (critical paths) is bypass-immune (`docs/configure/permissions/modes.md`).
- Fix (proposed): delete the `rm` ask globs and keep the `rm -rf` denies for `/`, `~`, and `$HOME`.
  Add a `tool.check` hook on `Bash` that parses the target paths.
  Return `allow` for paths inside the project, `/tmp`, and build folders.
  Return `ask` with `decider:"person"` for other targets.

### `tool.check` and `decider:"person"` (`docs/extend/mod-api/tool-command-config.md`, `types/tool-command-config.md:250-275`)

- Result: `{decision: allow|ask|deny, reason, rule, hook, setting, decider, ceiling}`.
- Input has `isReadOnly` (new in 2.1.304).
- `decider:"person"`: only the dialog or a host callback may approve.
  In `dontAsk`, avoid-prompts, or headless runs it is refused with the mod's reason, and the "always allow" row is not shown.
  Bundle: `strings.txt:675488` (functions `xJn`, `MJn`) and `:577641` (`suppressAlwaysAllowRule`, `defaultToNo`).
- A hook can only tighten: its `allow` does not dismiss a dialog that needs a person.
- A failing `tool.check` hook leaves the verdict beneath it, so add `.catch` that returns a refusal.
- Observed in `-p`: `Permission to use Bash denied by plugin <name>: <reason>` (`docs/start/what-changed.md`).

### `PermissionRequest` hook (`docs/extend/hooks/`)

- Fires before the dialog. Output: `decision.behavior` allow or deny, `updatedInput`, `updatedPermissions`, `message`, `interrupt`.
- Exit code 2 is not honored there.
- A `PreToolUse` hook may return `permissionDecision` allow, deny, ask, or defer, plus `updatedInput`.

### Gate for `.env` and destructive commands (proposed)

- `deny`: `Read(./.env*)`, `Read(**/.env*)`, `Bash(git reset --hard*)`, `Bash(git clean *)`, `Bash(git push --force*)`, `Bash(git push -f*)`, `Bash(git checkout -- *)`, `Bash(git branch -D*)`, `Bash(mkfs*)`, `Bash(dd *)`, `Bash(chmod -R *)`.
- Bash `deny` globs miss a command inside `cat .env` or `sh -c`, so also add a `tool.check` hook that parses the command (proposed).
- For gates that need a person, use `decider:"person"`.

### Modes and auto mode (`docs/configure/permissions/modes.md`, `auto-mode.md`)

- `permissions.defaultMode` accepts `manual` as an alias of `default`.
  `auto` and `bypassPermissions` do not take effect from project or local settings.
- Keys: `disableAutoMode:"disable"`, `disableBypassPermissionsMode`, `blockReadsOutsideWorkingDirectories`, `additionalDirectories`, `allowManagedPermissionRulesOnly`.
- The classifier is a model call over the transcript, with the rules as the system prompt.
  `system[1]` is 140,015 characters with default rules and 75,325 with custom rules (`docs/prompts/auto-classifier.md`, `auto-classifier-custom.md`).
  About 35k and 19k tokens at 4 characters per token (proposed estimate), cached.
- It runs two stages: stage 1 gives a severity with no tools.
- Model env vars: `CLAUDE_CODE_AUTO_MODE_MODEL` (undocumented, 2.1.302), `CLAUDE_CODE_BG_CLASSIFIER_MODEL`, `CLAUDE_CODE_AUTO_MODE_SERVER=0`.
- Rules (`autoMode.{allow,soft_deny,hard_deny,environment,classifyAllShell}`) are read from user, `--settings`, and managed settings only.
  `hard_deny` is a boundary that user intent does not clear. `soft_deny` can be cleared by intent.
- Turn it off: `permissions.disableAutoMode:"disable"` with `defaultMode:"default"` or `dontAsk`.
  `useAutoModeDuringPlan:false` stops it in plan mode.
- Plugin `settings.json` cannot carry `autoMode` or `permissions`.
- Recommendation (proposed): drop auto mode.
  A static `deny` list plus a `tool.check` hook costs zero model tokens per call.
  The classifier adds a model call to shell calls and its cached prefix costs a cache write.

### Settings safety checks

- `claudeSettingsFile` (writes to settings; only a person answers), `internalHardDeny`, `outsideReadsBlocked`, `dangerousRemoval` (`docs/configure/permissions/modes.md`).

## 3. Sandbox (`docs/configure/permissions/sandbox.md`)

- `sandbox.enabled` is false by default. Leaving it false needs no setting.
- Keys: `failIfUnavailable`, `autoAllowBashIfSandboxed` (default true), `allowUnsandboxedCommands` (default true), `excludedCommands` (a convenience, not a boundary).
- `filesystem.{allowWrite,denyWrite,denyRead,allowRead,allowManagedReadPathsOnly,disabled}`.
- `network.{allowedDomains,deniedDomains,strictAllowlist}` and `credentials.{files,envVars}`.
- New in 2.1.305: `sandbox.allowNestedUserNamespaces`. In 2.1.304, `denyRead` bracket fix on Linux.
- With the sandbox on, `.claude/settings.json`, git hooks, and git config are write-protected.
- With the sandbox off, protection comes from the permission layer: `claudeSettingsFile`, `internalHardDeny`, `deny` rules, `blockReadsOutsideWorkingDirectories`, and hooks.
- Unverified: the docs do not list `.claude/skills` or `.claude/hooks` as protected paths.
  Proposed: claudetto adds `Edit`/`Write` `ask` rules or a `tool.check` gate for them.
- Cost: the sandbox adds no model tokens, but `autoAllowBashIfSandboxed` removes prompts.
  Off by default is consistent with the 0.3.0 goal if the deny list and hooks cover it.

## 4. Mod API and hooks

### Mod setup (`docs/extend/mod-api/index.md`, `hooks.md`)

- `hooks/hooks.json` has `modules` with one path. The module exports `register(on, options)`.
- `on(pattern, [matcher], async ($, e, next) => ...)` and `.catch(handler)`.
- Hooks run in tiers: `prepend`, `user`, `append`, `builtin`, `core`.
  The claudetto "phases" (observe, check, answer, rewrite) are its own concept, not Claude Code's.
- A hook that throws, overruns, or returns a wrong shape is skipped, so a guard fails open unless it has `.catch`.
- Budgets: 10 s of the hook's code, 1 s for `.catch`, 5 s linger, 50 ms for `prompt.edit`, shared 1.5 s for `session.end`.
- Mods load only if the server flag `tengu_plugin_hooks_modules` is on. `--safe-mode`, `--bare`, and `disableAllHooks` stop them.

### Events (`docs/extend/mod-api/*`)

- `session.{start,receive,append,send,compact,attach,detach,measure,end}`.
- `prompt.{submit,fill,suggest,edit,change,autocomplete,context,compose,section,attachment,mention}`, `skill.prompt`, `attribution.text`.
- `turn.{start,step,complete}`, `tool.{call,check,describe,list,register}`, `command.*`, `config.*`, `agent.{offer,spawn,list,register}`.
- `model.{complete,classify,fork}`, `mcp.{call,connect}`, `settings.read`, `env.{get,set}`, `process.*`, `http.fetch`, `fs.*`, `store.*`, `state.*`.
- `classic.*` wraps every settings-hook event.

### `tool.call` vs `tool.check`

- `tool.call` sees and edits the call before it runs (input rewrite, deny, answer).
- `tool.check` decides permission after `tool.call` and `PreToolUse`. It returns `allow`, `ask`, or `deny`.
  It is the right place for the `rm` and `.env` gates.

### Cost-relevant events

- `prompt.compose` and `prompt.section` edit system-prompt sections. `prompt.context` edits first-message context blocks.
- `prompt.attachment` returning `{text:null}` drops a reminder.
  Proposed use: drop the `totalTokensReminder` and similar reminders.
- `tool.describe` rewrites a tool description or sets `isDeferred`.
  Proposed use: shorten or defer tools. Note that a changed tool list breaks the cache (`--disallowedTools ListAgents` gave cache read 0, write 15,925).
- `turn.step` with `next({...e, model})` sends a step to another model.
- `session.compact` rewrites the messages that compaction sees.
- `skill.prompt` and `attribution.text` rewrite their text.
- `settings.read` gets `layers` (`[{source:"user",settings:{...}}]`).

### Settings hooks (`docs/extend/hooks/*`)

- 33 events. Handler types: `command`, `http`, `mcp_tool`, `prompt`, `agent`.
  `prompt` and `agent` call a model, work on 12 events, and default to 30 s and 60 s. At most 12 run per event (2.1.302).
- Default timeouts: 600 s for `command`, `http`, `mcp_tool`. 30 s for `UserPromptSubmit` and model-switch events. 10 s for `MessageDisplay`.
- `async`, `asyncRewake`, `onFailure` (needs 2.1.295), and `if` (a permission rule, tool events only).
- Output cap: 10,000 characters for `additionalContext`, `systemMessage`, `initialUserMessage`, and `stdout`.
  Over the cap the text is saved to a file, and the model gets the path plus the first 2,000 characters.
- Every injected `additionalContext` is paid on each turn it stays in context, so keep it short (proposed).
- `SessionStart` input has `estimated_cache_write_usd`. `PreModelSwitch` and `PostModelSwitch` have `context_tokens`, `prompt_cache_warm`, and `estimated_cache_write_usd`.
- `PostToolUse` has `updatedToolOutput` and `classifierContext`. `SubagentStart` has `additionalContext`.
- `Stop` continuations are capped at 8 (`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`).
- A `script` hook type under `PreToolUse` disables the whole settings file (2.1.305).

### New in 2.1.304 to 2.1.306 (mod)

- `decider:"person"`, `e.isReadOnly`, `layers` on `settings.read`, `prompt.change`, `virtualText`, `$.ui.view({agentId})`, a docked pane limit of 45%, `.catch` runs less often (2.1.301), `$.env.set` result `{}` or `{deny}`.
- The type file is `types-2.1.303.d.ts`. It was not re-checked for 2.1.306.

## 5. Env vars and settings that cut cost

Measured values are from `docs/how-it-works/context-budget.md` (2.1.305, Opus 5.5).
Empty session baseline: 12,524 tokens. After the first turn: 16,277.

| Item | Effect |
| --- | --- |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` or `autoMemoryEnabled:false` | -691 (system prompt 2,407 to 1,706) |
| `includeGitInstructions:false` | -348 |
| `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` | also removes the git status snapshot, and wins over the setting |
| `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` | -324 |
| `deny` `Workflow` and `ScheduleWakeup` | 12,524 to 8,852 (-1,969 and -1,675 each) |
| `deny` `Agent` | -1,320 |
| `deny` `ReportFindings` / `ListAgents` | -807 / -345 |
| `--tools "Read,Edit,Bash"` | 5,358 (-10,919) |
| `--tools ""` | 2,532 |
| `deny` `Skill` | +5,599 (the `workflow-authoring` text moves into `Workflow`), so deny `Skill` and `Workflow` together to save 2,649 |
| `deny` `ToolSearch` | +15,898. `ENABLE_TOOL_SEARCH=false` +15,327. Keep tool search on. |
| `--disable-slash-commands` | about +2,300 (worse) |
| `outputStyle` Explanatory | +337 |
| One MCP server with 14 tools | +190 (schemas of 2,753 deferred) |
| `CLAUDE.md` of 60 lines | +1,450 |
| Sonnet 5.5 / Haiku 5.5 | +402 / +1,182 over Opus 5.5 |

### Background model calls and traffic

- `awaySummaryEnabled:false`, `promptSuggestionEnabled:false` (and `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=0`), `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1` (stops the title request).
- `autoDreamEnabled:false` (undocumented memory consolidation), `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`, `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY=1`.
- `DISABLE_TELEMETRY`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `DISABLE_ERROR_REPORTING`, `DISABLE_AUTOUPDATER`, `DISABLE_COST_WARNINGS`.
- The savings of these are not measured in the docs (proposed: small but non-zero).

### Reminders

- `totalTokensReminder` defaults to `padded-countdown` (`docs/configure/settings/model.md:40`).
  It adds a "tokens left" block to the system prompt and after each tool result, and after each user turn unless `totalTokensReminderAfterUserTurn:false`.
  The captured prompts show `<total_tokens>15000000 tokens left</total_tokens>` twice (`docs/prompts/default-lean.md:98,163`).
- Set `totalTokensReminder:"off"` or `CLAUDE_CODE_TOTAL_TOKENS_REMINDER=off`.
  Saving per tool result is a few tokens each, and is not measured (proposed).
  It changes the tail of messages, so it is cheap for the cache but adds up over long sessions.

### Models, effort, thinking

- `CLAUDE_CODE_SUBAGENT_MODEL`, `_FORCE`, `CLAUDE_CODE_EFFORT_LEVEL`, `effortLevel`, `maxEffortLevel`, `modelSettings`, `fastMode`, `fallbackModel`, `ANTHROPIC_DEFAULT_{HAIKU,SONNET,OPUS}_MODEL`, `CLAUDE_CODE_MAX_OUTPUT_TOKENS`.
- `MAX_THINKING_TOKENS=0` turns thinking off, but not on Opus 5.5, Sonnet 5.5, Haiku 5.5, or Fable.
  `CLAUDE_CODE_DISABLE_THINKING` and `alwaysThinkingEnabled` also exist.
- A model switch is a cache miss, and `PreModelSwitch` shows the estimated cost.

### Compaction and cache

- `autoCompactWindow`, `autoCompactEnabled`, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (accepts `k` and `M` since 2.1.304), `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, `idleCompaction`, `precomputeCompactionEnabled`.
- `promptCacheTtl`, `subagentPromptCacheTtl`, `ENABLE_PROMPT_CACHING_1H`, `FORCE_PROMPT_CACHING_5M`, `DISABLE_PROMPT_CACHING[_OPUS|_SONNET|_HAIKU]`.
- Editing `CLAUDE.md` keeps the cache. Changing tools breaks it. A subscription login writes a 1-hour cache.

### Output caps

- `MAX_MCP_OUTPUT_TOKENS` (default 25000), `BASH_MAX_OUTPUT_LENGTH` and `bashOutputMaxChars` (default 30000).
  Lowering them cuts tool-result tokens (proposed: try 8000 and 12000).
- `fileCheckpointingEnabled:false`, `attribution:false`, `CLAUDE_CODE_DISABLE_1M_CONTEXT`, `CLAUDE_CODE_DISABLE_FAST_MODE`, `CLAUDE_CODE_DISABLE_ATTACHMENTS`, `CLAUDE_CODE_SIMPLE` and `--bare`.

## 6. Skills and output styles

### Skill frontmatter (`docs/extend/skills-and-commands/frontmatter.md`)

- Keys: `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context` (`fork`), `agent`, `background`, `hooks`, `paths`.
- `description` plus `when_to_use` is cut at 1,536 characters in the listing.
- Keys are case exact, and an unknown key is ignored.
- `context: fork` with `agent:` runs a skill in a subagent, and `model` then sets the subagent model.
- `disable-model-invocation: true` hides the skill from the listing but also blocks preload into subagents.
- `skillOverrides` in settings hides or collapses a skill with no edit. `disableSkillShellExecution` stops inline shell.

### Cost

- Only the description is listed. The body loads on use.
- Built-in listing costs: `dataviz` 482, `claude-api` 361, `code-review` 331, `update-config` 236, `schedule` 127, `run` 123, `loop` 115, `plugin-authoring` 89, `workflow-authoring` 84, `keybindings-help` 83, `fewer-permission-prompts` 64, `simplify` 63, `security-review` 30, `init` 22.
  The whole listing is 2,210 tokens in an empty session.
- Proposed: set `skillOverrides` to `"off"` for `dataviz`, `claude-api`, `code-review`, `update-config`, `schedule`, `loop` and the other built-ins that claudetto does not need.
  That is about 1,800 tokens, subject to a check that `skillOverrides` accepts `"off"` for built-ins.
- A claudetto skill costs about its description length.
  Make each description one short line with its trigger, and move detail to the body.
- Preloaded `skills` on an agent load the full text (at most 32), so preload only what the agent needs.

### Output styles

- `outputStyle` Explanatory adds 337 tokens (`context-budget.md`). A subagent does not load the output style.
- Proposed: ship no output style, or one that is shorter than the default style, and use `prompt.section` to trim text instead.
- `docs/configure/output-styles.md` was not read in detail. Treat other style claims as proposed.

## 7. Other changes in 2.1.304 to 2.1.306 (`docs/start/what-changed.md`)

- 2.1.306: two fixes only (`claude -p` in cloud sessions "Not logged in", and "Prompt is too long" with many MCP tools).
  The program shows no change to env vars, flags, commands, settings, hooks, or gates.
- 2.1.305: `sandbox.allowNestedUserNamespaces`, `plugin validate --profile`, a tool-search retry fix, `allowManagedPermissionRulesOnly` no longer keeps `allowed-tools` for Desktop-mounted plugins, `CLAUDE_CODE_RETRY_WATCHDOG_USAGE_LIMIT_RECHECK_MS`, and a `script` hook type rejected.
- 2.1.304: tool search on by default behind a custom `ANTHROPIC_BASE_URL`, `/auto-mode-setup` on third-party providers, the mounted-drive `rm -r` prompt, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` suffixes, plugin MCP switches (`CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS`, `CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES`), `decider:"person"`.
- 2.1.302: `CLAUDE_CODE_AUTO_MODE_MODEL`, fork subagents on by default, the 12 prompt/agent hook limit, and a print-mode default permission of `default` on third-party providers or with telemetry off.
- 2.1.300 and 2.1.301: `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`, `CLAUDE_CODE_GZIP_REQUEST_BODIES=0`, validated `updatedInput`.

## Lever Table

| Lever | What it does | claudetto use | Expected saving | Citation |
| --- | --- | --- | --- | --- |
| `Agent(<builtin>)` deny or `agent.offer` | Hides `Explore`, `Plan`, `general-purpose`, `claude` | add | 324 tokens per session, plus cheaper delegation | `docs/extend/mod-api/agent.md` |
| Plugin agents with `model`, `effort`, `omitClaudeMd`, `tools` | Cheap scoped subagents | add | up to 1,450 tokens per subagent for a 60-line `CLAUDE.md`, plus model price | `docs/extend/subagents/frontmatter.md` |
| `agent.spawn` hook | Default `model` when unset | add | model price difference | `docs/extend/mod-api/agent.md` |
| `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` | Removes two built-ins | add (user env) | 324 tokens | `docs/how-it-works/context-budget.md` |
| `CLAUDE_CODE_FORK_SUBAGENT=0` | Stops forks that copy the context | add | proposed, avoids duplicate context | `docs/start/what-changed.md` |
| `Bash(rm -r*)` ask rules | Prompt on each recursive `rm` | remove | removes the repeat prompts | `src/plugins/claudetto/slices/prompt/slice.ts` |
| `tool.check` with `decider:"person"` | Path-aware gate, no "always allow" row | add | friction only | `docs/extend/mod-api/types/tool-command-config.md` |
| `.catch` on each guard | A throwing guard refuses instead of passing | keep | safety | `docs/extend/mod-api/hooks.md` |
| `deny` for `.env` reads and destructive `git` | Static gate with no model call | add | $0 per call | `docs/configure/permissions/rules.md` |
| Auto mode classifier | Model call per shell call, 19k to 35k token prompt | remove | per call, estimate | `docs/prompts/auto-classifier.md` |
| `permissions.disableAutoMode:"disable"` | Turns auto mode off | add (user settings) | as above | `docs/configure/permissions/auto-mode.md` |
| `sandbox.enabled` false | Default is off | keep | none, no setting | `docs/configure/permissions/sandbox.md` |
| `deny` `Workflow`, `ScheduleWakeup` | Drops two tools | add | 3,644 tokens (12,524 to 8,852) | `docs/how-it-works/context-budget.md` |
| `deny` `ReportFindings`, `ListAgents` | Drops two tools | add | 1,152 tokens | `docs/how-it-works/context-budget.md` |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` | Drops memory prompt | add | 691 tokens | `docs/how-it-works/context-budget.md` |
| `includeGitInstructions:false` | Drops git text | add | 348 tokens | `docs/how-it-works/context-budget.md` |
| `totalTokensReminder:"off"` | Drops "tokens left" blocks | add | a few tokens per tool result, proposed | `docs/configure/settings/model.md:40` |
| `skillOverrides` for built-in skills | Hides unused skills | add | about 1,800 tokens, proposed | `docs/how-it-works/context-budget.md` |
| `prompt.attachment` `{text:null}` | Drops a reminder | add | per reminder, proposed | `docs/extend/mod-api/turn-prompt.md` |
| `awaySummaryEnabled`, `promptSuggestionEnabled`, `autoDreamEnabled` false | Stops background model calls | add | small, not measured | `docs/configure/settings/` |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1` | Stops the title request | add | small, not measured | `docs/configure/env-vars/` |
| `BASH_MAX_OUTPUT_LENGTH`, `MAX_MCP_OUTPUT_TOKENS` lower | Smaller tool results | add | proposed | `docs/configure/env-vars/` |
| `ENABLE_TOOL_SEARCH=false` or deny `ToolSearch` | Loads all tool schemas | do not use | costs +15,327 or +15,898 | `docs/how-it-works/context-budget.md` |
| `--disable-slash-commands` | Hides commands | do not use | costs about +2,300 | `docs/how-it-works/context-budget.md` |
| Plugin `settings.json` | Only `agent` and `subagentStatusLine` apply | keep to those | none | `docs/extend/plugins/manifest.md:39` |
| `CLAUDE_CODE_EFFORT_LEVEL` | Overrides every agent `effort` | do not set | avoids defeating per-agent effort | `docs/configure/env-vars/` |
| Keep tool list stable | Changing tools breaks the cache | keep | avoids a 15,925-token cache write | `docs/how-it-works/context-budget.md` |

## Open Items

- Whether `$.agent.register` specs honor `permissionMode`, `hooks`, and `mcpServers` is unverified.
- The prefix algorithm of the Bash "don't ask again" row is unverified.
- Protection of `.claude/skills` and `.claude/hooks` with the sandbox off is unverified.
- The saving of the `totalTokensReminder` and background-call switches is not measured.
- `docs/configure/output-styles.md`, `status-line.md`, `memory-and-rules.md`, and `system-prompt.md` were not read in full.
