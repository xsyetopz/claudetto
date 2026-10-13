---
name: handoff
description: Writes a handoff file with the goal, the state, the next step, and the constraints of the user, then starts a clean session that reads it. Use when the context is large or a part of the work is done and the user wants to continue in a new session.
disable-model-invocation: true
allowed-tools: Write
---

<task>
Write the handoff file, so that a new session can continue the work.
The mod runs `/clear` after this turn and gives the new session the path of the file.
</task>

<steps>
1. Use the path of the handoff file that this prompt names.
2. Write the file with the `Write` tool.
3. Put four parts in the file: the goal, the state, the next step, and the constraints of the user.
4. Copy each constraint of the user word for word, because a summary drops constraints.
5. Name each open file, each failing check, and each decision that is not final.
6. Make no other change. Answer in one line with the path.
</steps>
