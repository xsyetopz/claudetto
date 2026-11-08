---
name: propose
description: Propose a new OpenSpec change with proposal, design, specs and tasks in one pass. Use for "openspec propose" or "opsx propose".
---

The tool is `mcp__claudetto-openspec__openspec`. If its schema is not loaded, load it with ToolSearch `select:mcp__claudetto-openspec__openspec`.

1. Get a kebab-case name from the user's words. Ask what they want built only if you cannot name it. If `openspec/changes/<name>` exists, ask for another name or point to the update skill.
2. Read the code and `openspec/specs/` the change touches. Do not invent behavior.
3. Create these files under `openspec/changes/<name>/`:
   - `.openspec.yaml`: `schema: spec-driven` and `created: YYYY-MM-DD`.
   - `proposal.md`: `## Why`, `## What Changes`, `## Capabilities` (New and Modified, one capability per line), `## Impact`.
   - `design.md`: context, goals and non-goals, decisions with the reason for each, risks.
   - `specs/<capability>/spec.md`, one per capability. Only this path is read.
   - `tasks.md`: `## 1. Group` headings, then `- [ ] 1.1 Task` lines. Every task is a checkbox and is numbered.
4. Spec deltas use `## ADDED Requirements`, `## MODIFIED Requirements` (restate the whole requirement and keep its scenarios), `## REMOVED Requirements` (**Reason**, **Migration**), `## RENAMED Requirements` (FROM and TO). Each `### Requirement: <name>` holds SHALL or MUST and at least one `#### Scenario: <name>` with `- **WHEN**` and `- **THEN**` lines.
5. Call `{action:"validate", change}` and fix every issue until it is valid.
6. Report the name, the files, and that apply is next.
