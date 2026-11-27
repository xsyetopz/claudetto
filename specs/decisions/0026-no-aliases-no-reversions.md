---
status: accepted
date: 2026-11-10
---

# No Aliases, No Reversions

## Context and Problem Statement

The agent asked whether to keep a `parseSync as parse` alias after a parser swap, and whether to revert a rename commit if the user did not choose it. Both are ways to keep the old shape next to the new one.

## Considered Options

- Keep an alias for the old name.
- Revert a commit that may not be the user's.
- Move forward only: no alias, no reversion.

## Decision Outcome

Chosen: Move forward only. The user wants no compatibility aliases and no reversions of settled work. This agrees with the rule of one obvious way for each job.

## Consequences

- The agent removes an old name when it renames, and does not add a shim.
- The agent does not revert a commit unasked.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/76585f31-efbf-45ca-ba61-7687f97970ee.jsonl:12549, user decision, 2026-11-10.
