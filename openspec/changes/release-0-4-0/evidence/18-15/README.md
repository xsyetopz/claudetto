# Task 18.15: Glob in the restore check

All runs use claudekit's fake Messages API from `/tmp/claudekit-leftovers` on Claude Code 2.1.319. They cost nothing.

- `tools.ts`: the main loop's first request carries no `Grep` or `Glob`, neither bare nor with the plugin, and the deferred list names neither.
  - Bare: `Agent,Bash,DeferredToolPlaceholder,Edit,ListAgents,Read,ReportFindings,ScheduleWakeup,Skill,ToolSearch,Workflow,Write`.
  - With the plugin: `Agent,Bash,DeferredToolPlaceholder,Edit,ToolSearch`.
- `agent.ts`: the first requests of `claudetto:Artemis` and `claudetto:Metis` each carry `Read,Grep,Glob`.
- `seen.ts`: hypothesis: a subagent's calls reach the gate's state, but a Glob result marks nothing as seen.
  - Prediction: after a subagent Reads `work/f.txt`, the probe deletes it and the main loop's `Write` of it is asked about. After a Glob lists it, the Write goes through.
  - Result before the fix: Read `asked: true`; Glob `asked: false, written: true`; control (a Glob that found nothing) `asked: false`.
  - Result after the fix, on a copy of the plugin: Read `asked: true`; Glob `asked: true, written: false`; control `asked: false, written: true`.
- Fix: `saw` in `hooks/gate/recreate.ts` takes the call's result text, and for `Glob` and `Grep` records each line that is an absolute path. The `--resume` replay passes the recorded text.
- Lab, in `hooks/gate.test.ts`, on a copy holding only that file: 54 pass, 0 fail.
  - The tests are "a file seen only in an agent's Glob and gone now asks on a Write" and "a file an agent's Glob listed before a resume and gone now asks on a Write".
  - Three mutants are caught:
    - no `Glob` branch: the first test fails;
    - no result text passed from `tool.call`: the first test fails;
    - no text passed by the replay: the second test fails.
