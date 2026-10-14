---
schema: dotclaude-spec/2
kind: package
id: P66
title: Session diagnosis: signals
wave: 3
deps: ["P106","P132"]
owns: ["src/plugins/dotclaude-sessions/slices/diagnose/domain/","src/plugins/dotclaude-sessions/slices/diagnose/limits.ts","tests/sessions/diagnose/signals.test.ts","tests/sessions/diagnose/fixtures/"]
satisfies: ["REQ-6","REQ-18"]
verify: just test tests/sessions/diagnose
agent: implementer
status: planned
---

## Goal

Pure functions find each failure signal in the rows of a transcript and map it to a dossier ID, and each signal has a known-good and a known-bad fixture.

## Context

- `src/plugins/dotclaude-sessions/slices/usage/domain/transcript.ts` and `scan.ts`: the reader of 1.0.0.
- `src/kernel/stamp.ts`: the build stamp.
- `external/agent-failure-dossier/00-INDEX.md` and parts `01` to `08`, with `08-session-log-corpus.md`.
- The map of signals, corrected from the dossier:
  tool errors (I04), permission and sandbox denials (I07, I10), `dangerouslyDisableSandbox` calls (I10), retries and loops (I12, I17), `AskUserQuestion` calls (I13, and over-asking I06), hook records (I05, I10), interrupts (I01), turn-limit notices (I11, I12), lost handbacks (I11), "Prompt is too long" (I03), each compaction as a handoff failure (I03), and cost spikes (I12).
- The prose rule of `design.md`: a signal comes only from a structured fact, such as a tool name, a tool input field, an exit status, or a row kind.
  No signal reads the words of a reply or of a user prompt.
- A slice imports only `src/kernel/` and its own folder (`.claude/rules/slice-imports.md`).

## Steps

1. Read the dossier sections, and write the map of signal to ID in `domain/dossier.ts`, with the section of each ID in a comment.
2. For each signal, a function that takes the rows and gives findings with the row line and a short quote.
   A tool error that the detector cannot read is an unknown, not a negative (REQ-9).
   Each threshold goes in `diagnose/limits.ts`.
3. A compaction row, such as a compact boundary, counts as a handoff failure, because compaction is a last resort (D1).
4. Read the rows with a reader of the slice, or move the reader of `usage` to `src/kernel/` if both slices need the same code.
5. Fixtures: for each signal, one known-good and one known-bad transcript with the sanitized structure of a real transcript: real row kinds and fields, with no real text.
6. Tests: each signal finds its known-bad fixture and passes its known-good fixture, and one transcript has no finding.

## Acceptance

- `just test tests/sessions/diagnose` passes.
- Each signal has a dossier ID, a known-good fixture, and a known-bad fixture.

## Boundaries

- Do not import from another plugin.
- Fixtures hold no real session text, only the real structure.
- Tests check findings, not message text (REQ-17).
