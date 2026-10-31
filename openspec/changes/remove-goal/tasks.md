# Tasks

## 1. Remove the Goal Code

- [x] 1.1 Delete `plugins/claudetto/src/blocks/finish/goal.ts` and `finish/__tests__/goal.spec.ts`. Verify that `rg -n "goal\.ts" plugins/claudetto/src` finds nothing.
- [x] 1.2 Cut `hooks.ts` to `onFinishStop` with `loopBlock` only, and cut the goal texts from `prompts.ts`. Verify that `bun test plugins/claudetto/src/blocks/finish` passes.
- [x] 1.3 In `block.ts`, remove the `command.run`, `command.describe`, `ui.render`, and `tool.call` registrations, and the routes that only the goal used. Verify that `just typecheck` exits 0.
- [x] 1.4 Remove the `goal` and `goalHeld` keys from `plugins/claudetto/types/claudetto.d.ts`. Verify that `just typecheck` exits 0.
- [x] 1.5 Delete the hook lab `plugins/claudetto/tests/finish/goal.test.ts`, and add a lab case to `loop.test.ts`: `/goal x` reaches the built-in `command.run` unchanged. Verify that the hook lab reports 0 fail.

## 2. Docs and Tests That Name the Goal

- [x] 2.1 Rename the `snippet.spec.ts` test "`modelProposedGoals` stays unset while `/goal <cmd>` is planned" so it does not name `/goal <cmd>`. Its assertion stays. Verify that `bun test plugins/claudetto/src/tiers` passes.
- [x] 2.2 Rewrite the `/goal` row at `README.md:92` to describe the `tasks.md` loop only, and add a `Removed` entry under an unreleased heading in `CHANGELOG.md`. Verify that `just lint` exits 0.
- [x] 2.3 Edit the Purpose of `openspec/specs/finish-loop/spec.md` to name the `tasks.md` loop only. Verify that `bunx openspec validate remove-goal --strict` passes.

## 3. Integration

- [x] 3.1 Run `just check`. Verify that the only failures are the 18 `EADDRINUSE` and 3 pty cases that the sandbox causes.

## Workflow follow-up

- Archive the change after review.
