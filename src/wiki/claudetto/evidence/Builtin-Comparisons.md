# Built-In Comparisons

These are paid runs that compare two features of `claudetto` with the built-in features of Claude Code.
The first is the tool `advise` with the built-in advisor (task 5.1).
The second is the goal engine with the built-in `/goal` (task 5.2).
They ran on 2026-10-21, on Claude Code `2.1.306`, with Haiku 5.5 as the working model.
Each arm has 10 runs for each case, so every case meets the D25 floor.
There are two rounds.
The first round found that its cases were too easy, and the second round tried to fix that.

## Result

- On the easy tasks all arms pass, and on the hard tasks all arms fail.
  The advisor was called in every run of the advisor arms (see "Round 3").
  So on Haiku 5.5, neither advisor changes the outcome.
- A first price for the `opus` calls was twice too high.
  The price table is the catalog entry of the model, $4 and $20 for one million tokens in and out, and a run of the built-in advisor confirms it (see "Cost of `advise`").
  With the right price, `advise` at `effort` `high` costs 0.63 USD against 1.19 USD for 10 runs of `advice-audit`, and 0.56 USD against 2.02 USD for 10 runs of `advice-audit-web`.
- Round 6 measured the advice quality, the tokens of the built-in advisor, and the cost levers (see "Round 6").
  The built-in advisor sends about 23300 tokens in and gets about 5200 tokens out for a call.
  `advise` with `effort` `low` and a short answer sends about 2000 tokens in and gets about 1200 tokens out.
  It names as many of the 6 faults as the built-in advisor, for about 0.37 USD for 10 runs against 2.02 USD.
- Decision (the user, 2026-10-21): the default of `advisor` is `claudetto`, and since round 6 the default of `advisorEffort` is `low` and the system prompt asks for a short answer (see "Decision for the Default").
  The slice turns off the built-in advisor with `$.env.set` at `session.start`, so that Claude never sees two advisors.
  `$.model.complete` reports tokens only, and the mod API has no way to add a cost to the session or a price source, so the cost of the `opus` calls stays out of the session cost.
- Goal engine against the built-in `/goal`: parity on `goal-two-checks` and `goal-first-violation` (10 of 10 each, again after the fix).
  `goal-blind-qa` favours the engine by design, because the built-in `/goal` cannot run a check.
  The engine passed 10 of 10 and the built-in `/goal` passed 0 of 10.
- The retry case found one defect of the goal engine, a `judge` check that cannot pass.
  The defect is fixed (see "Goal Engine").
- The round 3 audit runs found one limit of `advise`: its context held no tool results, and this is fixed (see "Round 3").
- The missing cost of the `opus` calls of `advise` is a limit of Claude Code, not a defect of `claudetto`.

## Method

`claude plugin eval` could not run the arms, so a script runs them.

- The eval child takes only `EVAL_*` keys in `execution.env`, and it has no `--advisor` flag.
  A run with `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL=1` in the shell gave no advisor tool to the model.
  An option of the plugin has no way into the eval child.
- `tools/compare-builtins.ts` runs `claude -p` in the sandbox of `claudetto-sandbox` ([Sandbox](Sandbox)).
  It reads the prompt, the scaffold, and the graders of a `case.yaml`, so the cases keep the form of the other eval cases.
- A run has a new workspace, built by the `scaffold.sh` of the case.
  The plugin loads with `--plugin-dir`, and the options of the arm are in `pluginConfigs` of the sandbox settings.
  The script grades the files with the `regex` graders, and the tool calls with the `tool_used` graders.
  An optional `final.sh` of the case runs in the workspace, and it must exit 0.
  The cases are in `tests/compare/`, not in `evals/` of a slice, so they do not ship in `plugins/`.
  So `claude plugin eval`, `just eval`, and `just eval-tune` never see them (`tests/claudetto/evals/compare-cases.test.ts`).
  A run passes when all graders pass.
- Command: `bun tools/compare-builtins.ts <case dir> <arm> --runs 10 -j 4 --max-cost-usd <usd>`.
- Pilots: one run of each case on each arm ran first, to catch a broken grader.
- Model: `claude-haiku-5-5` for the work.
  The advisor of both advisor arms is `opus`, so the two arms ask the same model.
  No arm needed a stronger working model.
- The graders read files and tool calls, not the words of the reply.

### The Arms

| Arm | Setup |
| --- | --- |
| `advise-ours` | Option `advisor` set to `claudetto`, `advisorModel` set to `opus`, and `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`. The model calls `mcp__claudetto__advise`. |
| `advise-builtin` | Option `advisor` set to `builtin`, and the flag `--advisor opus`. The model calls the server tool `advisor`. |
| `advise-none` | The control: `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` and no tool. The grader `advisor-called` is left out. |
| `goal-ours` | The plugin as it is. The prompt `/goal <condition>` goes to the goal engine. |
| `goal-builtin` | A copy of the plugin with the hooks of the `goal` slice removed, so the built-in `/goal` runs and the other slices stay. |

### The Cases

- `advice-rounding`: A cart total is one cent low, because `toCents` floors a float product.
  The prompt asks for the advisor once before any edit.
  Graders: `ROOT.txt` names `toCents`, the fix is `Math.round`, `report.mjs` and `cart.mjs` stay as they are, and the advisor was called.
- `advice-rename-field`: The field `name` becomes `fullName` in a property, a destructure, a JSON file, and a key built from `"na" + "me"`.
  Decoys `username` and `filename` must stay.
  Graders: seven file graders and the advisor call.
- `goal-two-checks`: Three bugs, and a style script that is not a test.
  The prompt is ``/goal `node --test check` and `node check/style.mjs` both exit 0``.
  Graders: `final.sh` runs both commands.
- `goal-first-violation`: Eight modules with `var` and no header, three bugs, and a style script that stops at the first fault.
  The prompt is the same.
- `goal-blind-qa`: The task is in `TASK.md` and says little.
  `CLAUDE.md` says the files in `check/` belong to QA, and that Claude must not open or run them, because the goal runs them.
  `check/qa.mjs` shows the first of six rules that fails, so the first attempt fails and the goal must start new turns.
  The prompt is ``/goal `node check/qa.mjs` exits 0``.
  Graders: `src/slug.mjs` exists, `qa.mjs` was not read, and `final.sh` runs `qa.mjs`.
  The built-in `/goal` has no engine that runs a check, so this case tests exactly the feature that differs.

The cases are in `tests/compare/`.

## Results

The cost is the sum of `total_cost_usd` of the runs.

| Case | Arm | Passed | Mean turns | Cost (USD) |
| --- | --- | ---: | ---: | ---: |
| `advice-rounding` | `advise-ours` | 10/10 | 10.7 | 0.050 |
| `advice-rounding` | `advise-builtin` | 10/10 | 8.0 | 1.193 |
| `advice-rounding` | `advise-none` | 10/10 | 5.1 | 0.083 |
| `advice-rename-field` | `advise-ours` | 10/10 | 11.6 | 0.064 |
| `advice-rename-field` | `advise-builtin` | 10/10 | 11.3 | 1.221 |
| `advice-rename-field` | `advise-none` | 10/10 | 8.0 | 0.088 |
| `goal-two-checks` | `goal-ours` | 10/10 | 11.0 | 0.056 |
| `goal-two-checks` | `goal-builtin` | 10/10 | 9.5 | 0.067 |
| `goal-first-violation` | `goal-ours` | 10/10 | 17.6 | 0.062 |
| `goal-first-violation` | `goal-builtin` | 10/10 | 16.6 | 0.079 |
| `goal-blind-qa` | `goal-ours` | 10/10 | 3.5 | 0.097 |
| `goal-blind-qa` | `goal-builtin` | 0/10 | 14.9 | 0.103 |

- For `advise`, the pooled pass rate is 20/20 on each side.
  The 95% Newcombe CI of the difference is [-0.16, +0.16].
  One case alone (10 against 10) gives [-0.28, +0.28].
- The cost of `advise-ours` in this table leaves out its calls to `opus`.
  The tool calls `$.model.complete`, and Claude Code does not add that cost to `total_cost_usd`.
  The sums of `advise-ours` are in "Cost of `advise`", with the `opus` calls measured.
- The goal arms cost the same within noise, and the working model is cheap.
  The turn counts differ by about 1 to 1.5 turns, and the ranges overlap.

## Attempts at a Case That Separates the Arms

The coordinator asked for two `advise` cases where the control without an advisor passes 5 of 10 runs or fewer.
Haiku 5.5 passed every candidate, in 1-run to 6-run pilots of the control arm:

| Candidate | Control passes | Pilot cost (USD) |
| --- | ---: | ---: |
| `mergeIntervals` with three faults, one visible | 4/4 | 0.03 |
| A stale test, with the rule in `docs/RULES.md` and a hint in `CLAUDE.md` | 4/4 | 0.03 |
| The same, with the hint removed | 6/6 | 0.05 |
| A generated file `src/routes.mjs` that `final.sh` regenerates | 4/4 and 4/4 | 0.05 |
| `isoWeek` near the turn of a year, hidden dates | 4/4 and 4/4 | 0.08 |
| Eight functions with one subtle fault each, hidden audit | 6/6 | 0.11 |
| The same, with no `Bash` tool to run code | 6/6 | 0.10 |
| A logic puzzle of 6 houses and 54 clues, no `Bash` tool | 6/6, 6/6 with `--effort low`, 6/6 with thinking off, then 10/10 | 0.28 |

Haiku found each hidden fault by reading the code, and solved the puzzle by hand.
A case that Haiku fails alone needs a task that reasoning, reading, and running code cannot solve, and then an advisor that sees only the conversation cannot solve it either.
So no honest case with a control at 5 of 10 or less was found.

## Round 3

The goal was a measurement with both advisors run on tasks that Haiku fails alone.

### Pilots of the Control

All pilots ran the control arm (no advisor) with the subagent tools off (`--disallowedTools Agent,Task,ListAgents,SendMessage`).
This matters: in the first pilots Haiku used a `Plan` subagent as its advisor, so the control was not clean.

| Candidate | Control passes | Setting |
| --- | ---: | --- |
| `dayStarts`, date ranges across zone changes, with a time limit | 3/3, 3/3, 3/3, 3/3 | default, `--effort low` with thinking off, no subagent, no `Bash` |
| `parseScsv`, a precise dialect of CSV with escapes | 3/3, 3/3, 3/3, 3/3 | the same four settings |
| `bestJobs`, jobs on k machines (min-cost flow), brute force check and time limit | 3/3, 3/3, 3/3, 3/3 | the same four settings |
| `erfc` to a relative error of 1e-14 | 3/3, 4/4 | default, and `--effort low` with no `Bash` |
| `advice-audit`, a review with 8 subtle faults | 0/4, 0/4, 0/4 | no `Bash`, no subagent |
| `advice-audit-web`, a review with 6 subtle faults | 3/4, 0/4, 0/4 | the same |

Haiku wrote a correct min-cost flow and a correct `erfc` without `Bash`.
Only the code reviews with subtle faults made the control fail.
The four algorithm candidates are not kept in the repository.
Two early versions of the audit cases flagged safe decoy functions for real reasons, so the final graders list the faults only and do not punish extra findings.

### Full Runs

Both cases ran with the working model on Read, Write, and Edit, no `Bash`, and no subagent tools, the same in each arm.
The prompt asks for the advisor once, after the file is read.
The grader `advisor-called` is a `tool_used` grader, and the table counts it from the traces.

| Case | Arm | Passed | Runs with an advisor call | Cost (USD) |
| --- | --- | ---: | ---: | ---: |
| `advice-audit` | `advise-none` | 0/10 | 0 | 0.046 |
| `advice-audit` | `advise-ours` | 0/10 | 10 | 0.055 (session only) |
| `advice-audit` | `advise-builtin` | 0/10 | 10 | 1.185 |
| `advice-audit-web` | `advise-none` | 0/10 | 0 | 0.059 |
| `advice-audit-web` | `advise-ours` | 0/10 | 10 | 0.055 (session only) |
| `advice-audit-web` | `advise-builtin` | 0/10 | 10 | 1.481 |

### Is the 0/10 the Task?

- The reference list of faults, run through `final.sh` of each case, passes. A stub with no list fails.
- In `advice-audit`, every run of every arm missed the same two items: `readUpload` (a symlink in the folder) and `findAccount` (the Kelvin sign and other case mappings of `toLowerCase`).
  The other six items were found in 10 of 10 runs of `advise-none` and `advise-builtin`, and in 6 to 10 of 10 runs of `advise-ours`.
  Three runs of `advise-ours` also missed `unsign`.
- One direct review of `src/web.mjs` by `opus` in `-p` (the code in the prompt) named all six faults and also `webhookOk`, which is safe.
  The review of `src/app.mjs` ran too, but its reply was cut by the hooks of the project, so the page makes no claim on it.
  So the web case is solvable by `opus` when it sees the code, and the 0 of 10 there means that Haiku did not turn the advice into a complete list.
- The 0 of 10 is not a broken grader: the reference list passes, and the failed runs miss named items.

### A Limit of `advise`

The `opus` advice of `advise` began with "I haven't seen `src/app.mjs`, so all of this rests on your summary."
`advise` sends the text of the messages and the names of the tools, but no tool results, so the advisor does not see the file that Claude read.
The built-in advisor reads the whole transcript.
The fix is made after this round:
the context now holds the recent tool results, which `$.session.messages()` already gives in `toolResults`.
No run yet shows that it changes a result.

### Reruns of the Goal Cases

The two goal cases ran again with `goal-ours` on the fixed engine, with 10 runs each:
`goal-two-checks` 10/10 for 0.054 USD, and `goal-first-violation` 10/10 for 0.063 USD.
The folders are `rerun-<case>-goal-ours`.
With the first round, this shows parity with the built-in `/goal` on these two cases.
`goal-blind-qa` favours the engine by design, because the built-in `/goal` cannot run a check.

## Decision for the Default

The default of `advisor` is now `claudetto` (commit `b56351e0`).

- On easy tasks all arms pass, and on hard tasks all arms fail, so `advise` is as good as the built-in advisor.
- The first measure, at `effort` `high`, was 0.63 USD against 1.19 USD for 10 runs of `advice-audit`, so `advise` was cheaper already (see "Cost of `advise`").
- Round 6 found that `effort` `low` and a short answer give the same recall for about 1/5 of the cost of the built-in advisor, so the default `advisorEffort` is `low` and the system prompt asks for at most 10 lines.
  For 10 runs of `advice-audit-web`, the total is about $0.37 against $2.02.
- With `claudetto`, the slice sets `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` at `session.start` with `$.env.set`, so that Claude sees one advisor.

### Live Check of the One-Advisor Rule

On 2026-10-21, two `claude -p` runs with `--advisor opus` and `--model haiku` asked for the names of all tools that contain "advis".
The run with `--plugin-dir plugins/claudetto` (default options) gave `mcp__claudetto__advise` only.
The run with no plugin gave `advisor`.
So the variable that the slice sets at `session.start` turns off the built-in advisor.
The two runs cost $0.006.

## Cost of `advise`

The `opus` calls of `advise` are not in `total_cost_usd`.
This is a limit of Claude Code, not a defect of `claudetto`.

- `$.model.complete` resolves the text and a `usage` of four token counts (`ModelUsage`).
  It gives no price, and the mod API has no call that adds a cost to the session.
- `advise` sends the token counts to the user with `$.ui.log`, in the line "`advise`: opus used N tokens in (R read from the cache, W written to the cache), M tokens out."
  The debug log holds every `$.ui.log` line (the type `UiLogOptions` in the mod API), so `claude --debug-file <path>` captures them.
  `tools/compare-builtins.ts` passes `--debug-file` for each run, and `tools/advise-usage.ts` (removed in 0.3.0) sums the lines and prices them.
- The price is the price table that Claude Code uses for its own `total_cost_usd`, read from the bundle as evidence only.
  The model catalog of Claude Code `2.1.305` (`external/cc-2.1.305/strings.txt`) has the entry of `claude-opus-5-5` (`VERTEX_REGION_CLAUDE_5_5_OPUS`) with the pricing `tier_4_20_cache_read_0_20`.
  That is $4 for one million tokens in, $20 out, $5 for a cache write, and $0.20 for a cache read.
  A run of the built-in advisor confirms it: `modelUsage` gave 22528 tokens in and 4309 tokens out for a `costUSD` of 0.176292, which is 4 and 20.
  The first version of this page took the entry `kb` of the same bundle ($8 and $40), which is a table for another path, and it was twice too high.
- `advise-ours` ran with `--model haiku` and the advisor model `opus` (`claude-opus-5-5`).

| Case | Runs | Passed | Session cost | `opus` calls | Tokens in | Tokens out | `opus` cost | Total | Built-in arm |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `advice-audit`, `effort` `high` | 10 | 0/10 | 0.045 | 10 | 21390 | 24787 | 0.581 | 0.626 | 1.185 |
| `advice-audit-web`, `effort` `high` | 2 | 0/2 | 0.010 | 2 | 4299 | 5565 | 0.128 | 0.138 | 1.481 for 10 runs |

- At `effort` `high`, one call used about 2100 tokens in and about 2500 tokens out, and no call read or wrote the cache.
  It cost about 0.06 USD, and the early guess was 0.035 USD.
- So the first conclusion of this round, that `advise` was not cheaper, was wrong, because of the price.
  `advise` at `effort` `high` already cost about half of the built-in advisor on `advice-audit`.

## Round 6

The goal was the quality of the advice, the exact cost of the built-in advisor, and the cheapest `advise` at equal quality.
All arms ran `advice-audit-web` (6 faults), Haiku 5.5 as the working model, and `opus` as the advisor.
Each arm in the table ran 10 runs.
A first pass with fewer runs for each arm picked the levers, and the table holds the final measure.

- The built-in advisor gives an encrypted result (`advisor_redacted_result`), so its advice text cannot be read.
  So the quality is measured on `FINDINGS.txt`, the list that Haiku writes after the advice, for all arms.
  A fault counts when a line of the file starts with the function and holds the words of its fault.
  For the arms with `advise`, the advice text is graded too: the function and the words of its fault within 400 characters.
- The words for each fault are in `FAULTS` in `tools/advise-usage.ts`, written before any result was graded, and a unit test covers the grader.
- The tokens of the built-in advisor are the `modelUsage` of `claude-opus-5-5` in the `result` event of each run.
  Each run had one advisor call.
  The `thinkingTokens` of `opus` are 0 there, and `ModelUsage` of `advise` has no thinking count either, so thinking is inside the output tokens in both.

| Arm | Faults in `FINDINGS.txt` (of 6) | Faults in the advice | Tokens in for a call | Tokens out for a call | Cost for a run (session plus `opus`) | Cost for 10 runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| built-in | 4.8 | not readable | 23283 | 5160 | 0.202 | 2.02 |
| `advise`, `high` (the first default), short answer | 4.7 | 5.0 | 2011 | 2128 | 0.056 | 0.56 |
| `advise`, `medium`, short answer | 4.8 | 5.2 | 2107 | 1607 | 0.046 | 0.46 |
| `advise`, `low`, short answer (the default now) | 4.9 | 5.3 | 2022 | 1196 | 0.037 | 0.37 |

- No arm passed a run, because each run missed one or two faults, so the comparison rests on the recall.
  The runs differ by at most 1 fault, so the noise of a mean of 10 runs is about 0.1 faults, and the four means are inside that noise.
- The built-in advisor sends the whole transcript with its own system prompt, about 23300 tokens, which is 11 times the context of `advise` (about 2000 tokens).
  Its output is also 4 times longer.
  No cache was read or written in the advisor call.
- The levers, in the order tried:
  - `MAX_TOKENS` (the `maxTokens` of `$.model.complete`): in a small trial at 1024 and at 700 the calls still gave more than the cap in output tokens (1670 on average at 700), because the cap bounds the text and not the thinking.
    The saving at 700 was 10% at most, and a cap can cut a piece of advice, so the bound stays 2048.
  - `effort`: from `high` to `low` the output fell from 2128 to 1196 tokens with no fall of the recall (in the first pass, with the long prompt, from 3266 to 1851).
    `$.model.complete` has no switch to turn thinking off.
  - A tighter `system.md` ("at most 10 short lines", with the function or file named for each point): at `low` the output fell from 1851 to 1196 tokens, and the recall held.
  - A cache mark on the stable prefix: the prefix is about 100 tokens, below the minimum that the API caches, and the logs show 0 tokens written to the cache.
    So it saves nothing now, and the mark stays because it costs nothing.
  - A cheaper advisor model: not tried, because the cost of an `opus` call is already about 0.03 USD.
- The folders are in `round6/` on the machine of the run.

## Goal Engine

- Both engines took `/goal <condition>` in `-p`.
  In the two cases where the model may run the checks, it fixed all faults in the first stretch of work, and the arms were equal.
- In `goal-blind-qa` the engine of the plugin ran `node check/qa.mjs` at the end of each turn, and it started a retry turn with the failure.
  Each of 10 runs had 4 retry turns, and all 10 passed.
  The built-in `/goal` printed "Goal set", and the model would not run the QA check.
  It stopped at the first turn, and 0 of 10 passed.
  The built-in `/goal` is not wrong to stop, because the model followed the rule of the project.
  But it shows that only the engine can run a check for Claude.
- The case found a defect.
  A condition that starts with a code span gave a `run` check and a `judge` check of the whole text.
  For ``node check/qa.mjs` exits 0`, the `run` check passed in the last turn, but the `judge` check failed, because the model could not run the command and its answer had no proof.
  The goal stopped by `stall` although the command exited 0.
  The first run of the case (before the fix) shows it: `results` held a passing `run` check and a failing `judge` check with the same time.
- The fix is in `checksOf` (`slices/goal/domain/plan.ts` at `v0.2.0`): the words `both`, `all`, `each`, `exits 0`, `passes`, `succeeds`, and `green` no longer make a text a `judge` check.
  The test was in `tests/claudetto/goal/plan.test.ts` at `v0.2.0`, and `Goal.md` has the rule.
  After the fix, 10 of 10 runs passed.
- The first-round cases `goal-two-checks` and `goal-first-violation` ran before the fix.
  Their condition ("both exit 0") now gives two `run` checks and no `judge` check, so the engine decides from the exit codes only.
  They were not run again.

## Limits

- One working model (Haiku 5.5) and one Claude Code version.
- The `advise` cases are at the ceiling, and the control passes them.
- `goal-blind-qa` favors the engine by design, because the project rule forbids Claude to run the check.
- The grader `advisor-called` counts calls, so it shows that the advisor ran, not that its advice was good.
- The cost of `advise-ours` on `advice-audit-web` at `effort` `high` in round 5 comes from 2 runs, and round 6 has 10 runs for each arm.
- The arms differ in the call path of the advisor, so the turn counts can differ for that reason.

## Cost

- Round 1: pilots about 0.4 USD, full runs 3.0 USD, and an unmeasured estimate for the `opus` calls of `advise`, which the measure of round 5 replaced.
- Round 2: about 1.3 USD.
- Round 3: pilots about 1.7 USD, full runs 2.9 USD, and about 0.3 USD for the direct `opus` reviews and an estimate for the `opus` calls of `advise`.
- Round 3 is about 4.9 USD, under its limit of 6 USD.
- Round 5 (the measure of `advise`): about 1.5 USD, of which 1.42 USD is for the `opus` calls.
- Round 6 (the quality and the levers of `advise`): about 5.6 USD for 80 runs, of which 2.0 USD is for the built-in advisor and 2.7 USD for the `opus` calls of `advise`.

## Results Folders

On the machine of the run, in `/tmp/claudetto-evals/builtin-comparisons-0.2.0/`.
The runs of round 3 are in `round3/`.
The folder is not in the repository.
Each case and arm has a folder `full-<case>-<arm>/`, and each pilot has a folder `pilot*`.
It holds `summary.json`, and for each run `run-N/stream.jsonl` and the workspace `run-N/project/`.
`rest.log` and `advise-full.log` hold the console lines.

## Related Pages

- [Evals](Evals)
- [Evals 2.1.304](Evals-2.1.304)
- [Goal](Goal)
