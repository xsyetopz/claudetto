# Tasks

Group 1 runs first, because its probes pick the routes of the later groups.
Group 2 runs next, because each later group writes `.ts` files in the new layout.
No agent edits the user settings files outside `configure`, and the user confirms each diff.
Each group ends with `just check`.

## 1. Probes and measures

- [x] 1.1 Probe the report-now note of design D1: a hook-lab case and one `just sandbox` run with a probe agent at `maxTurns` 8 and a note on turn 6.
  Verify by recording the turn of the report in `research/probes.md`, with the old and the new note text
- [x] 1.2 Probe whether `SubagentStop` fires when a subagent reaches `maxTurns`, with a logging hook in `just sandbox`.
  Verify by recording the hook input, or the absence of a call, in `research/probes.md`
- [x] 1.3 Probe whether `PreToolUse` or `PostToolUseFailure` fires for a call to `bash` (design D4).
  Verify by recording the hook inputs and the error text that the model gets
- [x] 1.4 Count the turns of each dotclaude agent type in the transcripts of the user with `dotclaude-sessions` (design D2).
  Verify by recording the run count, the median, and the 90th percentile of each type in `research/turns.md`
- [x] 1.5 Check `/config` in `just sandbox` with the forced style, with and without `outputStyle` (design D7).
  Verify by recording what `/config` shows in each case
- [x] 1.6 Read what `/usage` shows in the 2.1.296 bundle, and map each item to `rate_limits`, `cachedUsageUtilization`, or no source (design D3).
  Verify with the map in `research/usage.md`
- [x] 1.7 Trace each key of the snippet in the bundle (design D22).
  Verify with the table of key, trace, and effect in `research/snippet.md`
- [x] 1.8 Capture one turn with the `Stop` prompt hook and one without it.
  Verify that the extra Sonnet 5.5 request goes away without the hook, and record both figures
- [x] 1.9 Probe whether `claude --resume` loads a trimmed session JSONL with signed thinking blocks (design D19).
  Verify by recording the result in `research/probes.md`
- [x] 1.10 Probe whether a mod tool can show a multi-select picker with a note key and return its result (design D14).
  Verify by recording the result in `research/probes.md`
- [x] 1.11 Read how `/goal` sets and checks a condition in 2.1.296, and whether a skill can set it (design D20).
  Verify by recording the route in `research/probes.md`
- [x] 1.12 Extract the undocumented data of the 2.1.296 bundle: config keys, transcript entries, and cache files, with path, shape, and writer (design D24).
  Verify with the table in `research/data.md`, and a line for each source on the dotclaude feature that can use it
- [x] 1.13 Check the opt-in that brings back `Grep` and `Glob` in 2.1.296 (design D17): a capture with `--tools` that names them, and one with a tool rule that names them, against a capture with neither.
  Verify by recording the tool list and the start cost of each capture in `research/probes.md`, and give the figures to the user to pick the route
- [x] 1.14 Find in the bundle the default agent of an `Agent` call with no `subagent_type`, and any setting or env var that changes it (design D18).
  Verify with the offsets and a sandbox run in `research/probes.md`
- [x] 1.15 Check whether the `statusLine` command expands `${CLAUDE_PLUGIN_ROOT}` (design D13).
  Verify with a `just sandbox` run, and record the result in `research/probes.md`
- [x] 1.16 Probe whether a hooks module can run `/clear` with `$.command.run` and then submit a prompt with `$.prompt.submit`, in one `just sandbox` session (design D27).
  Verify by recording whether the conversation clears and the submitted prompt starts a turn, in `research/mod-api-probes.md`
- [x] 1.17 Map the whole mod API of 2.1.296 from the bundle (each hook event, each `$` call, shapes, refusals, tiers, budgets), and run an experiment for each part that a design decision uses or that the bundle leaves unclear.
  Verify with `research/mod-api-events.md`, `research/mod-api-calls.md`, and `research/mod-api-probes.md`, where each row says "works", "fails", or "not run", with the evidence

## 2. Foundation (`plugin-layout`, `generator`)

The cut of design D25 runs before the port, so only the code that stays moves to `.ts`.
Tasks 2.12 to 2.17 move the workspace to Bun 1.4.3, and they run before 2.5, so that the type work uses `bun check`.
So the type check and Biome of `just check` fail until 2.5 ends, and each of 2.12 to 2.17 is verified by its own checks with the other parts of `just check` (tests, `just validate`, and `just lab`).
The full `just check` runs at the end of the group.

- [x] 2.1 Probe whether a `tool.call` hook of the hooks module can ask the user, as a classic `PreToolUse` hook does with `ask` (design D26).
  Verify by recording the result in `research/probes.md`
- [x] 2.2 Write `research/cut.md`: each runtime file and test file with its call of design D25 (cut, move into the module, stay classic, or port), from the import graph and the result of 2.1.
  Verify by the review of the user
- [x] 2.3 Delete the files and tests that `research/cut.md` cuts.
  Verify with `just check` and `just lab`
- [x] 2.4 Check `tsconfig.json` for erasable syntax only and no emit, and make the type check of `just check` cover `.ts` files.
  Verify that `just check` runs the type check on one `.ts` file
  Task 2.13 moves this type check to `bun check`.
- [x] 2.5 Move the `lib/` and `features/` files that stay from `.mjs` to `.ts`, with `.ts` import extensions.
  Verify with `just check` and `just lab`
  State: `bun check` finds no type errors in 121 files (1,109 before the type work), and `just lab` passes.
  `just check` fails only in the line bound test, on two untracked session exports at the root of the repository.
  Keep each runtime value: use an `as` cast and not a `?? ""` fallback where the old code read an index.
- [x] 2.6 Move `hooks/register.mjs` to `hooks/register.ts`, move each tool check that denies or rewrites a call into its `tool.call` hook and each check that asks into a `tool.check` hook (design D26), and move each classic hook that stays to `hooks/<event-type>/<hook-name>.ts`.
  Verify with `just lab`, the "Classic hook folder" test, and the "Check in the module" and "Ask in the module" tests
- [x] 2.7 Move `tests/` and `tools/` to `.ts`.
  Verify that `just check` passes
  State: `bun check` finds no type errors in 229 files, and `just check` passes with 1022 tests.
  Where a test showed a wrong type in `plugins/`, the plugin type changed, and the test has no cast.
- [x] 2.8 Replace the shell-only `just` recipes with Bun scripts that use `Bun.$`, and the literal `/` path joins with `node:path` and `import.meta.dir`.
  Verify with the "Path join" test, and with CI on Windows, Linux, and macOS
  State: CI run 38178466172 passes `just ci` on Ubuntu, macOS, and Windows.
- [x] 2.9 Add `src/` and `just generate`: each text that a plugin ships comes from `src/` (design D12).
  Verify with the "Generate", "Header", and "Text in the plugin" tests
- [x] 2.10 Add the check that fails when a generated file differs from its source, and skip generated files in the size test.
  Verify with the "Edit by hand" and "Long generated file" tests
- [x] 2.11 Add the tests for "Shipped file", "Non-erasable syntax", and the import boundary on `.ts` files.
  Verify that each fails on a fixture
- [x] 2.12 Move the workspace from pnpm to Bun 1.4.3: `bun install` with `bun.lock` in place of `pnpm-lock.yaml`, `packageManager` `bun@1.4.3` in `package.json`, each `package.json` script and `just` recipe on `bun`, `bunx` in place of `npx`, and `CLAUDE.md` on Bun 1.4.3 and its commands (design D11).
  Verify that `just check` passes, and with the "Bun commands" test
- [x] 2.13 Replace the `tsc` type check with `bun check`, and remove the `typescript` dev dependency.
  Verify that `just check` runs `bun check` and fails on a fixture with a type error
- [x] 2.14 Move the tests from `node:test` to `bun:test`, run them with `bun test --check`, and move `tests/support/tmp-root` to the `preload` of `bunfig.toml`.
  Verify that `just check` passes with the same test count as before the move
- [x] 2.15 Make Bun run each classic hook, the status line, and each skill script, in `hooks.json` and the generator sources.
  Verify with `just lab` and the "Bun commands" test
  State: `src/` does not exist yet, so task 2.9 writes the generator sources with these commands, and the "Bun commands" test checks the generated `hooks.json`.
- [x] 2.16 Probe whether the mod runtime gives the `Bun` global or `bun:` modules to `hooks/register.ts`.
  Verify by recording the result in `research/probes.md`, and with the "Hooks module graph" test
- [x] 2.18 Keep each secret out of the tests and their output: Bun loads no `.env` in the workspace (`env = false` in `bunfig.toml`) or in a plugin command (`--no-env-file`), and a check on a token prints only a fixture value (`research/issues.md`, group 2).
  Verify with the test that a `.env` value does not reach a Bun process under the `bunfig.toml` of the repository, and with the tests of `tests/lab/sandbox/login.test.mjs`
- [x] 2.17 Replace each `node:` import that the map of design D28 gives a Bun API for, in `plugins/`, `tests/`, and `tools/`, and add the Bun API test.
  Verify that the test fails on a fixture with `node:child_process`, and that `just check` and `just lab` pass

## 3. Hook evals (`hook-evals`, `eval-suite`, `second-opinion`)

- [x] 3.1 Add the hook eval format and one case set for each hook: allow, block, shown text, cost for each turn, and false blocks.
  Verify with the "Hook with no eval" test
- [x] 3.2 Run the eval on the `Stop` prompt hook, and replace it with a command hook if the eval passes, else remove it.
  Verify with the "Evaluator prompt in the block", "Correct report", and "Repeated block" cases, and the cost of probe 1.8
- [x] 3.3 Add a hook-lab test that reproduces the lost multi-select answers of the Jev `AskUserQuestion` hook.
  Verify that it fails before the fix
- [x] 3.4 Fix the Jev hook: keep the question text, put the pick in an option description, and skip multi-select questions.
  Verify with the test of 3.3 and the "Answers keep their keys" scenario
- [ ] 3.5 Defer the Jev tool with and without `TYPESAFE_API_KEY`.
  Verify with the two start-cost scenarios in a capture
- [ ] 3.6 Add the approval-claim faults of the transcripts as eval cases of the prompt rule of task 5.7: a future decision, a claim that cites a project file, and a claim that cites an `AskUserQuestion` answer (design D25).
  Verify with the "Future pick" and "Sourced claim" scenarios of `system-prompt`
- [x] 3.7 Make each `Bash` guard check each part of a compound command.
  Verify with the "Read in a compound command" scenario
- [ ] 3.8 Add the code-span blocks of the transcripts as eval cases of the code-span rule of the output style (design D25).
  Verify that the eval of the output style holds the cases

## 4. Report-now note and roster (`context-bound`, `agent-definitions`, `model-router`)

- [ ] 4.1 Move the note to a `turn.step` hook that sends it with `$.session.send({ to: { agentId } })` (design D1), and change its text to name its source and state the facts, with no word count other than `REPORT_MAX_WORDS`.
  Verify with lab tests for "Note text", "Turn bound passed", and "Below the bound"
- [ ] 4.2 Add the hook-note rule and the tool-name rule to the generator source, and generate each agent body and variant.
  Verify with the "Agent body" and "Copy differs" tests
- [ ] 4.3 Add a line to the delegation text that a task prompt gives no word count above `REPORT_MAX_WORDS`.
  Verify with the variant tests and the byte budget test
- [ ] 4.4 Record in the wiki that `SubagentStop` does not fire at `maxTurns` (1.2), so the report comes before the cap and no fallback acts at it.
  Verify with `bun run lint:md`
- [ ] 4.5 Write the agent suite of design D18, with a body for each agent that a person reviews, and the write paths of each role in the guard.
  Verify with the "Agent files", "Defaults", "Research notes", "Read-only role", and "Agent listing" scenarios
- [ ] 4.6 Add the hook that denies an `Agent` call with no `subagent_type` and names the suite with the purpose of each agent, because no setting changes the default agent (1.14).
  Verify with the "No type" scenario in the hook lab
- [ ] 4.7 Check each hand-back against `REPORT_MAX_WORDS`, and set the cap again from measured reports with a table (design D1).
  Verify with a lab test on a report above the cap
- [ ] 4.8 Set `TURNS_LEFT_AT` and the `maxTurns` of each agent from 1.4, and record the measure in the wiki.
  Verify with the "Pin and record" scenario
- [ ] 4.9 Run the cost pilot of the new roster with `just usage`, and give the figures to the user before the release.
  Verify with the "Model change" scenario
- [ ] 4.10 Run the probe of 1.1 with the new route and text in `just sandbox`, once on each model of the roster.
  Verify that each run ends with a report before `maxTurns`

## 5. Core prompt and tool texts (`system-prompt`, `prompt-surface`)

- [ ] 5.1 Extract the simple system prompt and the tool descriptions of 2.1.296 into the generator source.
  Verify by recording their token counts from a capture
- [ ] 5.2 Rebuild the core prompt from the simple prompt with the fixes of design D6, and name `grep` and `find` through `Bash`, and `Read`, as the search and read route (the pick of the user after 1.13).
  Verify with the "Search route" test, the "Narration rule" review, and the "Gap outside the list" and "Pick on the list" eval cases
- [ ] 5.3 Trim the built-in tool descriptions to their definitions through `tool.describe`.
  Verify with the "Bash description" scenario
- [ ] 5.4 Audit the skills and the hook messages of the add-on plugins, and `external/2026-10-11`, against design D6.
  Verify with the findings in `research/prompt-audit.md`, and apply the ones that keep the dotclaude rules
- [ ] 5.5 Add a paired eval case for each rule above the simple prompt, and run the variant arms on the four models.
  Verify with "Rule with no gain" and "Variant eval", and remove each rule with no gain
- [ ] 5.6 Set the start budget from a capture after the cuts.
  Verify with the "Budget check" scenario
- [ ] 5.7 Add the rules of the `system-prompt` requirements "Ask and stop", "Check before agreement", "Go before writes", "Checks in the same turn", "Sourced picks", "Sandbox blocks", and "Claims with evidence" (`research/issues.md`, apply and `vegaspro` sessions).
  Put the rules in the core prompt, the agent bodies, and the output style, not in a regex hook.
  Verify with a paired eval case for each rule, from the faults of the transcripts, where the old arm fails
- [ ] 5.8 Add the code graph route to the core prompt and the agent bodies: a question about code goes to `codegraph` first when the session has one, and raw search and reads are the fallback (design D17).
  Verify with the "Code graph first" eval case, and count the `codegraph` and `grep` calls of one sandbox task against the apply session of 2026-10-11

- [ ] 5.9 Add the semi-autonomy rule to the core prompt, the agent bodies, and the delegation text: the session decides what the project state and the facts settle (task order, a route, a fix at its cause), runs each probe and check that it can run itself, and asks the user only for goals, preferences, and approvals (`research/issues.md`, group 2).
  Verify with paired eval cases from the apply session of 2026-10-11, an order question and a probe that the session asked the user to run, where the old arm fails

## 6. Unknown tool names (`system-prompt`)

- [ ] 6.1 Record in the wiki that no hook event fires for `bash` and that the error text gives the fix (1.3), so the prompt line and the error text are the only routes.
  Verify with `bun run lint:md`

## 7. Built-in inventory (`vanilla-surface`)

- [ ] 7.1 Add a `tools/` script that lists the built-in tools, skills, plugins, and attachment types from the installed bundle.
  Verify that it lists `PushNotification`, `CronCreate`, and `plugin-authoring` for 2.1.296
- [ ] 7.2 Check the gate and capture the start cost of each item, including auto-dream, the silent-turn and total-tokens reminders, the token-usage attachment, and the memory extraction.
  Verify with the table in `research/inventory.md`
- [ ] 7.3 Write the inventory page of the wiki with the picks of design D9, and add each switch to the snippet.
  Verify with the "New built-in tool", "Turned-off tool", and "Picks in the snippet" tests
- [ ] 7.4 Turn off the `Task*` tools, cron, and `ScheduleWakeup` in the snippet.
  Verify with the "Picks in the snippet" test
- [ ] 7.5 Capture a session with the new snippet.
  Verify the "Deny removes the tool" scenario, and record the start figures

## 8. Settings snippet (`settings-profile`)

- [ ] 8.1 Add `outputStyle: "dotclaude:dotclaude"` with the result of 1.5, and remove `promptCacheTtl`.
  Verify with the two "Snippet value" tests
- [ ] 8.2 Remove the recursive `rm` deny and the six `rm` ask rules with `*` around a flag letter, and let the guard parse the flags and allow a recursive delete under `$TMPDIR` only.
  Verify with the "Temp folder", "Home folder", and "Plain delete" tests
- [ ] 8.3 Remove each key with no trace from 1.7, and record each trace in the wiki.
  Verify with the "Untraced key" test
- [ ] 8.4 Add the test that the snippet has neither `Push` key.
  Verify that it fails on a fixture that sets `agentPushNotifEnabled`
- [ ] 8.5 Set `permissions.defaultMode: "auto"` in the snippet, and cut the `permissions` lists to exact prefix rules for the dangerous and destructive commands of design D22.
  First check in `just sandbox` whether a `Bash` rule matches each part of a compound command, with a rule on a harmless marker such as `Bash(echo probe-marker *)` and the command `true && echo probe-marker x`, so that no guarded command runs, and whether 2.1.296 has a rule form for PowerShell.
  Make the guard ask for a recursive delete outside the workspace and `$TMPDIR` in `bash`, `zsh`, PowerShell, and `cmd` forms.
  Verify with the "Snippet mode", "Destructive git command", "Dangerous delete on each shell", and "Routine command" tests, and with CI on Windows, Linux, and macOS

- [ ] 8.6 Find the layer that denied the `rm -rf` of an implementer on its own scratch folders under `/tmp` (a permission rule, the guard, or the auto mode classifier), and make the cleanup of a folder that the agent made pass with no ask, with 8.2 and 8.5 (`research/issues.md`, group 2).
  Verify with a `just sandbox` run where a subagent makes and deletes a folder under `$TMPDIR`

## 9. Configure and picker (`configure`, `commands`)

- [ ] 9.1 Redo and rename the dotclaude skills, and list each old and new name in the CHANGELOG.
  Verify with the "Old name" test
- [ ] 9.2 Add the `configure` script that computes the diff of each file for the three scopes and merges by key.
  Verify with the "Repository only", "User key kept", "Extra model", and "Status line field" tests
- [ ] 9.3 Point the status line to a stable launcher in `~/.claude` that finds the newest installed copy of the plugin (1.15), and write no machine path in project scope.
  Verify with the "Plugin update" and "Project scope" tests
- [ ] 9.4 Ask for each model and account choice, with its evidence.
  Verify with the "Mythos in the catalog" test
- [ ] 9.5 Add the confirmed write of `configure`, and remove `setup`.
  Verify with the "Run configure", "Rejected diff", and "No writer" tests
- [ ] 9.6 Build the picker as a mod tool with `$.ui.ask`, which returns `[]` when nothing is ticked (1.10).
  Verify with the "Nothing ticked" and "Note" tests in the hook lab
- [ ] 9.7 Run `configure` in `just sandbox` on a fresh config.
  Verify that the session after it matches the snippet of the wiki
- [ ] 9.8 Make `configure` run `bun --version` first, and show the install command of Bun with no write when Bun is missing or older than 1.4.3.
  Verify with the "No Bun" and "Old Bun" tests

## 10. Handoff and clear note (`handoff`, `context-bound`)

- [ ] 10.1 Add `HANDOFF_RESULT_MAX_BYTES` and the handoff script that trims the session JSONL.
  Verify with the "Trim" test
- [ ] 10.2 Add the continuation prompt with the active change and its open tasks.
  Verify with the "Active change" test of `handoff`
- [ ] 10.3 Load the handoff with `claude --resume` on the trimmed file (1.9), keep each tool result that the final text cites, and document the route in the wiki.
  Verify the "Resume" scenario in `just sandbox`
- [ ] 10.4 Add `CLEAR_NOTE_MAX_BYTES` and the `SessionStart` handler for `source` `clear`.
  Verify with lab tests for "Active change", "Other start", and "No change"
- [ ] 10.5 Run `/clear` in `just sandbox` in a project with an active change.
  Verify that the first answer names the change and the next open task
- [ ] 10.6 Measure the context sources of the apply session and the `vegaspro` sessions of 2026-10-11 with `dotclaude-sessions`, and the tokens that one handoff costs.
  Verify by recording the figures in `research/context.md`, and set `CONTEXT_NOTICE_AT` and `CONTEXT_HANDOFF_AT` from them
- [ ] 10.7 Add the `turn.step` hook of design D27 with `mainHandover` (`auto` by default, or `manual`), the notice, the handoff steps, and the clear route of 1.16.
  Verify with lab tests for "Notice", "Handoff in one long turn", and "Below the level"
- [ ] 10.8 Run a `just sandbox` session that passes `CONTEXT_HANDOFF_AT`, hands off, clears, and goes on, once with each `mainHandover` value.
  Verify the "Automatic clear" and "Manual clear" scenarios, and that the next task starts with no context lost from `tasks.md` and the artifacts

## 11. Goal and notifications (`goal`, `notifications`)

- [ ] 11.1 Add the goal entry with the route of 1.11, the change, the task range, and the turn cap.
  Verify with the "Default goal", "Task range", and "No change" tests
- [ ] 11.2 Run a goal in `just sandbox` on a change with 2 open tasks.
  Verify the "Tasks done" and "Turn cap" scenarios
- [ ] 11.3 Add the notify script on `Notification` and `Stop` for Windows, Linux, and macOS.
  Verify with the "Input needed" and "No notify tool" tests

## 12. Status line rows (`status-line`)

- [ ] 12.1 Extend the `/context` table parser with MCP tools, MCP server instructions, custom agents, and the compact buffer.
  Verify with tests for "Table in the tail" and "Part not in the table"
- [ ] 12.2 Replace the column grid with the 3 rows of design D3, with the usage items of 1.6.
  Verify with tests for "Wide terminal", "No usage data", and "Usage rows"
- [ ] 12.3 Show every model-scoped weekly window from `cachedUsageUtilization`.
  Verify with tests for "Fable row" and "Stale cache"
- [ ] 12.4 Set the drop order of "Fit to width" so that the model, the 7-day window, and the context meter stay.
  Verify with the "Narrow terminal" test at 60, 80, and 120 columns
- [ ] 12.5 Add the `/context` hint and the table age to row 3.
  Verify with the "No table" test
- [ ] 12.6 Remove the column code and its tests.
  Verify with `just check`
- [ ] 12.7 Show the status line to the user in `just sandbox` at the width of their terminal.
  Verify by the approval of the user
- [ ] 12.8 Measure the resize time of the terminal with the status line, without it, and with the render settings of Claude Code.
  Verify by recording the cause or the candidates in `research/resize.md`, and fix a cause in dotclaude

## 13. Lab (`plugin-layout`)

- [ ] 13.1 Resolve a relative `--settings` path of `just sandbox` against the folder of the user.
  Verify with a test from another folder
- [ ] 13.2 Make the drift check read the settings of `--settings`.
  Verify with a lab test that gives the snippet through `--settings`
- [ ] 13.3 Make `dotclaude-capture --count FILE` open no port, and stop an old proxy before a run.
  Verify with tests for both cases
- [ ] 13.4 Document `sandbox.network.allowLocalBinding` for `just capture` in `wiki/plugins/Sandbox.md`.
  Verify with `bun run lint:md`
- [ ] 13.5 Make `just capture` run in the agent sandbox with no settings change by the user, and remove the text that tells a session to ask the user about `allowLocalBinding` (`research/issues.md`, apply session).
  Verify with a capture run from an agent session where a listen on `127.0.0.1` fails with `EPERM`

## 14. Wiki and release

- [ ] 14.1 Rebuild the wiki, with one research page for each Claude Code version and its changes against the version before it.
  Verify with the "Supported version", "New tool", and "Repository check" tests
- [ ] 14.2 Document the undocumented data of 1.12 on the 2.1.296 page, and name the dotclaude part that uses each source.
  Verify with the "Usage cache" and "Undocumented source in use" scenarios
- [ ] 14.3 Record the out-of-scope items of design D10 with their reasons in the wiki.
  Verify with `bun run lint:md`
- [ ] 14.4 Add the CHANGELOG entries under `[Unreleased]`, with the breaking items marked.
  Verify with `bun run lint:md`
- [ ] 14.5 Run `just check` and `just lab`.
  Verify that both pass
- [ ] 14.6 Add a release check that the wiki of the version is published and that no tag of the version exists before the bump, so that no tag moves.
  Verify that the check fails on a fixture with an existing tag
- [ ] 14.7 Update `README.md` and the wiki install page: dotclaude needs Bun 1.4.3 or later, and the commands use `bun`.
  Verify with `bun run lint:md`

## Workflow follow-up

- After the user approves, run `just bump minor`, and `just wiki` to publish the wiki.
- After the release, archive the change with `/openspec-archive-change`.
