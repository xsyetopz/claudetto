# Evidence: the `ground` replay

Step 9 of `design-steps.md`.
No model call ran.

## Method

- The module `src/plugins/claudetto/slices/ground/adapters/check.ts` exports `check(event, prior)`.
  It runs the pure source check of the slice on a recorded `PreToolUse` call.
- Command: `bun src/plugins/claudetto-sessions/slices/sessions/skills/sessions/replay.ts src/plugins/claudetto/slices/ground/adapters/check.ts`.
- Data: `~/.claude/projects` (44 transcript files, 46 MB, 2026-10-18).

## Result

| Run | Calls replayed | Events checked | Denies |
| --- | --- | --- | --- |
| `check.ts` (the shipped filter) | 942 | 0 | 0 |
| Stress: each `Write` and `Edit` of a `.md` file counts as a plan file | 949 | 4 | 1 |
| Stress: each `Write` and `Edit` counts as a plan file | 952 | 19 | 1 |

- The local transcripts hold no `Write` or `Edit` of a plan or spec file and no `ProposeGoal` call.
  So the shipped filter checks no event, and the rate of false denies on real plan edits is not measured.
  The deny rate is 0 of 0 for the shipped filter, and 1 of 19 (5 percent) in the widest stress run.
- The one deny is `src/kernel/paths.ts:55-70`: the file has 34 lines now.
  The replay reads the files as they are today, so this is a stale reference of a past edit, not a false deny of the hook.
- The sample is too small to set a rate.
  The hook only denies with a message that names each claim and gives three ways out, so a false deny costs one rewrite.
  The rate needs a re-run when the transcripts hold plan edits.

## Skipped

- The end-of-turn note and the subagent-report check (items 2 and 3 of the step).
  The slices use only the `mod` hooks, and the engine has no `mod` event for the end of a turn or for a subagent report that the slice can use in a few lines.
