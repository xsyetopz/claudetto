# Evals

An eval runs a task with and without the `claudetto` plugin and compares the results.
It shows what the plugin changes in Claude Code.
`claudetto` uses the `claude plugin eval` command and has no harness of its own.

## Quick Start

```sh
claude plugin eval --help
just eval --model haiku
just eval --model haiku --case report-count
just eval-variant REF --model haiku
```

- `just eval` runs the suite with a cost limit of 5 USD.
  It stops when `--model` is missing, because the session model can cost many times more.
- The recipe runs `claude plugin eval plugins/claudetto` with `--no-publish`, `--scaffold`, `--allow-tools Bash,Write,Edit`, and `--keep-temp`.
- `tools/lock.ts` stops a second run while one runs.
- `just eval-variant REF` runs the checkout and a variant at a git ref, in a temporary `git worktree`.
- Results go to `plugins/claudetto/evals/results/`, which git ignores.
- `just check` never runs an eval, because a run costs money.
- Run each command in your own terminal, not in the Bash sandbox of Claude Code.
  In the sandbox, model calls go through a proxy.
  In the run of 2026-10-10, 10 runs stopped until the 600 s timeout.

## How a Run Works

Each case runs on two arms: with the plugin, and with none.
The report gives a score for each arm and the difference `Δ`.
Each run has a temporary home, work folder, and config folder.
User settings, hooks, `CLAUDE.md`, MCP servers, other plugins, memory, and skills are absent.
So the plugin arm tests only what the plugin ships.

Each run prints `kept temp: /private/tmp/e-XXXX`.
Read `trace.jsonl` there to find why a grader failed.
Delete kept folders by hand.

## The Suite

The suite has 19 cases.
3 are in `src/plugins/claudetto/evals/` and 16 are in the `evals/` folder of a slice.
`just generate` copies them to `plugins/claudetto/evals/`.
Each case has a `case.yaml` and most have a `scaffold.sh`.

| Case | Slice | Max turns | Graders |
| --- | --- | ---: | --- |
| `bugfix-range` | none | 20 | 2 `regex`, 2 `tool_used` |
| `feature-slugify` | none | 20 | 3 `regex`, 2 `tool_used` |
| `library-docs` | none | 20 | 5 `regex`, 2 `tool_used` |
| `handoff` | `handoff` | 20 | 2 `regex`, 3 `tool_used` |
| `accusation-subagent` | `prompt` | 25 | 3 `regex`, 4 `tool_used` |
| `accusation-user` | `prompt` | 25 | 3 `regex`, 7 `tool_used` |
| `correction-next-action` | `prompt` | 10 | 1 `llm`, 1 `tool_used` |
| `false-alarm-sum` | `prompt` | 20 | 2 `regex`, 4 `tool_used`, 1 `llm` |
| `harm-settled-by-facts` | `prompt` | 20 | 3 `regex`, 1 `llm` |
| `least-code-fix` | `prompt` | 20 | 4 `regex`, 1 `tool_used` |
| `missing-tool-is-a-step` | `prompt` | 15 | 1 `tool_used`, 1 `llm` |
| `repeat-no-reason` | `prompt` | 20 | 1 `regex`, 1 `llm` |
| `report-count` | `prompt` | 15 | 1 `regex`, 1 `tool_used`, 1 `llm` |
| `scope-followup` | `prompt` | 20 | 2 `regex`, 1 `llm` |
| `temp-folder-removed` | `prompt` | 20 | 1 `regex`, 1 `tool_used` |
| `accusation-warranted` | `styles` | 20 | 2 `regex`, 1 `llm` |
| `claim-check` | `styles` | 20 | 2 `regex`, 1 `tool_used`, 2 `llm` |
| `partial-verification` | `styles` | 20 | 3 `regex`, 3 `tool_used`, 2 `llm` |
| `unprompted-skip` | `styles` | 20 | 3 `regex`, 3 `tool_used`, 2 `llm` |

## Bounds of a Run

| Bound | Value | Where |
| --- | --- | --- |
| `runs` | 3 for each arm, 10 for `least-code-fix` and `temp-folder-removed` | `case.yaml` |
| `execution.timeout_seconds` | 600, 900 for `handoff`, 300 for `correction-next-action` | `case.yaml` |
| `execution.max_turns` | 10 to 25 | `case.yaml` |
| `--max-cost-usd` | 5 | `justfile`, `eval-compare/compare.ts` |

The `handoff` case is named `five-reads-codeword` and uses `model: haiku`.
It checks that an auto compaction in the middle of a task keeps the done steps and exact values ([Handoff](Handoff)).

## Current Results

No full run of the 19 current cases exists.
The four `styles` cases ran on Haiku 5.5 ([Evals of 0.1.0](Evals-0.1.0)).
On 2026-10-19, eleven `prompt` slice cases ran on Claude Code `2.1.303`, after the fix of `LEAN_BODY` ([Evals of 0.2.0](Evals-0.2.0)).
Each of them has 10 runs for each arm, so all eleven meet the D25 floor.
Nine of them ran with `--runs 10`, which overrides the 3 runs of their `case.yaml`.
The newest full run was on 2026-10-10 on Claude Code `2.1.296`, with an earlier suite ([Evals History](Evals-History#full-suite-on-claude-code-21296)).
Its figures do not describe the current prompt.

## See Also

- [Eval Graders](Eval-Graders)
- [Evals History](Evals-History)
- [Evals 0.1.0](Evals-0.1.0)
- [Evals 0.2.0](Evals-0.2.0)
- [Handoff Cost](Handoff-Cost)
- [Off Switches](Off-Switches)
- [Evidence](Evidence)
