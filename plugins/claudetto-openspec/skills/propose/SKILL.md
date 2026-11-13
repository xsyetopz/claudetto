---
name: propose
description: Propose a new OpenSpec change with proposal, design, specs and tasks in one pass. Use for "openspec propose" or "opsx propose".
---

The tool is `mcp__claudetto-openspec__openspec`.

1. Get a kebab-case name from the user's words. Ask what they want built only if you cannot name it. With no `openspec/` in the project, call `{action:"init"}` first.
2. Call `{action:"new", change}`. It writes `.openspec.yaml`. If it names an existing change, ask for another name or point to the update skill.
3. Read the code and `openspec/specs/` the change touches. State only behavior they show.
4. Create these files under `openspec/changes/<name>/`:
   - `proposal.md`: `## Why`, `## What Changes`, `## Capabilities` (New and Modified, one capability per line), `## Impact`.
   - `design.md`: context, goals and non-goals, decisions with the reason for each, risks.
   - `specs/<capability>/spec.md`, one per capability. Only this path is read.
   - `tasks.md`: `## 1. Group` headings, then `- [ ] 1.1 Task` lines. Every task is a checkbox and is numbered.
5. Spec deltas use `## ADDED Requirements`, `## MODIFIED Requirements` (restate the whole requirement and keep its scenarios), `## REMOVED Requirements` (**Reason**, **Migration**), `## RENAMED Requirements` (FROM and TO). Each `### Requirement: <name>` holds SHALL or MUST and at least one `#### Scenario: <name>` with `- **WHEN**` and `- **THEN**` lines.
6. Call `{action:"validate", change}` and fix every issue until it is valid.
7. Report the name, the files, and that apply is next.
