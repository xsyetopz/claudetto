---
schema: dotclaude-spec/2
kind: package
id: P162
title: Start hook of the implement agents
wave: 6
deps: ["P62","P120","P147"]
owns: ["src/plugins/dotclaude/slices/spec/adapters/mod.ts","src/plugins/dotclaude/slices/spec/domain/implement-brief.ts","src/plugins/dotclaude/slices/spec/slice.ts","src/plugins/dotclaude/slices/spec/lab/","tests/dotclaude/spec/start-hook.test.ts","the prompt lines of src/plugins/dotclaude/slices/spec/skills/implement/SKILL.md"]
satisfies: ["REQ-28"]
verify: just test tests/dotclaude/spec/start-hook.test.ts && just lab
agent: implementer
status: planned
---

## Goal

Each agent that `/dotclaude:implement` starts for a package moves that package to `doing` through the start hook.

## Context

- OpenJoystickDriver session `9b38a538-1eff-40af-a324-96d0c7a04511.jsonl`, lines 163 to 169:
  after the start of 4 agents, each package was still `planned`, and Claude ran `dotclaude-spec implement` for P1, P4, P9, and P10 by hand.
- The cause is in the code, so the defect repeats on each run with that prompt form:
  - `spec/slice.ts:21` filters on `subagentType: /(?:^|:)implementer$/`.
    P9 and P10 ran as `dotclaude:debugger` (lines 147 and 148), so the hook skipped them.
  - `domain/implement-brief.ts`: `packageOf` reads `id:` only from front matter at the start of the prompt (`FRONT_MATTER` has no `m` flag).
    Each of the 4 prompts started with "You implement package P1" or "You run package P9", so `packageOf` gave `undefined`.
  - `implement/SKILL.md:62-64` says "keep that line in the prompt", and does not say that the brief must be first.
- `adapters/mod.ts:19-41`: `onSpawn` runs `dotclaude-spec implement <package>` in the folder of the main session.
- dotclaude session `ef21d7f2` of 2026-10-14 repeats the defect: the P75 and P160 prompts started with "You implement package P75" and had the `id:` line later in a quoted brief.
  Both packages stayed `planned` until Claude ran `dotclaude-spec implement` by hand.
  `dotclaude-spec ready` printed both of them again while their agents ran.

## Steps

1. Write a lab test that gives `onSpawn` a prompt with text before the brief, and one with `subagentType` `dotclaude:debugger`.
   Both fail on the current code.
2. Make the skill text and the parser agree on one prompt form.
   Read the brief block of the prompt where the skill puts it, and accept only one `id:` line of one front matter block.
   A prompt with two different `id:` lines runs no command.
3. Decide which agent types the hook covers, from the agent types that the skill may start.
   Write the list in `slice.ts`, and the reason in a comment.
4. Tests: a brief first, a brief after text, a debugger agent, a prompt with no brief, and a prompt with two ids.

## Acceptance

- The verify command passes.
- The two cases of step 1 pass after the change.

## Boundaries

- Do not change `dotclaude-spec implement` or its refusal in a linked worktree.
- Tests check the command arguments, not the words of the skill (REQ-17).
