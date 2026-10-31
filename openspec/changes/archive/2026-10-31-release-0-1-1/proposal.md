# Proposal

## Why

Task 12.4 of `release-0-1-0` asked for a block of every kind in `BlockKind`, and three kinds had none: `context`, `screen`, and `status-line`. The owner chose to drop `context` and `screen`, since the `session` and `policy` blocks already add context and draw the goal mark, and neither kind has a feature of its own.

`status-line` has a defect to fix. Setup denies `Agent(statusline-setup)`, so the built-in `/statusline` spends a main-model turn asking for an agent the user has denied, and then fails. `.claude/claudetto/research/statusline-command.md` holds the design that fixes it.

## What Changes

- `BlockKind` loses `context` and `screen`. No block uses either one.
- A new `status-line` block answers the built-in `/statusline` with no model call. It writes claudetto's `statusLine` and `subagentStatusLine`, keeps a line the user set, and reports what it did. Its listing description says that claudetto writes the line.
- `/statusline <text>` with arguments still runs the built-in when `Agent(statusline-setup)` is not denied. When it is denied, claudetto says so and names the rule to remove.
- `agents/main.md` is cut to fit the 3,645-character body it replaces under the shipped settings, and its budget moves from 5,627 characters to 3,678 as the request carries the body. On `2.1.316` the file costs 1,708 characters more than that body.
- A tool result that would take a Haiku 5.5 request over 100,000 prompt tokens is withheld, and the model is told to ask for less. Above that step Haiku bills the whole request at five times, and the 90,000 handoff trigger cannot stop one large result. Moving the task to another model is not the fix: Sonnet 5.5 costs more per token than Haiku above the step, and a switch writes the whole prompt into the new model's cache.
- Release `0.1.1`: the four manifests, a `CHANGELOG.md` section, and the README line for `/statusline`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `status-line`: adds the requirement that `/statusline` is answered by claudetto with no model call. This capability is created by `release-0-1-0`, which is archived first.
- `tier-profiles`: adds the requirement that a tool result does not carry a Haiku request past the price step.
- `prompt-footprint`: the main agent budget is the body under the shipped settings, 3,678 as the request carries it, not 5,627.

## Impact

- `plugins/claudetto/src/blocks/block.ts`: two kinds removed.
- `plugins/claudetto/src/blocks/status-line/`: new block, with its hooks and its tests, and the matching hook lab file under `plugins/claudetto/tests/`.
- `plugins/claudetto/src/blocks/catalog.ts`: one catalog row and one attach call.
- The settings read and write in `plugins/claudetto/src/blocks/setup-command/hooks.ts` move to a module both blocks share.
- `openspec/changes/release-0-1-0/tasks.md`: 12.4 points at this change.
- A `turn.step` and a `tool.call` hook, with their tests, in a block under `plugins/claudetto/src/blocks/`.
- `plugins/claudetto/agents/main.md`, `tools/limits.ts`, and `tests/repo/prompt-budget.test.ts`.
- The `0.1.1` manifests, `CHANGELOG.md`, and `README.md`.
