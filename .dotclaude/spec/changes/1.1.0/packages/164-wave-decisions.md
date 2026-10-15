---
schema: dotclaude-spec/2
kind: package
id: P164
title: Decisions in the middle of a wave
wave: 6
deps: ["P62","P159"]
owns: ["the decision lines of src/plugins/dotclaude/slices/spec/skills/implement/SKILL.md",".dotclaude/spec/changes/1.1.0/evidence/wave-decisions.md"]
satisfies: ["REQ-25","REQ-28"]
verify: just generate && bun run lint:md && test -s .dotclaude/spec/changes/1.1.0/evidence/wave-decisions.md
agent: implementer
status: planned
---

## Goal

When a decision comes up while other runs of a wave go on, the main session picks its recommendation or gets an answer, and it does not leave the question open.

## Context

- OpenJoystickDriver session `949a747a-d80d-498e-849b-b0cdf0ad33d8.jsonl`:
  line 90 asks the user about P9, gives a recommendation, and ends the turn while P1, P4, P10, and P14 run.
  The notifications of lines 96 to 98 start new turns, and the question goes under the reports of P10 and P4 (lines 100 and 130).
- The user: "you can't just ask a question and not pause to wait for an answer.
  Choose your recommendation always.
  But think forward."
- REQ-25: a decision that facts can settle goes to Jev with `second_opinion` first, then to the user with `AskUserQuestion`.
  P159 owns that route.
- The `implement` skill has no rule for a decision while other runs go on.
- dotclaude session `ef21d7f2` of 2026-10-14: Claude ended 2 turns with a plain-text question on the route of P75 and P160 while 2 or 3 agents ran.
  The user: "Stop asking user for things that you can do yourself", and "that's ALSO a 1.0.0 problem that 1.1.0 should fix".

## Steps

1. Add a rule to the `implement` skill for a decision in a wave.
   A decision that facts can settle goes to Jev (REQ-25), and the skill follows the pick.
   When Jev is not available, the question goes to the user with `AskUserQuestion`, which waits for the answer.
   The question names the recommendation, and the skill says what the next steps of the wave are for each option.
2. The skill does not end a turn with a question in plain text while runs go on.
3. Add a `just eval` case that a model judges: a wave with 4 runs and a decision on one package.
   It passes a known-good reply and fails a known-bad reply before its first run (REQ-17).
   Write the results in the evidence file.

## Acceptance

- The verify command passes.
- The eval case of step 3 fails on 1.0.0 and passes after the change.

## Boundaries

- Do not change the `decide` slice (P159 owns it).
- No hook acts on the text of a question (REQ-3, REQ-17).
