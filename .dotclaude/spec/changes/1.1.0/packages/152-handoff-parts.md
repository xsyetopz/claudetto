---
schema: dotclaude-spec/2
kind: package
id: P152
title: Seven-part handoff file (I03 recipe 2)
wave: 4
deps: ["P57","P89","P115"]
owns: ["src/plugins/dotclaude/slices/handoff/domain/text.ts","tests/dotclaude/handoff/parts.test.ts"]
satisfies: ["REQ-9"]
verify: just test tests/dotclaude/handoff/parts.test.ts && just lab
agent: implementer
status: planned
---

## Goal

The handoff file has the seven parts of I03 recipe 2.

## Context

- `handoff/domain/text.ts:7`: four parts, the goal, the state, the next step, and the constraints of the user.
- I03 recipe 2 (`01-grounding-and-memory.md:184`): goal, state with proof, decisions and why, ruled-out approaches, the verify command, files touched, and the last N user prompts word for word.

## Steps

1. Change `writePrompt` to ask for the seven parts, each as a heading.
2. Put N of the last user prompts in `handoff/limits.ts` only if P70 does not own the file in the same wave, else in a new bound that P70 adds.
3. Test `parts.test.ts`: a handoff file with the seven headings passes the parser of the resume, and a file with four fails it.

## Acceptance

- The verify command passes.

## Boundaries

- Tests check the parser of the parts, not the prompt text (REQ-17).
- Do not change the trigger, which P70 owns.
