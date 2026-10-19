# Stop Hook Eval

This page gives the measured behavior of a `type: "prompt"` hook on `Stop`, and the facts about the `Stop` hook that Claude Code defines.
Read it before you use a hook of type `prompt` as a check at the end of a turn.
An earlier release of the project (0.28.0) shipped such a hook, and the next release (0.29.0) removed it after the eval below.

## Eval of 2026-10-12

The eval ran with `just eval`, on Claude Code `2.1.296`, with 3 runs for each case.
The cases were `stop-hook-block`, `stop-hook-repeated-block`, `stop-hook-correct-report`, and `stop-hook-plain-answer`.
Their graders read the trace, where each block is a user entry that starts with `Stop hook feedback:`.

| Case | Result with the hook |
| --- | --- |
| A reply that says all tests pass, with no check | Blocked in 3 of 3 runs |
| Text of the block | The whole evaluator prompt in 3 of 3 blocks, and not only the reason |
| The same reply again after a block | Passed with no second block in 2 of 3 runs |
| An accurate report after a check | No block in 3 of 3 runs |
| A plain answer with no claim | No block in 3 of 3 runs |

- The block text holds the whole prompt, so a block holds more than the reason and the action.
- The repeated reply passes, because the prompt answered `ok` when `stop_hook_active` was `true`.
- The hook adds one model request of about 6,914 input tokens to each turn (probe 1.8).
- A command hook cannot judge a claim in free text.

## Facts From the Binary

These facts are from the Claude Code `2.1.292` binary, read only (binary).

- Claude Code sends the hook `prompt` as a stopping condition, and asks whether it holds, based on transcript evidence only.
  `Stop` and `SubagentStop` get their own system prompt for this.
- The model is the hook `model` field, else `ANTHROPIC_SMALL_FAST_MODEL`, else Haiku in most setups.
- The default timeout is 30 seconds.
- The answer schema is `ok`, `reason`, and `impossible`, and `ok` and `reason` are required.
  An `ok: false` answer on `Stop` or `SubagentStop` blocks, and Claude gets the reason and continues.
  With `impossible: true`, the stop goes through.
- The next stop in the turn has `stop_hook_active: true`.
- A timeout, an API error, invalid JSON, or a schema failure does not block, so the hook fails open.
- Claude Code ends the turn after 8 consecutive blocks from `Stop` hooks, and shows a warning.
  `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` changes the cap, and a value of 0 or less removes it.
- Each query loop keeps its own count of blocks, and a subagent runs its own loop.
  The count resets to 0 when Claude calls a tool.

## Live Tests

These facts are from live tests of `2.1.292` in `just sandbox` with Haiku 4.5 (tested).

- A `"type": "prompt"` hook in a plugin `hooks.json` runs on `Stop` and on `SubagentStop`.
  The bug in [issue #13155](https://github.com/anthropics/claude-code/issues/13155) does not occur on `2.1.292`.
- The evaluator model is `claude-haiku-4-5`.
  `$ARGUMENTS` in the prompt becomes the hook input JSON.
- On a block, Claude gets `Stop hook feedback:`, then the full hook prompt in square brackets, then the `reason`.
  So a long prompt adds its full length to the context at each block.
- A `SubagentStop` hook that always blocks blocked a subagent 8 times.
  At the 9th block, the subagent ended, and the main agent got no warning.
- On 2026-10-07, the retry after a block repeated the claim "Done, all tests pass" with no test run, and the hook allowed it, because `stop_hook_active` was `true`.
  The same message with `stop_hook_active: false` was blocked in 3 of 3 runs.
- Claude Code puts the prompt after the text "Based on the conversation transcript above, has the following stopping condition been satisfied?
  Answer based on transcript evidence only."
  So the evaluator judges a "stopping condition" and also sees the transcript.
  A false block on a message that only asked for approval is probably a judgment of the task and not of the claims (not verified).
- On 2026-10-07, 10 runs of each prompt version on `claude-haiku-4-5` gave these false blocks on a message that asked for approval:

  | Prompt version | False blocks, first stops | False blocks, retries |
  | --- | --- | --- |
  | Old prompt, 1,859 characters | 2 of 10 | 1 |
  | "Met, unless …" wording | 5 of 10 | 0 |
  | Stopping condition, 1,498 characters | 0 of 10 | 0 of 7 |

- With the 1,498-character prompt, 2 messages that said "Done, add.js is fixed and all tests pass" with no check were both blocked.
  The sample of true positives is small.
- In a Haiku eval run (`2026-10-10T23-07-46-668Z`), the default background evaluator wrote prose in place of JSON.
  Claude Code then returned the hook prompt to the session as `Stop hook feedback`.
  A prompt that asks for the JSON object first passed 3 of 3 in the rerun (`2026-10-10T23-53-58-434Z`).

The [hooks doc](https://code.claude.com/docs/en/hooks) says that the count resets to 0 at each tool call.
The [environment variables doc](https://code.claude.com/docs/en/env-vars) says that the cap applies to `Stop` and `SubagentStop` hooks.

## Related Pages

- [Model Guidance](Model-Guidance)
- [Probes of 2.1.301](Probes-2.1.301)
- [Engine Facts](Decisions-Engine)
- [Evidence](Evidence)
