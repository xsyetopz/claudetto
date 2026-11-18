---
status: accepted
date: 2026-11-14
---
# Ask Questions through AskUserQuestion

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

Source: user decision, 2026-11-14 14:19 UTC, ask each question through AskUserQuestion (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36420); user decision, 2026-11-16 15:27 UTC, questions go through AskUserQuestion (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b1ac2fdf-4da4-4f95-8340-0d1d068a5d88.jsonl:302); observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Rules).
