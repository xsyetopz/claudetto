# Decisions

Each line holds the decision, who made it, and the source. A line marked open waits for the user.

## Answers of the User, 2026-10-30

- D1. "No legacy compatibility will be retained" meant no migration path from an old install. It never meant removing OpenSpec or other features. The restart change read it the other way without asking (`prd.md`, Problem).
- D2. The six `/config` items are disables that setup must write: `workflowSizeGuideline: "unrestricted"`, `workflowKeywordTriggerEnabled: false`, `enableWorkflows: false`, `enableArtifact: false`, `remoteControlAtStartup: false`, and the IDE auto-install off. The user set them by hand because setup did not.
- D3. OpenSpec: setup runs `openspec init` in the project. The seven workflow skills, the preset source, and `bin/minispec` stay out (answer to the OpenSpec question). D27 picks which skills OpenSpec itself writes.
- D4. Built-in agents: setup denies all six: `Agent(general-purpose)`, `Agent(Explore)`, `Agent(Plan)`, `Agent(claude)`, `Agent(claude-code-guide)`, and `Agent(statusline-setup)`, and also writes `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1`.
- D5. `env`: the 14 docs-checked flags of `/tmp/ccx/env.txt`, plus the two setup already writes, plus whatever the gitignored `openspec/` files add (see D7).

## Decided by Claude on the User's Instruction

- D6. The removed agents, decided after reading "Building agents: when to fold subagents into your main agent loop" (claude.com, read 2026-10-30), as the user asked:
  - `Zeus` stays out. The article says to replace the orchestrator so that "the model that writes the plan is also the one carrying it out".
  - `Hephaestus` stays out. Its edit steps chain on the main thread's context, and the article says to merge specialists that "chain on each other's output, touch the same data, or are often called together".
  - `Apollo` stays out. Running checks is cheap inline, and a summary loses the file and line detail the next edit needs.
  - `Hermes` comes back. Web research is the article's "independent research paths" case: it needs little from the rest of the session and hands back a compact result, and the pages it reads stay out of the main window.
  - `Artemis` and `Athena` stay. Artemis is a read-only search that returns paths only, and Athena is the "black-box verification" case.

## Found in the Gitignored `openspec/` Files

- D7. The only `env` name these files add beyond D5 is `CLAUDE_CODE_THRIFTY_SONIC=0`. `references.md:396` of the restart change calls it unofficial and says it stops a prompt line that routes file reads through `cat`, which skips `Read` hooks. It is not in the docs set of D5. Open: write it or not.
- D8. Names the files keep out of setup, each by an earlier decision that stands: `CLAUDE_CODE_AUTO_MODE_MODEL` (`specs/low-hitl/spec.md:157`), `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` (architecture D8 of the restart, a per-tier option), `CLAUDE_CODE_PROMPT_CACHE_TTL` (`src/tiers/snippet.ts` `DROPPED_KEYS`), and the sleep and idle compaction keys (`src/keys.ts`).

## Answers of the User, 2026-10-30, Second Round

- D9. `work`: `finish` comes back (`/goal <cmd>` and the `tasks.md` loop). `ground`, `protect`, and `notes` stay out.
- D10. Auto mode: tune the built-in auto mode hard and trim its classifier request to the fewest characters that still decide correctly. Use every surface that helps, undocumented ones included, and never patch the Claude Code binary or its npm package (`AGENTS.md`).
- D11. `session/hygiene` comes back, and widens beyond claudetto's work files to the stale parts of the user's `~/.claude/` and the other files that programs generate there.
- D12. `session/prompt`: rebuild it only if a reading shows that it costs little, and do better than the old one. Otherwise record it as dropped.
- D13. Version floor: both. Setup writes `minimumVersion: "2.1.314"` (`configure/settings/core.md:47`, any settings file, keeps auto-updates from installing anything older), and the mod warns once at `SessionStart` when the running version is older.
- D14. `CLAUDE_CODE_THRIFTY_SONIC=0` is written, and the code marks it unofficial with its source.
- D15. Docs lookup: find a lightweight Context7 integration, and build our own if none is light enough. The old `find-docs` skill is not restored as it was.

## Answer of the User, 2026-10-30, Third Round

- D16. Auto mode decides through Jev first, and falls back to Haiku 5.5 at `high` effort. Claudetto's Haiku base moves from `medium` to `high`. This overrides the `low-hitl` requirement "Choose the Classifier Model by Measurement" and the `classifier-model` fault of `src/automode/faults.ts`, both of which keep `CLAUDE_CODE_AUTO_MODE_MODEL` unset.
  - Read from the `2.1.314` binary: `CLAUDE_CODE_AUTO_MODE_MODEL` exists, a server-configured classifier model wins over it, and the program falls back to its default when "the API's safeguards refuse the classifier's escalated check" on the pinned model. No classifier effort key exists, only `CLAUDE_CODE_AUTO_MODE_TEMPERATURE`.
  - Claude's reading of "base": the one Haiku call claudetto makes, the compaction summary (`src/summary.ts:70`), which takes the tier row's `effort` (`src/tiers/tiers.ts:78`, `medium`). The main session's `effortLevel` is not part of this answer.

## Answers of the User, 2026-10-30, Fourth Round

- D17. Jev in auto mode: measure first. Before any hook wires Jev in, a paid A/B run of Jev against the classifier on the `just eval` cases, with its cost given as a share of the weekly limit before it runs. D16 stays the goal, and its wiring waits on this reading.
- D18. `env`: all four groups of the old setup (`archive/plugins/claudetto/modules/setup/prompts.ts:91-184`) are approved by name, with `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` (D4) and `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` (D2):
  - Prompt and tool trims: `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1`, `CLAUDE_CODE_DISABLE_CFC_PROMPT=1`, `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`, `CLAUDE_CODE_DISABLE_CRON=1`.
  - Agents: `CLAUDE_CODE_FORK_SUBAGENT=0`.
  - IDE, UI, telemetry: `CLAUDE_CODE_AUTO_CONNECT_IDE=false`, `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1`, `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY=1`, `DISABLE_ERROR_REPORTING=1`.
  - Commands and services: `DISABLE_EXTRA_USAGE_COMMAND=1`, `DISABLE_FEEDBACK_COMMAND=1`, `DISABLE_INSTALL_GITHUB_APP_COMMAND=1`, `CLAUDE_CODE_DISABLE_FAST_MODE=1`, `ENABLE_CLAUDEAI_MCP_SERVERS=false`.
  - This replaces the lost list of 14 of D5, which was rebuilt from the same source and checked against `/tmp/ccx/rows.tsv` (every flag `[Documented]`).
- D19. The A/B of D17 has two arms on the same `just eval` cases: (A) the built-in classifier run locally with `CLAUDE_CODE_AUTO_MODE_SERVER=0` and `$defaults` kept, and (C) claudetto's own mode, the `default` permission mode plus a `PreToolUse` hook that asks Jev first and then Haiku 5.5 at `high`, failing closed. Arm B, the built-in with lists that leave out `$defaults`, is not measured. The run is priced as a share of the weekly limit and approved before it starts.
- D20. The classifier request goes to the fewest characters with the least regression; 76k is not enough (user, 2026-10-30, restating D10). This reopens arm B of D19 as a trim ladder:
  - Free: `just capture` learns to read the classifier request (the fake API answers the first turn with a tool call, then records the classifier request that follows). Each rung is measured in characters: built-in `$defaults` (`140,093` per `docs/prompt/machinery.md`), custom lists, empty lists, and each auto-mode env key that changes the request, read from the `2.1.314` binary (`CLAUDE_CODE_AUTO_MODE_TIER`, `_SEGMENTED_TRANSCRIPT`, `_PRIOR_ASSISTANT_CONTEXT`, `_GIT_STATUS`, `_GIT_STATUS_LIMIT`, and the rest of the `CLAUDE_CODE_AUTO_MODE_*` names).
  - Paid: the A/B of D19 adds the smallest rungs as arms against A, and each rung reports its characters and its regression against A on the `just eval` cases. The pick is the lowest characters for the least regression. The run is priced and approved before it starts.
  - `src/automode/faults.ts` holds no rule of Claude's own that keeps a rung out. Its faults are rewritten to fit whatever the readings pick.
- D21. Standing instruction (user, 2026-10-30): take the scenic route and optimize every surface claudetto can reach, not only the classifier: the session prompt, tool texts, agent and skill texts, the output style, hook output, and every request the program sends. Claude does not hold a step back "for now" or add a gate of its own; only a reading or a decision of the user picks a step.

## Answers of the User, 2026-10-30, Fifth Round: the Plugin's `settings.json`

- D22. The keys the plugin's snippet writes, beyond D2, D4, D13, D14, and D18 (user, answers to the `settings.json` questions; each key is a property of the vendored `2.1.314` schema):
  - claude.ai integrations off: `disableClaudeAiConnectors: true`, `syncClaudeAiSkills: false`, `syncClaudeAiPlugins: false`, `autoUploadSessions: false`, the `DesignSync` deny, `disableRemoteControl: true`, `inputNeededNotifEnabled: false`, `agentPushNotifEnabled: false`.
  - Session features off: `autoMemoryEnabled: false`, `autoDreamEnabled: false`, `promptSuggestionEnabled: false`, `awaySummaryEnabled: false`, `spinnerTipsEnabled: false`, `feedbackDrafts: "off"`, `feedbackSurveyRate: 0`, `todoFeatureEnabled: false`, `voiceEnabled: false`.
  - Prompt and model: `includeGitInstructions: false`, `showThinkingSummaries: false`, `attribution: false`, `fallbackModel: ["claude-sonnet-5-5"]`, and `modelSettings` `maxEffortLevel` of `claude-opus-5-5` `high`, `claude-sonnet-5-5` `medium`, and `claude-haiku-5-5` `high`.
  - Behavior: `autoContinueAtUsageLimit: true`, `switchModelsOnFlag: false`, `precomputeCompactionEnabled: false`, `showClearContextOnPlanAccept: true`, `useAutoModeDuringPlan: false`, `crossSessionInbound: "accept"`, `prefersReducedMotion: true`.
  - `modelProposedGoals` stays unset while D9's `/goal <cmd>` is planned, and becomes `"disabled"` if that `/goal` is dropped (user's rule).
  - Left unset on purpose: `autoUpdatesChannel`, `cleanupPeriodDays`, `alwaysThinkingEnabled`, `disableAgentView`, `fileCheckpointingEnabled`, `bashEditDiffEnabled`, `respondToBashCommands`, `skillListingMaxDescChars`, `terminalProgressBarEnabled`, `showTurnDuration`, `emojiCompletionEnabled`, `tui`.
- D23. A snippet question is about the keys the plugin writes, never about the user's live `~/.claude/settings.json` (user, 2026-10-30).
- D24. When the user's settings already hold `permissions.deny`, setup appends the snippet's missing deny rules after the user's own, because a deny only tightens. `permissions.allow` and the `autoMode` lists stay whole, because an added rule there loosens (user, 2026-10-30).

## Answer of the User, 2026-10-30, Sixth Round: the Personal Instruction Files

- D25. `~/.claude/CLAUDE.md` holds the user's own instructions for every project, and `~/.claude/rules/*.md` the user's own rules, each scoped to files by `paths` or loaded in every session without it (official `memory` page, "Choose where to put CLAUDE.md files" and "User-level rules"). Claudetto writes none of its own text into an instruction file: no origin line, no comment block, no claudetto rule (user, 2026-10-30, `AskUserQuestion`). This replaces D21 of `0.3.0-alpha.2` (`fc93e8fb^:openspec/changes/archive/2026-10-23-release-0-3-0-alpha-2/design.md`) and the block and test rule of commit `91b5f533`.
- D26. Setup writes no instruction file. An interview command does, in place of the built-in `/init` (user, 2026-10-30, `AskUserQuestion`):
  - Interview: Claude reads the repo, asks the user with `AskUserQuestion` only what the repo does not show, shows the draft, and writes after the user's yes. It costs tokens on each run, which the user accepted over code dialogs that cost none.
  - Scopes: global `~/.claude/CLAUDE.md`, repo, local `./CLAUDE.local.md`, user rules `~/.claude/rules/`, and repo rules `.claude/rules/`.
  - Repo layout: the text lives in `AGENTS.md`, and `CLAUDE.md` holds the title `# CLAUDE.md` and the import `@AGENTS.md`, as this repo does. The title of `CLAUDE.md` stays `# CLAUDE.md`. Claude Code skips `AGENTS.md` when a `CLAUDE.md` exists, so the text loads once through the import (official `memory` page, "AGENTS.md"). The reverse, `AGENTS.md` holding `@CLAUDE.md`, was dropped, because no source shows that Codex expands an `@` import.
  - Command name: a probe decides. `$.command.register` refuses a built-in's name (clawdipedia `extend/mod-api/calls/tool-command-config`). When a `command.run` hook can answer the built-in `/init`, the interview is `/init`. Otherwise it is `/claudetto:init`.
  - Probe reading (2026-10-30, Claude Code `2.1.314`): a hook answers the built-in `/init`, so the interview is `/init`. A throwaway plugin registered `on("command.run", { command: "init" }, async () => ({ text: "PROBE-HOOK-ANSWERED-INIT" }))`. In an empty folder, `ANTHROPIC_BASE_URL=http://127.0.0.1:9 claude -p "/init" --plugin-dir <probe>` printed `probe-init: PROBE-HOOK-ANSWERED-INIT`, exited 0, and wrote no file. The dead base URL means no model request could have run. The binary agrees: `S9n` of module `chunk-sq7yspzm.js` runs the `command.run` chain before the engine's own run for every command. Built-in modules hook `/clear`, `/resume`, `/diff`, and `/plugin` the same way.
  - Second probe reading (2026-10-30, Claude Code `2.1.314`): the first reading shows only that a `command.run` hook prints an answer; that answer never reaches the model. The interview stays `/init`, and the route is a `skill.prompt` hook on the built-in `init` skill. Harness: `claude -p "/init"` against the local fake Messages API of `tools/capture/fake-api.ts`, one throwaway plugin per route, reading the user messages of the last model request.
    - `skill.prompt` returning the interview text for `init`: the marker is in the model's context, and the user text drops from 2,398 to 803 characters. What stays is the attribution reminder, the `<command-name>/init</command-name>` wrapper, and the marker; the built-in `init` text (1,592 characters, `source: "built-in"`) is gone.
    - `prompt.submit` rewriting `text` to another command: the built-in prompt still runs (2,398 characters). Rewriting `command` too is refused: `next() passed an argument with a changed command (the envelope is the engine's; a rewrite keeps command, isMeta)`.
    - `command.run` calling `$.command.run` or `prompt.submit`: refused, `it would wait on the turn this hook is holding`. Answering `{ text }`: printed, no model request.
    - The hook matches `source: "built-in"` too, so a user's own skill named `init` keeps its text.

## Answer of the User, 2026-10-30, Seventh Round: OpenSpec's Own Skills

- D27. Setup runs `openspec init --tools claude --profile core` (user, 2026-10-30, `AskUserQuestion`). OpenSpec `1.15.0` writes its six `core` workflow skills (`propose`, `explore`, `apply`, `update`, `sync`, `archive`) to `.claude/skills/`; claudetto still ships none (D3). `--profile core` overrides the user's global OpenSpec profile, and neither flag writes `~/.config/openspec/config.json`. A user with no global OpenSpec config also gets six `.claude/commands/opsx/*.md` commands, because OpenSpec's default delivery is `both` and `init` has no delivery flag. Read from two runs of the real CLI in temp folders, with and without `XDG_CONFIG_HOME` pointing at an empty folder.

## Answer of the User, 2026-10-30, Eighth Round: Building Blocks

- D28. Claudetto's source becomes a set of building blocks, so the plugin is easy to extend and maintain (user, 2026-10-30, `AskUserQuestion` and two follow-up messages). The blocks are a source-code structure, not a user-level pick: the first answer "User picks blocks" was corrected to "it's not user-level, but this source-code-level", so there is no `blocks` option, no setup pick, and no rename table.
  - A block is one module that changes one surface of Claude Code: a prompt (a built-in skill or command text, through `skill.prompt`), an agent (`agents/*.md`, `agent.offer`), a command answered in code (`command.run`), a tool text (`tool.describe`), a context block (`prompt.context`), a screen (`ui.render`), the status line, a policy (`tool.check` and the limits), or a session step (handoff, compaction, measurement).
  - The catalog covers every surface that clawdipedia shows a plugin can change, through the Mod API and the classic hooks.
  - Each block's base text is as short as it can be for the Claude 5.5 family, written to Anthropic's prompting practices and to the Marmelab "state of AI harness engineering 2026" article.
  - Long-term stability (user, 2026-10-30): a block rides only a typed, documented route, never a binary internal. Each block names its routes in the host's own event type and the Claude Code version its lab cases pin, so a host change fails that block's case and nothing else.
  - Loader reading (2026-10-30, Claude Code `2.1.314`): the hook loader refuses `block.attach(on)` through an object, `"on" is passed to something other than a function named at the top of this file or imported from one of the module's own files`. So each block exports an attach function as a `const` named at the top of its file (the lint bans `function` declarations, and the loader accepts the `const`: `just check` passed with it), and the catalog calls each by name. One module may hook one event several times: a throwaway plugin with three `skill.prompt` hooks passed 4 of 4 lab cases.
  - It ships in `0.1.0`, built by workers on the shared core.

## Choices Settled by Claude on Verified Readings, 2026-10-30

The user asked that each open choice be settled with the least problematic option the verified data supports.

- D29. Setup writes `statusLine` and `subagentStatusLine` as the shell command `bun --no-env-file "$(ls -d "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claudetto/claudetto/*/ | sort -V | tail -1)bin/claudetto-statusline"` (with `--subagent` for the second), and `statusLine` also gets `refreshInterval: 5`. This is the command of `0.4.0-alpha.2`.
  - Why: user settings do not expand `${CLAUDE_PLUGIN_ROOT}`, because `khe` of `chunk-01y36vdn.js` in `2.1.314` passes the command to the shell unchanged. The plugin cache holds one folder per version (`installed_plugins.json` on this machine: `.../claudetto/claudetto/0.0.0`). An absolute path would break on each update. `sort -V` picks `0.10.0` over `0.9.0` (a test checks it), and the macOS `sort` `2.3-Apple` supports it.
  - `padding` and `hideVimModeIndicator` stay unset: the line does not render `vim.mode`, and the margin of `COLUMNS_MARGIN` already covers the default padding.
  - A status line merges as one value: a user's own line is kept whole and reported once, and claudetto adds no key to it.
  - The two keys sit in the dialog group "Models and windows", because `$.ui.ask` takes at most four options and the four groups are in use. The line shows the model, the effort, the context window, and the limit windows that this group sets.
- D30. The IDE auto-install is turned off by the env twin `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL=1` in `settings.json`, not by `autoInstallIdeExtension: false` in `~/.claude.json`. `l2r` of `chunk-sq7yspzm.js` (offset `3244316`) in `2.1.314` skips the install when either one is set, so the effect is the same. `~/.claude.json` is rewritten by a running Claude Code, and setup writes only `settings.json`.

## Answer of the User, 2026-10-30, Ninth Round: Worktrees On, Fast Mode Off

- D31. Worktrees stay on, and fast mode and its settings stay off, because quality on a budget outranks speed (user, 2026-10-30, message: "worktrees are to be enabled if not already but fast mode and its stuff go disabled. quality for cheap > speed"). Setup already meets both, so it writes no new key.
  - Worktrees: `EnterWorktree` and `ExitWorktree` carry no gate in `2.1.314` (clawdipedia `reference/tools/agents-and-tasks`), and setup denies neither. The `worktree` setting holds only layout keys (`symlinkDirectories`, `sparsePaths`, `baseRef`, `bgIsolation`, `location`), none of which turns worktrees on or off, so setup leaves it unset.
  - Fast mode: setup writes `CLAUDE_CODE_DISABLE_FAST_MODE=1`. Claude Code allows fast mode only while that flag is off, and `/fast` is gated on it (clawdipedia `configure/env-vars/models-and-effort`, `extend/skills-and-commands/slash-commands`), so `fastMode` and `fastModePerSessionOptIn` have no effect and stay unwritten.
  - A test in `src/tiers/__tests__/snippet.spec.ts` holds both for every tier. It fails when setup denies `EnterWorktree` or drops the fast mode flag.

## Answers of the User, 2026-10-30, Tenth Round: IDE Auto-Install, `$defaults`, Hygiene

- D30 is approved (user, 2026-10-30, message: "we disable these, yes").
- D32. The `$defaults` check of `src/automode/faults.ts` is kept, changed, or removed by Claude on a measurement (user, 2026-10-30, message: "measure it, then decide on your own").
- D33. Hygiene is a garbage collector for what Claude Code leaves behind (user, 2026-10-30, message). Its list holds only paths that Claude Code's own `cleanupPeriodDays` sweep skips: leftover `fswatch-probe-*` folders and session folders in the temp root `claude-<uid>`, and claudetto's old handoffs.

## Direction of the User, 2026-10-30, Eleventh Round: The Root Agent Stops a Goal

- D34. The root agent can pause or block a `/goal` (user, 2026-10-30, message: "the root agent should be able to pause/block a goal if there are issues", pointing at the Codex harness). Modeled on Codex's `update_goal` (`codex-rs/ext/goal/src/tool.rs`, `templates/goals/continuation.md`): the goal has a status, `active`, `paused`, or `blocked`, and only an `active` goal runs its check at a stop. The root agent sets `blocked` through the `goal` tool only after the same blocker holds for three goal turns in a row, and `paused` only when the user asks. `/goal resume` turns the goal back on. The no-progress bound marks the goal `blocked` instead of clearing it, so the person sees it. The tool is registered when `/goal` sets a goal, deferred behind ToolSearch, so a session with no goal pays nothing for it. In the `tasks.md` loop the root agent blocks a task by writing `blocked: <reason>` in its box, and the loop passes over that box.
