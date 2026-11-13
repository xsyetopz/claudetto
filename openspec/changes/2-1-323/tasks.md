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
- [ ] 2.6 Measure the largest prompt a `search` run sends with `autoCompactWindow: 100000`, to see whether compaction keeps it under 100,000 tokens.
- [x] 2.7 Check with the fake Messages API whether `Write` to the session's `$TMPDIR` folder asks, and whether `permissions.additionalDirectories` holding that folder stops the ask (D10.31).
- [ ] 2.8 Probe the 2.1.323 surfaces that `research/cc-2-1-323.md` marks unprobed: an `engines` range that excludes the running version, a `ui.render` hook on `AbovePrompt` with and without `plugin: "*"`, and the `ceiling` field of a `tool.check` event.

## 3. Per-Model System Prompts

- [ ] 3.1 Write the shared core of under about 3,500 chars from `ROOT_PROMPT`, following `research/text-audit.md` §9.
- [ ] 3.2 Write the Opus, Sonnet, and Haiku 5.5 bodies from `research/model-guidance.md`.
- [ ] 3.3 Write the `prompt.compose` mod that changes `lean_body` per `e.model`, keeps the session sections, and leaves other models on the default.
- [ ] 3.4 Delete `ROOT_PROMPT` and its shared-scope injection.
- [ ] 3.5 Test the mod with the fake Messages API: assert the `system[2]` text for each model and the default for an unknown model.

## 4. Subagents

- [ ] 4.1 Rewrite `agents/search.md`, `plan.md`, `sweep.md`, and `work.md` with the `model`, `effort`, `tools`, and `maxTurns` from design decision 4, and `autoCompactWindow: 100000` in `search.md`. Write each body to its model's guidance.
- [ ] 4.2 Turn off built-in agents through `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` and `permissions.deny Agent(<name>)` in setup.
- [ ] 4.3 Delete the `delegation.ts` deny. Keep only the agent listing trim, if it still lowers the request.
- [ ] 4.4 Write spawn caps through the two `CLAUDE_CODE_MAX_*` env keys, and delete the spawn caps and the repeat-failure refusal (`DENY_FAILED`) in `admit.ts`.
- [ ] 4.5 Merge `useMemoryHold` into one file, and add a retry hint to its spawn denial. In the merge, catch a failed poll inside the memory watch's loop so the watch goes on, keep watching a `run_in_background` command, and a call Claude Code moved to the background at its timeout, until its process ends (D10.10), and start `sysctl` by its absolute path (D10.6). Abort the watch in a `finally` around `next(e)`, so a cancelled call logs no "memory watch stopped" notice (D10.23). Write the failing tests first.
- [ ] 4.7 In the `work.md` body and the root prompt's `<delegation>` block, state that only the lead runs `claude plugin test` (`just lab`), once, after the work agents end. Give the reason as the measured cost: one run of the `claudetto` mod takes 3.4 GB in 19 processes, and no narrower run exists (P-D10.10g).

## 5. Bash Gate to Settings

- [ ] 5.1 Add the `permissions`, `sandbox.filesystem`, and `autoMode` entries from design decision 5 to the setup groups, closing the gaps that task 2.1 found.
- [ ] 5.2 Move `switch.ts` to a classic `PreToolUse` command hook.
- [ ] 5.3 Delete `tool.check/useBashRules/`, the vendored rules, their fixtures, the licence, `gate.mock.ts`, and their tests and docs.
- [ ] 5.4 Delete the gate texts in `texts-gate.ts`, and keep the advisor and decide specs.
- [ ] 5.5 Delete the read guard: `surfaceCall` and `heavyFile` in `useSlimSurface/surface.ts`, `REFUSAL` in `texts.ts`, the `readGuardEnabled` option, and their tests and docs (D10.24).

## 6. Stop, Ledger, and Compaction

- [ ] 6.1 Delete `useSliceCommits`, the cleanup and background-task Stop blocks, `grade.ts`, `named-files.ts`, `register.ts` in `useStopChecks`, `stop.ts`, and `turn.ts`.
- [ ] 6.2 Move `open-items.ts` to a classic Stop command hook that checks the What I Need form and never repeats an identical block. The hook parses the section's Markdown list items and fenced blocks, and it accepts one fenced `sh` block as the item for a command the user runs in a separate terminal (D10.9). Update the What I Need text in `output-styles/Concise.md` to match. Write the failing tests first.
- [ ] 6.3 Fold the `texts-grade.ts` fault list into one prompt-type Stop hook. The hook judges by model, with no word regex or phrase list, and it counts the arguments of a slash command the user typed, such as a `/goal` condition, as the user's words (`research/defects.md` D10.26). Write the failing test first: a reply that cites a `/goal` item passes.
- [ ] 6.4 Move the Budget `prompt.submit` hook into `useBudgetRun`, and merge its three files.
- [ ] 6.5 Delete `useConstraintPin` and `useAskFix`, and add `PIN_COMPACT_KEEP` as a classic `PreCompact` hook.
- [ ] 6.6 Stop writing `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` and `autoCompactWindow: 300000` in setup.
- [ ] 6.7 Move the StopFailure notice to a classic hook.

## 7. Defects

- [ ] 7.1 Treat ENOENT as absent with no log in `useSetup/rules.ts`, `surface.ts` `namesIn`, `claudetto-openspec/hooks/fs.ts`, and `hygiene/`. Write a failing test for each first.
- [ ] 7.2 Paint the `dark` palette in `statusline/main.ts` until a theme is known, unless `NO_COLOR` is set. Write the failing test first.
- [ ] 7.3 Delete `statusline/subagents.ts` and `subagentStatusLine` in `plugins/claudetto/settings.json`.
- [ ] 7.4 Add the classic `SessionStart` package-manager detection. Delete the Bun prompt line, `BUN_FACT`, `bunRuleEnabled`, and the npm deny table.
- [x] 7.5 Delete the `tool.check` catch in `register.ts` and `checkFault` in `chain.ts`, so a guard fault leaves the engine's verdict in place. Write the failing test first.
- [ ] 7.14 Make the `tool.call` catch return the `next(e)` result once the tool has run (`research/defects.md` D9.2). Write the failing test first.
- [ ] 7.6 Delete the decider fallback (`decider/fallback.ts`) and move each judgment it makes to a prompt-type classic hook (D9.5).
- [ ] 7.7 Delete the hygiene sweep's idle-time rule for temp folders. Point probes at `$TMPDIR/<project>/<session_id>/`, and remove that folder on `session.end`. At session start, remove only the per-session folders that no running session's `~/.claude/sessions/<pid>.json` names and whose `pid` and `procStart` no longer match a running process (D9.6). Write the failing test first.
- [ ] 7.8 Delete `kill.ts`, the worktree ownership check in `own.ts`, the endless-wait check, and their texts with task 5.3, after task 2.2 confirms the sandbox's own process and worktree limits on 2.1.323 (D9.3, D9.4).
- [ ] 7.9 Have setup offer `worktree.symlinkDirectories` with the git-ignored dependency folders it finds at the project root, so a worktree agent has them without building symlinks (D10.2, P-D10.2a). For each folder it links, add the name without a trailing slash, such as `node_modules`, to claudetto's own `.gitignore` block, because a `node_modules/` line misses the link and the worktree then shows it as an untracked change (P-D10.2b). Test first with a failing `ignores.test.ts` case, and check with `git check-ignore node_modules` in a worktree made with the setting.
- [ ] 7.10 In the bedrock repo, change `guard-base` to compare the resolved `core.hooksPath` with `<repo>/.githooks` (P-D10.1b), and add a `.githooks/pre-push` that runs `just verify` (P-D10.5). Adopt the result here (D10.1, D10.5).

- [ ] 7.11 In `claudetto-you-should-know/hooks/register.ts`, store the `tool_use` id that a shown note judged, and deny only that call; any other call of the turn goes to its own check (D10.16). Write the failing test first: one note offered, then a second call with another id runs.
- [ ] 7.12 In the classic `SessionStart` hook of task 7.4, append `[ -n "$ZSH_VERSION" ] && setopt no_nomatch no_equals` to `$CLAUDE_ENV_FILE`, so a Bash command with an unmatched glob or an `==` word runs under zsh as under bash, and `**` stays recursive (D10.17). Test with the fake Messages API: `echo == x` and `grep --include=*.ts x /dev/null` succeed under `CLAUDE_CODE_SHELL=/bin/zsh`.
- [ ] 7.13 In `usePriceStep/price-step.ts` `readingOf`, drop the `$.ui.log` from the sleep's `catch`, so a stop chunk that arrives in time logs nothing (D10.20). Write the failing test first: a Haiku step whose stop chunk arrives in time, with an `on("ui.log")` collector read after the sleep's rejection has landed, records no log.
- [ ] 7.15 In `useSetup/rules.ts`, offer to delete each `.md` file in `~/.claude/rules/claudetto/` whose name is not in `RULES`, in one dialog that lists them, so a rule the plugin retired stops loading (D10.27). Write the failing test first: an installed `noNarratingComments.md` is listed and, on yes, removed.
- [ ] 7.16 Add an `agent.spawn` mod that drops `model` from the event, so each subagent runs on its agent file's model and a lead's `model` argument cannot put it on Opus or Fable, and delete "or pass `model: opus`" from the `<delegation>` block in `texts.ts` (D10.28). Write the failing test first: a spawn event with `model: "opus"` reaches `next` with no `model`.
- [ ] 7.17 After task 7.15, check that no file of `~/.claude/rules/claudetto/` has a `paths:` key, so claudetto's rules load with the memory at session start and add no reminder block to a step (D10.29, P-D10.29d). Then rerun `scan-lookback4.ts` on the sessions after it and expect no claudetto rule in a step past 21 positions.
- [ ] 7.18 Have setup add `Edit(//tmp/claude-<uid>/**)` and `Edit(//private/tmp/claude-<uid>/**)` to `permissions.allow`, with the user's uid, so a probe file in Claude Code's temp folder needs no approval; the user chose the whole folder (D10.31, P-D10.31). Write the failing test first, then check with the fake Messages API that a scripted `Write` there is written.
- [ ] 7.19 Release the plugin with task 7.5, so that installed copies stop answering `ask` on a guard fault. Before that, time each `tool.check` guard on an MCP call with the fake Messages API and `--debug-file`, and make each guard that does not judge that tool return before its first `$` call (D10.32).
- [x] 7.20 Have `pinCheck` call `next(e)` at once for a tool that no pinned rule can break, that is anything other than `Bash` and the writers, and bound its wait for `state.pending` by `next.budget.remainingMs` less a margin, after which it judges with the ledger as it stands and logs that the read was still running. Have the `classic.Stop` checks run their Decider calls together, not one after another (D10.32, P-D10.32b, P-D10.32c). Write the failing tests first: a `Read` while a ledger read hangs settles at once, and a `Bash` call settles within the budget. Then rerun P-D10.32b and expect no "ran past its 10s budget" line.
- [x] 7.21 Have the `you-should-know` `tool.call` hook close this turn's open note once the person answers an `AskUserQuestion` call without a deny or error, through the same close as the "know" press, so the next call runs (D10.36). The failing test comes first.

## 8. Texts

- [ ] 8.1 Rewrite `output-styles/Concise.md` from the original as `research/text-audit.md` records. Drop the `sudo` example, use the `- ! <command>` form, and keep the no-announcement and check-then-state rules.
- [ ] 8.2 Rewrite the surviving tool texts. Keep a text only while it beats the stock text. Base the reason for one repo-wide check after parallel agents on the measured cost, in place of "holds the whole program in memory" (P-D10.10a).
- [ ] 8.3 Write the `useHeadlineseNames.md` rule and add it to the rules setup offers.
- [ ] 8.4 Remove the six copies of the ToolSearch line from the OpenSpec skills, and the clones of the user's rule files.
- [ ] 8.5 Rewrite step 5 and "Ending A Pause Or A Report" in `claudetto-openspec/skills/apply/SKILL.md`. The skill stops only after every step the agent's tools can take is done, and asks the user for a physical step, such as connecting a device, as it asks for a command (`research/defects.md` D9.10).
- [ ] 8.6 Rewrite the scope sentence in the root prompt's `<defects>` block (`texts.ts:29`) and `rules/noUnrequestedEdits.md`, so that scope follows the user's goal and not the task's files. The agent fixes each defect that stands between the goal and its done-check, in any file, and acts on no cause it has not checked (D10.4). Measure both texts with the task 10.3 A/B run.

## 9. Folders

- [ ] 9.1 Move `claudetto-openspec/hooks/spec*` into `spec/`, `validate*` into `validate/`, and `archive*` into one of them.
- [ ] 9.2 Merge `useSetup/ignore*` into `ignore.ts`, and move `hooks/texts*` into `texts/` if three files remain.
- [ ] 9.3 Update the load paths in `register.ts`, `bunfig.toml`, and `project.just`.

## 10. Check and Release

- [ ] 10.1 Run `just verify`.
- [ ] 10.2 Measure the request size for each model against the 2.1.322 baseline with the fake Messages API.
- [ ] 10.3 Ask before the paid A/B run of the per-model prompts and the Sonnet and Haiku agents, the grader replay, and the D9.5 truncation probe. Report the cost and the weekly share.
- [ ] 10.4 List each removed option, mod, and setting in the release notes.
