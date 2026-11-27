---
status: accepted
date: 2026-11-13
---

# Bulk Passes Go to Cheap Workers

## Context and Problem Statement

The agent hesitated to start a text and naming pass over about 1,800 Swift files and 120 Markdown files, for fear of the user's usage limit.

## Considered Options

Run it in the lead; run it in cheap haiku or sonnet workers; skip it.

## Decision Outcome

Chosen: Run bulk mechanical passes in haiku or sonnet workers. The user said usage stays safe that way. Supersedes none.

## Consequences

Worker count and model choice follow the delegation block.

Source: user decision, 2026-11-13 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:15323`)
