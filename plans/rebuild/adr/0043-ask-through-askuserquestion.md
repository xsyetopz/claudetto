---
status: accepted
date: 2026-11-14 (date of the handoff that records it; day of decision not recorded)
---
# Ask Questions Through AskUserQuestion

## Context and Problem Statement

The agent asked a plain-text question. The user wants each question asked through AskUserQuestion, and each mention of it wrapped in backticks.

Transcript record tx-x01b/ask-user-question-for-decisions: When must the agent stop and ask?

## Considered Options

- Plain-text question.
- AskUserQuestion.
- Decide alone and state assumptions.
- Ask through `AskUserQuestion` for each question, product choice, decision the user should know, and step git cannot undo.

## Decision Outcome

Chosen: AskUserQuestion.

## Consequences

A prompt line that tells the agent to ask before it assumes conflicts with texts.ts:16; a manifest test pins the older line.

Transcript record tx-x01b/ask-user-question-for-decisions decided: Ask through `AskUserQuestion` in those four cases. Good: choices stay with the user. Bad: more prompts.

Source: user decision, 2026-11-14 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241); observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Rules); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded).
