# Turns of the dotclaude agents (task 1.4)

Source: the subagent transcripts of the user, 38 `.jsonl` files, all of 2026-10-11 UTC, runs from 01:50 to 13:49.
`just usage` (`dotclaude-usage --days 3650 --runs 500 --agents-dir plugins/dotclaude/agents --json`) gives totals and a `turnCap` field, but no turn count for each run.
So a read-only script counted each run: the agent type from `<session>/subagents/agent-*.meta.json` (`agentType`), and the turns as the unique `message.id` of the `assistant` entries.
The report is the `message` input of the final `SubagentHandback` call, counted in code points.
Four investigator runs of the live session `165c2232` had no hand-back yet, so the table leaves them out.

| Type | Runs | Median turns | 90th percentile | Max | `maxTurns` | Runs at or over `maxTurns` | Runs with no report | Median report chars | 90th percentile report chars |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dotclaude:investigator` | 17 | 24 | 32 | 33 | 31 | 5 | 0 | 3926 | 6595 |
| `dotclaude:implementer` | 4 | 28 | 47 | 47 | 61 | 0 | 0 | 2849 | 3332 |
| `dotclaude:reviewer` | 1 | 4 | 4 | 4 | 41 | 0 | 0 | 3958 | 3958 |
| `dotclaude:test-runner`, `dotclaude:debugger`, built-in types | 0 | none | none | none | 16, 61 | none | none | none | none |

With the four live runs, the investigator figures are 21 runs, median 17, 90th percentile 32, and max 33.

## Findings

- The five investigator runs at 31 to 33 turns all handed back a report.
- A dotclaude hook note in those transcripts says "You made 32 turns, and the limit is 31 turns", which agrees with the count of unique `message.id`.
- The runs did not stop at the 31st unique `message.id`.
  So the unit that `maxTurns` counts can differ from one model request (not verified).
- The `.meta.json` files have no partial flag.
- The sample is small: 22 finished runs, and one reviewer run.
  Task 4.8 sets the values of the types with no runs from the closest type, and records that the figure is not measured.
