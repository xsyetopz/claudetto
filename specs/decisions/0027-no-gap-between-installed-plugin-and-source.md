---
status: accepted
date: 2026-11-10
---

# No Gap Accepted Between the Installed Plugin and the Source

## Context and Problem Statement

A side agent noted that the installed claudetto still allowed reads that the source now denies, and offered: reinstall now, or accept the gap until the next release.

## Considered Options

- Reinstall the plugin now
- Accept the gap until the next release

## Decision Outcome

Chosen: The user accepts no gap; the agent loads the branch's plugin at once with `--plugin-dir` and the installed copy disabled.

## Consequences

A fixed guard is live in the session that fixed it.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d21b8a3c-f9ed-4529-894d-f27c09158b69.jsonl:5918, reported, user, 2026-11-10 (user decision, 2026-11-10).
