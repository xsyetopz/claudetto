---
status: superseded by ADR-0170
date: recorded in openspec/specs/surface-trim/spec.md:222 (day of decision not recorded)
---
# Expand the Shell-Group Fold

## Context and Problem Statement

An early change set `isExpanded: true` on a tool group in a `ui.render` hook to show shell-group results expanded (task 18.29).

## Considered Options

- Set `isExpanded` in a `ui.render` hook.
- Leave the engine fold.

## Decision Outcome

Chosen at the time: expand the shell-group fold. Superseded: no `ui.render` hook sets `isExpanded` on a ToolGroup; the engine folds grouped search and shell results itself with "(ctrl+o to expand)" (confirmed on a real screen); `fold.ts` is deleted.

## Consequences

- `isExpanded` is absent from plugins/ at 088a227c; nothing to build.

Source: openspec/specs/surface-trim/spec.md:222; openspec/specs/surface-trim/spec.md:232.
