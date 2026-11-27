---
status: accepted
date: 2026-11-04
---

# Background Tasks Stay Enabled

## Context and Problem Statement

`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` also stops auto-backgrounding, Ctrl+B, and MCP auto background. No partial switch keeps `run_in_background` and drops only its text. Should the setup write the variable?

## Considered Options

- Set `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`. It trims Agent and Bash text (sent bytes 29,295 to 27,943) but turns off every background path.
- Leave it unset.

## Decision Outcome

Chosen: leave it unset, because the feature is off by default and the user's rule is that a default-off feature stays unset.

## Consequences

`run_in_background` stays in the Agent and Bash text. Its trim is left to `tool.describe`.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1790; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3120; user decision, 2026-11-04.
