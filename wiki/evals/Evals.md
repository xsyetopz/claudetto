# Evals

Evals measure the effect of the `dotclaude` plugin on Claude Code.
Since 0.28.0, they use the `claude plugin eval` command of Claude Code.
The command needs Claude Code 2.1.269 or later.
The repository has no eval harness of its own, and `just check` never runs an eval, because a run costs money.
The suite has 16 cases in `plugins/dotclaude/evals/`, because the command reads cases only from a folder inside the plugin.
`just eval` wraps `claude plugin eval` for this suite.
The first runs are in [Evals of 0.28.0](Evals-0.28.0#ported-suite).
The newest Opus 5.5 figures are in [Ported suite of 0.28.0](Evals-0.28.0-Ported-Suite#full-suite-after-the-shared-rules-moved).
The figures of Sonnet 5.5 and Haiku 5.5 are in [the same page](Evals-0.28.0-Ported-Suite#sonnet-55-and-haiku-55).
The Bun harness of earlier releases (`tools/eval/`) and the root `evals/` folder are removed (design D35).
Its figures stay in [Eval history](Evals-History) and [Evals of 0.28.0](Evals-0.28.0).

## How a run works

A case is a folder with a `prompt.md`, a `case.yaml`, or both.
A grader is a `graders/<name>.md` file or an entry in the `graders:` list of `case.yaml`.
A case with no grader fails to load.
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

No grader runs a command or a test file.
To test code, the prompt asks Claude to run the tests and to write the result to a file.
A `regex` grader then reads that file.
The agent sees the test and the result, so this check is not hidden.

### File-state graders

Each case with a protected file guards it with a `tool_used` grader on `Edit`, a `tool_used` grader on `Write`, and one `regex` file-state grader.
The file-state grader has the name `kept-<path>`, such as `kept-src-mean-mjs`, and the target `{ source: file, path }`.
It matches the final content of the file.
Command text cannot always tell a write from a read, because `cp data/big.log /tmp/x` reads the log and has the text of a write.
So no file-state grader reads the text of a `Bash` call.
A small file has a pattern for its exact content, with an optional last line end, anchored to the start and the end of the file.
The anchors are `(?<![\s\S])` and `(?![\s\S])`, so they hold with or without the `m` flag.
The large `data/big.log` of `big-file-subagent` has the exact first line, the line with the audit code, and the exact last line, with any text between them.
A change in the middle of that log is not seen.
A file that the agent deleted does not exist, so the grader throws and the run fails the grader.
`tests/dotclaude/eval-graders.test.mjs` runs each `scaffold.sh` and checks that each pattern matches the content that it writes, and no changed content.

## Checks that the format can express

The research for 0.28.0 mapped each earlier check to the format.
No run proved the map, so each row is unverified.

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

## Dropped checks

The user approved these drops for 0.28.0.

- The hidden oracle with test files, tamper hashes, and canary files.
- The scripted user: a claim at turn N, and a scripted answer to an approval ask.
- A fixture `CLAUDE.md` as the source of a rule or of an accusation, because no `CLAUDE.md` loads in a run.
  So the adherence cases of earlier releases cannot port as they were.
- The interval rule.
- A comparison against a prompt variant, a style, or a router mode, because the only arms are plugin and no plugin.
- The LLM grader calibration against human labels.

There is no adherence gate (design D9).
Instruction adherence is checked by the guards and the hooks in code.

## Open facts

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
claude plugin eval plugins/dotclaude --no-publish --scaffold --allow-tools Bash,Write,Edit --max-cost-usd 5
just eval
```

The first command lists the flags.
The second runs the suite with a cost limit.
`just eval` runs the same command, and the recipe passes `plugins/dotclaude` and `--scaffold`.
Extra arguments go to the eval, such as `just eval --case destructive-ask`.
The recipe always passes `--keep-temp`, so each run keeps its sandbox and its `trace.jsonl`.
The eval prints `kept temp: /private/tmp/e-XXXX` for each run.
The folder holds the work folder, and its `home/` and `tmp/` folders are sealed with mode 000.
Read `trace.jsonl` there to find the cause of a failed grader.
Delete the kept folders by hand when they are not needed.
The report goes to claude.ai by default, so use `--no-publish`.
Run each command from your own shell, because a run costs money.
Run it in a terminal outside Claude Code.
`just eval` and `just eval-variant` stop with a reason when they run in the Bash sandbox of Claude Code, such as with `! just eval`, because the model calls of the runs then go through the proxy of the sandbox.
In the run of 2026-10-10 from `! just eval`, 10 runs stopped on a model call until the 600 s timeout of the case, in both arms.

## Reports and results

- [Eval history](Evals-History) holds the results of the suites of the 0.4 to 0.26 releases.
- [Evals of 0.28.0](Evals-0.28.0) holds the last runs of the removed harness.
- [Ported suite of 0.28.0](Evals-0.28.0-Ported-Suite) holds the runs of the 16 cases.
- [Gates of 0.28.0](Evals-0.28.0-Gates) holds the gates.
- [Open items](Open-Items) holds the measures and decisions that are still open.
- [Prompt variants](Prompt-Variants) holds the variants that earlier evals tested.
- [Claude mods](Claude-Mods) holds the results of the mods API probes.
- [Off switches](Off-Switches) holds the switches that wait for an eval.
- [Usage evidence](Usage-Evidence) holds the usage measures.
