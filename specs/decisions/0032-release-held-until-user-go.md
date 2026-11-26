---
status: accepted
date: 2026-11-12
---

# Merge, Tag, and Release Wait for the User

## Context and Problem Statement

The user told the agent to prepare CI, tagging, and executable releases but not to release until the user says everything works; later asked for the user to audit the visuals before a merge, then gave the go.

## Considered Options

Release when CI is green; hold the merge until the user audits; hold merge, tag, and release until the user says so.

## Decision Outcome

Chosen: Hold merge, tag, and release until the user says go. The user gave the go on 2026-11-12 after the visual check. Supersedes none.

## Consequences

The agent reports the state and waits; it does not merge on green CI alone.

Source: user decision, 2026-11-12 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/62fb35cb-dd6d-4719-9eaa-89f8692eb98f.jsonl:13`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/62fb35cb-dd6d-4719-9eaa-89f8692eb98f.jsonl:3770`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/62fb35cb-dd6d-4719-9eaa-89f8692eb98f.jsonl:6291`)
