# Decisions-Reversed

The decisions of 0.x that 1.0.0 reverses, with the reason for each reversal.
The decisions in force are in [Decisions](Decisions).

## Settings

- D35 No proprietary formats.
  Old choice: dotclaude writes no format of its own that Claude Code does not read or define, and a feature that needs a file for a later call to read back is not built.
  Reason: the user decided on 2026-10-12 that `.dotclaude/` holds dotclaude's own files, with an append-only `events.jsonl` for the spec store, and that `/handoff` returns.
  This also reverses the handoff clause of D5.
  Source: `.dotclaude/spec/changes/1.0.0/change.md` (Decisions of the user, 2026-10-12, and Scope), and `.dotclaude/spec/changes/1.0.0/packages/34-spec-events.md`.

## Prompt

None yet.

## Router

None yet.

## Tools

None yet.

## Layout

None yet.

## Evidence

None yet.
