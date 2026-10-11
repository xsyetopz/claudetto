# Design

## Context

See `proposal.md` for the motivation.
The facts come from Claude Code 2.1.293, its public docs, and its bundle (read with `strings`, never changed).
The target version is 2.1.295.
Its release notes change only how Claude Code judges `prompt` and `agent` hooks written as instructions, and task 2.33 checks its bundle for other changes.
Each fact names its research note in `research/`.
A fact marked **unverified** has no run behind it.
In this change, `lib/` means `plugins/dotclaude/lib/` (decision D17).

- Start of session: 19,702 tokens for the first request with the 0.27.0 profile, and 10.7K in `/context`.
  5K to 7K tokens are not explained.
  A 30K or larger start reproduced only when the profile did not apply (`context-breakdown.md`).
- The mod events can drop or rewrite parts: `prompt.section`, `prompt.compose`, `prompt.context`, `prompt.attachment`, `tool.describe`, `agent.offer`, `agent.spawn`, `turn.step` (`mods-api.md`).
  `turn.step` can set `model` and `effort` of each request, and `agent.spawn` can set `model` (`mods-api.md`).
- `cc-plugin-sec-default` sends `classic.*`, `prompt.section`, `prompt.context`, `prompt.compose`, `skill.prompt`, `attribution.text`, and `settings.read` to the append tier.
  A hook that runs before the guard still gets these events (`research/probes.md`, 2.1, and the bundle).
- The guard reads its on or off state and its two options (`allowManagedModsOnly`, `allowModsToOverrideDenyRules`) from managed settings only.
- With no managed settings, and outside a Team or Enterprise organization, the guard is not seated.
  dotclaude then loads at tier `user`, and its `prompt.section` and `prompt.compose` handlers reach the request (`research/probes-2.md`, "No managed settings", and 2.7).
- With managed settings, the guard is seated and skips the `prompt.section` handlers of tier `user`.
  A managed `enabledPlugins` key also locks the plugin name in every config on the machine (2.1).
  These are the reasons for D2.
- A subagent's system prompt does not go through `prompt.compose` or `prompt.section`, and `prompt.context` reaches it (2.7).
- The plugin docs give the layout of a plugin and of a marketplace (D17).
  A mod is a plugin with `hooks/hooks.json` that holds `modules` (one path), and the module exports `register(on, options)`.
  Test files that end in `.test.ts` run with `claude plugin test` (public docs, mods reference).
- The model catalog has `claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5`, and `claude-fable-5-1`, each with effort low to max (`model-routing.md`).
  The default effort is medium, and high for Fable 5.1.
- `maxEffortLevel` accepts `max`, which means no cap (`model-routing.md`, `off-switches.md`).
- The Agent tool takes `model` (alias enum) and `effort` (`model-routing.md`).
  `agent.spawn` has no `effort` key (`mods-api.md`).
- A system-prompt edit in the middle of a session breaks the prompt cache and invalidates later thinking blocks (`prompting-guidance.md`, community and vendor notes).
- Claude Code has no override route for the compact prompt (`external/cc-2.1.293/prompts/INDEX.md`).
  The snippet sets `DISABLE_COMPACT=1`.
- The mods API changes fast (issues #91870 and #96831, `mods-api.md`).
- `cleanupPeriodDays` defaults to 30, and issue #41458 reports that a large value was not honored.
- The status input, the reset-credit source, the Edit and Write stale-file failure, and the `ctx7` CLI are the same as in the 0.27.0 plan and stay as D6, D8, and D10 state.
- Rule of the user 2026-10-09: dotclaude 0.28+ uses no proprietary schema or format (D35).
  Parts of earlier work that break it are wiped, and the text below says so where it applies.
  In this change, "the profile" means the plain settings snippet of the wiki, plus the plugin `settings.json` for the keys that Claude Code accepts there.
  It is not a file that code reads.

## Goals / Non-Goals

**Goals:**

- Apply the Rule of Least Power to each need.
- Cut start-of-session context and per-task cost without a loss in adherence.
- Measure before each cut, and keep a cut only when the eval suite shows no loss.
- Do the risky unknowns first, because the later work depends on them.
- Use only what vanilla Claude Code provides, and wipe each proprietary format of earlier work (D35).

**Non-Goals:**

- No wrapper that starts `claude` with `--system-prompt-file`, because it does not apply to the desktop app or the IDE.
- No call to a private Anthropic endpoint and no read of the user token by the plugin.
- No patch of the Claude Code binary or its npm package.

## Decisions

### D1 Rule of Least Power

Each requirement first looks for no key, then a settings key or env var in the generated schema, then a part to turn off, then a mod handler, and a script only when nothing above works.
D35 sits above this order: no step may add a format that Claude Code does not own.
The wiki lists each settings key and each `env` entry with its reason and the Claude Code default.
A test validates the plugin `settings.json` and the wiki snippet against the generated schema.

### D2 No guard route: dotclaude runs at tier `user` from `settings.json`

Decision of the user: dotclaude does not use managed settings.
dotclaude writes no `managed-settings.json`, no `managed-settings.d/` drop-in, and runs no `sudo`.
dotclaude runs at tier `user`, and gets `prompt.section`, `prompt.compose`, and `prompt.context`, because the guard is not seated on a machine that has no managed settings and is not in a Team or Enterprise organization.
Trade-off, accepted by the user: with no guard, any installed mod that has a `tool.check` hook can turn a deny rule into an allow (probe log: `deny -> allow by plugins dotclaude, probe23`).
The guard of dotclaude never weakens a deny.
The wiki states the trade-off (task 6.10).
On a machine that has managed settings anyway, such as an organization, the guard is seated.
The `SessionStart` drift check then reports that the guard is seated and which dotclaude parts it skips, and does nothing else.
`maxEffortLevel` and `availableModels` work from user settings (task 1.2), so the settings snippet holds them.
This replaces the prepend route of the first plan.
The probe evidence is in `design-parts.md` (D2 detail) and `research/probes-2.md`.

### D3 Attachment and tool-description cuts by id

The mod rewrites by exact id, with a lab test for each handler, and an unknown id passes on unchanged.
`prompt.attachment` cuts: `sandbox_instructions`, `auto_mode`, `skill_listing`, `agent_listing_delta`, `environment`, `model`, `session_context` where the shorter text keeps the behavior (`context-breakdown.md`, `INDEX.md` sizes are upper bounds).
`tool.describe` rewrites the large loaded tools: Agent, Bash, AskUserQuestion, Read, Grep (`INDEX.md`).
`agent.offer` drops built-in agent lines that the snippet does not need.
Deferred tools stay on.
`tool.describe` sets `isDeferred: true` only for the tools that task 2.19 shows the engine defers with a saving (task 9.4), and never sets it to `false`.
The drift check reports a Claude Code version other than the tested version, 2.1.295.
`session_context` and `prompt.context` cuts are eval-gated.

### D4 Measured budget

`tools/measure.mjs` (`just measure`) runs one headless turn or reads a transcript, and prints the usage of the first request.
`START_TOKENS` in `tools/limits.mjs` is the measure after the cuts plus 5% headroom.
`just measure` compares its number with `START_TOKENS`, fails above it, and writes no file (D35).
A hand edit of `START_TOKENS` records a new baseline, and the diff shows it.
D16 closes the 5K to 7K gap with a request capture, so the bound counts what the API bills.

### D5 Who invokes what

`setup` is a skill with `disable-model-invocation: true`, which keeps it out of the listing.
It only runs the OpenSpec CLI configuration (D11) after the user confirms, and writes no Claude Code setting (D35).
The `docs` skill (Context7) is a model-invocable plugin skill with a short description in the add-on `dotclaude-docs` (D24).
The `handoff` skill is removed (D35), because the checkboxes of `tasks.md` and the commits hold the state.
`skillOverrides` does not apply to a plugin skill on 2.1.293 (task 2.12: the engine returns `on` for a skill whose source is `plugin`).
So a model-invocable plugin skill has its full listing line, and its cost is the length of its description (about 60 tokens for 190 characters).
The OpenSpec skills are project skills, so the settings snippet sets them `name-only` in `skillOverrides` (17 tokens each against 61).
The doctor becomes a `SessionStart` drift check.

### D6 to D30 Decisions in the parts files

`design-parts.md` holds D6 (status line), D8 (Context7 skill), D9 (evals through `claude plugin eval`), D10 (schema extraction), D11 (OpenSpec), the D2 detail, and D22 to D28.
D7 (auto-fix hook) is removed by D35, and its entry says so.
D22 (context bound), D23 (development frictions), D24 (add-on plugins), D25 (agent roster), D26 (code graph), D27 (measured facts), and D28 (compliance by checks) are new in 0.28.0.
D29 (semantic line breaks), D30 (hold correct work under an unsupported claim), D32 (usage awareness, now removed), and D33 (three-column status line) are in `design-parts-2.md`.
D34 (adherence by checks in code) is in `design-parts-3.md`.
D35 (no proprietary formats) is in `design-parts-3.md`.
The text of D6 to D11 is from the 0.27.0 plan, with the changes noted there.

### D12 Agent frontmatter search (replaces the router table)

D35 removes the router table: no data file maps a task class to a model and effort pair, and no `MAIN_EFFORT` or table of allowed efforts exists.
The frontmatter of `agents/*.md` (`model`, `effort`, `maxTurns`) is documented by Claude Code, and it is the one place that holds the choice (D25).
The evals may still decide the frontmatter of each agent.
They run the cases of one agent role, try pairs from the cheapest, and stop at the first pair with no loss in resolve rate, over-claim rate, and policy-violation rate.
The result goes into the agent file by hand.
No search output, table, or report file keeps it, and the wiki records the figures as prose.
Haiku 5.5 may skip checks at low and medium effort (`prompting-guidance.md`), so the over-claim rate is a pass condition.
Haiku 5.5 costs 5x for each request above 100K prompt tokens, for each rate (the 2.1.294 price table at offset 13120762, `model-routing.md` section 1.1).
No rule moves a long task to Sonnet 5.5.
D22 bounds the subagent (`HAIKU_CONTEXT_MAX`), and the delegation text sends large reads to one subagent.
The coordinator may pass `model` and `effort` in an `Agent` call, which the tool documents.
`claude-haiku-4-5` leaves the roster.
The wiki snippet carries `availableModels` and `enforceAvailableModels` without it.
The research gives no 5.5 effort cost index (`model-routing.md` section 1.3), so only the evals set the final values.
The values of D25 are the ones that the user set on 2026-10-09 from the eval report `evals/results/2026-10-09T12-16-54-262Z` and the Anthropic effort guide.
The report files go with the harness (D9), and `wiki/evals/Evals-History.md` keeps the figures.
The rows above a measured pair are inferred, not measured.

### D13 No router: the main loop keeps the session choice

D35 removes the deterministic router: the `prompt.submit` and `agent.spawn` classifiers, the `turn.step` applier, the `PreToolUse` fallback on `Agent`, and the cap.
They all need the table of D12.
A hook that rewrites `model` or `effort` at each step also adds a rule that only a probe could prove.

- The main loop keeps the model and the effort that the user set (`/model`, `/effort`, `effortLevel`).
  dotclaude does not rewrite `model` or `effort` in `turn.step`, `agent.spawn`, or a classic hook.
- An effort switch keeps the prompt cache (task 2.16: 19,453 against 19,454 tokens read).
  A model switch rebuilds the full prefix once (task 2.16: 22,070 tokens written and 0 read at the switch).
  Anthropic says "Tuning effort is often a better lever than switching models" (choosing-a-model page).
  These facts go to the wiki as evidence for the user.
- The snippet never sets `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, because each defeats the frontmatter.
  In the 2.1.294 bundle, `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` removes `model` from the `Agent` tool schema (offset 28702018) and drops the model of the agent file (offset 28585659).
- The agent files use the full id `claude-haiku-5-5`.
  The `haiku` alias resolves to Haiku 5.5 only on the Anthropic API, and to Haiku 4.5 on Bedrock, Vertex, and Foundry ([model-config docs](https://code.claude.com/docs/en/model-config)).
- A hook-set `max` arrives as `xhigh` on Haiku 5.5, Sonnet 5.5, and Opus 5.5 with `maxEffortLevel: "max"` (task 2.10).
  The agent files use `xhigh` at most.
- Open item, recorded: the source of the `xhigh` cap (probably an account limit for each model, **unverified**).

### D14 Off switches

`research/off-switches.md` is the source.
Three lists go in the wiki and in tests.

- Forced off, no quality cost: the built-in plugins except `cc-plugin-plugin-authoring`, `syncClaudeAiSkills`, `syncClaudeAiPlugins`, `disableClaudeAiConnectors`, `spinnerTipsEnabled`, `feedbackSurveyRate`, `feedbackDrafts`, `fastMode`, `disableAgentView`, `disableRemoteControl`, `CLAUDE_CODE_DISABLE_CFC_PROMPT`, `CLAUDE_CODE_DISABLE_CRON`, `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`, `CLAUDE_CODE_DISABLE_TERMINAL_TITLE`, `CLAUDE_CODE_ATTRIBUTION_HEADER=0`, `CLAUDE_CODE_AUTO_CONNECT_IDE=false`, `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL`, `CLAUDE_CODE_TODO_REMINDER_MODE=off`, denies of `Agent(claude-code-guide)` and `Agent(statusline-setup)`.
- Eval-gated: denies of `EnterPlanMode`, `ExitPlanMode`, and the Task tools, `DISABLE_TELEMETRY` (it also stops the GrowthBook fetch, so flags use code defaults), `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, and `includeGitInstructions: false` (D15).
  An item enters the snippet only after an eval run shows no loss.
  An item that failed stays out, and the wiki records its figures.
  No flag turns an item on (D35).
- Never set (a constant in the pin test, not in `lib/`, because `lib/` ships to users): `disableAllHooks`, `allowManagedHooksOnly`, `strictPluginOnlyCustomization`, `disableSideloadFlags`, `CLAUDE_CODE_SIMPLE`, `CLAUDE_CODE_SAFE_MODE`, `CLAUDE_CODE_ENABLE_TASKS=0`, `CLAUDE_CODE_DISABLE_CLAUDE_MDS`, `CLAUDE_CODE_DISABLE_ATTACHMENTS`, `CLAUDE_CODE_EFFORT_LEVEL`, `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, `MAX_THINKING_TOKENS`, `alwaysThinkingEnabled`, `CLAUDE_CODE_REMOVE_PROMPT_STRINGS`, `CLAUDE_CODE_DISABLE_WEB_FETCH`, `CLAUDE_CODE_BASH_EDIT_DIFF=0`, `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS`, `allowAllClaudeAiMcps`, `claudeMd`, `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`, and `DISABLE_INTERLEAVED_THINKING`.

Keys in the global config scope (for example `autoConnectIde`) are not in `settings.json`, so the snippet uses the env vars.
No off switch for the `computer-use` MCP server is known (`off-switches.md`), and task 2.13 looks for one.
The 0.27.0 conflict of `includeGitInstructions: false` with the `attribution` text is solved in D15.

### D15 dotclaude owns the system prompt

The mod replaces the Claude Code sections with the text of one model: Opus 5.5, Sonnet 5.5, Haiku 5.5, or Fable 5.1.
The output style holds only the role, the tone, and the format, because Claude Code sends it as a message and not in the system prompt.
`prompt.compose` returns the shared sections of `features/prompt/shared.mjs` and then the model notes (tasks 28.12 and 29.11), and an unknown section id passes on unchanged and shows in the drift check.
If `prompt.compose` is not honored, the fallback is `prompt.section` for each known id (task 2.7).
Rules from `prompting-guidance.md` section 17:

- XML tags separate instructions from data, and tag names are plain and consistent.
- Plain imperatives, a reason only where it changes behavior, one emphasized word at most, and no stacked CAPS.
- Scope in one line: no unasked features, and extras go to the end of the reply.
- A keep-going sentence, and one confirmation rule for destructive or shared-system actions.
- The verification rule is in the shared sections, and only the subagent block of Sonnet 5.5 and Haiku 5.5 repeats it (cut V2).
  Fable 5.1 follows its own guide (unverified until the variant evals).
- Delegation text: delegate only for large, independent, parallel work.
- No "think harder" rules.
- The attribution line (the snippet sets `includeGitInstructions: false`): the prompt tells Claude to end commit messages and PR text with the attribution that Claude Code gives it in the system reminder.
  A task checks that the trailer still appears, and compares the `attribution.text` event as an alternative.

Each variant has a byte budget in `features/prompt/limits.mjs`, set from the first measured draft.
The main-session variant comes from `prompt.compose` at session start, from the session model.
A subagent's system prompt is its agent body, because `prompt.compose` and `prompt.section` do not run for a subagent (2.7).
At spawn, `agent.spawn` adds the short per-model block of the chosen subagent model to the task `prompt`, once.
No variant changes in a session or agent, because a mid-session edit breaks the cache.
A model switch by the user keeps the variant of the session start, and dotclaude does not switch the main-loop model (D13).
Whether this costs adherence is a variant-eval question (open).
The shared sections stay short, and subagents do not get them, so each agent body repeats the two or three lines that matter.
The compact prompt has no override route, and the wiki records that.

### D16 Request capture and the 30K start

Capture: a local logging proxy that Claude Code reaches through `ANTHROPIC_BASE_URL` (documented) records the first request body.
A non-first-party base URL turns tool search off unless `ENABLE_TOOL_SEARCH` is set (`context-breakdown.md`), so the capture run sets it to `true`.
The proxy forwards to the real API, and a task checks that a subscription token works through it (unverified).
The agent sandbox blocks a local port, so the user starts `just capture` in a terminal and then starts the implementation session with `ANTHROPIC_BASE_URL` and `ENABLE_TOOL_SEARCH=true` (capture session).
`just sandbox` runs inherit both variables, so each probe request goes through the proxy.
The capture splits the first request into system blocks, tool schemas, and messages, and closes the 5K to 7K gap.
The `prompt_snapshot` attachment of the transcript already gives the tool and system text (`research/subagent-usage.md`), so `just measure` reads it first, and the capture closes only the rest of the gap.
Repro: the user's 30K start is checked in the terminal, the desktop app, and the IDE, each with the profile and `/context`.
The research found 30K only without the profile, so the cause is a config source that the surface does not read (other `CLAUDE_CONFIG_DIR`, a project with MCP servers, or a larger `CLAUDE.md`, all inferred).
The task makes the profile apply in each surface, with `CLAUDE_CODE_PLUGIN_DIRS` or user settings as the route if needed.

### D17 to D19 Layout, bounds, and runtimes

The text is in `design-parts-2.md`.
D17 sets the tree: `lib/` and `features/<name>/` with `hooks/register.mjs` as the one module, and the add-ons `dotclaude-jev`, `dotclaude-browser`, and `dotclaude-codegraph`.
D18 keeps 300 and 500 lines, sets three tiers of bounds (`lib/budget.mjs`, `features/<name>/limits.mjs`, `tools/`), drops the `AGENTS` list, and sets the dependency rule and the 250-line module trigger.
D19 keeps Node 22.18 `.mjs` and Bun, and adds the rule of no `node:` import in the module graph.
Test T1 enforces the import rules (task 3.14).

### D20 Remove `dotclaude-modder`

The plugin leaves the marketplace and `plugins/`, and the change deletes it outright (D35).
No archive is kept under `external/archive/`.
Git history is the only copy.
dotclaude is a general-purpose set of software-engineering roles, not a role for one niche.
The change updates `marketplace.json`, the docs, the README, the wiki, `CLAUDE.md`, and the CHANGELOG, and removes its tests.
`dotclaude-browser` and `dotclaude-jev` stay add-ons (D24, in `design-parts.md`), and the new add-ons `dotclaude-docs` and `dotclaude-codegraph` join them (D24, D26).

### D21 Hand-off order

This plan ends in a hand-off.
Task group 1 is for the user: apply a small live patch of settings to the installed 0.27.0 profile, so that the 0.28.0 work does not run on the old profile.
The group wrote a managed drop-in for the probes, and the user removed it after task 2.3 (D2).
Then the user runs `/opsx:apply` for the rest.
No agent runs `sudo`, and no agent edits the user files.
The live patch changes settings only: it leaves `includeGitInstructions` unchanged until the 0.28.0 prompt carries the attribution line, and it leaves `DISABLE_TELEMETRY` out (eval-gated).

### D31 Guard hooks fail open (`onFailure`)

Claude Code 2.1.295 adds `onFailure: "block"` for `command` and `http` hooks (`research/bundle-2.1.296.md`).
With it, a hook that cannot start, times out, exits with a code other than 0 or 2, or prints JSON that is not valid blocks the call.
The `PreToolUse` guard hooks do not use it, and no other hook does (decision of the user 2026-10-08).
The reason: when `node` is missing, each guarded `Bash`, `WebFetch`, and `Agent` call would stay blocked, with a warning only in the log, and Claude cannot repair that.
The permission rules and the sandbox still guard a call when a hook cannot start.
The semantic-line-break hooks never use it, because a formatter failure would then stop the session.

## Risks / Trade-offs

- [With no guard, an installed mod with a `tool.check` hook can turn a deny rule into an allow] → accepted by the user (D2), and the wiki states it. The guard of dotclaude never weakens a deny.
- [An organization has managed settings, so the guard is seated and skips the `prompt.section` handlers of tier `user`] → the drift check reports it (D2), and the smaller saving is stated.
- [A `$` call in an imported file is invisible to validation, and a policy mod cannot see it] → probe P1 (task 2.27) decides, and the module size trigger of D18 applies on a fail.
- [The mods API changes] → exact ids, unknown ids pass on, and the drift check reports an untested version.
- [The variant is fixed at start, but the user can switch the model] → the variant evals test it, and dotclaude never switches the main-loop model (D13).
- [A shorter prompt loses adherence] → every cut is eval-gated, and the over-claim and violation rates are pass conditions.
- [`.claude.json` cache shape changes] → one accepted shape, a fixture test, and a hidden segment on any other shape (D35).
- [Claude Code ignores `cleanupPeriodDays` (#41458)] → the wiki tells users to back up needed transcripts.
- [`claude plugin eval` may not express a check that the plan needs, and its capabilities are unverified] → task 25.1 maps each check first, drops what it cannot express, and builds no wrapper.
  A cut with no gate that the suite can express is not made.
- [The cuts of D35 lose features] → accepted by the user:
  - No burn rate, no context breakdown estimate, and no usage notes for the 5-hour and 7-day windows, because they need a state file or a status-line-only input.
  - No one-time level notes and no handoff carry across `/clear`, so a session that hits a limit or the context block keeps no record.
    The stateless context note (`context-bound` spec) and the checkboxes of `tasks.md` are the defense.
  - No auto-fix, so Claude spends context on format and lint issues that tools could fix.
  - No router, so no automatic model or effort for each task, no escalation after two failed fixes, and no move of a long Haiku 5.5 task to Sonnet 5.5.
  - No setup write, so the user applies the snippet by hand, and the snippet can drift from the live settings.
  - No eval history in files, and the figures live in the wiki as prose.
- [Old files stay on user machines, such as a 0.27.0 managed file or a rules file] → the CHANGELOG lists them, and no code deletes a file of the user.

## Migration Plan

There is no migration tool (D35).

1. The user updates the plugin.
1. The user applies the settings snippet of the wiki by hand, and removes by hand the keys that earlier versions wrote.
   The `cleanupPeriodDays` value of 14 is one of them.
1. The next session start runs the drift check.

Rollback: install 0.27.0 again from the marketplace.
dotclaude keeps no backup.

## Open Questions

- The start-of-session bound and the byte budget of each variant, which come from measurement.
- The final frontmatter of each agent and the final list of cuts, which the evals decide.
- The format and the capabilities of `claude plugin eval`, which task 25.1 reads.
- Whether `$.ui.status` can draw the main status line, or whether the wiki snippet must name a `statusLine` command (D6).
- The cause of the 30K start in the user windows.
- Whether `prompt.compose` is honored, whether a `$` handler from a feature file validates (P1), and the three probes of D29.
- The pinned `ctx7` version, from npm at task time.
