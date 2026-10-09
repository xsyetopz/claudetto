# Evals

Evals measure the effect of the `dotclaude` plugin on Claude Code.
Since 0.28.0, they use the `claude plugin eval` command of Claude Code.
The command needs Claude Code 2.1.269 or later.
The repository has no eval harness of its own, and `just check` never runs an eval, because a run costs money.
The suite has 14 cases in `plugins/dotclaude/evals/`, because the command reads cases only from a folder inside the plugin.
No run of the suite has passed yet.
The harness of earlier releases (`tools/eval/`, `evals/`, and `just eval`) is removed (design D35).
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

## Checks that the format can express

The research for 0.28.0 mapped each earlier check to the format.
No run proved the map, so each row is unverified.

| Check | Expressible | Mechanism |
| --- | --- | --- |
| Paired comparison, plugin against no plugin | Yes | The two arms and `Δ` |
| Isolation of the config for each run | Yes | The temporary home of each run |
| Cost limit | Yes | `--max-cost-usd`, exit code 2 with a partial result |
| `k` runs for each case | Yes | `runs:` in `case.yaml` or `--runs` |
| Tamper check | Partly | `tool_used` with `max: 0` on `Edit`, `Write`, and `Bash` for the protected path |
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

- Whether a `regex` grader on a missing file fails or errors.
- Whether `plugins:` in `case.yaml` loads add-on plugins.
- Whether the hooks of the plugin behave the same inside a run.
- Whether the trace names a subagent call `Agent`, and whether `input_match` sees the commands of a subagent.

## Commands

```sh
claude plugin eval --help
claude plugin eval --no-publish --allow-tools Bash,Write,Edit --max-cost-usd 5
```

The first command lists the flags.
The second runs the suite with a cost limit.
The report goes to claude.ai by default, so use `--no-publish`.
Run each command from your own shell, because a run costs money.

## Reports and results

- [Eval history](Evals-History) holds the results of the suites of the 0.4 to 0.26 releases.
- [Evals of 0.28.0](Evals-0.28.0) holds the last runs of the removed harness.
- [Open items](Open-Items) holds the measures and decisions that are still open.
- [Prompt variants](Prompt-Variants) holds the variants that earlier evals tested.
- [Claude mods](Claude-Mods) holds the results of the mods API probes.
- [Off switches](Off-Switches) holds the switches that wait for an eval.
- [Usage evidence](Usage-Evidence) holds the usage measures.
