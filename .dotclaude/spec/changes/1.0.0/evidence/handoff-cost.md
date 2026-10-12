# Handoff cost

This file compares the cost of one `/dotclaude:handoff` with the cost of one `/compact`.
Both runs start from the same session.
It is evidence for package P14.
It changes no code.

## Setup

- Date: 2026-10-12, from 17:32 UTC to 17:34 UTC.
- Claude Code: `2.1.296`, from `claude --version`.
- Model: `claude-sonnet-5-5`, with a context window of 1,000,000 tokens.
- Checkout: branch `dotclaude-1-0-0`, tip `627d1d22`.
- Each run used `just sandbox`, with a new sandbox from `just sandbox-clean`.
- `project/` of the sandbox held a copy of `src/plugins/dotclaude/slices/{asks,decide,guard,handoff}`, with the tests removed, in one commit.
- The sandbox had no `config/settings.json`, so `mainHandover` had its default `manual`.
- Four `claude` runs in total.

## Commands

All runs used this common part: `just sandbox --model claude-sonnet-5-5 --output-format stream-json --verbose`.

| Step | Arguments after the common part | Session |
| --- | --- | --- |
| Base | `-p "Read every file under src/asks and src/decide with the Read tool. Then list in 10 lines what each directory does."` | `993c4a7a-80a2-471e-a935-3a62007f014e` |
| Handoff, fork A | `--resume 993c4a7a-80a2-471e-a935-3a62007f014e --fork-session -p "/dotclaude:handoff"` | `5a84c9b0-1efe-4a30-a297-9f85402380d8`, then `83a52326-ac90-4f5e-9679-cb1d7d47cb00` after `/clear` |
| Compaction, fork B | `--resume 993c4a7a-80a2-471e-a935-3a62007f014e --fork-session -p "/compact"` | `71d8771d-95e0-42ca-b97c-e9866c7fa1ae` |
| Follow-up, fork B | `--resume 71d8771d-95e0-42ca-b97c-e9866c7fa1ae -p "Continue the work."` | `71d8771d-95e0-42ca-b97c-e9866c7fa1ae` |

- The base run read 31 files and had a context of 81,316 tokens at its last call (`usage` of its last `assistant` event: 20,245 cache read plus 61,071 cache write).
- `--fork-session` worked, so the two runs started from the same context.
- The handoff run needed no follow-up turn.
  `/dotclaude:handoff` wrote the handoff file (1,585 bytes), ran `/clear`, and the resume turn in the new session read the file and answered.
  The resume turn is the follow-up of fork A.
- Fork B needed the follow-up turn `Continue the work.`.
- The report command was `CLAUDE_CONFIG_DIR=<sandbox>/config plugins/dotclaude-sessions/bin/dotclaude-usage --days 1 --window 1000000`.
  The same command with `--json` gave the JSON.

## Sources of the numbers

- Source S: the `usage` and `total_cost_usd` fields of the `result` events in the `stream-json` output of each run.
- Source T: the `cost-state` and `compact_boundary` entries, and the `usage` of the `assistant` entries, in the transcripts under `<sandbox>/config/projects/`.
  A forked session starts with the `cost-state` of its base, so a number for one step is the `cost-state` after the step minus the `cost-state` before it.
- Source U: the output of `dotclaude-usage`.

## Handoff (fork A)

| Measure | Handoff step | Resume step | Total | Source |
| --- | --- | --- | --- | --- |
| Input tokens (not cached) | 6 | 4 | 10 | S: `usage.input_tokens` of the two `result` events |
| Cache read tokens | 164,242 | 25,946 | 190,188 | S: `usage.cache_read_input_tokens` |
| Cache write tokens | 2,576 | 5,874 | 8,450 | S: `usage.cache_creation_input_tokens` |
| Output tokens | 869 | 147 | 1,016 | S: `usage.output_tokens` |
| Model calls | 2 | 2 | 4 | T: `assistant` ids `FoDsxv`, `ZZ5vTU`, `rzG8S2`, `6QnDs3` |
| Cost (API list price) | $0.0354 | $0.0276 | $0.0630 | S: `total_cost_usd` `0.3654005` minus base `0.3299703`, and `0.0275686` |
| Context after | 82,927 at the last call | 18,487 at the last call | 18,487 | T: input plus cache read plus cache write of the last call of each step |
| Time of the step | 6.7 s | 2.4 s | 9.1 s | S: `duration_ms` of the `result` events (wall time of the whole run: 10.3 s from `time`) |

## Compaction (fork B)

| Measure | `/compact` step | Follow-up step | Total | Source |
| --- | --- | --- | --- | --- |
| Input tokens (not cached) | 59,526 | 2 | 59,528 | T: `cost-state` `inputTokens` deltas |
| Cache read tokens | 20,245 | 12,613 | 32,858 | T: `cost-state` `cacheReadInputTokens` deltas |
| Cache write tokens | 3,542 | 15,803 | 19,345 | T: `cost-state` `cacheCreationInputTokens` deltas |
| Output tokens | 3,049 | 391 | 3,440 | T: `cost-state` `outputTokens` deltas |
| Model calls | not shown | 1 | not shown | T: the transcript has no `assistant` entry for the summary call, and the `result` event of `/compact` has no `usage` data |
| Cost (API list price) | $0.1604 | $0.0684 | $0.2288 | S: `total_cost_usd` `0.4903918`, then `0.5587791`, minus base `0.3299703` |
| Context after | 7,835 (`postTokens`) | 28,418 at the first call | 28,418 | T: `compact_boundary` and the `usage` of the follow-up call (2 plus 12,613 plus 15,803) |
| Time of the step | 18.8 s | 4.4 s | 23.2 s | T: `durationMs` 18,772 of `compact_boundary`, and S: `duration_ms` 4,369 (wall time of the runs: 19.8 s and 5.6 s) |

## Comparison

- The handoff cost $0.0630 and the compaction with its follow-up cost $0.2288 on this session.
  The values are from the table rows above.
- The summary call of the compaction read 59,526 tokens that the cache did not serve, and it wrote 3,049 output tokens.
  The handoff made no such call.
  The handoff turn read the cached context (164,242 cache read tokens over 2 calls) and wrote 869 output tokens.
- The context after the handoff was smaller (13,333 at the first call of the resume, 18,487 after it read the file) than the context after the compaction (28,418 at the first call of the follow-up).
- The handoff took 9.1 s and the compaction with its follow-up took 23.2 s.
- The sums of `dotclaude-usage` do not match the table, because a fork copies the history of the base session.
  Output of `dotclaude-usage --days 1 --window 1000000`:
  `Model calls: 14 in 4 runs`, `Context read again ... 354,820 in total`, `$1.16 API-equivalent`.
  The run rows were `5a84c9b0` 5 calls (sum 214,917), `71d8771d` 4 calls (63,284), `993c4a7a` 3 calls (50,669), and `83a52326` 2 calls (25,950).
  It also printed `Cache hit rate: 60.6%` and `Full cache rewrites that nothing explains: 63.4% of cost`.
  `dotclaude-usage` counts each model call once, by message id, so it gives the calls of the base to the run that it reads first.
  It does not show the call that `/compact` makes.
  Source U was therefore a check and not the source of the table.

## What is not measured

- One session of one size (about 81,000 tokens), one model, and one run of each step.
  The numbers have no spread.
- The call of `/compact` is not in the transcript as a message.
  Its tokens come from the difference of `cost-state` and its call count is unknown.
- The cost is the API list price that Claude Code prints, not a subscription limit.
  Source S and source T are the same figure from the same client, not two independent meters.
- The quality of the continued work: whether the model kept the facts that it needed.
  The resume turn of fork A answered from the handoff file, and the follow-up of fork B read five files again.
  This file does not rate either answer.
- Cache expiry between steps.
  The steps ran within two minutes, with a cache of one hour.
  A handoff or a compaction after a long pause pays more cache writes.
- Auto-compaction and the triggers of the handoff.
  Both steps were manual (`/compact` and `/dotclaude:handoff`).
- Time to first token and the wait for the user.
