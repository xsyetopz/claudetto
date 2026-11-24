# RISK-525 and RISK-532: Subagents Past the Concurrent Limit, and an Untyped Agent Call

Probes on 2026-11-24 used claude 2.1.331 with `-p` and `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=4`. The
claudetto arm loads `plugins/claudetto`. `run.sh <arm> <n> [batch|free] [haiku|sonnet]` copies `src/` into
a scratch folder. It asks for one background subagent per file, six files in all. Each subagent first
runs `sleep 40`, so the first four are still live when the last two are asked for. The probes cloned
`src/` as a git repository; `run.sh` copies the same six files.

- `batch` asks for all six "at once".
- `free` leaves the fan-out to the model.

Each run is scored on two things:

- Refusals: Agent results that read "Concurrent subagent limit reached ... Do not retry".
- Rows: how many of the six files the final reply's table answers.

## Where the Engine Refuses

The engine refuses an Agent call past the limit before any plugin hook runs. A logging build of the
`tool.call` hook on `Agent` wrote one entry per call it heard. The two refused calls of the batch have no
entry. The four calls before them saw 0, 1, 2 and 3 live agents (`$.agent.list()`) and were let
through. So no `tool.call` or `agent.spawn` hook can hold, queue or reword the refusal:

- The `agent.spawn` refusal in `hooks/delegation/limit.ts` (a48e41c24) never fired in the baseline.
- A queue at `tool.call` (built and tested for this slice) heard none of the refused calls.

Neither shipped.

## Runs

Rows per run for each build of claudetto. Each run had 2 refusals, in every arm.

| Build | Model, kind | Rows per run | "general-purpose not found" |
| --- | --- | --- | --- |
| vanilla | Haiku, batch | 4, 0, 6 | 0 |
| vanilla | Haiku, free | 6, 0, 0 | 0 |
| vanilla | Sonnet, free | 6, 6 | 0 |
| claudetto main e89f9d4e9 | Haiku, batch | 6, 6, 6 | 6 calls in 2 of 3 runs |
| claudetto + tool.call queue | Haiku, batch | 6, 6, 4 | 0 of 3 |
| claudetto + queue, logging | Haiku, batch | 6 | 6 calls |
| claudetto + "At most 4 run at once" in the Agent text | Haiku, batch | 6, 6, 6 | 0 |
| same | Haiku, free | 6, 6, 6 | 0 |
| same | Sonnet, free | 6, 6 | 0 |
| claudetto, the shipped Agent text | Haiku, batch | 6, 6, 6 | 0 |

The limit sentence reached the model. Asked to quote its Agent tool's description, Haiku returned the
sentence word for word, and it still sent six calls at once on Haiku and on Sonnet. The sentence
measured no gain, so it was dropped (ADR-0177).

In 4 of 8 vanilla runs the reply answered fewer than six files. Each of these ended by asking the
person to raise the limit, or with no table. In 16 of 17 claudetto runs the model waited for a result,
then started the last two itself.

## The Untyped Call

The old claudetto Agent text read "Set subagent_type (default general-purpose)". `agent.offer` hides
general-purpose (ADR-0099), so an untyped call failed with "Agent type 'general-purpose' not found".
That happened 6 times a run in 3 of the 4 claudetto runs before this fix. The shipped text reads "Set
subagent_type to a listed agent: an untyped call fails", and the type error is gone: 0 in 11 runs.

Cost: $0.03 to $0.32 per run.
