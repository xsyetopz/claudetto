# Proposal

## Why

claudetto's `/goal` replaces the built-in `/goal` with a different contract, and the replacement fails its users. `/goal release-0-2-0` became the shell check `sh -c release-0-2-0`, which exits 127 on every stop. The built-in keeps the text as written and has a model judge it.

Three more defects come from the replacement:

- The start prompt goes through `$.prompt.submit`. A turn that is running queues that prompt, and `/goal clear` cannot withdraw it. The Mod API has no withdraw call, and `prompt.submit` hooks fire when the prompt is queued.
- The prompt-hint mark is not drawn again when the goal is cleared.
- The mark shows no age under one minute. The built-in shows the age from one second.

The built-in `/goal` already does this job.

## What Changes

- **BREAKING**: claudetto no longer answers `/goal`. The built-in `/goal` runs, with its condition text unchanged.
- **BREAKING**: the `mcp__claudetto__goal` tool, the `/goal resume` word, and the `paused` and `blocked` goal states are removed.
- claudetto no longer draws a `/goal` mark in the prompt hint. The built-in draws its own.
- The `tasks.md` loop stays as it is. When the loop reaches its bound, it no longer marks a goal.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `finish-loop`: the `Goal Command` and `Root Agent Stops a Goal` requirements are removed, and the `Bounded Loop` scenario no longer marks a goal.

## Impact

- `plugins/claudetto/src/blocks/finish/`: `goal.ts`, the goal hooks in `hooks.ts`, the goal texts in `prompts.ts`, and four registrations in `block.ts`.
- The `goal` and `goalHeld` state keys in `plugins/claudetto/types/claudetto.d.ts`.
- Tests: `finish/__tests__/goal.spec.ts`, the hook lab `plugins/claudetto/tests/finish/goal.test.ts`, and the name of one test in `tiers/__tests__/snippet.spec.ts`.
- Docs: `README.md:92`, `CHANGELOG.md`, and the Purpose of `openspec/specs/finish-loop/spec.md`.
