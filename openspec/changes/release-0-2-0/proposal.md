# Proposal: release-0-2-0

> `trim-0-2-0` replaces the parts below that name removed code.
> It removes the turn gate, the `agents` slice, `minispec`, `claudetto-you-should-know`, `just measure`, `just usage`, and `just start-run`.

## Why

Live sessions of `0.1.0-alpha.1` in three repositories show that claudetto works against the user in several places.
Helpers stop before they finish, because each agent has a turn cap (`maxTurns`, 30 to 60) and a context cap (85K or 100K) that the plugin sets itself.
The planner, the investigator, the researcher, and the implementer run on Haiku 5.5 at `xhigh`, also for work where Haiku falls short.
Agents run the full checks after a typo fix on a frontier model.
The status line shows the window of the engine (`1M`), not the window that claudetto uses (`300k`, `100k` for Haiku).
The turn gate notice shows `�` for each line break and says `claudetto: claudetto turn gate:`.
An empty session costs about 19.7K tokens, and the prompts are long and narrow.
The source has 1,075 files in `src/`, of which 70 of the 460 `.ts` files have fewer than 20 lines, and the wiki has about 148K words.
The evals use small samples and check words more than behavior, so they do not prove the claims that cite them.
The add-on `claudetto-you-should-know` looks nothing like the built-in `You should know` feature of Claude Code 2.1.302, and the built-in needs feature flags, which the telemetry switches of D31 turn off.

The user asks for a major overhaul, with no legacy upkeep.

## Answers to the User's Questions

- **Why the status line shows `1M`.
  **
  `src/plugins/claudetto/slices/statusline/segments.ts:144` prints `context_window.context_window_size`, which is the window of the model as Claude Code reports it.
  The subagent row prints `task.contextWindowSize` (`src/plugins/claudetto/slices/statusline/adapters/subagents.ts:42`).
  claudetto limits the context only through `autoCompactWindow` and its handoff trigger (`src/kernel/budget.ts:10`, `:36`, `:39`), so the engine still reports the full window.
  The kernel has `windowOf` (`src/kernel/budget.ts:16`) to clamp the size, but the status line does not use it.
- **Why there are turn limits.
  **
  `src/plugins/claudetto/slices/agents/limits.ts:25` sets `AGENT_MAX_TURNS`, with the reason "a read-only role needs fewer turns than a role that edits and runs checks".
  No measurement supports the values.
  A second cap, `SUBAGENT_CONTEXT_MAX` and `HAIKU_CONTEXT_MAX` (`limits.ts:11`, `:17`), tells a helper to report at 100K or 85K tokens.
  The helper of task 5.1 in `versionlens-redux` most likely stopped at that cap, while it still read files.
- **Why the turn gate text is broken.
  **
  `src/plugins/claudetto/slices/turngate/adapters/mod.ts:179` puts the multi-line block reason (`prompts/tasks-reason.md`) into `NOTICE_CAP` and sends it to `$.ui.log`.
  The notice line shows each line break as `�`, and `$.ui.log` adds `claudetto:` before the `claudetto turn gate:` of `prompts/notice-cap.md:1`.
- **Is `Stop hook error:` an error?
  **
  No.
  It is how Claude Code shows the reason of a `Stop` hook that blocks the stop.
  The hook worked as designed.
  The plan shortens the reason so that the label reads less like a fault.

## What Changes

- Rewrite the add-on `claudetto-you-should-know` to match the built-in, with no telemetry (D1).
  The setup tells the user how to turn on the built-in `You should know`.
- Remove each mention of the old `dotclaude` plugin from the repository, which includes `CHANGELOG.md` and the eval results.
- Add a jscpd integration: a shipped base config, an `extends` merge in a plugin `bin/` command, a `jscpd.local.json` and a baseline in this repository, a `just` recipe in `just check`, and a short skill for jscpd and DRY refactoring.
  The integration is language-agnostic and reads its formats from the config, not from code.
- Fix the turn gate notice: one line, one prefix.
- Remove `maxTurns` from each agent, and remove the context cap of each subagent.
  Claude Code compaction and the handoff keep a run in its window.
- Rebuild the agent roster by the cost and the fit of each model.
  Haiku 5.5 keeps only closed, small, well-defined work.
  Sonnet 5.5 takes the planner, the implementer of a multi-file slice, and the researcher.
  Opus 5.5 keeps the reviewer and the debugger.
  Add small and large variants where the evidence shows a gap.
- Make the status line show the window that claudetto uses, for the main session and for each subagent.
- Set the prompt cache TTL so that a short pause does not make the cache cold.
- Change the prompts to state goals and limits, not narrow steps, and make them shorter.
  A check runs once for each finished part, not after each edit.
- Cut the tokens that claudetto adds to an empty session, with a measured target.
- Merge thin files and slices, and shorten the wiki.
- Make the evals prove the claims that cite them, or remove the claims.
- Make `minispec` read YAML frontmatter in each file of a change and a `.minispec.yml` config at the root.
- Let the setup make the shell alias that it offers, after the user agrees, and add the cache folders of the project toolchains to the sandbox write list, read from the project and not from a fixed list.
- Give each built-in tool an on or off decision by need: allow `TaskStop` and the other tools that claudetto texts name, and deny only the tools that nothing needs.
- Review each env var of Claude Code 2.1.302 for what it does and what else it changes, and set the best value of each in the settings snippet, with the docs, the bundle, and the dossiers as sources.
- Remove the guidance that makes the main session spread work over long-lived lane worktrees that a helper cannot reach.

## Assumptions

- The dossier `external/2026-10-17/` is untrusted page content.
  The plan uses it only as a lead, and each engine fact that a change rests on gets a check against the docs or the bundle in a task.
- The jscpd skill goes in the core plugin, because the core plugin has the `bin/` commands and the check runner.
- The work runs in the main session, with no helpers, as the user asked on 2026-10-17.
  For the same reason, this plan had no `reviewer` pass.

## Impact

- Tier: `large`.
- Code: `src/plugins/claudetto/slices/{agents,statusline,turngate,prompt,styles,setup,minispec,checks}`, `src/kernel/budget.ts`, `src/plugins/claudetto-you-should-know/` (rewritten), `tools/`, `justfile`, `src/wiki/`.
- Specs: `agent-roster`, `context-budget`, `hook-messages`, `jscpd`, `minispec-format`, `evals`, `settings-snippet`.
- Users: each user of the core plugin gets new agent models and no turn caps.
  Users of `claudetto-you-should-know` get a new look and behavior, and each user of the snippet gets telemetry, error reports, feedback, and surveys off (D31).
