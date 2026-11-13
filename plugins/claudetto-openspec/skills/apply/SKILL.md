---
name: apply
description: Implement the tasks of an OpenSpec change. Use for "openspec apply", "opsx apply", or when the user says to continue a change's tasks.
---

The tool is `mcp__claudetto-openspec__openspec`.

1. Pick the change: the name the user gave, else the one change `{action:"status"}` lists. Several changes and no name: ask which.
2. Validate first: `{action:"validate", change}`. On any ERROR or WARNING, stop and name each issue (path and message), with no edit. The user fixes the change or runs the update skill.
3. `{action:"status", change}`. Read the files it lists (proposal, design, specs, tasks.md) before the first edit.
4. Work the unticked tasks in order. Keep each edit to what its task says. After a task is done, change its `- [ ]` to `- [x]` in tasks.md, in the same turn.
5. Work every unticked task your tools can do before you stop, because a task left for the user waits a whole turn. When one task is blocked, go on with the next one it does not block. Stop only when each task left needs a decision from the user, hits a denial, or needs a step only the user can take: a command such as `sudo` or a login, or a physical step such as connecting a device. Then wait for the user's answer.

## Ending A Pause Or A Report

End every pause and every final report by copying each task you leave unticked as its `- [ ]` line, exactly as `tasks.md` has it, with the blocker beneath it. The blocker is one of:

- `! <command>` for the user to run, the exact command;
- the physical step for the user to take, such as "connect the test phone over USB";
- the denial from this turn, quoted;
- an open question to the user.

A task your tools can still do is no blocker: do it before you end. Copy each task whole, so the user can match it to `tasks.md`. When none are left, say the change is done and name the verify skill.
