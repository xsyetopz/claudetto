# Handoff Cost

This page gives the cost of one `/dotclaude:handoff` and the cost of one `/compact`.
Both runs start from the same session.
Read it to compare the two costs, and the sources of each number.
The source of the numbers is the measurement of 2026-10-12, with Claude Code `2.1.296`.
The record is `.dotclaude/spec/changes/1.0.0/evidence/handoff-cost.md`.
The index of the evidence is [Evidence](Evidence).

## What the Numbers Compare

- The handoff figures are for the whole handoff, which has two model calls.
- The compaction figures are for the `/compact` step and its follow-up turn.
- The context figures are not the same kind of value.
  For the handoff, the context is at the last call of each step.
  For the compaction, the context after is `postTokens` of the compact boundary.
  The follow-up value is at the first call of the follow-up.
  Read the context rows as two different points.
  Do not read them as one measure.

## Setup

- Date: 2026-10-12, from 17:32 UTC to 17:34 UTC.
- Claude Code: `2.1.296`, from `claude --version`.
- Model: `claude-sonnet-5-5`, with a context window of 1,000,000 tokens, as the record names it.
- Checkout: branch `dotclaude-1-0-0`, tip `627d1d22`.
- Each run used `just sandbox`, with a new sandbox from `just sandbox-clean`.
- The project of the sandbox held a copy of the `asks`, `decide`, `guard`, and `handoff` slices, with the tests removed, in one commit.
- The sandbox had no `config/settings.json`.
  So `mainHandover` had its default, `manual`.
  The default is `DEFAULT_MAIN_HANDOVER` in `src/plugins/dotclaude/slices/handoff/limits.ts`.
- Four `claude` runs ran in total:
  - One base run.
  - One handoff fork.
  - One compaction fork.
  - One follow-up.

## Commands

All runs used `just sandbox --model claude-sonnet-5-5 --output-format stream-json --verbose`.
The base run read every file under `src/asks` and `src/decide` with the `Read` tool.
The handoff fork ran `/dotclaude:handoff`.
The compaction fork ran `/compact`.
The compaction fork received the follow-up `Continue the work.`

- The base run read 31 files.
  Its last call had a context of 81,316 tokens (20,245 cache read plus 61,071 cache write).
- `--fork-session` worked.
  The two forks started from the same context.
- The handoff wrote the handoff file (1,585 bytes).
  It ran `/clear`.
  The resume turn in the new session read the file and answered.
  The handoff needed no follow-up turn of its own.
- The compaction fork needed the follow-up turn.
- The report command was `CLAUDE_CONFIG_DIR=<sandbox>/config plugins/dotclaude-sessions/bin/dotclaude-usage --days 1 --window 1000000`.

## Sources

- Source S: the `usage` and `total_cost_usd` fields of the `result` events in the `stream-json` output.
- Source T: the `cost-state` and `compact_boundary` entries, and the `usage` of the `assistant` entries, in the transcripts of the sandbox.
  A forked session starts with the `cost-state` of its base.
  So a step is the `cost-state` after it minus the `cost-state` before it.
- Source U: the output of `dotclaude-usage`, used as a check only.

## Handoff

| Measure | Handoff step | Resume step | Total | Source |
| --- | --- | --- | --- | --- |
| Input tokens (not cached) | 6 | 4 | 10 | S: `usage.input_tokens` |
| Cache read tokens | 164,242 | 25,946 | 190,188 | S: `usage.cache_read_input_tokens` |
| Cache write tokens | 2,576 | 5,874 | 8,450 | S: `usage.cache_creation_input_tokens` |
| Output tokens | 869 | 147 | 1,016 | S: `usage.output_tokens` |
| Model calls | 2 | 2 | 4 | T: four `assistant` ids |
| Cost (API list price) | $0.0354 | $0.0276 | $0.0630 | S: `total_cost_usd` |
| Context, last call of the step | 82,927 | 18,487 | 18,487 | T: input plus cache read plus cache write |
| Time of the step | 6.7 s | 2.4 s | 9.1 s | S: `duration_ms` |

## Compaction

| Measure | `/compact` step | Follow-up step | Total | Source |
| --- | --- | --- | --- | --- |
| Input tokens (not cached) | 59,526 | 2 | 59,528 | T: `cost-state` deltas |
| Cache read tokens | 20,245 | 12,613 | 32,858 | T: `cost-state` deltas |
| Cache write tokens | 3,542 | 15,803 | 19,345 | T: `cost-state` deltas |
| Output tokens | 3,049 | 391 | 3,440 | T: `cost-state` deltas |
| Model calls | not shown | 1 | not shown | T: the transcript has no `assistant` entry for the summary call |
| Cost (API list price) | $0.1604 | $0.0684 | $0.2288 | S: `total_cost_usd` deltas |
| Context, first call of the follow-up | 7,835 (`postTokens`) | 28,418 | 28,418 | T: `compact_boundary` and the follow-up `usage` |
| Time of the step | 18.8 s | 4.4 s | 23.2 s | T: `durationMs`, and S: `duration_ms` |

## Comparison

- On this session, the handoff cost $0.0630.
  The compaction with its follow-up cost $0.2288.
- The summary call of the compaction read 59,526 tokens that the cache did not serve.
  It wrote 3,049 output tokens.
- The handoff made no such call.
  Its turn read the cached context of 164,242 tokens over two calls.
- The context after the handoff was smaller than the context after the compaction.
  This holds for the values in the tables only, because they are at different calls.
- The handoff took 9.1 s.
  The compaction with its follow-up took 23.2 s.
- The sums of `dotclaude-usage` do not match these tables.
  A fork copies the history of its base session.
  The tool counts each model call once.
  It does not show the call of `/compact`.
  Source U was a check.
  It was not the source of the tables.

## What Is Not Measured

- The page has one session of one size (about 81,000 tokens), one model, and one run of each step.
  The numbers have no spread.
- The call of `/compact` is not in the transcript as a message.
  Its tokens come from the difference of `cost-state`.
  Its call count is unknown.
- The cost is the API list price that Claude Code prints.
  It is not a subscription limit.
  Source S and source T come from the same client, so they are not two independent meters.
- The quality of the continued work is not measured.
  This page does not rate the answers of the resume turn or the follow-up.
- Cache expiry between steps is not measured.
  The steps ran within two minutes, with a cache of one hour.
  A handoff or a compaction after a long pause pays more cache writes.

## Related Pages

- [Usage-Evidence](Usage-Evidence): the plans, prices, and usage of dotclaude 1.0.0 over one measured week.
