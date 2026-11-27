---
status: accepted
date: 2026-11-16
---
# The User's Orders Outrank Queued Steps

## Context and Problem Statement

A handoff queues next steps; the user may say otherwise.

Transcript record tx-x02/user-messages-only-orders: The agent took a handoff and an old goal file as standing orders, and acted on a goal it wrote itself. The user sets the goal with `/goal`.

## Considered Options

- The handoff Next list leads.
- The user's order leads; the goal outranks the handoff.
- Handoffs, goal files, and plan files are orders.
- Only the user's own messages are orders; the rest is context.

## Decision Outcome

Chosen: The user's orders beat queued steps and easier paths; a handoff cites evidence, quotes the user, sets no order, and the goal outranks it.

## Consequences

Good: a correction survives a reset. Bad: handoffs must carry the user's words in full.

Transcript record tx-x02/user-messages-only-orders decided: only the user's own messages are orders. Handoffs, goal files, and `openspec/` are context. The agent checks each next step against the user's messages. Ruled out: acting on a goal the agent set itself.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057 (the user's reproach); user decision, 2026-11-16 17:40 UTC, do what the user asked, nothing else (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4133).
