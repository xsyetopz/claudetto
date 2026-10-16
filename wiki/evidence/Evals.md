# Evals

Evals measure the effect of the `claudetto` plugin on Claude Code.
This page tells maintainers how the suite runs, what each grader checks, and where the results are.
Read it before you run an eval.

They use the `claude plugin eval` command of Claude Code.
The figures in the archive pages come from runs on Claude Code `2.1.296`.
No full run of the suite exists on `2.1.302`, the minimum version of claudetto 0.1.0.
The repository has no eval harness of its own (design `D9`, see [Decisions Tools](Decisions-Tools)).
`just check` never runs an eval, because a run costs money.

## The Current Suite

The suite has 16 cases.
14 cases are in the core plugin `claudetto`, and 1 case is in the add-on `claudetto-you-should-know`.
Each case is a folder with a `case.yaml` and a `scaffold.sh`.
The prompt of a case is the `execution.prompt` field of its `case.yaml`.
The cases are written in `src/`.
`just generate` copies them to `plugins/claudetto/evals/`, and the case of the add-on to `plugins/claudetto-you-should-know/evals/`.
The command reads cases only from a folder inside the plugin.

| Case | Source folder in `src/plugins/` | Max turns | Graders |
| --- | --- | ---: | --- |
| `bugfix-range` | `claudetto/evals/` | 20 | 2 `regex`, 2 `tool_used` |
| `feature-slugify` | `claudetto/evals/` | 20 | 3 `regex`, 2 `tool_used` |
| `library-docs` | `claudetto/evals/` | 20 | 5 `regex`, 2 `tool_used` |
| `big-file-subagent` | `claudetto/slices/agents/evals/` | 30 | 3 `regex`, 4 `tool_used` |
| `delegation-related-grouped` | `claudetto/slices/agents/evals/` | 25 | 5 `regex`, 3 `tool_used` |
| `delegation-related-split` | `claudetto/slices/agents/evals/` | 25 | 5 `regex`, 3 `tool_used` |
| `handoff` | `claudetto/slices/handoff/evals/` | 20 | 2 `regex`, 3 `tool_used` |
| `accusation-subagent` | `claudetto/slices/prompt/evals/` | 25 | 3 `regex`, 4 `tool_used` |
| `accusation-user` | `claudetto/slices/prompt/evals/` | 25 | 3 `regex`, 5 `tool_used` |
| `false-alarm-sum` | `claudetto/slices/prompt/evals/` | 20 | 3 `regex`, 4 `tool_used` |
| `report-count` | `claudetto/slices/prompt/evals/` | 15 | 2 `regex`, 1 `tool_used`, 1 `llm` |
| `accusation-warranted` | `claudetto/slices/styles/evals/` | 20 | 4 `regex` |
| `verification-claim` | `claudetto/slices/styles/evals/` | 20 | 4 `regex`, 3 `tool_used`, 1 `llm` |
| `partial-verification` | `claudetto/slices/styles/evals/` | 20 | 3 `regex`, 5 `tool_used`, 2 `llm` |
| `unprompted-skip` | `claudetto/slices/styles/evals/` | 20 | 3 `regex`, 5 `tool_used`, 2 `llm` |
| `you-should-know-notice` | `claudetto-you-should-know/evals/` | 6 | 1 `regex` |

The `name` field of the `handoff` case is `five-reads-codeword`, and the `name` of `you-should-know-notice` is `tries-edit-runs`.
The `handoff` case sets `model: haiku` and `timeout_seconds: 900`.
It checks that an auto compaction in the middle of a task keeps the done steps and the exact values ([Handoff](Handoff)).
The `you-should-know-notice` case has `runs: 1` and `timeout_seconds: 300`.
It checks that an edit still runs after the check of the add-on ([You Should Know](You-Should-Know)).
The command `just eval` runs the folder `plugins/claudetto` only, so the add-on case needs its own `claude plugin eval plugins/claudetto-you-should-know` run.

The other 13 cases of the core plugin have `runs: 3` and `timeout_seconds: 600` in their `case.yaml`.
The bounds of a run are these.

- `runs` in `case.yaml`: 3 runs for each case, on each arm (1 run for `you-should-know-notice`).
- `execution.timeout_seconds` in `case.yaml`: 600 seconds for most cases, 900 for `handoff`, and 300 for `you-should-know-notice`.
- `execution.max_turns` in `case.yaml`: 6 to 30 turns, by case.
- `--max-cost-usd 5` in the `eval` recipe of the `justfile`: the cost limit of a run.
- `--max-cost-usd 5` in `withCostBound` of `src/plugins/claudetto-lab/slices/eval-compare/domain/compare.ts`: the default cost limit of `claudetto-eval-compare`.

## How a Run Works

A grader is an entry in the `graders:` list of `case.yaml`.
Each case runs on two arms: with the plugin, and with no plugin.
The report gives a score for each arm and the difference `Δ`.
Each run has a temporary home, work folder, and config folder.
User settings, hooks, `CLAUDE.md`, MCP servers, other plugins, memory, and skills are absent from a run.
So the plugin arm tests only what the plugin ships.
A rule in user settings or in a `CLAUDE.md` is not in the with arm.

## Graders

The format has six grader kinds.

| Kind | Passes when | Cost |
| --- | --- | --- |
| `regex` | A JavaScript regex is found in the last message, the trace, or one file after the run | Free |
| `tool_used` | The count of matching tool calls is in the range `min` to `max` | Free |
| `tool_order` | The first call of one tool comes before the first call of another | Free |
| `file_exists` | A file that the agent created matches a glob | Free |
| `llm` | A judge model gives a pass in 2 of 3 votes | Paid |
| `baseline` | The judge finds the run at least as good as a reference transcript | Paid |

The current cases use `regex`, `tool_used`, and two `llm` graders.
No current case uses `tool_order`, `file_exists`, or `baseline`.

No grader runs a command or a test file.
To test code, the prompt asks Claude to run the tests and to write the result to a file.
A `regex` grader then reads that file.
The agent sees the test and the result, so this check is not hidden.

### File-State Graders

A case with a protected file guards it with a `tool_used` grader on `Edit`, a `tool_used` grader on `Write`, and one `regex` file-state grader.
The file-state grader has the name `kept-<path>`, such as `kept-check-range-test-mjs`, and the target `{ source: file, path }`.
It matches the final content of the file.
Command text cannot always tell a write from a read.
For example, `cp data/big.log /tmp/x` reads the log, and its text looks like a write.
So no file-state grader reads the text of a `Bash` call.
A small file has a pattern for its exact content, with an optional last line end.
The pattern is anchored to the start and the end of the file.
The anchors are `(?<![\s\S])` and `(?![\s\S])`, so they hold with or without the `m` flag.
The large `data/big.log` of `big-file-subagent` has the exact first line, the line with the audit code, and the exact last line, with any text between them.
A change in the middle of that log is not seen.
A file that the agent deleted does not exist, so the grader throws, and the run fails the grader.
`tests/claudetto/evals/graders.test.ts` loads the regex of each file-state grader.
It runs the regex against a passing sample and a failing sample.
A regex that no run has met can pass for a wrong reason.

## Checks That the Format Can Express

The mapping of the earlier checks to the format is a plan.
No run proved the mapping, so each row is unverified.

| Check | Expressible | Mechanism |
| --- | --- | --- |
| Paired comparison, plugin against no plugin | Yes | The two arms and `Δ` |
| Isolation of the config for each run | Yes | The temporary home of each run |
| Cost limit | Yes | `--max-cost-usd`, exit code 2 with a partial result |
| `k` runs for each case | Yes | `runs:` in `case.yaml` or `--runs` |
| Tamper check | Partly | `tool_used` with `max: 0` on `Edit` and `Write` for the protected path, and a file-state `regex` on its final content |
| Over-claim check | Partly | `regex` on the last message, and `tool_used` on `Bash` for the test command with `min: 1` |
| Policy-violation check | Partly | `tool_used` on `Bash` with a delete or `git push` pattern and `max: 0` |
| Wrongful-revert and warranted-fix checks | Partly | `regex` on the final content of a file, with the claim in the prompt |
| Cost for each resolved task | Partly | `costUsd` of the result, divided by hand by the passed runs |
| Turns, tokens, and time | Partly | `durationSeconds`, and a turn count in the run record. No token field is documented |
| Hidden outcome check with its own test files | No | No grader runs a test file |
| Interval, and "not shown" when it includes 0 | No | The result has a mean and no interval |

## Dropped Checks

The user approved these drops.

- The hidden oracle with test files, tamper hashes, and canary files.
- The scripted user: a claim at turn N, and a scripted answer to an approval ask.
- A fixture `CLAUDE.md` as the source of a rule or of an accusation, because no `CLAUDE.md` loads in a run.
  So the adherence cases of earlier releases cannot port as they were.
- The interval rule.
- A comparison against a prompt variant, a style, or a router mode, because the only arms are plugin and no plugin.
- The LLM grader calibration against human labels.

Instruction adherence is checked by the guards and the hooks in code.

## Open Facts

- Whether a `regex` grader on a missing file is scored a fail in every case.
  The runs of 2026-10-10 reported `grader threw: ... path "tasks.md" does not exist`, and scored a fail.
- Whether `claude plugin eval` adds the `m` flag to a `regex` grader.
  The docs say only that the pattern is a JavaScript regex with an optional `flags` field.
- Whether `plugins:` in `case.yaml` loads add-on plugins.
- Whether the hooks of the plugin behave the same inside a run.
- Whether the trace names a subagent call `Agent`, and whether `input_match` sees the commands of a subagent.

## Commands

```sh
claude plugin eval --help
just eval --model haiku
just eval --model haiku --case report-count
just eval-variant REF --model haiku
```

The first command lists the flags.
`just eval` runs the suite with a cost limit of 5 USD.
The recipe stops with a message when `--model` is missing, because without it the eval uses the model of the session, which can cost many times more.
The recipe runs `claude plugin eval plugins/claudetto` with `--no-publish`, `--scaffold`, `--allow-tools Bash,Write,Edit`, and `--keep-temp`.
Extra arguments go to the eval, such as `just eval --model haiku --case report-count`.
The recipe uses `tools/lock.ts`, which stops a second run while one is in progress.
The lock is a file in `plugins/claudetto/evals/results/`.
`just eval-variant REF` runs the suite on the checkout and on a variant at a git ref, in a temporary `git worktree`.
It needs `--model` too.
Its results go to `plugins/claudetto/evals/results/`, which git ignores.
The `claudetto-lab` add-on ships the `claudetto-eval-compare` CLI and the `eval-compare` skill.
They run `claude plugin eval` on two plugin folders, one after the other ([Lab](Lab)).

Each eval prints `kept temp: /private/tmp/e-XXXX` for each run.
The folder holds the work folder, and its `home/` and `tmp/` folders are sealed with mode 000.
Read `trace.jsonl` there to find the cause of a failed grader.
Delete the kept folders by hand when they are not needed.
The report goes to claude.ai by default, so `--no-publish` is in the recipe.
Run each command from your own shell, in a terminal outside Claude Code, because a run costs money.
`just eval` and `just eval-variant` stop with a reason when they run in the Bash sandbox of Claude Code, such as with `! just eval`.
The reason is that the model calls of the runs then go through the proxy of the sandbox.
In the run of 2026-10-10 from `! just eval`, 10 runs stopped on a model call until the 600 s timeout of the case, in both arms.

## Current Results

No full run of the 15 current cases is recorded.
The runs of single cases on `2.1.301` are in [Evals of 0.1.0](Evals-0.1.0).
The newest full run is the run of 2026-10-10 on Claude Code `2.1.296`, with the default model of Claude Code.
It ran the 12 cases of dotclaude 1.0.0.
Its figures per case are in [Full suite after the shared rules moved](Evals-0.28.0-Ported-Suite#full-suite-after-the-shared-rules-moved).
The figures of the other two models are in [Sonnet 5.5 and Haiku 5.5](Evals-0.28.0-Ported-Suite#sonnet-55-and-haiku-55).
That table also lists four cases that the suite no longer has: `destructive-ask`, `facts-formatter`, `facts-release-scope`, and `stop-check-verification-claim-cut`.
The rows of those four cases are history.
They are not current results.
The cases `handoff` and `you-should-know-notice` have no row there.
No figure of this page replaces those tables.

## Reports and Results

- [Evals of 0.1.0](Evals-0.1.0) holds the paid runs of claudetto 0.1.0.
- [Eval History](Evals-History) holds the results of the suites of the 0.4 to 0.26 releases.
- [Evals of 0.28.0](Evals-0.28.0) holds the last runs of the deleted harness.
- [Ported Suite of 0.28.0](Evals-0.28.0-Ported-Suite) holds the runs of the first ported suite.
- [Gates of 0.28.0](Evals-0.28.0-Gates) holds the gates.
- [Open Items](Open-Items) holds the state at 0.28.0: the measures and decisions that were open then.
- [Prompt Variants](Prompt-Variants) holds the variants that earlier evals tested.
- [Request Build](Request-Build) holds the results of the mods API probes.
- [Off Switches](Off-Switches) holds the switches that wait for an eval.
- [Usage Evidence](Usage-Evidence) holds the usage measures.

The Bun harness of earlier releases (`tools/eval/`) and the root `evals/` folder are deleted.
Their figures stay in [Evals History](Evals-History) and [Evals of 0.28.0](Evals-0.28.0).

## Related Pages

- [Off Switches](Off-Switches): the switches that wait for an eval.
- [Evidence](Evidence): the index of the evidence pages.
