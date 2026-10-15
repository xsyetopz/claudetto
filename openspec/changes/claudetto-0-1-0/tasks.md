# Tasks

Each check runs from the repository root.
`just check` must pass at the end of each group.
[coverage.md](coverage.md) maps each fault to its task.
A paid task gives its expected cost, and [costs.md](costs.md) has the total.
Ask the user before each paid run, with the cost and the current weekly share.

## 1. Generator and plugin names

- [ ] 1.1 Rename the source folders in `src/plugins/` to `claudetto` and `claudetto-<name>`, and remove `dcc-plugin-agents-md`.
  Check: `just generate` writes `plugins/claudetto/` and the 6 add-on folders, and `ls plugins` shows no `dotclaude` or `dcc-plugin` folder.
- [ ] 1.2 Write the new `.claude-plugin/marketplace.json` from the generator, with the version `0.1.0-alpha.1`.
  Check: `claude plugin validate .` passes, and `just generate --check` reports no drift.
- [ ] 1.3 Add the ladder line to the source of each slice (D2), and a test that each slice has it.
  Check: `just test tests/kernel/ladder.test.ts` passes, and fails when one line is removed.
- [ ] 1.4 Copy the kernel parts that each add-on uses into the add-on (D8), and add a test that no add-on imports from another plugin.
  Check: `just test tests/kernel/imports.test.ts` passes.
- [ ] 1.5 Pin Claude Code 2.1.300 as the minimum version, with a session-start notice below it.
  Check: a lab test with `version` `2.1.299` gives the notice and turns the handover off.
- [ ] 1.6 Add the `claudetto` overview page to `src/wiki/`.
  Check: `bun run lint:md` passes.
- [ ] 1.7 Change the `homepage` test in `tests/support/manifests.test.ts` to the `claudetto` repository, so that the 8 tests that the rename broke pass.
  Check: `just test tests/support/manifests.test.ts` passes, and fails with a `homepage` of another repository.
- [ ] 1.8 Add the version tables of the schema builder, with a table for 2.1.300, and stop on an unknown version (C2).
  Check: the `schemas/` key test passes with 2.1.300 installed, and a test with version `9.9.9` writes no schema.
- [ ] 1.9 Exempt `.claude/skills/openspec-*` from the line bound in `tools/validate.ts` (C3, the user, 2026-10-15: "excempt agreed").
  Check: `just validate` passes with the OpenSpec skills, and a test of a 301-line file in another `.claude/` folder fails.
- [ ] 1.10 Find the cause of V7 with a `Stop` agent hook in `-p`: run the 2 permission modes `default` and `auto` in a new and in a used config folder, each with `--debug-file` and `--include-hook-events`.
  Write the cause and the method to `live-checks.md`.
  When the cause is in `claudetto` or its settings, fix it with a lab test.
  When the cause is in Claude Code, no `claudetto` feature uses an agent hook in the failing case, and a test checks that.
  Check: the evidence file names the failing case and the debug log line that shows why (paid, about 0.10 USD).
- [ ] 1.11 Fix the repository tools (review rows 122 to 128): one owner of the eval lock, a lock that holds while the paid run lives, a dry run that refuses an unknown flag in `release.ts` and `bump-version.ts`, the kept traces of `eval-variant`, the cost bound in `tools/limits.ts`, and quoted names in the stray check.
  Check: `just test tests/tools/` passes, with one test for each row.

## 2. Kernel

- [ ] 2.1 Remove `src/kernel/spec-store.ts` and `src/kernel/stamp.ts` and each import of them.
  Remove the slices `rules` and `stamp`, which stay behind, and the slices `handoff` and `spec`, which groups 3 and 9 write again, with their tests.
  Check: `rg -l 'spec-store|stamp' src tests` gives no result, `ls src/plugins/*/slices` shows none of the 4 slices, and `just typecheck` passes.
- [ ] 2.2 Fix the parser holes of the shell parser in `src/kernel/shell/` that `faults.md` lists.
  Check: one test for each listed hole in `tests/kernel/shell*.test.ts` passes.
- [ ] 2.3 Move the handover trigger bounds and the other new runtime bounds to `src/kernel/budget.ts`.
  Check: `just test tests/kernel/budget.test.ts` pins 225,000 and 100,000.
- [ ] 2.4 Make `src/kernel/model.ts` mark an unknown model id as unknown, not as a known model.
  Check: a test with `claude-unknown-9` gives `unknown`.
- [ ] 2.5 Fix kernel F6 to F10: a read error is not an absent file, a parser error of the rules is not a YAML problem, `node/paths.ts` and the 4 constants with no reader go, and `MAX_PATTERNS` moves to `src/kernel/budget.ts`.
  Check: `just test tests/kernel/` passes, with a test of a read error and a test of a parser error.
- [ ] 2.6 Add a kernel helper that builds `updatedInput` from the whole tool input with the types of its input schema (V1 of 2.1.300), and use it in each hook that changes an input.
  Check: a test of an `Edit` change keeps each key of the input, and `rg -n 'updatedInput' src/plugins` lists only calls of the helper.

## 3. Handover

- [ ] 3.1 Write the `session.compact` hook of the main thread: the fork, the file write, the `$.fs.stat` check, and the return of the first user message, the handover, and the tail with its `handle`.
  Check: a lab test with a stubbed `session.compact` input gives the 3 parts, and keeps each tail `handle`, and `bunx markdownlint-cli2` gives no error on the written file (C1).
- [ ] 3.2 On `nothing-to-fork`, write the handover from `$.model.complete` on the text of `e.messages`.
  Call `next(e)` on `empty-reply`, `api-error`, a failed `$.model.complete`, a missing or empty file, a fork text with 0 quoted spans (`handover-modes-300.md`), and a `$.fs.stat` error, and leave a subagent compaction alone.
  Check: one lab test for each case, and a sandbox run of `--resume` with `-p "/compact"`, as in run `p6`, gives a handover and keeps its `result` (paid, about 0.03 USD).
- [ ] 3.3 Cut a tail that keeps the context above the trigger, or call `next(e)` when the cut is not enough.
  Check: a lab test with a tail of 120,000 tokens takes the cut path, and one with a larger tail takes `next(e)`.
- [ ] 3.4 Set the trigger with `autoCompactWindow` and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` from the bounds of 2.3.
  Check: a lab test reads the generated settings and finds the bounds for each model family.
- [ ] 3.5 Add the manual handover command: clear and submit in the TUI, the compaction path in `-p`.
  Check: a lab test of each surface.
- [ ] 3.6 Add the spinner and the final notice in the TUI, and no output in `-p`.
  Check: a lab test with a stubbed surface.
- [ ] 3.7 Add the compaction profile setting.
  Check: a lab test with the setting writes no handover file and calls `next(e)`.
- [ ] 3.8 Detect when the guard skips `claudetto` for `session.compact`, and add the managed-environments notice with the `appendPlugins` entry.
  Check: a lab test of a seated guard gives one notice, and a lab test with `claudetto` in `appendPlugins` gives none.
- [ ] 3.9 Run the handover in plain `-p` in `just sandbox-alone`, as in run `p5`.
  Check: the run gives the right answer, keeps its `result`, and the evidence file has the method and the result (paid, about 0.02 USD).
- [ ] 3.10 Write the handover page in `src/wiki/`.
  Check: `bun run lint:md` passes.
- [ ] 3.11 Write the done-step rule in the handover prompt and the handed message, with small re-checks allowed.
  Check: the handover eval with a wrong fact in the handover and the eval with a true handover each have no full repeat of a done step, and the evidence file has the results (paid, about 0.15 USD).
- [ ] 3.12 Add the managed setup help: the JSON change, one `! sudo` command, the side-effect warning, and no offer on a machine that an organization manages.
  Check: a lab test of each case: no file, a file, and server-managed settings.
- [ ] 3.13 Add the ground check: each backticked value of the handover is looked up in the session messages, and each miss adds a warning and a log line.
  The parser pairs backticks inside one line only, so an odd count does not make a span of prose (the bug of `handover-long-300/v3-150000/r1`).
  Check: a lab test with a changed value, a true value, and a line with an odd count of backticks, and the handover eval with a wrong fact gives the right answer in 5 of 5 runs (paid, about 0.08 USD).
- [ ] 3.14 Remove the extra turns of the handover: find the cause of each turn that v3 adds over the built-in compaction, and remove each one that is not the fork call.
  When a turn is a needed step, such as the 1-line read of the ground check, keep it only when a run without it gives a wrong answer, and record that run.
  Check: in the long eval at 150k, v3 has no more turns than the built-in compaction plus 1 for each compaction and each kept step, and the evidence file has the cause of each turn (paid, about 2.60 USD).

## 4. Prompt profile and context trim

- [ ] 4.1 Build the prompt variant of each model from the live 2.1.300 block, not from the stale extract (V6), and give a spawn with no `model` the block of its own model.
  Check: a test compares the intro rules of the variant with the live block, and a lab test of a spawn with no `model` gets its own block.
- [ ] 4.2 Remove each setting and env entry that equals the default of 2.1.300 (N9, N10), and add the compaction gate.
  Check: `just test tests/claudetto/prompt/` passes, and a test fails when a generated value equals its default.
- [ ] 4.3 Measure the size of each variant and of each text that `claudetto` adds to the first request (E5), and pin each in a test.
  Check: the test fails when a variant grows past its pin.
- [ ] 4.4 Check each trim switch against the bundle, with the shorter tool descriptions and the drop of built-in agent types.
  The `Bash` text states no fact that Claude Code computes for each run, `CLAUDE_CODE_REMOVE_PROMPT_STRINGS` removes the `WebSearch` note (E8), and each trim part has a runtime caller.
  Check: `just test tests/claudetto/trim/` passes, and a sandbox run lists `Glob` and `Grep` and has no `WebSearch` note (paid, about 0.02 USD).
- [ ] 4.5 Write the prompt and trim pages in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 5. Status line

- [ ] 5.1 Show the context against the model window and the distance to the handover.
  Check: a test with a stubbed 2.1.300 input gives the right values for Opus and Haiku.
- [ ] 5.2 Read the new inputs of 2.1.300, and show an error, not an empty field, when a read fails.
  Check: a test with a bad input gives the error mark.
- [ ] 5.3 Add the subagent status line and the colors with a meaning.
  Check: `just test tests/claudetto/status/` passes.
- [ ] 5.4 Map the colors to the built-in theme from the `theme` key, with the `*-ansi`, `*-daltonized`, and `NO_COLOR` cases, and add the prompt cache segment with `refreshInterval`.
  Check: a test of the `dark`, `light`, `dark-ansi`, and `dark-daltonized` themes gives the colors of the map, and a test with `prompt_cache.warm` `false` gives the cold mark.
- [ ] 5.5 Fix the status line review rows 109 to 113: each MiniSpec state in the change segment, a `git` error shown as an error, no silent `catch`, no dead code, and snapshot tests that do not depend on `TZ`.
  Check: `TZ=UTC just test tests/claudetto/status/` and `TZ=Asia/Tokyo just test tests/claudetto/status/` pass.
- [ ] 5.6 Update the status line page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 6. Guard, asks, checks, and attribution

- [ ] 6.1 Deny only a command part that only prints a file, read a `git` global option with a separate value as an option, and remove the AI-policy ask.
  Check: the S1 sample of 369 commands gives no false deny in `tests/claudetto/guard/`, and a test of `git -C dir status` gives no deny.
- [ ] 6.2 Ask before a call that discards work, weakens a test, or changes a protected file, and ask on an unreadable command.
  The ask covers a test file over the size bound and the bounds file of the asks (asks rows 14 and 15), and `git checkout -- bun.lock` gets an ask, not a deny (E7).
  Check: `just test tests/claudetto/asks/` passes, with a test for each named case.
- [ ] 6.3 Run a batch of checks with one call and one result, with the guard on each check, `pipefail`, and a timeout that stops the whole check and its child processes.
  `constructor` is not a count word, and the tests check results, not words, with no copy of a bound (checks rows 29 to 34).
  Check: `just test tests/claudetto/checks/` passes, with a test for each row.
- [ ] 6.4 Add the attribution trailer on each commit form, here-strings included, and on the PR body, with the kernel shell reader and the model name from the kernel.
  Ask on an unreadable command, and pass no option that `git commit` does not have (attribution rows 16 to 20).
  Check: `just test tests/claudetto/attribution/` passes, with a test for each row.
- [ ] 6.5 Update the guard pages in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 7. Role agents

- [ ] 7.1 Write the role agents with the write scope of the planner, one report-now note (S2), and `REPORT_MAX_WORDS` in `limits.ts`.
  Each tool that a prompt or fragment names is in the frontmatter (agents rows 8, 12, 13).
  Check: `just validate` passes, and a test reads each frontmatter and each named tool.
- [ ] 7.2 Set `model` and `effort` from the role table of D7, and add that table to the results file of the sweep.
  Check: a test compares each frontmatter with the table of D7, and fails when an Opus agent has `xhigh` or `max`.
- [ ] 7.3 Write the graders of the agent evals: an answer grader that fails on a list of all files, an `Agent` grader that checks the agent type, and a grader that fails a run that ends with a question in plain text or gives the user a decision that the agent can settle (S11, U1, agents rows 9 to 11).
  Check: a test runs each grader on a recorded passing and failing transcript.
- [ ] 7.4 Update the agents page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 8. Decision API, semantic breaks, output style, and setup

- [ ] 8.1 Make the decision API opt-in, with the pick, the confidence, and the errors kept.
  Duplicate option keys fail the input check, the eval entry counts the model calls, the bound is in `limits.ts`, and `TOOL_NAME` goes (decide rows 41 to 45).
  Check: `just test tests/claudetto/decide/` passes, and no call goes out when the option is off.
- [ ] 8.2 Fix the semantic breaks of list items, quotes, and CRLF line endings, with the `updatedInput` helper of 2.6 (sembr rows 80 and 81).
  Check: `just test tests/claudetto/sembr/` passes.
- [ ] 8.3 Write the concise output style and its evals that can fail: each grader checks the fix, not words, and `npm test` alone is not a check (U3, styles rows 114 to 120).
  Check: the eval fails on a padded sample, and a run of the style evals with and without the style is in the evidence file (paid, about 3.00 USD).
- [ ] 8.4 Write the settings setup: the check before a write, the built-in entries, the git excludes (U2), and the drift notice.
  Fix setup rows 90 to 97: quoted `git ls-files` names, a git failure is not "no files", `--apply` checks the call before it writes, a `null` file is not "No difference", no test of prose or test that cannot fail, the bound in `limits.ts`, and `SCOPES` goes.
  Check: `just test tests/claudetto/setup/` passes, with a test for each row.
- [ ] 8.5 Write the setup keys: `sandbox.filesystem.allowWrite` for the package caches (S6), `allowRead` for the SSH signing key that `git config user.signingkey` names (S5), `bashOutputMaxChars` 16000 (N8), `autoMode` with `$defaults` (N7), and a drift notice for an env key with no effect, such as `BASH_OUTPUT_MAX_CHARS` and `CLAUDE_CODE_MAX_CONTEXT_TOKENS` without `DISABLE_COMPACT` (V1 of the user settings).
  Check: a test for each key, and `bun install` in a sandbox of the lab test gives no `EPERM`.
- [ ] 8.6 Add the plugin `WorktreeCreate` and `WorktreeRemove` hooks (V3): create from `HEAD` (S4), copy the files that `.worktreeinclude` names, and remove a worktree only when `git status --ignored` shows no file that a session made (S8).
  Add the generated types of this repository to `.worktreeinclude` (W1).
  Check: a lab test of each hook, and `just typecheck` passes in a new agent worktree of this repository.
- [ ] 8.7 Update the pages of these slices in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 9. MiniSpec

- [ ] 9.1 Write the `minispec` CLI: `new`, `list`, `show`, `status`, `validate`, and `archive`, with `--json`, and the layout `minispec/specs/` and `minispec/changes/<name>/`.
  Check: `just test tests/claudetto/minispec/` passes, `minispec validate` refuses a check that is prose (S9), and `rg -l 'spec-store' plugins` gives no result.
- [ ] 9.2 Test the CLI against <https://clig.dev/>: help, stdout and stderr, exit codes, `NO_COLOR`, no prompt without a terminal, and errors that name the next step.
  Check: `just test tests/claudetto/minispec/cli.test.ts` passes.
- [ ] 9.3 Write the MiniSpec skills and templates for each tier.
  Check: `just validate` passes.
- [ ] 9.4 Add the back-to-planning step, the review by another agent, and the worktree support.
  Check: a sandbox run of a medium change in a linked worktree ends with the proposal, the tasks, and a review (U9, O2, paid, about 3.00 USD, and 9.5 uses the same run).
- [ ] 9.5 Measure the management calls in that run.
  Check: the evidence file shows less than 15% of the tool calls.
- [ ] 9.6 Link the handover to MiniSpec: the handover file in the change folder, and the next open task in the handover.
  Check: a lab test of a handover with an active change writes `minispec/changes/<name>/handover.md` and names the next task.
- [ ] 9.7 Write the MiniSpec page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 10. Output GC

- [ ] 10.1 Record each output of a session: `mktemp` folders, worktrees, copies, sandbox config folders, scratch files, and task output.
  Check: a lab test of `mktemp -d` writes a record with the path and the session id.
- [ ] 10.2 Write the sweep with the roots, the allowed folders, no symlink follow, and the age bound of 7 days and the size bound of 5 GiB in `slices/gc/limits.ts` (D6).
  Check: `just test tests/claudetto/gc/` covers a live root, a path outside the roots, and a symlink, and pins the two bounds.
- [ ] 10.3 Run the sweep at session start, at session end, and with a command that has a dry run.
  Check: the dry run in a sandbox lists paths and removes nothing.
- [ ] 10.4 Write the GC page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 11. YSK add-on

- [ ] 11.1 Gate the add-on on `tengu_jolly_dewdrop`, with one notice when the value is off.
  Check: a lab test of each value.
- [ ] 11.2 Run one check for each turn before the first change, with the band in the TUI and context in `-p`.
  The eval bound counts each model call (YSK rows 133 and 134).
  Check: a lab test of a turn with 5 edits makes one call.
- [ ] 11.3 Check each file claim against the disk, and give the side check as the source (E3, U7).
  The fork prompt has a data rule, and the grader checks the claim, not a `NONE` keyword (YSK rows 135 and 138).
  Check: a lab test drops a false claim about a whole file.
- [ ] 11.4 Count each write tool and each `Bash` write as a change, and log each failure (YSK rows 136 and 137).
  Check: `just test tests/claudetto-you-should-know/` passes, and the repeat and ask tests fail with a broken stub (YSK row 132).
- [ ] 11.5 Write the YSK page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 12. Browser add-on

- [ ] 12.1 Make CloakBrowser opt-in, and honor the `WebSearch` permission rules.
  Check: a lab test with a `WebSearch` deny rule makes no search.
- [ ] 12.2 Grant only the `agent-browser` subcommands of the guide, add the notices for dropped domain filters and a one-page `extended` search, and close each browser.
  A results page is not a bot check, and the session-name bound is in `limits.ts` (browser rows 22 and 24 to 28).
  Check: `just test tests/claudetto-browser/` passes.
- [ ] 12.3 Update the browser page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 13. Codegraph add-on

- [ ] 13.1 Ship the CLI skill by default and the MCP server through `bunx` as an option.
  Check: a sandbox run with the default lists no `codegraph` MCP tool (paid, about 0.02 USD).
- [ ] 13.2 Run one sync at a time with the kernel shell parser, and show CLI errors as errors, not as a missing CLI.
  The hook timeout covers the sync, no test checks words, and the hook margin is in `limits.ts` (codegraph rows 35 to 40).
  Check: `just test tests/claudetto-codegraph/` passes.
- [ ] 13.3 Update the codegraph page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 14. Docs add-on

- [ ] 14.1 Pin `ctx7`, ask for the project version, and allow only its read subcommands.
  The settings snippet allows the same command as the skill, the setup check reads `bunx`, and the call bound is in `limits.ts` (docs rows 46 to 51).
  Check: `just test tests/claudetto-docs/` passes.
- [ ] 14.2 Add the opt-in `context7` MCP server.
  Check: a sandbox run with the option lists the `context7` tools (paid, about 0.02 USD).
- [ ] 14.3 Update the docs page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 15. Lab add-on

- [ ] 15.1 Write the capture tool with no token in the log.
  Check: a test greps the log of a stubbed session for the token and finds nothing.
- [ ] 15.2 Make the eval comparison fail on an empty arm and on a missing `input_tokens`, with the bound of `report.ts` in `limits.ts` (lab rows 69 to 71).
  Check: `just test tests/claudetto-lab/` passes.
- [ ] 15.3 Make the frontmatter check fail when no plugin loaded, keep the sandbox apart from the user config, and move `start-run.ts` to `tools/` (lab rows 68 and 72).
  Check: `just test tests/claudetto-lab/` passes, and `rg -l 'start-run' plugins` gives no result.
- [ ] 15.4 Update the lab page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 16. Sessions add-on

- [ ] 16.1 Write the start cost and the usage reports, with an unknown model and an empty transcript handled (U5).
  One label names one count, `--text-max` fails with no snapshot, and no data gives its own status (sessions rows 82 to 85).
  Check: `just test tests/claudetto-sessions/` passes, with a test for each row.
- [ ] 16.2 Add the rate-limit note, `session.identity` with a managed install, `.catch` on each gating hook, and the version record.
  Check: a lab test of each (N1, N5), and a transcript with no raw JSON stamp (L3).
- [ ] 16.3 Fix sessions rows 86 to 89: the difference test can fail, `TIMEOUT_MS` is in `limits.ts`, the 3 unused exports go, and the `--text-min` comment agrees with the code.
  Check: `just test tests/claudetto-sessions/` passes.
- [ ] 16.4 Update the sessions page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 17. Integration

- [ ] 17.1 Run the handover in the TUI and in `-p --input-format stream-json` in the sandbox.
  Check: the evidence file has the method and the result of each mode (paid, about 0.10 USD).
- [ ] 17.2 Run each add-on alone with `just sandbox-alone`.
  Check: each session starts with no error in the debug log (paid, about 0.12 USD).
- [ ] 17.3 Remove the historical dotclaude pages from `src/wiki/`.
  Check: `rg -il 'dotclaude' src/wiki` lists only the migration page.
- [ ] 17.4 Add the CHANGELOG entries under `0.1.0-alpha.1`.
  Check: `bun run lint:md` passes.
- [ ] 17.5 Run the full gate.
  Check: `just check` passes, and each task that `coverage.md` names is checked.

## Workflow follow-up

- Tag `0.1.0-alpha.1` and publish the wiki with `just wiki`, after the user approves.
- Archive the change after review.
