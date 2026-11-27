---
status: accepted
date: 2026-11-14
---
# The Agent Does All Work Itself

## Context and Problem Statement

The agent asked the user to do steps and to check hardware that a tool or script could cover. The user said the agent is supposed to do all of it.

Transcript record tx-x02/agent-does-the-work: The agent asked the user for approval of rm -rf on temp folders, asked the user to press buttons, and deferred steps it could run.

## Considered Options

- The agent asks the user whenever a step is easier for the user.
- The agent does all work itself and asks the user only for a physical action.
- Hand steps to the user.
- Run each step, settings too; hand over only a step that failed on a password, a touch or a dialog no command answers.

## Decision Outcome

Chosen: The agent does all work itself and asks the user only for a physical action, such as plugging in a cable or moving a switch. Supersedes: none.

## Consequences

A handoff carries the rule; a reply that defers a doable step is a conduct defect. Cost: more tool calls per task.

Transcript record tx-x02/agent-does-the-work decided: the second. Deleting temp folders never needs the user's approval. The sandbox allows all but dangerous commands.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:4111 (handoff of 2026-11-14); user decision, 2026-11-14 21:15 UTC, fix open parts at once, do not hand them back (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1008); user decision, 2026-11-14 14:17 UTC, a temp-folder delete needs no approval (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36369).
