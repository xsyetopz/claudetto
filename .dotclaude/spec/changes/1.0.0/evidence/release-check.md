# P16: Sandbox Session of the Release Check

This file gives the method and the results of step 5 of [P16](../packages/16-release-check.md).
One session in the sandbox ran `/spec`, `/ship`, `/hotfix`, a decision, and a handoff.

## Method

- Branch `p16-integrate`, with the nine `p16-*` fix branches merged.
  `just check` passed on it before the session.
- Claude Code `2.1.296`, model `Sonnet 5.5`, auto mode.
  `/status` showed the auth token `CLAUDE_CODE_OAUTH_TOKEN`, which the sandbox script sets from the login of the user.
  So the session ran on the subscription.
- The command was `bun --env-file=<main checkout>/.env tools/sandbox.ts --dir /tmp/p16-sandbox.k9hHgW`, in a detached `tmux` session.
  The env file gives `TYPESAFE_API_KEY` to the `decide` slice.
  Claude Code asked whether to use the `ANTHROPIC_API_KEY` of the env file, and the answer was `No`.
- The project was a git repository with `math.ts`, `math.test.ts`, and `README.md`.
  `sub` in `math.ts` returned `a + b`, so one of the two tests failed.

## Results

| Action | Prompt | Result |
| --- | --- | --- |
| `/spec` | `/dotclaude:spec add-mul-div large`, with `mul` and `div` as one package each | A planner agent wrote `design.md`, and a reviewer agent checked it. `dotclaude-spec validate add-mul-div` printed `Valid.` |
| `/ship` | `/dotclaude:ship add-mul-div` | One implementer and one reviewer for each package. Both packages were merged into `master` and are `done` in `events.jsonl`. |
| `/hotfix` | `` `sub` in `math.ts` returns `a + b`, and it must return `a - b` `` | `sub` returns `a - b`. `bun test math.test.ts` gave 5 pass and 0 fail. The record is `.dotclaude/spec/hotfixes/2026-10-13-sub-in-math-ts-returned-a-b-instead-of-a.md`. |
| Decision | A question about `NaN` in `div`, with the `second_opinion` tool | Claude called `mcp__dotclaude__second_opinion`. The result was `Jev answered: return-nan (confidence 1.00)`, so the fallback did not run. |
| Handoff | `/dotclaude:handoff` | Claude wrote `.dotclaude/handoff/handoff-20261013T030342Z.md`. A new session, `a849a21b`, read the file and gave the state and the open decisions. |

## Findings

- The handoff hint after a package `done` showed as a second copy of the last reply.
  Lines 163 and 199 of transcript `f51cc9eb` are `system` notices with the label `dotclaude+cc-plugin-agents-md`.
  Each holds the full reply, with each line end changed to `U+FFFD`, and then the hint.
- During `/ship`, Claude wrote "The lane hook did not run", and it moved `P01` and `P02` to `review` with `dotclaude-spec lane`.
  `events.jsonl` has a `planned` row for `P01` only.
- The session changed the git-ignored files of the checkout that it loaded.
  It wrote `.claude-plugin/types/` into four more plugin folders, and a `tsconfig.json` into five plugin folders.
  It wrote `claude-code-tools/index.d.ts` again from the tools of the sandbox session, which has no `mode` field for `WebSearch`.
  Then `just check` failed in the type check and in the generate check.
  A copy of the type files from the main checkout and the removal of the new `tsconfig.json` files made `just check` pass again.
