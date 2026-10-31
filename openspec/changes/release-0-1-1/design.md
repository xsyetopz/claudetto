# Design

## Context

- `/statusline` is a built-in `prompt` command. It runs no code of its own and returns a prompt that asks the model to start the `statusline-setup` agent (`.claude/claudetto/research/statusline-command.md`, section 1).
- `command.run` hooks can answer a command without `next`, so the command body never runs. claudetto already does this for `/claudetto:setup` (`plugins/claudetto/src/blocks/setup-command/`). Whether the hook takes over a built-in `prompt` command is inferred from the type doc and not yet tested end to end.
- `plugins/claudetto/src/tiers/status-line.ts` holds the `statusLine` value, and `applyTier` in `src/tiers/merge.ts` keeps the values a user set.

## Goals / Non-Goals

**Goals:**

- One block of kind `status-line` that owns the `/statusline` answer and its listing description.
- The settings read and write shared with `setup-command`, not copied.

**Non-Goals:**

- No change to the status line script `bin/claudetto-statusline` or to `src/statusline/`.
- No `/claudetto:statusline` command. Setup already writes the line, and `/statusline` is the name users type.
- No `skillOverrides` entry. Turning `/statusline` off would remove the command the hook catches.

## Decisions

- **Hook `command.run` on `statusline`, with `command.describe` for the label.** Alternatives: a plugin command, which can only add `/claudetto:statusline`, and `agent.offer`, which hides the agent but leaves the wasted model turn in place. Neither fixes the defect.
- **Write only `STATUS_LINE_KEYS` through `applyTier`.** It is the same merge setup uses, so a user line is kept the same way in both paths. No question dialog: the command names one group.
- **Arguments pass to the built-in only when its agent is not denied.** Users who removed the deny want the built-in flow. With the deny present, the built-in can only fail after a model turn, so claudetto answers in its place.
- **Share the settings path and parse as pure `settingsFileFor` and `settingsOf` in `src/settings-file.ts`.** Both blocks read the same file, and `jscpd` in `just lint` fails on a copy. The hook loader follows `$` past an import only into a `function` declaration, which the lint rules forbid, and it accepts `$` only as `$.noun.event(...)` with a literal env name, so `$.env` cannot be passed as a value either. The `$` read therefore lives once in `src/blocks/settings-commands.ts`, which holds both `command.run` handlers, and each block's `block.ts` imports its handler from there.
- **A failing hook passes the command on with `next(e)`.** The built-in still runs when claudetto's hook throws.

## Risks / Trade-offs

- [The hook does not take over a `prompt` built-in] → The first task runs `/statusline` in a real `2.1.314` session with the hook in place, before the rest is built. If it fails, the block falls back to `command.describe` plus an answer from `/claudetto:setup`, and the plan is revised.
- [A changed `command.describe` text moves the prompt cache] → `/statusline` sets `disableModelInvocation`, so it is not in the model's listing. `just capture --shipped` confirms the first request is unchanged.

## Migration Plan

Archive `release-0-1-0` before this change, so the `status-line` capability exists when this delta merges into it. Installing the update needs no step beyond the README's "Update" section.
