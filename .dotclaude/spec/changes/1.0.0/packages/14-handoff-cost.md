---
schema: dotclaude-spec/2
kind: package
id: P14
title: Handoff cost
wave: 3
deps: ["P13"]
owns: [".dotclaude/spec/changes/1.0.0/evidence/handoff-cost.md"]
satisfies: []
verify: just test tests/dotclaude/handoff && just lab
agent: investigator
status: done
---

## Goal

Measure the cost of one handoff against one compaction on the same session, with `dotclaude-usage`, and write the numbers to `.dotclaude/spec/changes/1.0.0/evidence/handoff-cost.md`.
This package only reports.
It changes no code.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md:174-177`.
- The handoff that the numbers measure is the slice `handoff` of P13.
  Read its package: `.dotclaude/spec/changes/1.0.0/packages/13-handoff.md`.
- The report tool is `dotclaude-usage`, as the entry names it.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.
- The entry names no verify and no owns other than the evidence file, so the verify is the handoff check of P13.
  This is an assumption, and the main session decides it.

## Steps

1. On one session, make one handoff, and then make one compaction on the same session.
   Record the same measures for both runs.
2. Run `dotclaude-usage` on each run, and copy the numbers that it prints.
3. Write `.dotclaude/spec/changes/1.0.0/evidence/handoff-cost.md` with the numbers, the command of each run, and the source of each number.

## Acceptance

- `.dotclaude/spec/changes/1.0.0/evidence/handoff-cost.md` has one table for the handoff and one for the compaction.
- Each number has the command that printed it.
- The file has no change of code and no change of any other file.

## Boundaries

- Change only the path of `owns`.
- Use the agent `investigator`, and do not change the code of P13 to get a better number.
- Write the text of the report in STE-flavored ASD-STE100, and use one sentence on each line.
