---
status: superseded by ADR-0143
date: recorded in openspec/specs/compaction-path/spec.md:61 (day of decision not recorded)
---

# Old Handoff Requirements Removed

## Context and Problem Statement

The old handoff skipped the first compaction, appended a user message mid-turn, and installed a file written one compaction earlier. D321 REMOVED requirements in compaction-path (handoff reply replaces compaction, large-context fork at idle, handover loop, no mid-turn fork, four-arm threshold), the 19 session-handoff requirements, "Stale Claudetto Files Go", "Bound Output and Heartbeat Files Go", "Marked Temp Folders Go", the secret-matcher "Every Handoff Is Scanned", and the agent-conduct requirements "Comments State a Reason", "Code Rules Guard Only Trust Boundaries", and "Each Rule File Applies to Every Path".

## Considered Options

- Keep the old requirements.
- Remove them; the settled handover decision replaces auto compaction by default, and the edge-case and comment rules move to user rules.

## Decision Outcome

Chosen option: remove them.

## Consequences

Good: no requirement left that describes behavior the code no longer has. Bad: the replacement handover behavior must carry the guarantees (see the REQ-HANDOVER items).

Source: openspec/specs/compaction-path/spec.md:61; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/secret-matcher/spec.md:26; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/agent-conduct/spec.md:140; openspec/specs/session-hygiene/spec.md:8.
