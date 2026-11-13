# Tasks: Lean Rebuild on Claude Code 2.1.323

## 1. Version Floor

- [ ] 1.1 Set `engines["claude-code"]: ">=2.1.323"` in the `plugin.json` of `claudetto`, `claudetto-openspec`, and `claudetto-you-should-know`.
- [ ] 1.2 Delete the runtime version warning and every other runtime version check, along with their tests and docs.
- [ ] 1.3 Add `claude plugin validate` for each plugin to `project.just` so that `just check` runs it.

## 2. Free Probes Before Deletes

- [ ] 2.1 Replay the `rules.generated/fixtures-*.ts` commands against the planned `permissions`, `sandbox`, and `autoMode` settings in a `/tmp/probe-*` project, and record the uncovered fixtures in `research/probes.md`.
- [ ] 2.2 Re-run the `sandbox-git.ts` and `switch.ts` scenarios on 2.1.323, and take the protected path list again from 2.1.323.
- [ ] 2.3 Run `/init` in a scratch repo and compare its output with `starter-families.ts`.
- [ ] 2.4 Check whether the built-in `/advisor` gate is on for this account.
- [ ] 2.5 Probe `prompt.compose` on a subagent that uses the lean prompt path, `agent_id` in subagent hook input, and a call to a tool that `tool.list` removed.

## 3. Per-Model System Prompts

- [ ] 3.1 Write the shared core of under about 3,500 chars from `ROOT_PROMPT`, following `research/text-audit.md` §9.
- [ ] 3.2 Write the Opus, Sonnet, and Haiku 5.5 bodies from `research/model-guidance.md`.
- [ ] 3.3 Write the `prompt.compose` mod that changes `lean_body` per `e.model`, keeps the session sections, and leaves other models on the default.
- [ ] 3.4 Delete `ROOT_PROMPT` and its shared-scope injection.
- [ ] 3.5 Test the mod with the fake Messages API: assert the `system[2]` text for each model and the default for an unknown model.

## 4. Subagents

- [ ] 4.1 Rewrite `agents/search.md`, `plan.md`, `sweep.md`, and `work.md` with the `model`, `effort`, `tools`, and `maxTurns` from design decision 4. Write each body to its model's guidance.
- [ ] 4.2 Turn off built-in agents through `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` and `permissions.deny Agent(<name>)` in setup.
- [ ] 4.3 Delete the `delegation.ts` deny. Keep only the agent listing trim, if it still lowers the request.
- [ ] 4.4 Write spawn caps through the two `CLAUDE_CODE_MAX_*` env keys, and delete the spawn caps and the repeat-failure refusal (`DENY_FAILED`) in `admit.ts`.
- [ ] 4.5 Merge `useMemoryHold` into one file, and add a retry hint to its spawn denial.

## 5. Bash Gate to Settings

- [ ] 5.1 Add the `permissions`, `sandbox.filesystem`, and `autoMode` entries from design decision 5 to the setup groups, closing the gaps that task 2.1 found.
- [ ] 5.2 Move `switch.ts` to a classic `PreToolUse` command hook.
- [ ] 5.3 Delete `tool.check/useBashRules/`, the vendored rules, their fixtures, the licence, `gate.mock.ts`, and their tests and docs.
- [ ] 5.4 Delete the gate texts in `texts-gate.ts`, and keep the advisor and decide specs.

## 6. Stop, Ledger, and Compaction

- [ ] 6.1 Delete `useSliceCommits`, the cleanup and background-task Stop blocks, `grade.ts`, `named-files.ts`, `register.ts` in `useStopChecks`, `stop.ts`, and `turn.ts`.
- [ ] 6.2 Move `open-items.ts` to a classic Stop command hook that checks the What I Need form and never repeats an identical block.
- [ ] 6.3 Fold the `texts-grade.ts` fault list into one prompt-type Stop hook.
- [ ] 6.4 Move the Budget `prompt.submit` hook into `useBudgetRun`, and merge its three files.
- [ ] 6.5 Delete `useConstraintPin` and `useAskFix`, and add `PIN_COMPACT_KEEP` as a classic `PreCompact` hook.
- [ ] 6.6 Stop writing `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` and `autoCompactWindow: 300000` in setup.
- [ ] 6.7 Move the StopFailure notice to a classic hook.

## 7. Defects

- [ ] 7.1 Treat ENOENT as absent with no log in `useSetup/rules.ts`, `surface.ts` `namesIn`, `claudetto-openspec/hooks/fs.ts`, and `hygiene/`. Write a failing test for each first.
- [ ] 7.2 Paint the `dark` palette in `statusline/main.ts` until a theme is known, unless `NO_COLOR` is set. Write the failing test first.
- [ ] 7.3 Delete `statusline/subagents.ts` and `subagentStatusLine` in `plugins/claudetto/settings.json`.
- [ ] 7.4 Add the classic `SessionStart` package-manager detection. Delete the Bun prompt line, `BUN_FACT`, `bunRuleEnabled`, and the npm deny table.

## 8. Texts

- [ ] 8.1 Rewrite `output-styles/Concise.md` from the original as `research/text-audit.md` records. Drop the `sudo` example, use the `- ! <command>` form, and keep the no-announcement and check-then-state rules.
- [ ] 8.2 Rewrite the surviving tool texts. Keep a text only while it beats the stock text.
- [ ] 8.3 Write the `useHeadlineseNames.md` rule and add it to the rules setup offers.
- [ ] 8.4 Remove the six copies of the ToolSearch line from the OpenSpec skills, and the clones of the user's rule files.

## 9. Folders

- [ ] 9.1 Move `claudetto-openspec/hooks/spec*` into `spec/`, `validate*` into `validate/`, and `archive*` into one of them.
- [ ] 9.2 Merge `useSetup/ignore*` into `ignore.ts`, and move `hooks/texts*` into `texts/` if three files remain.
- [ ] 9.3 Update the load paths in `register.ts`, `bunfig.toml`, and `project.just`.

## 10. Check and Release

- [ ] 10.1 Run `just verify`.
- [ ] 10.2 Measure the request size for each model against the 2.1.322 baseline with the fake Messages API.
- [ ] 10.3 Ask before the paid A/B run of the per-model prompts and the Fable agents, and before the grader replay. Report the cost and the weekly share.
- [ ] 10.4 List each removed option, mod, and setting in the release notes.
