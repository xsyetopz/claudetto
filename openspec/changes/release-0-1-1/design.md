# Design

## Context

- `/statusline` is a built-in `prompt` command. It runs no code of its own and returns a prompt that asks the model to start the `statusline-setup` agent (`.claude/claudetto/research/statusline-command.md`, section 1).
- `command.run` hooks can answer a command without `next`, so the command body never runs. claudetto already does this for `/claudetto:setup` (`plugins/claudetto/src/blocks/setup-command/`). Whether the hook takes over a built-in `prompt` command is inferred from the type doc and not yet tested end to end.
- Haiku 5.5 bills a request whose prompt is over 100,000 tokens at five times, cache reads included (`docs/models.md`, "The Price Cliff"). The 90,000 handoff trigger is checked between calls, and 53 of 1,377 Haiku steps on this machine grew by more than its 10,000-token margin, from single tool results of 84,000 to 411,764 tokens (`docs/window-weights.md`).
- `plugins/claudetto/src/tiers/status-line.ts` holds the `statusLine` value, and `applyTier` in `src/tiers/merge.ts` keeps the values a user set.

## Goals / Non-Goals

**Goals:**

- One block of kind `status-line` that owns the `/statusline` answer and its listing description.
- The settings read and write shared with `setup-command`, not copied.
- No tool result carries a Haiku 5.5 request past 100,000 prompt tokens.

**Non-Goals:**

- No change to the status line script `bin/claudetto-statusline` or to `src/statusline/`.
- No `/claudetto:statusline` command. Setup already writes the line, and `/statusline` is the name users type.
- No model switch. Sonnet 5.5 costs $2.00, $0.10 and $10.00 per million input, cache-read and output tokens against Haiku's $0.50, $0.05 and $2.50 above the step, and the first request after a switch writes the whole prompt into the new model's cache.
- No `skillOverrides` entry. Turning `/statusline` off would remove the command the hook catches.

## Decisions

- **Hook `command.run` on `statusline`, with `command.describe` for the label.** Alternatives: a plugin command, which can only add `/claudetto:statusline`, and `agent.offer`, which hides the agent but leaves the wasted model turn in place. Neither fixes the defect.
- **Write only `STATUS_LINE_KEYS` through `applyTier`.** It is the same merge setup uses, so a user line is kept the same way in both paths. No question dialog: the command names one group.
- **Arguments pass to the built-in only when its agent is not denied.** Users who removed the deny want the built-in flow. With the deny present, the built-in can only fail after a model turn, so claudetto answers in its place.
- **Share the settings path and parse as pure `settingsFileFor` and `settingsOf` in `src/settings-file.ts`.** Both blocks read the same file, and `jscpd` in `just lint` fails on a copy. The hook loader follows `$` past an import only into a `function` declaration, which the lint rules forbid, and it accepts `$` only as `$.noun.event(...)` with a literal env name, so `$.env` cannot be passed as a value either. The `$` read therefore lives once in `src/blocks/settings-commands.ts`, which holds both `command.run` handlers, and each block's `block.ts` imports its handler from there.
- **A failing hook passes the command on with `next(e)`.** The built-in still runs when claudetto's hook throws.
- **Withhold the result with `{ deny }` after `next(e)`, not a shortened `{ result }`.** Core checks a hook's `result` against each tool's output schema, so a cut result would need a shape per tool. A deny after the tool ran reads `<tool> ran, and a plugin withheld its result: <text>` for every tool, and the text says how to ask for less.
- **Read the loop's prompt from its last `turn.step`.** The step's `usage` names the model that answered and its input, cache-read, cache-write and output tokens, and the tool call comes from that step, so a reading always exists. Keyed by `agentId`, absent on the main loop, so a Haiku subagent is bounded the same way.
- **Estimate a result's tokens at 3 characters each.** `claudekit` prices transcripts at 4, and Haiku 5.5 counts about 30% more tokens than Haiku 4.5 for the same text, so 3 errs toward withholding. Not measured against the token-count API.

## Risks / Trade-offs

- [The hook does not take over a `prompt` built-in] → The first task runs `/statusline` in a real `2.1.314` session with the hook in place, before the rest is built. If it fails, the block falls back to `command.describe` plus an answer from `/claudetto:setup`, and the plan is revised.
- [A withheld result costs a rerun] → The tool already ran, so the model pays a second, narrower call. That is cheaper than a request at five times, and the cost lands only where the sum is over the step.
- [The estimate misjudges a result] → Too high withholds a result that fit; too low lets one cross. The probe reads the text size against the next request's token count in a fake API session, and the hook test pins both sides of the threshold.
- [A changed `command.describe` text moves the prompt cache] → `/statusline` sets `disableModelInvocation`, so it is not in the model's listing. `just capture --shipped` confirms the first request is unchanged.

## Migration Plan

Archive `release-0-1-0` before this change, so the `status-line` capability exists when this delta merges into it. Installing the update needs no step beyond the README's "Update" section.
