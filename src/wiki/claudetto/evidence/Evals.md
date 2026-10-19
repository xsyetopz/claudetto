# Evals

Evals measure the effect of the `claudetto` plugin on Claude Code.
This page tells maintainers how the suite runs, what each grader checks, and where the results are.
Read it before you run an eval.

They use the `claude plugin eval` command of Claude Code.
The figures of earlier runs come from Claude Code `2.1.296` and `2.1.302` ([Evals History](Evals-History), [Evals of 0.1.0](Evals-0.1.0)).
No full run of the current suite exists.
The repository has no eval harness of its own (see [Decisions Tools](Decisions-Tools)).
`just check` never runs an eval, because a run costs money.

## The Current Suite

The suite has 19 cases.
3 cases are in `src/plugins/claudetto/evals/`, and 16 cases are in the `evals/` folder of a slice.
Each case is a folder with a `case.yaml`, and most have a `scaffold.sh`.
The prompt of a case is the `execution.prompt` field of its `case.yaml`.
The cases are written in `src/`.
`just generate` copies them to `plugins/claudetto/evals/`.
The command reads cases only from a folder inside the plugin.

| Case | Slice folder in `src/plugins/claudetto/slices/` | Max turns | Graders |
| --- | --- | ---: | --- |
| `bugfix-range` | none (`evals/`) | 20 | 2 `regex`, 2 `tool_used` |
| `feature-slugify` | none (`evals/`) | 20 | 3 `regex`, 2 `tool_used` |
| `library-docs` | none (`evals/`) | 20 | 5 `regex`, 2 `tool_used` |
| `handoff` | `handoff` | 20 | 2 `regex`, 3 `tool_used` |
| `accusation-subagent` | `prompt` | 25 | 3 `regex`, 4 `tool_used` |
| `accusation-user` | `prompt` | 25 | 3 `regex`, 5 `tool_used` |
| `correction-next-action` | `prompt` | 10 | 1 `llm`, 1 `tool_used` |
| `false-alarm-sum` | `prompt` | 20 | 2 `regex`, 4 `tool_used`, 1 `llm` |
| `harm-settled-by-facts` | `prompt` | 20 | 3 `regex`, 1 `llm` |
| `least-code-fix` | `prompt` | 20 | 3 `regex` |
| `missing-tool-is-a-step` | `prompt` | 15 | 1 `tool_used`, 1 `llm` |
| `repeat-no-reason` | `prompt` | 20 | 1 `regex`, 1 `llm` |
| `report-count` | `prompt` | 15 | 1 `regex`, 1 `tool_used`, 1 `llm` |
| `scope-followup` | `prompt` | 20 | 2 `regex`, 1 `llm` |
| `temp-folder-removed` | `prompt` | 20 | 1 `regex`, 1 `tool_used` |
| `accusation-warranted` | `styles` | 20 | 2 `regex`, 1 `llm` |
| `claim-check` | `styles` | 20 | 2 `regex`, 1 `tool_used`, 2 `llm` |
| `partial-verification` | `styles` | 20 | 3 `regex`, 3 `tool_used`, 2 `llm` |
| `unprompted-skip` | `styles` | 20 | 3 `regex`, 3 `tool_used`, 2 `llm` |

The `name` field of the `handoff` case is `five-reads-codeword`.
It sets `model: haiku` and `timeout_seconds: 900`.
It checks that an auto compaction in the middle of a task keeps the done steps and the exact values ([Handoff](Handoff)).
`correction-next-action` has `timeout_seconds: 300`, and `least-code-fix` and `temp-folder-removed` have `runs: 10`.
The other cases have `runs: 3` and `timeout_seconds: 600`.
The bounds of a run are these.

- `runs` in `case.yaml`: 3 runs for each case, on each arm (10 for two cases).
- `execution.timeout_seconds` in `case.yaml`: 600 seconds for most cases, 900 for `handoff`, and 300 for `correction-next-action`.
- `execution.max_turns` in `case.yaml`: 10 to 25 turns, by case.
- `--max-cost-usd 5` in the `eval` recipe of the `justfile`: the cost limit of a run.
- `--max-cost-usd 5` in `src/plugins/claudetto-lab/slices/eval-compare/compare.ts`: the default cost limit of `claudetto-eval-compare`.

## How a Run Works

A grader is an entry in the `graders:` list of `case.yaml`.
Each case runs on two arms: with the plugin, and with no plugin.
The report gives a score for each arm and the difference `Δ`.
Each run has a temporary home, work folder, and config folder.
User settings, hooks, `CLAUDE.md`, MCP servers, other plugins, memory, and skills are absent from a run.
So the plugin arm tests only what the plugin ships.
A rule in user settings or in a `CLAUDE.md` is not in the with arm.

## Graders

The format has six grader kinds, and the current cases use `regex`, `tool_used`, and `llm`.
[Eval Graders](Eval-Graders) lists the kinds, the file-state graders, the checks that the format can express, and the open facts.

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

No full run of the 19 current cases is recorded.
The runs of the four `styles` cases on Haiku 5.5 are in [Evals of 0.1.0](Evals-0.1.0).
The newest full run is the run of 2026-10-10 on Claude Code `2.1.296`, with the default model of Claude Code.
It ran the cases of an earlier release, and [Evals History](Evals-History#full-suite-on-claude-code-21296) gives the figures of the cases that the suite still has.
Those figures are history.
They do not describe the current prompt.

## Reports and Results

- [Evals of 0.1.0](Evals-0.1.0) holds the paid runs of the `Concise` style cases.
- [Evals History](Evals-History) holds the older runs, the off-switch eval, and the compaction bench.
- [Handoff Cost](Handoff-Cost) holds the cost of a handoff against a compaction.
- [Off Switches](Off-Switches) holds the switches that wait for an eval.
- [Usage Evidence](Usage-Evidence) holds the usage measures.

## Related Pages

- [Off Switches](Off-Switches): the switches that wait for an eval.
- [Eval Graders](Eval-Graders): the grader kinds and the open facts.
- [Evals History](Evals-History): the figures of older runs.
- [Evidence](Evidence): the index of the evidence pages.
