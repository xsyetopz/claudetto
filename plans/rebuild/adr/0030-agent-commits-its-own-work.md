---
status: accepted
date: 2026-11-12
---

# The Agent Commits Its Own Work When the User Allows It

## Context and Problem Statement

A project rule says not to commit unless asked, and a stop hook asks for a commit; the agent held its work uncommitted and asked.

## Considered Options

Never commit; ask each time; commit when the user says so and treat it as the agent's job.

## Decision Outcome

Chosen: Commit when the user says to, including changes that were already in the tree, and do it without a second ask. The user said it was the agent's job. Supersedes none.

## Consequences

The agent splits work into separate Conventional Commits.

Source: user decision, 2026-11-12 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/0aeae205-b9f3-46e8-9b4a-f0afa266d523.jsonl:3305`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/f562bb33-b072-47ed-a737-f1b3d070b642.jsonl:2034`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/f562bb33-b072-47ed-a737-f1b3d070b642.jsonl:2129`)
