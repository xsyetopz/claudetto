# RISK-531: The Goal Tools Note Under `-p`

Probes on 2026-11-24 used claude 2.1.331 with `-p` and Sonnet.

## Cause

A cc-inspect `cli` probe ran `-p "/goal the file done.txt exists"` with `--plugin-dir plugins/claudetto` at
a615305ea. The first request's user message holds the command name, `Goal set: ...` and the engine's goal
directive, but not the note that `registerCommand` returns as `context`. So under `-p` the set-time note
never reaches the model.

## Cure

The goal's first Stop-hook block row now carries the note once (`plugins/claudetto/hooks/goal/feedback.ts`).
A block row reaches the model under `-p`: the cap note already rode on it. The set-time `context` stays,
for a session that delivers it.

## Measurement

`run.sh <arm> <n> [haiku|sonnet]` sets a goal with a step only the user can take (a Fly.io login), so the
goal's Stop hook blocks.

| Build | Runs with the note in the transcript | Block rows per run | Goal tools called |
| --- | --- | --- | --- |
| a615305ea | 0 of 3 | 2, 2, 2 | `pause_goal` |
| this change | 3 of 3 | 2, 2, 2 | `pause_goal` |

The note now reaches the model, and on this fixture the outcome does not change: each run called
`pause_goal` at the first block, and the goal cleared after the turn. `pause_goal` is in the prompt since
RISK-520, so this fixture needs nothing from the note. The note names `get_goal`, `set_goal` and
`clear_goal`, which sit behind ToolSearch.

Cost: $0.05 to $0.06 per run.
