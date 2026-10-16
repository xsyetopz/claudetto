# Tasks

Each check runs from the repository root.
`just check` must pass at the end of each group.
[coverage.md](coverage.md) maps each fault to its task.
A paid task gives its expected cost, and [costs.md](costs.md) has the total.
Ask the user before each paid run, with the cost and the current weekly share.

## 1. Generator and plugin names

- [x] 1.1 Rename the source folders in `src/plugins/` to `claudetto` and `claudetto-<name>`, and remove `dcc-plugin-agents-md`.
  Check: `just generate` writes `plugins/claudetto/` and the 6 add-on folders, and `ls plugins` shows no `dotclaude` or `dcc-plugin` folder.
- [x] 1.2 Write the new `.claude-plugin/marketplace.json` from the generator, with the version `0.1.0-alpha.1`.
  Check: `claude plugin validate .` passes, and `just generate --check` reports no drift.
- [x] 1.3 Add the ladder line to the source of each slice (D2), and a test that each slice has it.
  Check: `just test tests/kernel/ladder.test.ts` passes, and fails when one line is removed.
- [x] 1.4 Copy the kernel parts that each add-on uses into the add-on (D8), and add a test that no add-on imports from another plugin.
  Check: `just test tests/kernel/imports.test.ts` passes.
- [x] 1.5 Build for Claude Code 2.1.301 or later: the docs state it, CI installs it, and the code has no runtime version check.
  Check: `.github/workflows/ci.yml` installs `2.1.301`, `wiki/Install.md` names it, and no code in `src/` compares the Claude Code version.
- [x] 1.6 Add the `claudetto` overview page to `src/wiki/`.
  Check: `bun run lint:md` passes.
- [x] 1.7 Change the `homepage` test in `tests/support/manifests.test.ts` to the `claudetto` repository, so that the 8 tests that the rename broke pass.
  Check: `just test tests/support/manifests.test.ts` passes, and fails with a `homepage` of another repository.
- [x] 1.8 Gate the schema builder by the Claude Code version: `--version` without `--bundle` must match the installed version, or the command fails and names it (C2).
  Check: the `schemas/` key test passes with the installed version, and a test with version `9.9.9` writes no schema.
- [x] 1.9 Exempt `.claude/skills/openspec-*` from the line bound in `tools/validate.ts` (C3, the user, 2026-10-15: "excempt agreed").
  Check: `just validate` passes with the OpenSpec skills, and a test of a 301-line file in another `.claude/` folder fails.
- [x] 1.10 Find the cause of V7 with a `Stop` agent hook in `-p`: run the 2 permission modes `default` and `auto` in a new and in a used config folder, each with `--debug-file` and `--include-hook-events`.
  Write the cause and the method to `live-checks.md`.
  When the cause is in `claudetto` or its settings, fix it with a lab test.
  When the cause is in Claude Code, no `claudetto` feature uses an agent hook in the failing case, and a test checks that.
  Check: the evidence file names the failing case and the debug log line that shows why (paid, about 0.10 USD).
- [x] 1.11 Fix the repository tools (review rows 122 to 128): one owner of the eval lock, a lock that holds while the paid run lives, a dry run that refuses an unknown flag in `release.ts` and `bump-version.ts`, the kept traces of `eval-variant`, the cost bound in `tools/limits.ts`, and quoted names in the stray check.
  Check: `just test tests/tools/` passes, with one test for each row.

## 2. Kernel

- [x] 2.1 Remove `src/kernel/spec-store.ts` and `src/kernel/stamp.ts` and each import of them.
  Remove the slices `rules` and `stamp`, which stay behind, and the slices `handoff` and `spec`, which groups 3 and 9 write again, with their tests.
  Check: `rg -l -g '!**/guard/s1-*.json' 'kernel/(spec-store|stamp)\.ts|slices/(rules|stamp)/' src tests tools` gives no result, `ls src/plugins/*/slices` shows none of the 4 slices, and `just typecheck` passes.
- [x] 2.2 Fix the parser holes of the shell parser in `src/kernel/shell/` that `faults.md` lists.
  Check: one test for each listed hole in `tests/kernel/shell*.test.ts` passes.
- [x] 2.3 Move the handoff trigger bounds and the other new runtime bounds to `src/kernel/budget.ts`.
  Check: `just test tests/kernel/budget.test.ts` pins 225,000 and 100,000.
- [x] 2.4 Make `src/kernel/model.ts` mark an unknown model id as unknown, not as a known model.
  Check: a test with `claude-unknown-9` gives `unknown`.
- [x] 2.5 Fix kernel F6 to F10: a read error is not an absent file, a parser error of the rules is not a YAML problem, `node/paths.ts` and the 4 constants with no reader go, and `MAX_PATTERNS` moves to `src/kernel/budget.ts`.
  Check: `just test tests/kernel/` passes, with a test of a read error and a test of a parser error.
- [x] 2.6 Add a kernel helper that builds `updatedInput` from the whole tool input with the types of its input schema (V1 of 2.1.300), and use it in each hook that changes an input.
  Check: a test of an `Edit` change keeps each key of the input, and `rg -n 'updatedInput' src/plugins` lists only calls of the helper.
  Done without a kernel helper: each rewrite is a mod `tool.call` handler that calls `next({ ...e, key })`, and the 2.1.301 types of `tool.call` refuse a wrong type, an unknown key, and a partial input at the type check. No hook sends `updatedInput`.

## 3. Handoff

- [x] 3.1 Write the `session.compact` hook of the main thread: the fork, the file write, the `$.fs.stat` check, and the return of the first user message, the handoff, and the tail with its `handle`.
  Check: a lab test with a stubbed `session.compact` input gives the 3 parts, and keeps each tail `handle`, and `bunx markdownlint-cli2` gives no error on the written file (C1).
- [x] 3.2 On `nothing-to-fork`, write the handoff with a `haiku` completion on a digest of the messages of at most 15,000 tokens, because a completion reads no prompt cache (`handoff-cost-301.md`).
  Call `next(e)` on a digest that does not fit, `empty-reply`, `api-error`, a missing or empty file, a fork text with 0 quoted spans (`handoff-modes-300.md`), and a `$.fs.stat` error, and leave a subagent compaction alone.
  Check: one lab test for each case, and a resume trial of each arm (`--resume` with `/compact`, the next turn, and the questions) keeps each labeled value at a lower compaction cost than the built-in compaction (`handoff-retention-301.md`).
- [x] 3.3 Cut a tail that keeps the context above the trigger, or call `next(e)` when the cut is not enough.
  Check: a lab test with a tail of 120,000 tokens takes the cut path, and one with a larger tail takes `next(e)`.
- [x] 3.4 Set the trigger with `autoCompactWindow` and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` from the bounds of 2.3.
  Check: a lab test reads the generated settings and finds the bounds for each model family.
- [x] 3.5 Add the manual handoff command: clear and submit in the TUI, the compaction path in `-p`.
  Check: a lab test of each surface.
- [x] 3.6 Add the spinner and the final notice in the TUI, and no output in `-p`.
  Check: a lab test with a stubbed surface.
- [x] 3.7 Add the compaction profile setting.
  Check: a lab test with the setting writes no handoff file and calls `next(e)`.
- [x] 3.8 Detect when the guard skips `claudetto` for `session.compact`, and add the managed-environments notice with the `appendPlugins` entry.
  Check: a lab test of a seated guard gives one notice, and a lab test with `claudetto` in `appendPlugins` gives none.
- [x] 3.9 Run the handoff in plain `-p` in `just sandbox-alone`, as in run `p5`.
  Check: the run gives the right answer, keeps its `result`, and the evidence file has the method and the result (paid, about 0.02 USD).
- [x] 3.10 Write the handoff page in `src/wiki/`.
  Check: `bun run lint:md` passes.
- [x] 3.11 Write the done-step rule in the handoff prompt and the handed message, with small re-checks allowed.
  Check: the handoff eval with a wrong fact in the handoff and the eval with a true handoff each have no full repeat of a done step, and the evidence file has the results (paid, about 0.15 USD).
- [x] 3.12 Add the managed setup help: the JSON change, one `! sudo` command, the side-effect warning, and no offer on a machine that an organization manages.
  Check: a lab test of each case: no file, a file, and server-managed settings.
- [x] 3.13 Add the ground check: each backticked value of the handoff is looked up in the session messages, and each miss adds a warning and a log line.
  The parser pairs backticks inside one line only, so an odd count does not make a span of prose (the bug of `handoff-long-300/v3-150000/r1`).
  Check: a lab test with a changed value, a true value, and a line with an odd count of backticks, and the handoff eval with a wrong fact gives the right answer in 5 of 5 runs (paid, about 0.08 USD).
- [x] 3.14 Remove the extra turns of the handoff: find the cause of each turn that v3 adds over the built-in compaction, and remove each one that is not the fork call.
  When a turn is a needed step, such as the 1-line read of the ground check, keep it only when a run without it gives a wrong answer, and record that run.
  Check: in the long eval at 150k, v3 has no more turns than the built-in compaction plus 1 for each compaction and each kept step, and the evidence file has the cause of each turn (paid, about 2.60 USD).

## 4. Prompt profile and context trim

- [x] 4.1 Build the prompt variant of each model from the live 2.1.301 block, not from the stale extract (V6), and give a spawn with no `model` the block of its own model.
  Check: a test compares the intro rules of the variant with the live block, and a lab test of a spawn with no `model` gets its own block.
- [x] 4.2 Remove each setting and env entry that equals the default of 2.1.300 (N9, N10), and add the compaction gate.
  Check: `just test tests/claudetto/prompt/` passes, and a test fails when a generated value equals its default.
- [x] 4.3 Measure the size of each variant and of each text that `claudetto` adds to the first request (E5), and pin each in a test.
  Check: the test fails when a variant grows past its pin.
- [x] 4.4 Check each trim switch against the bundle, with the shorter tool descriptions and the drop of built-in agent types.
  The `Bash` text states no fact that Claude Code computes for each run, no trim part sets `CLAUDE_CODE_REMOVE_PROMPT_STRINGS`, which does not reach the `WebSearch` note (E8), and each trim part has a runtime caller.
  Check: `just test tests/claudetto/trim/` passes, and a sandbox run lists `Glob` and `Grep` (paid, about 0.02 USD).
- [x] 4.5 Write the prompt and trim pages in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 5. Status line

- [x] 5.1 Show the context against the model window and the distance to the handoff.
  Check: a test with a stubbed 2.1.300 input gives the right values for Opus and Haiku.
- [x] 5.2 Read the new inputs of 2.1.300, and show an error, not an empty field, when a read fails.
  Check: a test with a bad input gives the error mark.
- [x] 5.3 Add the subagent status line and the colors with a meaning.
  Check: `just test tests/claudetto/status/` passes.
- [x] 5.4 Map the colors to the built-in theme from the `theme` key, with the `*-ansi`, `*-daltonized`, and `NO_COLOR` cases, and add the prompt cache segment with `refreshInterval`.
  Check: a test of the `dark`, `light`, `dark-ansi`, and `dark-daltonized` themes gives the colors of the map, and a test with `prompt_cache.warm` `false` gives the cold mark.
- [x] 5.5 Fix the status line review rows 109 to 113: each MiniSpec state in the change segment, a `git` error shown as an error, no silent `catch`, no dead code, and snapshot tests that do not depend on `TZ`.
  Check: `TZ=UTC just test tests/claudetto/status/` and `TZ=Asia/Tokyo just test tests/claudetto/status/` pass.
- [x] 5.6 Update the status line page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 6. Guard, asks, checks, and attribution

- [x] 6.1 Deny only a command part that only prints a file, read a `git` global option with a separate value as an option, and remove the AI-policy ask.
  Check: the S1 sample of 369 commands gives no false deny in `tests/claudetto/guard/`, and a test of `git -C dir status` gives no deny.
- [x] 6.2 Ask before a call that discards work, weakens a test, or changes a protected file, and ask on an unreadable command.
  The ask covers a test file over the size bound and the bounds file of the asks (asks rows 14 and 15), and `git checkout -- bun.lock` gets an ask, not a deny (E7).
  Check: `just test tests/claudetto/asks/` passes, with a test for each named case.
- [x] 6.3 Run a batch of checks with one call and one result, with the guard on each check, `pipefail`, and a timeout that stops the whole check and its child processes.
  `constructor` is not a count word, and the tests check results, not words, with no copy of a bound (checks rows 29 to 34).
  Check: `just test tests/claudetto/checks/` passes, with a test for each row.
- [x] 6.4 Send the attribution reminder of Claude Code, which `includeGitInstructions: false` turns off, with no read of the command text.
  It goes to the main loop after each change of the lines and after a compaction, and to each new subagent.
  Check: `just test tests/claudetto/attribution/` and `just lab` pass, with a test for a model switch, a compaction, managed lines, a spawn, and lines that are off.
- [x] 6.5 Update the guard pages in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 7. Role agents

- [x] 7.1 Write the role agents with the write scope of the planner, one report-now note (S2), and `REPORT_MAX_WORDS` in `limits.ts`.
  Each tool that a prompt or fragment names is in the frontmatter (agents rows 8, 12, 13).
  Check: `just validate` passes, and a test reads each frontmatter and each named tool.
- [x] 7.2 Set `model` and `effort` from the role table of D7, and add that table to the results file of the sweep.
  Check: a test compares each frontmatter with the table of D7, and fails when an Opus agent has `xhigh` or `max`.
- [x] 7.3 Write the graders of the agent evals: an answer grader that fails on a list of all files, an `Agent` grader that checks the agent type, and a grader that fails a run that ends with a question in plain text or gives the user a decision that the agent can settle (S11, U1, agents rows 9 to 11).
  Check: a test runs each grader on a recorded passing and failing transcript.
- [x] 7.4 Update the agents page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 8. Decision API, semantic breaks, output style, and setup

- [x] 8.1 Make the decision API opt-in, with the pick, the confidence, and the errors kept.
  Duplicate option keys fail the input check, the eval entry counts the model calls, the bound is in `limits.ts`, and `TOOL_NAME` goes (decide rows 41 to 45).
  Check: `just test tests/claudetto/decide/` passes, and no call goes out when the option is off.
- [x] 8.2 Fix the semantic breaks of list items, quotes, and CRLF line endings, with the `updatedInput` helper of 2.6 (sembr rows 80 and 81).
  Check: `just test tests/claudetto/sembr/` passes.
- [ ] 8.3 Write the concise output style and its evals that can fail: each grader checks the fix, not words, and `npm test` alone is not a check (U3, styles rows 114 to 120).
  Check: the eval fails on a padded sample, and a run of the style evals with and without the style is in the evidence file (paid, about 3.00 USD).
- [x] 8.4 Write the settings setup: the check before a write, the built-in entries, the git excludes (U2), and the drift notice.
  Fix setup rows 90 to 97: quoted `git ls-files` names, a git failure is not "no files", `--apply` checks the call before it writes, a `null` file is not "No difference", no test of prose or test that cannot fail, the bound in `limits.ts`, and `SCOPES` goes.
  Check: `just test tests/claudetto/setup/` passes, with a test for each row.
- [x] 8.5 Write the setup keys: `sandbox.filesystem.allowWrite` for the package caches (S6), `allowRead` for the SSH signing key that `git config user.signingkey` names (S5), `bashOutputMaxChars` 16000 (N8), `autoMode` with `$defaults` (N7), and a drift notice for an env key with no effect, such as `BASH_OUTPUT_MAX_CHARS` and `CLAUDE_CODE_MAX_CONTEXT_TOKENS` without `DISABLE_COMPACT` (V1 of the user settings).
  Check: a test for each key, and `bun install` in a sandbox of the lab test gives no `EPERM`.
- [x] 8.6 Add the plugin `WorktreeCreate` and `WorktreeRemove` hooks (V3): create from `HEAD` (S4), copy the files that `.worktreeinclude` names, and remove a worktree only when `git status --ignored` shows no file that a session made (S8).
  Add the generated types of this repository to `.worktreeinclude` (W1).
  Check: a lab test of each hook, and `just typecheck` passes in a new agent worktree of this repository.
- [x] 8.7 Update the pages of these slices in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 9. MiniSpec

- [x] 9.1 Write the `minispec` CLI: `new`, `list`, `show`, `status`, `validate`, and `archive`, with `--json`, and the layout `minispec/specs/` and `minispec/changes/<name>/`.
  Check: `just test tests/claudetto/minispec/` passes, `minispec validate` refuses a check that is prose (S9), and `rg -l 'spec-store' plugins` gives no result.
- [x] 9.2 Test the CLI against <https://clig.dev/>: help, stdout and stderr, exit codes, `NO_COLOR`, no prompt without a terminal, and errors that name the next step.
  Check: `just test tests/claudetto/minispec/cli.test.ts` passes.
- [x] 9.3 Write the MiniSpec skills and templates for each tier.
  Check: `just validate` passes.
- [x] 9.4 Add the back-to-planning step, the review by another agent, and the worktree support.
  Check: a sandbox run of a medium change in a linked worktree ends with the proposal, the tasks, and a review (U9, O2, paid, about 3.00 USD, and 9.5 uses the same run).
- [x] 9.5 Measure the management calls in that run.
  Check: the evidence file shows less than 15% of the tool calls.
- [x] 9.6 Link the handoff to MiniSpec: the handoff file in the change folder, and the next open task in the handoff.
  Check: a lab test of a handoff with an active change writes `minispec/changes/<name>/handoff.md` and names the next task.
- [x] 9.7 Write the MiniSpec page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 10. Output GC

- [x] 10.1 Record each output of a session: `mktemp` folders, worktrees, copies, sandbox config folders, scratch files, and task output.
  Check: a lab test of `mktemp -d` writes a record with the path and the session id.
- [x] 10.2 Write the sweep with the roots, the allowed folders, no symlink follow, and the age bound of 7 days and the size bound of 5 GiB in `slices/gc/limits.ts` (D6).
  Check: `just test tests/claudetto/gc/` covers a live root, a path outside the roots, and a symlink, and pins the two bounds.
- [x] 10.3 Run the sweep at session start, at session end, and with a command that has a dry run.
  Check: the dry run in a sandbox lists paths and removes nothing.
- [x] 10.4 Write the GC page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 11 to 16. Add-ons

The tasks of the add-ons are in [tasks-addons.md](tasks-addons.md).

## 17. Integration

- [x] 17.1 Run the handoff in the TUI and in `-p --input-format stream-json` in the sandbox.
  Check: the evidence file has the method and the result of each mode (paid, about 0.10 USD).
- [x] 17.2 Run each add-on alone with `just sandbox-alone`.
  Check: each session starts with no error in the debug log (paid, about 0.12 USD).
- [x] 17.3 Remove the historical dotclaude pages from `src/wiki/`.
  Check: `rg -il 'dotclaude' src/wiki` lists only the migration page.
- [x] 17.4 Add the CHANGELOG entries under `0.1.0-alpha.1`.
  Check: `bun run lint:md` passes.
- [x] 17.5 Run the full gate.
  Check: `just check` passes, and each task that `coverage.md` names is checked.

## 18. No Word Matching

- [x] 18.1 Remove each check that reads words of a natural language: the CloakBrowser bot check, the `sembr` abbreviation list, the run-checks counts and failure words, the `minispec` keywords and `[y/N]` prompt, the status line `git` message, the asks name and key substrings, the ysk topic words, the sessions `agentId:` text, and the eval regexes on the final message.
  Check: `just test` on each changed folder passes, with tests in Polish, Russian, and Japanese.
- [x] 18.2 Add the `usercheck` slice: after a denied call, a reply with no `!` command gets one block.
  Check: `just lab` passes the 6 tests of `lab/usercheck.test.ts`.
- [x] 18.3 Write one debug log line for each prompt anchor that finds nothing.
  Check: `just lab` passes the 2 anchor tests of `lab/section.test.ts`.
- [x] 18.4 Add the spec `worktree-hooks`, which `Architecture.md` names.
  Check: `openspec validate claudetto-0-1-0` passes with no warning.
- [x] 18.5 Run the full gate again.
  Check: `just check` and `just docker check` pass.

## 19. Prompt Files

- [x] 19.1 Generate `prompts.ts` of a slice from its `prompts/` folder, with `{{name}}` parameters and `{{NAME}}` bounds, and remove the `NAME.ts/` text folders.
  Check: `just test tests/tools/generate/` passes the 4 tests of `prompts.test.ts`.
- [x] 19.2 Move each message to Claude or to the user from the code of each slice to `prompts/`.
  Check: `just test` and `just lab` pass.
- [x] 19.3 Run the full gate again.
  Check: `just check` and `just docker check` pass.
- [x] 19.4 Flag a text of more than `CODE_TEXT_MAX_CHARS` characters in the code of a plugin or of the kernel, by its count of characters, and move each flagged message to `prompts/`.
  Check: `just test tests/support/prose-in-code.test.ts` passes, and `just check` and `just docker check` pass.

## 20. Commit Check, AI Policy, and Setup of `CLAUDE.md`

- [x] 20.1 Add the `claude-md` command of `/claudetto:setup`, which writes the `claudetto` part of `CLAUDE.md` between marker comments at the user, project, or local scope.
  Check: `just test tests/claudetto/setup/` passes, with a test for each scope and a second run that changes nothing.
- [x] 20.2 Fix the findings of the 2 debugger reviews before the commit of the slices.
  Check: `just check` passes, and each fix has a test that fails on the old code.
- [x] 20.3 Write the `env` keys of a git `commit-msg` hook in setup, which runs only in the shells of Claude and rejects a commit with no commit line of the session.
  A repository config that turns the hook off does not win over the `env` keys.
  Check: `just test tests/claudetto/attribution/commit-hook.test.ts` passes on git 2.54 or later.
- [x] 20.4 Deny a `Bash` command that goes around the commit hook while the commit line is on.
  Check: `just lab` passes the bypass tests of `lab/git.test.ts`.
- [x] 20.5 Check the pull request body after `gh pr create` and `gh pr edit`, and deny a GitHub MCP pull request write with no pull request line.
  Check: `just lab` passes the pull request tests of `lab/git.test.ts`.
- [x] 20.6 Add the `policy` slice: before Claude sends work upstream to a repository that the `gh` login does not own (`git push`, `gh` writes, MCP writes, network writes), Claude reads the AI policy files and records a verdict, and a `forbidden` verdict stops these actions and no local work.
  Check: `just test tests/claudetto/policy/` and `just lab` pass, and each deny class has a test that fails when its check is removed.
- [x] 20.7 Add the push hook of the policy, the ask for `silent`, the bypass deny, the owned organizations, the marker of the calls of Claude, the token blank, and the git version note of setup.
  Check: `just test tests/claudetto/policy/` and `just lab` pass, and each part has a test that fails when the part is removed.
- [x] 20.8 Run the full gate again.
  Check: `just check` and `just docker check` pass.

## 21. Turn Gate, Ground Gates, and the Open Work

- [ ] 21.1 Answer the open checks of `Failure-Gaps-0.1.0` in the lab, at no cost, and record each answer on that page.
  Check: `just lab` passes a test for each answer.
- [ ] 21.2 Make `just check` pass with the seccomp work of `setup`, and fix the conflict of `sandbox-cmd.test.ts:217` with the seccomp check.
  Check: `just check` passes, and `just docker check` passes the Linux tests of `setup`.
- [ ] 21.3 Add the background-task part of the turn gate.
  Check: `just lab` passes a test for each scenario of `turn-gate`, with no model call.
- [ ] 21.4 Add the judge, its cap of 2, and the reason-only block text.
  Check: `just lab` passes the `turn-gate` scenarios with a stubbed judge, and a test fails when the gate passes on `stop_hook_active`.
- [ ] 21.5 Move each prohibition list of the prompts into the rubric of the judge, or delete it.
  Check: `just test` passes, and the `prompt` tests compare the prompts with the list on `Failure-Gaps-0.1.0`.
- [ ] 21.6 Measure the cost of one judge call, after the user approves the paid run.
  Check: the evidence page has the method and the figures.
- [ ] 21.7 Add the read gate, the deny of a rejected call, and the re-read after a rejected write.
  Check: `just lab` passes a test for each scenario of `ground-gates`.
- [ ] 21.8 Add the git state at the start, the `[Unreleased]` ask, the package ask, and the served-model mark.
  Check: `just test` and `just lab` pass a test for each scenario of `ground-gates`.
- [ ] 21.9 Add the effort floor and the turn bound of the agents, and the baseline check of `eval-compare`.
  Check: `just validate` fails on an agent at `low`, and `just test tests/claudetto-lab/` passes.
- [ ] 21.10 Write a lock file with the PID and the owner for each long check run (`I17`).
  Check: `just test` passes a test where a second run sees the lock.
- [ ] 21.11 Run the full gate again.
  Check: `just check` and `just docker check` pass.

## Workflow follow-up

- Tag `0.1.0-alpha.1` and publish the wiki with `just wiki`, after the user approves, and archive the change after review.
