# Proposal

## Why

dotclaude 0.27.0 rebuilt the core plugin on documented extension points, but it left a vanilla Claude Code 2.1.293 install mostly intact.
A session with the 0.27.0 profile starts at about 19.7K tokens (first request of 2.1.293 on this machine).
`/context` reports only about 10.7K of it, and 5K to 7K tokens are not explained.
The user also sees starts of 30K tokens or more in other windows, which the research reproduced only when the profile did not apply.
Built-in plugins, claude.ai-synced skills, and claude.ai connectors come back after the user turns them off by hand.
Claude Code sends its own system prompt, which is long, is written for no one model, and tells Claude to use delegation and verification in the same way on every model.
The 0.27.0 profile set `cleanupPeriodDays: 14`, so Claude Code deleted the older session transcripts of the user.
The 0.27.0 status line dropped most of the 0.26.x segments.
Claude uses its own context to fix format and lint issues that the project tools can fix, and it uses recalled library facts that can be out of date.
0.27.0 also has no evals, so a change to a prompt cannot show that it keeps the outcome.
The largest usage item is not the start but subagent runs: the `/usage` report puts 40% of usage on `dotclaude:investigator`, and its runs page files into context and end at 110K to 223K tokens (`research/subagent-usage.md`).

0.28.0 is a large breaking release.
Its goal is the least start-of-session context, the least usage quota and token cost, and the best adherence.
dotclaude works with Claude Code 2.1.295 or later through every documented or exposed extension point: settings, env vars, plugins, mod events, classic hooks, and output styles.
The research ran on 2.1.293.
The 2.1.294 release notes change only how Claude Code judges `prompt` and `agent` hooks, so the research holds, and task 2.33 checks the bundle for other changes.
The 2.1.295 release notes add `onFailure: "block"` for command and HTTP hooks, and fix mod and plugin-test behavior.
They remove no key or event that dotclaude uses, and task group 21 checks this.
It never patches or changes the binary or the npm package.
It may read the bundle for evidence.
The release follows the Rule of Least Power: leave a default, then set a settings key or an env var, then turn a part off, then add a mod, and write a script only when nothing above it works.
Quality and usage quota come before speed.

The user added a rule on 2026-10-09 (design D35).
dotclaude 0.28+ never uses or makes up a proprietary schema or format for itself.
dotclaude takes only what the latest vanilla Claude Code provides:
settings, env vars, key-values, hooks and the other documented extension points, the API, and possibly the Agent SDK.
dotclaude does not make up a band-aid that cannot be proven to work.
Each proprietary format that earlier work built is wiped outright, with its tests.
There is no migration, no compatibility shim, and no kept copy.

## What Changes

- **BREAKING** The settings snippet of the wiki turns off every built-in part that a settings key or an env var can turn off, when the research shows no quality cost.
  This includes the built-in `cc-plugin-*` plugins except `cc-plugin-plugin-authoring`, claude.ai skill sync, claude.ai plugin sync, claude.ai connectors, and the nudges, tips, and surveys.
  Items that might cost quality, such as a deny of `EnterPlanMode` and `ExitPlanMode`, stay behind an eval.
- A spec requirement lists the keys that dotclaude never sets, because they stop hooks or plugins, or lower quality.
- **BREAKING** dotclaude does not use managed settings.
  It writes no `managed-settings.json` and no `managed-settings.d/` drop-in, and runs no `sudo`.
  dotclaude runs at tier `user` from `settings.json`.
  The `cc-plugin-sec-default` guard is not seated on a machine that has no managed settings and is not in a Team or Enterprise organization, so the dotclaude prompt handlers reach the request.
  Trade-off, accepted by the user: with no guard, an installed mod with a `tool.check` hook can turn a deny rule into an allow.
  The wiki states it.
  On a machine that has managed settings anyway, the drift check reports that the guard is seated and which dotclaude parts it skips.
- **BREAKING** dotclaude owns the system prompt.
  The mod replaces the Claude Code sections with one dotclaude prompt variant for each model: Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1.
  Each variant uses XML tags, has a byte budget in `features/prompt/limits.mjs`, and stays stable in a session and in an agent.
  The prompt carries the commit attribution line, because the snippet sets `includeGitInstructions: false`.
- The mod cuts attachments (`prompt.attachment`) and tool descriptions (`tool.describe`) where the shorter text keeps the behavior.
  Deferred tools stay on.
  Claude Code has no route to override the compact prompt, and the proposal records that.
- **BREAKING** There is no router and no router table (design D12, D13, D35).
  The frontmatter of `agents/*.md` (`model`, `effort`, `maxTurns`) that Claude Code documents carries the choice.
  The evals may still decide the frontmatter of each agent, and the result lives only in the agent files.
  The main loop keeps the model and effort that the user set.
  `claude-haiku-4-5` leaves the roster, and the snippet sets `availableModels` and `enforceAvailableModels` without it.
- The start-of-session budget comes from a measure after the cuts.
  One task captures the first request to explain the 5K to 7K gap.
  One task reproduces the 30K start in the desktop app, the IDE, and the terminal, and makes the settings apply in each.
- Each subagent gets a context bound: a range-read rule, a report-now hook at `SUBAGENT_CONTEXT_MAX`, and delegation text that sends related questions to one subagent.
- The main session gets a bound on file reads, because 56% of its file reads read the same file again through Bash slices, which the `Read` dedup does not cover.
  A hook denies a Bash command that only prints a file and gives the `Read` call instead.
- A context figure reaches the model only from a measure, never from the model, because issue #35357 shows Claude reporting a false context state.
  A `UserPromptSubmit` hook gives it to the model as `additionalContext`, and the status line may also show it to the user.
- A new add-on plugin `dotclaude-codegraph` calls the CodeGraph CLI from command hooks at session start, at each search, and after edits, with `bin/` and no MCP server (design D26).
- Rules that a program can check move from prompt text to hooks, lints, and eval measures, and the guard stops asking about `rm -rf` of a variable that holds a temp folder.
- A plain-Node `sembr` formatter splits sentences onto their own lines before a write.
  Silent `PreToolUse` hooks rewrite Markdown files, commit messages, and pull-request bodies.
  The output style gets a `<reply_format>` block for chat (design D29).
- Claude holds correct work under an unsupported claim of fault from the user, a subagent report, or project context.
  An evidence line in the prompt and the agent bodies comes first, and an irreversible-action gate follows only if the eval needs it.
  New eval measures count wrongful reverts and false confessions, with a warranted-accusation control (design D30).
- The output style and the agent descriptions get shorter.
  Each agent description has 300 characters or fewer.
- The status line shows the public Claude Code status data in the vanilla footer order, and adds derived values: pace, reserve or deficit, run-out time, cache countdown and hit ratio, cost and lines for each hour, and reset credits.
  It keeps the 0.26.x look.
  It keeps no state: the burn-rate samples, the slow-read cache, and the context breakdown estimate are cut (design D35).
- **BREAKING** The snippet no longer sets `cleanupPeriodDays`.
  The wiki tells the user to remove the 0.27.0 value of 14 by hand.
- **BREAKING** `setup` no longer writes Claude Code settings.
  It keeps only the OpenSpec configuration step and stays user-invoked.
  The profile file, its merge, diff, backups, migration, gated items, and launcher stubs are deleted (design D35).
  The `handoff` skill and the `.claude/handoffs/` files are deleted, and a drift check replaces a doctor command.
  dotclaude ships no third-party skills.
- **BREAKING** The auto-fix feature is cut, because it kept an edited-files log (design D7, D35).
- A new add-on plugin `dotclaude-docs` holds a lightweight skill that makes Claude get library and API docs with the Context7 CLI (`ctx7`), because it needs an outside tool (design D24).
- Setup configures OpenSpec to deliver skills only and turns OpenSpec telemetry off.
  The snippet sets the OpenSpec skills to `name-only`.
- **BREAKING** The dotclaude eval harness is deleted.
  Evals port to the suite format of `claude plugin eval`, which Claude Code owns (design D9).
  Its capabilities are unverified, so task 25.1 maps each check onto it and drops each check that it cannot express.
- A `tools/` script extracts the full settings schema of the installed Claude Code from its bundle, without a patch.
  The schemas are for 2.1.295 and later, and the version is in the standard `$comment` keyword.
- **BREAKING** 0.28.0 follows the exact plugin and marketplace layout of the Claude Code plugin docs, and keeps none of the old structure.
  Each normal file has 300 lines or fewer and each test file 500 lines or fewer.
  Bounds have three tiers: shared runtime bounds in `lib/budget.mjs`, feature bounds in `features/<name>/limits.mjs`, and repository bounds in `tools/`.
  A plugin has `lib/` and `features/<name>/` with one hooks module, and a test enforces the import rules.
  When the module passes 250 lines, the next feature becomes an add-on plugin.
  What needs Python uses Python, runtime JavaScript is `.mjs` on Node, and tests, `tools/`, and evals use Bun.
  The old rule that the `um` command runs on Bun goes away.
- **BREAKING** `dotclaude-modder` leaves the marketplace, and the change deletes it outright with no archive.
  dotclaude is a general-purpose set of software-engineering roles.
  `dotclaude-browser` and `dotclaude-jev` stay separate add-ons, and `dotclaude-codegraph` joins them, because a feature that costs tokens or needs an outside tool is a plugin that the user can turn off (design D24).
  Each add-on works without the core plugin and imports nothing from it.
  Jev is a custom tool that uses `TYPESAFE_API_KEY` when it is set, and a reviewer check on Haiku 5.5 when it is not.
- The main session gets a stateless context note at a prompt at or above a context level, and no tokens below the first level (design D27, D32).
  At the handoff level, the note tells Claude to tick the tasks and name `/clear` and the resume command, because Claude Code 2.1.295 ends a turn with no last model turn at the context block and at a usage limit.
  The usage notes, the level markers, the handoff carry across `/clear`, and the stop records are cut, because they kept state (design D35).
- The plan ends with a hand-off.
  The first task group is for the user: apply a small live settings patch to the installed 0.27.0 profile.
  Then the user runs `/opsx:apply` for the rest.
- The wiki gets a full rewrite for 0.28.0.
  It is formal, terse, and concise ASD-STE100, and it documents every part, switch, and decision.
  It has no quoted Claude Code CLI code or prompt text, and the local copies in `external/` stay out of the repository.

## Capabilities

### New Capabilities

- `vanilla-surface`: which parts of a vanilla Claude Code install dotclaude turns off, which keys it never sets, that dotclaude writes no managed file, and the rule of no proprietary format.
- `system-prompt`: the dotclaude system prompt variants for each model, their structure, their byte budgets, and their stability.
- `prompt-surface`: the start-of-session context that dotclaude sends, its budget, its measure (printed, not stored), and the mod that cuts attachments and tool descriptions.
- `plugin-layout`: the plugin and marketplace layout, the file size bounds, the runtimes, the outright removal of `dotclaude-modder`, the three tiers of bounds, the import rules, and the add-on plugins.
- `second-opinion`: the Jev custom tool of `dotclaude-jev`, its fallback without a key, and the browser skill of `dotclaude-browser`.
- `model-router`: the roster, and the agent frontmatter that carries the model and effort.
  The router is removed.
- `status-line`: the main and subagent status lines, their segments, derived values, and data sources.
  They keep no state.
- `settings-profile`: the plain settings snippet of the wiki and the plugin `settings.json`, and the session-retention rule.
- `commands`: the entries that dotclaude adds to Claude Code, who can invoke each, and the drift check.
- `auto-fix`: removed.
  The spec states that the capability is gone and why.
- `library-docs`: how the `dotclaude-docs` add-on gets current library and API docs through the Context7 CLI.
- `openspec-integration`: how setup configures OpenSpec for low context cost.
- `eval-suite`: the evals in the format of `claude plugin eval`, the check map, and the measures that the suite can express.
- `settings-schema`: the generated JSON Schema for `settings.json`, and for `managed-settings.json` as a reference only, for 2.1.295 and later.
- `agent-definitions`: the limits on the dotclaude agents, such as the description length.
- `context-bound`: the bounds on the context of each subagent and of the main session, so that a session with compaction off does not reach its limit.
- `usage-awareness`: removed.
  The spec states that the capability is gone and why.
  The stateless context note is in `context-bound`.
- `code-graph`: the `dotclaude-codegraph` add-on and its CodeGraph CLI integration through command hooks, opt-in for each project.
- `semantic-line-breaks`: the `sembr` formatter, the silent rewrite hooks for files, commits, and pull requests, and the reply-format rule.

### Modified Capabilities

None. The project has no specs yet.

## Impact

- `plugins/dotclaude/`: moves to the documented layout (`lib/` and `features/<name>/` hold the code, and `hooks/register.mjs` is the one module), with `hooks/`, `output-styles/dotclaude.md`, `agents/*.md`, `skills/`, and `settings.json`.
- `plugins/dotclaude-modder/`: removed outright.
- `plugins/dotclaude-jev/` and `plugins/dotclaude-browser/`: stay as add-ons that work without the core plugin, with the new layout.
- `plugins/dotclaude-codegraph/`: new add-on with `bin/` and command hooks.
- `plugins/dotclaude-docs/`: new add-on with the Context7 `docs` skill.
- `tools/limits.mjs`: the repository bounds.
  `tools/baseline.json` is deleted, and `just measure` writes no file.
- `tests/dotclaude/`: new and changed tests, and hook-lab tests in `plugins/dotclaude/tests/`.
- `tools/`: a new schema extractor, a request-capture proxy, and changes to `sandbox.mjs`.
  `tools/eval/` is deleted.
- New files and folders: `evals/` for private cases in the format of `claude plugin eval`, `schemas/` for the generated schema, `.env.example`, and a `.env` line in `.gitignore`.
- `justfile`: new `measure`, `capture`, and `schema` recipes, and an `eval` recipe only if `claude plugin eval` needs one.
- `wiki/`: a full rewrite for 0.28.0.
- `CHANGELOG.md`: entries under `[Unreleased]`, and then `just bump minor`.
- Network: the `dotclaude-docs` skill needs `context7.com` and `registry.npmjs.org` in the sandbox allowlist.
  The capture proxy needs a local port.
- User machines: dotclaude writes no setting.
  The user applies the settings snippet of the wiki by hand.
  The managed template is removed, and its five keys go in the snippet.
  Files that earlier versions wrote stay, and no code deletes them.
