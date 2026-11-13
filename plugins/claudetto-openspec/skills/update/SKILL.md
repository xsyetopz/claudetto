---
name: update
description: Revise an existing OpenSpec change so its proposal, design, specs and tasks agree. Use for "openspec update change" or "opsx update". Never edits code.
---

The tool is `mcp__claudetto-openspec__openspec`.

1. Pick the change (`{action:"status"}` lists them). Read every file in it.
2. Apply the user's new decision to the artifact it belongs to, then carry it to the others: proposal (why, what changes), design (decisions), `specs/<capability>/spec.md` deltas, tasks.md. A task already ticked stays ticked unless the decision undoes it. Say so when it does.
3. Edit only files under `openspec/changes/<name>/`. Leave code and `openspec/specs/` to apply and archive.
4. Call `{action:"validate", change}` and fix what it reports until it is valid.
5. Report what changed in each file, one line each.

Delta format: only `specs/<capability>/spec.md` is read. Its sections are `## ADDED Requirements`, `## MODIFIED Requirements` (restate the whole requirement and keep its scenarios), `## REMOVED Requirements` (give **Reason** and **Migration**), `## RENAMED Requirements` (FROM and TO). A requirement is `### Requirement: <name>`, holds SHALL or MUST, and each has `#### Scenario: <name>` with `- **WHEN**` and `- **THEN**` lines. Keep `specs/` to those files.
