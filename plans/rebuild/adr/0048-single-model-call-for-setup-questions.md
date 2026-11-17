---
status: accepted
date: 2026-11-14 (date of the handoff that records it; day of decision not recorded)
---
# One Model Call for Setup Questions

## Context and Problem Statement

The user reported that setup ran extremely slowly and said it could be faster with one model call and AskUserQuestion.

## Considered Options

- One call per question.
- One Haiku call for all questions.

## Decision Outcome

Chosen: One call for all setup questions.

## Consequences

Setup advice is batched; PR #23 shipped it.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, latest user message and Done).
