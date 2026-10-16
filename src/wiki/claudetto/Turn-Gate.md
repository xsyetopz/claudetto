# Turn Gate

This page describes the `turngate` slice of the core plugin `claudetto`.
It is for a user who wants a turn to end only when the work is done or the reply says that it is not done, and for a contributor who edits the slice.

## The Problem

A turn that ends with text only is a report, and not proof that the work is done.
A reply can say "the tests pass" when no test ran after the last edit.
A reply can say "I will run the tests now" and then stop.
A reply can stop while a background command still runs, so its output never comes back to the work.
A prompt is the weakest control, so the slice adds a gate at the end of each turn.

## What the Hooks Do

1. The `tool.call` hook keeps one summary line for each tool call of the turn: the tool, the target, and the outcome.
   The outcome is `ok`, `ok, read-only`, or the first line of the error.
   A call that a permission check or the user denies is an error.
   The main loop and each subagent have their own record.
2. The `classic.Stop` and `classic.SubagentStop` hooks run the gate.
   - When a background task still runs (`background_tasks` with the status `running`), the gate blocks the stop.
     The reason names the id of each task, and tells Claude to wait for the output or to stop the task with `TaskStop`.
     This part makes no model call.
   - Else, when the `judge` option is on and the turn has tool calls, one judge call reads the reply and the summary of the calls.
     When the judge finds a fault, the gate blocks the stop.
3. The reason of a block holds the quote of the reply, the rule, and the fix, and no line of the rubric.
4. The gate keeps its own count of blocks for each turn, and gives no pass for `stop_hook_active` (D58).
   After `MAX_BLOCKS` blocks, the next stop passes, and a notice tells the user what the gate found.
5. A stop that the gate allows ends the turn, so it clears the record.
   An interrupted turn (`turn.complete` with `isAborted`) clears it too.
6. A block of a hook beneath the gate stands, and the gate does not judge it or count it.

## The Judge

The judge is one `$.model.complete` call in the hooks module, with no tools.
It reads only the reply and the summary of the calls, and never the transcript.
The reply goes in with its start and its end, and a mark of the cut when it is long.

The rubric has three faults:

- `claim`: the reply says that work is done or that a check passes, and no call after the last edit of that work shows it.
- `promise`: the last paragraph says that the agent does more work now or next, and the turn ends before that work.
- `opener`: the first sentence is an apology, or an agreement with the user that gives no fact.

These replies have no fault:
a reply that only asks a question or waits on a proposal,
an honest report of a failure,
and an answer that claims no work.

The judge reads the reply in its own language and judges its meaning, so the gate works in each language of the reply.
The judge gives JSON: `{"fault":"none"}`, or a fault with `quote` and `fix`.
A judge call that fails, that times out, or that gives no valid verdict allows the stop, and a notice names the cause.

## The `judge` Option

The judge is on by default.
To turn it off, set the plugin option `judge` (title "Turn Judge") to `false`.
With the judge off, the background-task part still runs.

## Cost

The background-task part makes no model call.
The judge runs only in a turn that has tool calls and a reply, so a turn of chat only costs nothing.
Each judge call writes its `usage` to the debug log (`--debug-file`).
The cost figure comes from that `usage`, because the `total_cost_usd` of the session leaves out a model call of a hook ([D63](Decisions-Session)).
A block costs one more model response of the main model.

One measured session on 2026-10-16 gave these figures for the judge on Sonnet 5.5:

| Call | Input tokens | Output tokens | Time | Verdict | Cost at list price |
| --- | --- | --- | --- | --- | --- |
| 1 | 798 | 68 | 1,571 ms | `claim` | $0.0023 |
| 2 | 826 | 11 | 1,152 ms | `none` | $0.0018 |

The method and the source are on [Failure Gaps 0.1.0](Failure-Gaps-0.1.0#the-cost-of-one-judge-call).

## Known Gaps

- A turn with no tool calls is not judged.
  For this reason, an opener in a turn with no tool calls passes.
- A `Stop` hook runs after the user sees the reply (D58), so the user can see a reply that the gate then blocks.

## Bounds

| Bound | Value | File | Use |
| --- | --- | --- | --- |
| `MAX_BLOCKS` | 2 | `slices/turngate/limits.ts` | Most blocks of the gate in one turn |
| `JUDGE_MODEL` | `sonnet` | `slices/turngate/limits.ts` | The model of the judge |
| `JUDGE_EFFORT` | `medium` | `slices/turngate/limits.ts` | The effort of the judge |
| `JUDGE_TIMEOUT_MS` | 30,000 | `slices/turngate/limits.ts` | Most time of one judge call |
| `JUDGE_MAX_TOKENS` | 1,024 | `slices/turngate/limits.ts` | Most output tokens of one judge call |
| `MAX_CALLS` | 60 | `slices/turngate/limits.ts` | Most calls in the summary, from the end of the turn |

The other bounds of the slice are on [Bounds](Bounds).

## Related Pages

- [User Checks](User-Checks): the other `Stop` hook of the core plugin.
- [Read Gates](Read-Gates): the gates on a read and on a rejected call.
- [Architecture](Architecture): the slices of the core plugin.
