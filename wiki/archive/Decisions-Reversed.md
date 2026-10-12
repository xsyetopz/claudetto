# Decisions-Reversed

The decisions of 0.x that 1.0.0 reverses, with the reason for each reversal.
The decisions in force are in [Decisions](Decisions).

## Settings

None yet.

## Prompt

None yet.

## Router

- D25, number: the old choice was five agents.
  The 1.0.0 choice is a fixed set of six agents.
  The reason is the 1.0.0 scope of `.dotclaude/spec/changes/1.0.0/change.md` (section Scope), less the `test-runner` agent that item 8 of `evidence/zero-token.md` replaces with a CLI.
- D25, planning: the old choice kept planning in the main loop.
  The 1.0.0 choice adds the `planner` agent (Opus, `high`, writes only under `spec/`).
  The reason is the Agents table of `.dotclaude/spec/changes/1.0.0/workflow.md`.

## Tools

None yet.

## Layout

None yet.

## Evidence

None yet.
