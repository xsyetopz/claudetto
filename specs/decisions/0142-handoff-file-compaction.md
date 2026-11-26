---
status: superseded by ADR-0143
date: recorded in openspec/specs/compaction-path/spec.md:10 (day of decision not recorded)
---
# Handoff File Compaction

## Context and Problem Statement

The compaction-path spec chose a file path: the first auto-compaction with no file is skipped with one notice naming `<CLAUDE_CODE_TMPDIR|TMPDIR|/tmp>/claudetto-handoff-<session id>.md`; the file text becomes the one message and is removed; a precompute leaves the file; a second auto-compaction after the notice takes the built-in path.

## Considered Options

* Handoff file with a skipped first compaction (the spec)
* Fork handover that writes no file and skips no compaction

## Decision Outcome

Chosen option: the fork handover, because handover replaces core auto compaction. The file path pattern and the rule that a precompute skips are rejected.

## Consequences

* Good, because no file is left in the temp folder.
* Bad, because the D321 conflict the plan flags stays open until the successor record is written.

Source: openspec/specs/compaction-path/spec.md:10; openspec/specs/compaction-path/spec.md:16; openspec/specs/compaction-path/spec.md:69.
