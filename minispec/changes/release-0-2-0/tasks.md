# Tasks

Each task names its check as a command in a code span.
Mark a task done only after its check ran and passed.
Write the test of a task before its code, and see it fail first.
A red check matches the failure text that the task expects, not only a nonzero exit (D24).
Run a fast check of the changed files after each change of behavior, and the full `just check` once at the end of each group (D7).
The main session does each task itself, with no subagent and no worktree (D37).
Do group 3 first, then the other groups in order, because each compaction of the build uses the handoff and the stop gate (D37).
The release is stable: each row of `findings.md` is closed before the tag (D38).

## 1. Version and evidence

- [ ] 1.1 Add a test that `main(["minor", "--dry-run"])` of `tools/bump-version.ts` with no `--root` returns 0, and see it fail, because `rest` at line 95 drops `args[0]` when `at` is `-1`.
  Fix the filter, then bump the version to `0.2.0` with `just bump 0.2.0`.
  Check: `just test tests/tools/bump-version.test.ts && grep -q '"version": "0.2.0"' package.json`
- [ ] 1.2 Write `minispec/changes/release-0-2-0/findings.md` with one row for each surface of D38.
  Fill it from the transcripts in `~/.claude/projects/` of the sessions that used claudetto, read-only, from the facts of each `design*.md`, and from one run of each `bin/` command and each hook lab.
  Give each fault its source, the task that fixes it, and the check, and add a task for each fault that no task covers.
  Check: `test -s minispec/changes/release-0-2-0/findings.md && minispec validate release-0-2-0`
- [ ] 1.3 Read the rest of `external/2026-10-17/` and the older dossiers in `external/` for model, effort, prompt, and cache facts, and add each new fact that changes a decision to `design.md`.
  Check: `minispec validate release-0-2-0`

## 2. You-Should-Know and removals

- [ ] 2.1 Read all of the code of the built-in `cc-plugin-you-should-know` in the 2.1.302 bundle, and record its behavior in `src/wiki/rationale/Decisions-Session.md` with each source line: the trigger, the model, the effort, the prompt goals, the state, the timing, the keys, and the render tree with its colors, glyphs, and layout (D1).
  Check: `grep -q cc-plugin-you-should-know src/wiki/rationale/Decisions-Session.md`
- [ ] 2.2 Add lab tests of `claudetto-you-should-know`: its `AbovePrompt` tree has the first line `<kind> · <summary>`, a bold title, a list, and a last line, it draws nothing when it has no note, it calls no `$.telemetry` method, and it runs with `DISABLE_TELEMETRY` set, and see them fail.
  Each behavior of 2.1 gets a test.
  Rewrite the add-on as the smallest code that passes them, remove each old file that the rewrite does not use, and keep `cc-plugin-you-should-know@builtin` off in the snippet (D1).
  Check: `just generate && just test tests/claudetto-you-should-know && just lab && test $(find src/plugins/claudetto-you-should-know -name '*.ts' | xargs cat | wc -l) -lt 1607`
- [ ] 2.3 Remove each mention of `dotclaude` from the tracked files, the eval results included.
  Check: `! git grep -qi dotclaude`

## 3. Turn gate notice

- [ ] 3.1 Add a test that the cap notice of the turn gate is one line with `claudetto` at most once, and see it fail.
  Check: `! just test tests/claudetto/turngate/notice.test.ts`
- [ ] 3.2 Add a line fold in `src/kernel/text.ts` for each `$.ui.log` text, drop the prefix in `prompts/notice-cap.md`, and give the count of open tasks in place of the full reason.
  Check: `just test tests/claudetto/turngate/notice.test.ts && just lab`
- [ ] 3.3 Add a test that the turn gate does not block a second time for the same set of open tasks after the reply has reported them, and that its reason names `TaskStop` only when the session has the tool, then fix the gate.
  A session on 2026-10-17 had no `TaskStop`, the sandbox refused `kill`, and the gate blocked the same tasks three times.
  Also test that a `Bash` call that edits a file and then runs the check counts as a check after the edit, because the gate blocked such a call in the same session.
  The cause: `targetOf` in `slices/turngate/domain/calls.ts:37` gives the judge only the first line of the command, cut to `MAX_TARGET_CHARS` (160), so a check at the end of a heredoc or a long `&&` chain is not in the summary.
  Fix it by D22 (`design-surfaces.md`): the target is the first and the last line of the command, each cut to 80 characters.
  Check: `just test tests/claudetto/turngate && just lab`

- [ ] 3.4 Add a lab test that a compaction in a session whose shell is in a subfolder writes the handoff under the project root, and see it fail, then resolve `HANDOFF_DIR` against `CLAUDE_PROJECT_DIR` by D23, and move the handoff of this change out of `minispec/changes/release-0-2-0/.claudetto/`.
  Check: `just lab && test ! -e minispec/changes/release-0-2-0/.claudetto`

- [ ] 3.5 Add lab tests of the stop gate: no block for a running background task, one `additionalContext` notice with the count when the reply does not name the tasks, no second block when `stop_hook_active` is `true`, and the reply read from `last_assistant_message`, and see them fail, then change the gate and remove `MAX_BLOCKS` (D32).
  Check: `just test tests/claudetto/turngate && just lab`
- [ ] 3.6 Add a guard lab case for the command of the facts of `design-handoff.md`, with `$(( ))`, `$( )`, and a pipe, that must pass, and a test that a matcher with an empty name matches no tool, and see them fail, then fix the walk and the matcher at the cause (D35).
  Check: `just test tests/claudetto/guard && just lab`
- [ ] 3.7 Count the guard denies of read-only commands in the transcripts of other projects, read-only, add each one as a lab case, and write the count and the method to `wiki/evidence/Usage-Evidence.md` (D35).
  Check: `just lab && just test tests/claudetto/guard`
- [ ] 3.8 Add a test that each agent prompt and each delegation text of claudetto gives an objective, an output format, the tools, and the limits, and asks for bulk output in a file, and see it fail, then change the texts (D33).
  Check: `just generate && just test tests/claudetto/agents`
- [ ] 3.9 Add a test that each `!` command that a hook gives has the exact command and one line of reason, then change the hook texts (D36).
  Check: `just generate && just test tests/claudetto && just lab`

## 4. Agent caps and roster

- [ ] 4.1 Change `tests/claudetto/agents/max-turns.test.ts` to require no `maxTurns` in each agent file, and add a test that the `tool.call` hook adds no report-now text at 120K tokens for a Sonnet or Opus subagent.
  Check: `! just test tests/claudetto/agents/max-turns.test.ts`
- [ ] 4.2 Add a test that each Haiku agent file sets `autoCompactWindow` to `HAIKU_AUTOCOMPACT_WINDOW` (`144444`), and see it fail, then set it.
  The docs give the field from v2.1.296, with a range of `100000` to `1000000`, and `CLAUDE_CODE_AUTO_COMPACT_WINDOW` overrides it (`external/cc-2.1.302/docs/sub-agents.md:313`, `:1160`).
  Find in the bundle whether `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` applies to a subagent, so that compaction starts near 100K, and record the source in `src/wiki/rationale/Decisions-Session.md`.
  When it does not apply, keep the notice of D2 as the guard.
  Check: `just test tests/claudetto/agents && grep -q CLAUDE_AUTOCOMPACT_PCT_OVERRIDE src/wiki/rationale/Decisions-Session.md`
- [ ] 4.3 Remove `AGENT_MAX_TURNS`, `SUBAGENT_CONTEXT_MAX`, `HAIKU_CONTEXT_MAX`, each `maxTurns` line, and the turn-limit part of `claudetto-sessions` usage, and `slices/agents/prompts/report-note.md`, and keep only the Haiku guard of task 4.2, with a test that it does not stop the run and that the helper writes its report after a notice (D28).
  Change `src/fragments/report-size.md` so that the report length of the brief wins over `REPORT_MAX_WORDS` (D28).
  Check: `just generate && just test tests/claudetto/agents && just lab`
- [ ] 4.4 Add a test of the roster of `design.md` D3: the model and the effort of each agent, no Haiku agent above `high`, and a size of work in each description.
  Check: `! just test tests/claudetto/agents/roster.test.ts`
- [ ] 4.5 Add `scout` and `fixer`, and set the model and the effort of each agent to D3.
  Write each description as the size and the kind of work that fits, and each body as goals and limits, not steps.
  Check: `just generate && just test tests/claudetto/agents && just validate`
- [ ] 4.6 Remove the prompt text that asks for long-lived lane worktrees, and add a drift line of the setup for a missing `worktree.baseRef` of `head`, with a test.
  Record the source of D11 in `src/wiki/rationale/Decisions-Session.md`.
  Check: `just test tests/claudetto/setup && ! git grep -qi 'lane worktree' src`
- [ ] 4.7 Set `SUBAGENTS_MAX_20X` to 10 and `SUBAGENTS_API` to 4 by D14, keep `SUBAGENTS_PRO` at 2 and `SUBAGENTS_MAX_5X` at 4, and add the method and numbers of D14 to `wiki/evidence/Usage-Evidence.md`.
  Check: `just test tests/claudetto/setup tests/claudetto/prompt && bun run lint:md`
- [ ] 4.8 Add a test that `accountOf` with `subscriptionType: "max"` and no tier asks for the plan, and that setup writes the picks of the answer, and see it fail, then add the question to the setup by D19.
  Check: `just test tests/claudetto/setup`
- [ ] 4.9 Set the picks of each account to D20 (Pro `medium`, Max 5x, Max 20x, and API key `high`, Opus 5.5 for each), with the test that pins them.
  Check: `just test tests/claudetto/setup`

## 5. Status line

- [ ] 5.1 Add tests that the context segment shows `of 300k` for a window of 1M, and that a Haiku subagent row shows the Haiku window, and see them fail.
  Check: `! just test tests/claudetto/statusline/window.test.ts`
- [ ] 5.2 Use `windowOf` from `src/kernel/budget.ts` in `segments.ts` and a family window in `adapters/subagents.ts`.
  Check: `just test tests/claudetto/statusline`

## 6. Prompts and session start

- [ ] 6.1 Record the start tokens of `0.1.0-alpha.1` by source from an existing transcript, and set `START_TOKENS` in `tools/limits.ts` to half of the part that claudetto adds.
  Check: `grep -q START_TOKENS tools/limits.ts && just test`
- [ ] 6.2 List each point where claudetto can override or add a text in 2.1.302 (tool descriptions, system prompt blocks, output styles, agents, skills, MCP texts, the `CLAUDE.md` block, hook messages), with the model that reads each text, in `src/wiki/reference/Texts.md`.
  Check: `test -s src/wiki/reference/Texts.md && bun run lint:md`
- [ ] 6.3 Audit each text of 6.2 by `.claude/skills/claude-api/shared/prompt-audit.md` for the model that reads it, and write the report with `file:line` to `minispec/changes/release-0-2-0/prompt-audit.md`.
  Check: `test -s minispec/changes/release-0-2-0/prompt-audit.md`
- [ ] 6.4 Rewrite each text by the audit and D17: goals and limits, no step lists, no rule that a hook enforces, a fast check of the changed files after each change of behavior, the full checks once for each finished part, and none for an edit that changes no behavior (D7).
  Each text tells the model to report a gap or a blocker and not to work around it (D26).
  Add a `tool.describe` transform for each built-in tool whose text the audit shortens or fixes.
  Check: `just generate && just test tests/claudetto/prompt tests/claudetto/styles tests/claudetto/surface && bun run lint:md`
- [ ] 6.5 Cut the CLAUDE.md block of the setup, the MCP tool descriptions, the MCP server instructions, and the skill and agent descriptions to the words that a model needs to pick them.
  Check: `just generate && just test tests/claudetto/setup && just validate`
- [ ] 6.6 Measure the start of a fresh session with `just start-run` and `just measure`, and run the evals of group 11 on each cut text, and put back each cut that lowers a score (D26).
  This is a paid sandbox session: ask the user first, with the expected cost and the weekly share.
  Check: `just measure`

## 7. Cache and setup

- [ ] 7.1 Confirm the names `promptCacheTtl` and `subagentPromptCacheTtl` in the settings schema of the installed Claude Code, and record the source in `src/wiki/rationale/Decisions-Session.md`.
  Check: `just schema && grep -rq promptCacheTtl schemas/`
- [ ] 7.2 Add a test that the setup snippet has no `promptCacheTtl` and no `subagentPromptCacheTtl`, and that setup removes a `promptCacheTtl` of `5m` that an earlier setup wrote, then remove it from the snippet (D18).
  Check: `just test tests/claudetto/setup`
- [ ] 7.3 Add a test that the setup makes a change that it offered, such as the `claude` alias, when the user says yes, then change the setup text and code.
  Check: `just test tests/claudetto/setup`
- [ ] 7.4 Add a test that the sandbox step of the setup adds the cache and build folders that the toolchains of the project report, with no fixed list of tools or paths, then add the code.
  Check: `just test tests/claudetto/setup`

- [ ] 7.5 Add a test that fails when a claudetto text or hook names a tool that the settings snippet denies, and see it fail on `TaskStop`.
  Check: `! just test tests/claudetto/prompt/denied-tools.test.ts`
- [ ] 7.6 Write `src/wiki/reference/Tools.md` with one row for each built-in tool of 2.1.302 (purpose, start tokens, the claudetto need, the decision), and change the deny list of the snippet to match.
  Check: `just generate && just test tests/claudetto/prompt && bun run lint:md`
- [ ] 7.7 List each env var that the 2.1.302 bundle reads and the docs env-vars page names, and each settings key of the inventory, and write `src/wiki/reference/Env.md` and `src/wiki/reference/Settings-Keys.md` with one row for each: what it does, what else it changes, the sources, and the decision.
  Start from the inventory and the D18 list of `design-surfaces.md`.
  Check: `test -s src/wiki/reference/Env.md && bun run lint:md`
- [ ] 7.8 Add a test that pins the `env` of the settings snippet to the rows of `Env.md` with the decision `set`, then change the snippet.
  The test also pins the tracking variables of D31, and that the snippet sets no `OTEL_LOG_*` variable.
  Check: `just generate && just test tests/claudetto/setup tests/claudetto/prompt`
- [ ] 7.9 Measure from the transcripts the share of helper cache writes that follow a gap of more than 5 minutes, with the method in `wiki/evidence/Usage-Evidence.md`, and set `subagentPromptCacheTtl` to `1h` only when the rewrites that it saves cost more than the higher price of each write (D18).
  Check: `grep -q subagentPromptCacheTtl wiki/evidence/Usage-Evidence.md`
- [ ] 7.10 Write the command corpus of D43 in `tests/claudetto/guard/corpus/`: each destructive git form that must be denied, and each safe form that must pass, from the transcripts of other projects and the safe forms of D43.
  Check: `test -n "$(ls tests/claudetto/guard/corpus/)"`
- [ ] 7.11 Add a test that matches the corpus against the `permissions.deny` rules of the snippet by the matching of `permissions.md` (whole command, `*`, and each subcommand of a compound command), and see it fail, then write the exact deny rules (D43).
  Check: `just test tests/claudetto/setup tests/claudetto/guard`
- [ ] 7.12 Add a test that the snippet sets `sandbox.enabled`, `autoAllowBashIfSandboxed: true`, `allowUnsandboxedCommands: false`, `permissions.defaultMode: "acceptEdits"`, and the allow rules of the safe tools of `Tools.md`, and see it fail, then change the snippet (D43).
  Check: `just test tests/claudetto/setup`
- [ ] 7.13 Cut the `guard` hook to the forms that a rule cannot match (`sh -c`, `bash -c`, `eval`, and a program by path), with the corpus as its lab, and move each ask of `asks` for a call that discards work to the deny rules of 7.11 (D43, D35).
  Check: `just test tests/claudetto/guard tests/claudetto/asks && just lab`

## 8. MiniSpec format

- [ ] 8.1 Add tests that `minispec new` writes frontmatter and that `minispec validate` refuses a file with no frontmatter and a root with both `.minispec.yml` and `.minispec.yaml`, and see them fail.
  Check: `! just test tests/claudetto/minispec/format.test.ts`
- [ ] 8.2 Add the frontmatter and the `.minispec.yml` config to the `minispec` slice, and add both to this change.
  Check: `just test tests/claudetto/minispec && just generate && plugins/claudetto/bin/minispec validate release-0-2-0`

## 9. jscpd and the `dry` skill

- [ ] 9.1 Add tests of the `extends` merge of `jscpd` spec: deep merge, append of ignore lists, `<key>Remove`, `null`, and exit 2 on a cycle, and see them fail.
  Check: `! just test tests/claudetto/dry/merge.test.ts`
- [ ] 9.2 Add the slice `dry` with `assets/jscpd.base.json`, the merge in `bin/jscpd-config`, and no format list in code.
  Check: `just generate && just test tests/claudetto/dry`
- [ ] 9.3 Add `jscpd.local.json` that extends the shipped base with `"semantic": null`, write `.jscpd-baseline.json`, and add the `just dry` recipe to `just check`.
  Check: `just dry`
- [ ] 9.4 Write the skill `dry` in at most 60 lines: when to run jscpd, how to read a clone, and when a merge of clones is right.
  Check: `just generate && just validate && bun run lint:md`

## 10. Smaller source and wiki

- [ ] 10.1 Remove the slices `worktree`, `attribution`, and `corrections`, the `commit-msg` hook of the setup, and their tests and wiki pages, and add a setup test that the snippet has no `WorktreeCreate` hook and sets `attribution` (D12).
  Check: `just generate && just check`
- [ ] 10.2 Add tests that the snippet has a `permissions.ask` rule for each path and command ask of `asks`, and a `permissions.deny` rule for each prefix deny of `guard`, see them fail, then move those rules to the snippet and remove their code, and the deny of a print-only `Bash` command (D12).
  Check: `just test tests/claudetto/asks tests/claudetto/guard tests/claudetto/setup && just check`
- [ ] 10.3 Merge the files of `setup` that hold one concern, with no change of behavior, and remove each prompt fragment that one prompt uses (D12).
  Check: `just generate && just check`
- [ ] 10.4 Move each hand-edited page of `wiki/` to `src/wiki/`, generate all of `wiki/` from it, move each cited fact of `docs/research/` to `src/wiki/evidence/`, and remove `wiki/archive/` and `docs/research/` (D13).
  Check: `just generate --check && bun test tests/support/wiki-links.test.ts`
- [ ] 10.5 Cut each wiki page to at most 150 lines, with no narrative (D13).
  Check: `bun run lint:md && just validate`
- [ ] 10.6 Make `biome.json` and `.markdownlint-cli2.jsonc` skip `plugins/` and `wiki/` and lint `src/**/*.md`, and make `just generate` format its output with Biome (D13).
  Check: `just lint && just generate --check`
- [ ] 10.7 Add a `just validate` rule that fails on a slice with a hook and no row in `src/wiki/rationale/Controls.md`, see it fail, then write one row for each hook, guard, cap, and notice: its incident and the condition that removes it (D27).
  Check: `just validate`

- [ ] 10.8 Add a `just validate` rule that reads the pinned line count of each part from `tools/limits.ts` and fails when a part grows past it, and a rule that fails on a file under 15 lines that is not an entry point and on a folder with one file, and see both fail (D40, D41).
  Check: `just test tests/tools && just validate`
- [ ] 10.9 Write `minispec/changes/release-0-2-0/behavior.md` with the behavior table of each part of the table of facts of `design-redo.md`: each input of its tests and its old decision, from a run of the tests (D40).
  Check: `test -s minispec/changes/release-0-2-0/behavior.md && just test`
- [ ] 10.10 Remove the repeated-`Read` deny of `reads`, and check in the 2.1.302 bundle whether a built-in keeps a rejected call rejected, then keep that gate or remove the slice by the result, with the source line in `src/wiki/rationale/Decisions-Session.md` (D39).
  Check: `just test tests/claudetto/reads && just lab`
- [ ] 10.11 Merge `usercheck` into `turngate` with one `Stop` hook, with the rows of both in `behavior.md` as tests (D42).
  Check: `just test tests/claudetto/turngate && just lab`
- [ ] 10.12 Remove the `gc` slice, the CLI `claudetto-gc`, the command `/claudetto:gc`, their tests, and their wiki pages, and add the cleanup rule of D44 to the system prompt text and each agent prompt (D44).
  Check: `just generate && just test && ! test -d src/plugins/claudetto/slices/gc`
- [ ] 10.13 Rewrite each slice of the core plugin that D39 keeps, one part at a time, each to its rows of `behavior.md` and below its line count in `design-redo.md`, with the full `just check` after each part (D40).
  Check: `just check`
- [ ] 10.14 Rewrite each add-on plugin the same way, and then rewrite `src/kernel/` and `tools/` to what the parts still use, each below its line count (D40).
  Check: `just check`
- [ ] 10.15 Apply D41 to each part, and pin the line count of each part in `tools/limits.ts` (D40, D41).
  Check: `just validate`

## 11. Evals

- [ ] 11.1 Add a `just validate` rule that fails on an eval case whose only check matches reply words, and on a wiki claim that cites an eval with fewer than 10 runs in an arm, and see it fail on the current cases.
  Check: `! just validate`
- [ ] 11.2 Change each eval case to check a file, an exit status, or a tool call, or remove it, and remove each wiki number that no eval proves.
  Each case fails on a recorded bad run, names pass^k or pass@1, counts its tool calls and tokens, and the implementer cases keep a held-out split (D25).
  Check: `just validate`
- [ ] 11.3 Run the changed evals with `just eval-variant claudetto--v0.1.0-alpha.1` at 10 runs for each arm.
  This is a paid run: ask the user first, with the expected cost and the weekly share.
  Check: `just eval-variant claudetto--v0.1.0-alpha.1 --model claude-haiku-5-5 --max-cost-usd 5`
- [ ] 11.4 Run the implementer cases on Sonnet 5.5 `high`, Opus 5.5 `low`, and Opus 5.5 `medium` at 10 runs for each arm, and change D3 only by D21.
  This is a paid run: ask the user first, with the expected cost and the weekly share.
  Set the effort of each arm with `CLAUDE_CODE_EFFORT_LEVEL`, which overrides the `effort` of the agent files.
  Check: `CLAUDE_CODE_EFFORT_LEVEL=high just eval-variant claudetto--v0.1.0-alpha.1 --model claude-sonnet-5-5 --max-cost-usd 5`
- [ ] 11.5 Find in the bundle a variable that stops the telemetry of a `claude` run and keeps the feature flags, and record it in `src/wiki/rationale/Decisions-Session.md`.
  Add a test that `tools/telemetry.ts` gives an arm with the advisor that env and no `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, see it fail, then add it.
  When no such variable exists, drop task 11.6 and keep the `planner` (D31).
  Check: `just test tests/tools/telemetry-env.test.ts && grep -q advisor src/wiki/rationale/Decisions-Session.md`
- [ ] 11.6 Add the planning cases of D30 with their hidden lists, and check each case on a recorded bad plan (D25), then run the `planner` and `advisor` arms at 10 runs each, and keep or remove the `planner` agent by the rule of D30.
  This is a paid run: ask the user first, with the expected cost and the weekly share.
  Check: `just validate && grep -q 'planner.*advisor' wiki/evidence/Usage-Evidence.md`

- [ ] 11.7 Add an eval case that gives a task that writes to the temp folder, and checks that each folder that the task made is gone at the end, and run it at 10 runs (D44).
  Check: `just validate`

## 12. Release notes and gate

- [ ] 12.1 Add the entries of this change under `0.2.0` in `CHANGELOG.md`.
  Check: `grep -q '0.2.0' CHANGELOG.md && bun run lint:md`
- [ ] 12.2 Add a `just validate` rule that fails while `findings.md` has a row with no passed check, and see it fail on the open rows (D38).
  Check: `just validate`
- [ ] 12.3 Run the full gate in a container.
  Check: `just docker check`
- [ ] 12.4 Ask the user before the paid run, with the cost and the weekly share, then run one `just sandbox` session of the setup and one task of each slice on a fresh config, and write each fault to `findings.md` and fix it (D38).
  Check: `just validate`
- [ ] 12.5 Ask the user for a yes to tag `v0.2.0` and push, and do neither before the yes (D38).
  Check: `git tag --list v0.2.0`
