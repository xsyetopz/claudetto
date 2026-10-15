---
schema: dotclaude-spec/2
kind: package
id: P165
title: you-should-know: no repeated notes and no stale notes
wave: 5
deps: ["P58","P68","P69"]
owns: ["the repeat and relevance rules of src/plugins/dcc-plugin-you-should-know/slices/notice/","tests/dcc-plugin-you-should-know/repeat.test.ts",".dotclaude/spec/changes/1.1.0/evidence/ysk-repeat.md"]
satisfies: ["REQ-29"]
verify: just test tests/dcc-plugin-you-should-know && just lab
agent: implementer
status: planned
---

## Goal

A you-should-know note does not repeat a topic of the same session, and it does not question an action that the transcript shows as done or started.

## Context

- `evidence/injected-instructions.md` lists the 8 live notes with their transcript lines.
- One note questioned an edit that a fact-check had already started.
  One note said that a search "only checks the newest session log", but the search had a match.
- P68 and P69 cover the source line of the note and the UX of the built-in plugin.
  No package covers the repeat and the relevance.
- The engine is in `src/plugins/dcc-plugin-you-should-know/`, and `slices/notice/domain/notice.ts` holds its rules today.

## Steps

1. Read the 8 notes of the evidence file, and their transcript lines.
   Write in `evidence/ysk-repeat.md` which notes repeat a topic and which notes the transcript disproves, with the line of each.
   Use a counter with a known-good and a known-bad fixture for each count (REQ-18).
2. Keep the topic of each shown note in the store of P68, and give no note on a topic that the session showed before.
3. Give the side agent the recent tool calls and their results, so that it sees an action that is done or started.
   Find the bound of that input in `notice/limits.ts`, and send a new value to Jev (REQ-25).
4. Tests `repeat.test.ts`: a second note on the same topic is not shown, and a note on a new topic is shown.
5. Add a `just eval` case that a model judges: a transcript with a started edit and a note that questions it.
   It passes a known-good note and fails a known-bad note before its first run (REQ-17).

## Acceptance

- The verify command passes.
- The evidence file gives the count of repeated and disproved notes, with the counter and its fixtures.

## Boundaries

- Do not change the band, the buttons, or the source line (P68, P69).
- Tests check the store and the decision to show, not the words of a note (REQ-17).
