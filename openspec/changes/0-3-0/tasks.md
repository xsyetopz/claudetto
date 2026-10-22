## 1. Free Probes That Close the Open Rows

Each probe runs on the stub of `research/probes.md`, with no paid model call, and writes its result to a new batch of `probes.md`.

- [x] 1.1 Size each row of "Open Rows" in `research/replace-matrix.md` that a stub capture can measure: the attachment kinds, the gated sections, the commit texts, the output style reminder, and the background model calls (title, session name, memory, auto dream, precompute, observer, `WebFetch` summary).
  Verify: each row has a size and a source, and `grep -c 'NEEDS CLARIFICATION' research/replace-matrix.md` goes down by the count of the rows closed.
- [x] 1.2 Probe whether a plugin skill `goal` replaces the built-in `/goal`, and whether a skill with `disable-model-invocation: true` adds a description to the request.
  Verify: the batch shows the request and the `/goal` result, and the rows of `/goal` and spec `minispec` "No Start Cost" name it.
- [x] 1.3 Probe whether `tool.check` can change the input of `Bash` (`updatedInput`), and whether macOS has a `trash` command.
  Verify: the batch shows the changed command or the refusal, and D4 keeps or drops the Trash rewrite by the result.
- [x] 1.4 Run Claude Code in a terminal against the stub with the snippet of D5, and get a `Bash` prompt from the gate and from a plain rule.
  Verify: the screen text has no `auto mode handles these prompts for you` and no "Yes, and switch to auto mode" row.

## 2. Tests of the Faults

- [x] 2.1 For each fault of `.claudetto/0.3.0-findings.md` and `research/sessions.md` that a later task fixes, add a test in `tests/claudetto/<slice>/` that fails on `v0.2.0`.
  Verify: `just test <file>` fails on the `v0.2.0` tree, and the test names its fault (spec `release-evidence` "Fault Has a Test").

## 3. Parts That Go

- [x] 3.1 Remove `claudetto-codegraph` with its source, tests, and wiki page.
  Verify: `just check` passes, and `grep -r codegraph src tests` finds no use.
- [x] 3.2 Remove `advise`, `patch`, the print guard, the `command.describe` hook, the `agent.spawn` rule text, the memory texts, and each control with no incident (D6).
  Verify: `just check` passes, and spec `lean-surface` "Parts That Go" scenarios pass.
- [x] 3.3 Remove the `prompt` rewrites of the system sections and the texts that no kept part uses (D6, A9).
  Verify: `just check` passes, and the stub capture of task 6.4 has no claudetto section text.
- [x] 3.4 Stop `just generate` from writing the build header into the files that a skill copies into a user project.
  Verify: spec `lean-surface` "No Build Header in User Files" scenario passes.
- [x] 3.5 Turn on `complexity/noExcessiveCognitiveComplexity` at 15 and add the file line bound to `tools/limits.ts`, then fix the 20 functions above 15 or remove them with their slice (D7).
  Verify: `just check` passes with the new rules.
  This task runs after group 9 for each part that group 9 rebuilds, so no function gets a fix and then a rebuild.
- [x] 3.6 Make `plugins/` the source, by decision A14 of `architecture.md` (picked in an `AskUserQuestion` answer of the apply session, 2026-10-22).
  Move each shipped file of `src/plugins/` and `src/kernel/` to `plugins/`.
  Write `register.ts`, `hooks.json`, the snippet, the texts, `plugin.json`, and `marketplace.json` by hand in place of the generated files, and keep the controls in `src/wiki/claudetto/rationale/Controls.md`.
  Remove `tools/generate/` except the wiki part, and update `CLAUDE.md`, `.claude/rules/`, and the tests.
  This task runs after tasks 3.1 to 3.3, and it closes task 3.4, because no generator writes into `plugins/` after it.
  Verify: `just check` passes, `src/` holds only `wiki/`, and `CLAUDE.md` names `just generate` only for the wiki.
- [x] 3.7 Remove the add-on plugins `claudetto-sessions` and `claudetto-lab` (D6, picked in an `AskUserQuestion` answer, 2026-10-22).
  Move each part of `claudetto-lab` that a `just` recipe, a file of `tools/`, or a test of another plugin uses to `tools/`, with its tests to `tests/tools/`.
  Remove the rest with the plugin folders, the marketplace entries, their tests, and their wiki pages, and add a "Removed" entry to the `CHANGELOG.md` section of 0.3.0.
  Verify: `just check` passes, `just sandbox --help` runs, and `grep -rn "claudetto-sessions\|claudetto-lab"` finds only the `CHANGELOG.md` entries and `openspec/`.

## 4. Agents

- [x] 4.1 Add the `agents` slice with `scout`, `worker`, `reviewer`, and `researcher` of D1, each with `model`, `effort`, `tools`, `omitClaudeMd: true`, and the body rules of D1.
  Verify: spec `agent-roster` "Fixed Agent Settings", "Effort Is Not Forced", and "No Forced Wait" scenarios pass.
- [x] 4.2 Add the `agent.offer` hook and the `Agent(<name>)` denies of D2, with `Agent(claude-code-guide)`, and the `agent.spawn` default to `worker`.
  Verify: `just lab` passes, and a stub capture lists only claudetto agents (spec `agent-roster` "Own Agents Only" and "Call with No Type").

## 5. Permission Gate

- [x] 5.1 Rebuild `guard` as one `tool.check` hook on `Bash`, `Read`, `Grep`, `Glob`, `Edit`, and `Write`, on the shell parser of `src/kernel/shell/`, with the rules of spec `permission-gate` and D4.
  Verify: a test for each scenario of the spec passes in `just lab`.
- [x] 5.1a Send each `ask` of the delete and local `git` gates to Jev first, with the requirement "Jev before a Person" of spec `permission-gate` and D4.
  Verify: `just test tests/claudetto/guard/` passes the scenarios "Jev Is Sure" and "Jev Is Not Sure" with a stubbed Jev, and `just lab` shows a person dialog with no key.
- [x] 5.2 Log each `ask` of the gate with its reason to a file of the session, for question Q1.
  Verify: a lab test with three `ask` calls writes three lines.
- [x] 5.3 Add the static `deny` rules for a session with no mods.
  Verify: spec `permission-gate` "Gate without Mods" scenario passes on a stub session with `disableAllHooks: true`.

## 6. Prompt Base

- [x] 6.1 Add `claudetto:main` with the body of D9 and the plugin `settings.json` key `agent`.
  Verify: spec `prompt-base` "Main Agent" scenario passes on a stub capture.
- [x] 6.2 Add the `shell` block of `prompt.context` with the shell facts of D9, and keep the `prompt.attachment` hook that drops each kind that no rule needs (the environment text is a system section, `evidence.md`).
  Verify: spec `prompt-base` "Attachments" scenario passes.
- [x] 6.3 Add the `tool.describe` texts in ASD-STE100 for each kept tool, with the rule list of each tool, and defer the tools that the plan marks as seldom used.
  Verify: spec `prompt-base` "Tool Texts" scenario passes, and `ToolSearch` is not deferred.
- [x] 6.4 Cut the body, the attachments, and the tool texts until no cut keeps the tests green, then pin the size of the first main request.
  Verify: spec `prompt-base` "Request Size Only Shrinks" and "Base without Mods" scenarios pass.

## 7. Settings and Setup

- [x] 7.1 Write the snippet from the `Lever` column of `research/replace-matrix.md`, with `permissions.disableAutoMode: "disable"` and `permissions.defaultMode: "default"`.
  Verify: spec `settings-levers` scenarios pass.
- [x] 7.2 Add a pin test for each key and env var of the snippet.
  Verify: spec `settings-levers` "Pinned Effect" scenario passes.
- [x] 7.3 Make setup remove the 170 `ask` rules, the `sandbox` keys, and the auto mode keys, and report each removed key.
  Verify: spec `setup` "Remove Keys of 0.2.0" scenario passes on a copy of a settings file with the `Bash(rm -r*)` rules.
- [x] 7.3a Make setup find the official Context7 skill `find-docs` and a Context7 rule in `~/.claude/` and the project, and report each with its size next to `claudetto-docs`, with no delete (D11).
  Verify: a setup test with a fixture home that has both prints both sizes, and the fixture files stay.
- [x] 7.3b Add a test that runs `bunx -y ctx7@0.6.1 --help` and checks the `library` and `docs` commands that the skill uses.
  Verify: `just test tests/claudetto-docs/` passes.
- [x] 7.4 Make setup set `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` from the plan tier (D3), and offer no code-intelligence tool.
  Verify: spec `setup` "Plan Tier" and "No Code-Intelligence Offer" scenarios pass.

## 8. MiniSpec

- [x] 8.1 Write the parity fixtures and the parity test against `@fission-ai/openspec@1.14.3` for `new change`, `list`, `status`, `validate`, and `archive` (D10).
  Verify: the test runs OpenSpec on each fixture and records its result.
- [x] 8.2 Rebuild the `spec` slice as MiniSpec: the step skills `claudetto:propose`, `claudetto:apply`, `claudetto:verify`, and `claudetto:archive`, and the `minispec` command, on the OpenSpec layout.
  Verify: spec `minispec` scenarios pass, and the parity test passes or each difference is named in D10.
- [x] 8.3 Cut MiniSpec until no cut keeps the tests green, with a rewrite pass and `claudetto:dedupe`, then pin its lines and bytes.
  Verify: spec `minispec` "Size Only Shrinks" scenario passes.

- [x] 8.4 Rename the skills by the table of D11 in `src/`, the wiki, and the tests, and add a "Renamed" entry with the table to the `CHANGELOG.md` section of 0.3.0.
  Verify: `just generate` and `just check` pass, and `grep -rn 'claudetto:dry\|claudetto:spec\|eval-compare\|claudetto-sessions' src plugins tests` finds no match outside the changelog.
  Note: task 3.7 removed the `eval-compare` skill, so the grep still finds `eval-compare` only as the tool path `tools/eval-compare/` and in the past results of `plugins/claudetto/evals/results/`.

## 9. Kept Parts That Get Rebuilt

- [x] 9.1 Rebuild `goal` as one `Stop` check, with the `goal` skill of task 1.2 when the probe allows it.
  Verify: a lab test shows that the stop blocks until the check exits `0`.
- [x] 9.2 Rebuild `statusline`, `ground`, and `decide` on the surfaces of the verdict table of `architecture.md`, with less code and the same tests.
  Verify: the old tests pass on the new code, and the line count of each goes down.
- [x] 9.3 Cut `src/kernel/` and `tools/` to what the kept parts import.
  Verify: `just check` passes, and no file of `src/kernel/` has no importer.

## 10. Paired Evals

Each task in this group needs the approval of the user before it runs, with the expected cost and the weekly share (`CLAUDE.md`).

- [x] 10.1 Compare `handoff` with the built-in compaction, and `claudetto-browser` with the built-in `WebFetch`, on tokens and on the next turns.
  The user dropped the comparison with Claude in Chrome, because it runs as MCP tools (2026-10-22).
  Verify: the result is in the evidence file, and the cheaper part that keeps the task stays.
- [x] 10.2 Compare `scout` on Haiku with `scout` on Sonnet, with the run count of spec `release-evidence`.
  Verify: the result is in the evidence file, and D1 keeps or changes the model.
- [x] 10.3 Run one paid request with and without auto mode, and compare `usage.input_tokens`, to learn whether the `safeguards` field counts.
  Verify: the result is in `research/probes.md` and in D5.

## 12. Session Hygiene

- [x] 12.1 Probe with stubbed events whether a subagent sees the `$.state` of the main session, and time a `git` hash of the changed files before and after a `Bash` call (D12).
  Verify: both results and their method are in `evidence.md`, and D12 names the choice.
- [x] 12.2 Write the edit ledger of spec `session-hygiene`.
  Verify: `just lab` passes the scenarios "Mine" and "Changed After".
- [x] 12.3 Write the cleanup at session start, with the worktree rule.
  Verify: a test on a fake temp tree passes the scenarios "Live Session", "Ended Session", "Unmerged Work", "Old Probe", "Running Probe", and "Unknown Folder".
- [x] 12.4 Find the maker of the `fswatch-probe-*` folders, and fix it or add it to the cleanup.
  Verify: the maker and the fix are in `evidence.md`.

## 11. Release

- [x] 11.1 Run the alpha test sessions and count the gate prompts from the log of task 5.2, then answer Q1 in `design.md`.
  Verify: Q1 has the counts and a decision for `0.3.0-alpha.2`.
- [x] 11.2 Measure the empty-session context of 0.2.0 and of the claudetto settings in the same way as `docs/how-it-works/context-budget.md` of `claude-code-docs`. Verify: spec `release-evidence` "Context Measured" scenario passes, and the result is in the evidence file.
- [x] 11.3 Run `just bump 0.3.0-alpha.1`. Verify: each manifest has `0.3.0-alpha.1`, and `just check` passes.
- [x] 11.4 Update `src/wiki/` for setup, permissions, agents, MiniSpec, and the parts that go, and add the `CHANGELOG.md` entries under `0.3.0-alpha.1`.
  Verify: `bun run lint:md` passes, and `just generate` gives no diff.
- [x] 11.5 Run the full checks.
  Verify: `just docker check` passes.
