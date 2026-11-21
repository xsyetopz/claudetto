---
status: accepted
date: recorded in user decision, 2026-11-11 and 2026-11-12 (day of decision not recorded)
---

# No Plugin-Invented Schemas or Files

## Context and Problem Statement

Earlier designs wrote plugin-invented files: `case.json`, `runs.json`, `dotclaude-rules.json`, a handoff tool, command, files and cleanup, `runs.jsonl`, `gate-asks/*.jsonl`, `.claude/claudetto/output/`, start/depth/time caps, and a `.created-by-claudetto` marker. Which of them stay?

## Considered Options

- Keep the invented files.
- Remove them and use native keys (native env keys replace the start, depth, and time caps).

## Decision Outcome

Chosen option: remove them. The user ordered NEVER for `case.json`, `runs.json`, and `dotclaude-rules.json`; the user approved each other removal on 2026-11-11 and 2026-11-12 (user decision).

## Consequences

Good: fewer files to keep in step with Claude Code. Bad: the removed handoff tool, command, and cleanup need the replacement the handover ADRs define.

Source: user decision, 2026-11-11 and 2026-11-12; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md (D321 removals; line not matched one by one); gate-asks: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/permission-policy/spec.md:274; marker: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/session-hygiene/spec.md:61; `runs.jsonl` and `case.json` wording unresolved in openspec/ (no hit).
