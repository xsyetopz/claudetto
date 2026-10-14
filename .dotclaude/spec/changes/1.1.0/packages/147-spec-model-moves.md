---
schema: dotclaude-spec/2
kind: package
id: P147
title: State moves that the model runs (D10)
wave: 5
deps: ["P145","P146","P62"]
owns: ["src/plugins/dotclaude/slices/spec/adapters/transition.ts","the front matter of src/plugins/dotclaude/slices/spec/skills/","tests/dotclaude/spec/model-moves.test.ts"]
satisfies: ["REQ-20"]
verify: just test tests/dotclaude/spec/model-moves.test.ts && just test tests/dotclaude/spec && just lab
agent: implementer
status: planned
---

## Goal

A state move of the spec CLI follows D10: the CLI refuses a move with no marker of the user, or the skills drop `disable-model-invocation`.

## Context

- The spec skills set `disable-model-invocation: true` (`spec/skills/{accept,archive,plan,review,merge,implement,specify}/SKILL.md`).
- In session `d87f7ed2`, the agent ran `dotclaude-spec specify` and `plan` itself through `Bash`.
- D10 is in `decisions.md`: the CLI refuses a state move with no marker of the user (Jev, 0.96).

## Steps

1. Stop until the user decides D10.
2. With D10 (a): find a marker that only the user can make, such as a run from a skill that the user started.
   Write the answer and its source in a comment of `transition.ts`.
   Refuse each state move with no marker, and name the skill that the user runs.
3. With D10 (b): remove `disable-model-invocation: true` from the spec skills.
4. Tests `model-moves.test.ts` for the chosen option: a move with the marker passes and a move with none is refused, or each skill has no flag.

## Acceptance

- The verify command passes.

## Boundaries

- Do not change the gates of a move.
- Do not change the body of a skill, which P62 owns.
