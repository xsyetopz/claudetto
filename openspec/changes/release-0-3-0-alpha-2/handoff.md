openspec change: `openspec/changes/release-0-3-0-alpha-2/`.
Next open task: `2.1` in `tasks.md`.
Done tasks, checked in `tasks.md`: `1.1`, `1.2`, `1.3`.
Passed checks: none.
Only a checked task or a passed check is done.
Each checked task is done and verified, so run its check again only when the user asks.

- Task: bring the planning files of openspec change `release-0-3-0-alpha-2` in line with D20 to D24 through the skill `openspec-update-change` (planning files only, no code). The user confirmed all 12 revisions: "proposal.md (1-7), prd.md (8-10), architecture.md (11), review + tasks + spec (12)".
- `proposal.md` got the built-in agents off, the `claude-demo` alias, `Concise.md` format only, the D8 note fix ("sets a note"), `compaction` `auto`, `handover`, or `built-in`, bullets D20 to D24, and the Impact lines. The script printed `ok`.
- `prd.md` got 3 new problems, the goals G19 (20-line memory files) and G20 (`minispec` parity, 793 lines or fewer), and 2 success measures. The script printed `ok`.
- `architecture.md` got the 4 stale points fixed (line 10, line 36, A5, A6), the component table rows, and the new decisions A8, A9, and A10. The script printed `ok`.
- RAN, result after this handoff: a `python3` edit that adds `general-purpose` and `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` to the requirement "Built-In Agents Off" in `specs/settings-levers/spec.md`.
- Next:
  - Edit `review.md` with the coverage rows for D21 to D24 and G19 and G20.
  - Move the paid sandbox run of task 9.6 and the paid eval of task 7.6 into group 11, in the one ask of task 11.3. The two paid runs as they stand break D18.
  - Run `minispec validate release-0-3-0-alpha-2 --strict` (last result `"valid": true`, `"failed": 0`, tasks `{'done': 3, 'total': 64, 'next': '2.1'}`).
  - End the report with: run `/claudetto:apply` or ask me to apply this change.
- Facts for the next step: today's `/usage` told the user to "Give "claude" subagents a cheaper model" and to "Stop sessions you no longer need · some ran 8 hours or more". The plugin line count is `8726 total`. The spec slice has `793 total`.
- User words:
> apply the plan changes first.
> what's weird is that openspec official recommends the command to use, and your agent didn't.
> less code for same coverage and behaviour? that's what you have to optimize for.
