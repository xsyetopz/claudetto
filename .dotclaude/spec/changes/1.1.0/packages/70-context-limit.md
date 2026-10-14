---
schema: dotclaude-spec/2
kind: package
id: P70
title: Automatic handover before the context window (I03)
wave: 5
deps: ["P57","P61","P67","P89","P115","P152"]
owns: ["src/plugins/dotclaude/slices/handoff/limits.ts","src/plugins/dotclaude/slices/handoff/domain/trigger.ts","src/plugins/dotclaude/slices/handoff/adapters/mod.ts","src/plugins/dotclaude/slices/handoff/lab/","tests/dotclaude/handoff/",".dotclaude/spec/changes/1.1.0/evidence/context-limit.md"]
satisfies: ["REQ-9","REQ-26"]
verify: just test tests/dotclaude/handoff && just lab
agent: implementer
status: planned
---

## Goal

The main session hands over, clears, and resumes by itself before "Prompt is too long", also inside one long turn.

## Context

- The regression case: session `d87f7ed2-83aa-4166-bfad-ebad80362c74` of OpenJoystickDriver ended at 00:10 UTC with "Prompt is too long".
  The last call had 273,544 tokens, 91% of `CLAUDE_CODE_AUTO_COMPACT_WINDOW` 300000 (`prompt/slice.ts:54`), with `DISABLE_COMPACT` (`:65`).
  The context passed 180k at 23:26, and the only output was one `manual` hint at 80 percent.
- `handoff/limits.ts:38-39`: `DEFAULT_MAIN_HANDOVER` is `manual`, "until P14 measures the cost".
  The CHANGELOG of 1.0.0 gives the P14 result: $0.0630 for the handoff against $0.2288 for the compaction.
- `handoff/adapters/mod.ts:249-275`: the trigger runs only in `onTurnComplete` (`triggerOf` at `:169-175`).
- `handoff/adapters/mod.ts:182-192`: `withHint` sends the `manual` hint once for each episode.
- I03 in `external/agent-failure-dossier/01-grounding-and-memory.md:135-188`: compact early and on purpose.
- The decision of the user, 2026-10-14: the automatic handover.

## Steps

1. Set `DEFAULT_MAIN_HANDOVER` to `auto` in `limits.ts`, and remove the stale comment.
2. Find out which mod API calls of `tool.call` can ask Claude to finish its step and write the handoff, such as `additionalContext` or a deny with a reason.
   Write the answer, with the lines of the types file, in the evidence file.
3. On `tool.call` of the main session, when the context share reaches `CONTEXT_PERCENT`, ask Claude to finish the step it is on and write the handoff now.
   `turn.complete` then runs the resume.
4. Add `HANDOFF_HARD_PERCENT` (such as 85) to `limits.ts`.
   At that bound, deny the next tool call with the write prompt, so that the turn ends before the window.
5. Map the context of the main session to the light of REQ-26 (`src/kernel/light.ts`): gauge and the lights of REQ-26 for the main session: green blinking from 50%, yellow from `CONTEXT_PERCENT`, yellow blinking from 80% or when the handoff file is late, red from `HANDOFF_HARD_PERCENT`, and red blinking above the compaction mark of P151.
   The status line takes the same light.
6. Add an end-to-end lab test that replays the context growth of one long turn, and checks that the handoff starts before the window and that the resume submits, also when the session is in a subfolder (handoff defect 1, P115).
7. Tests: the default value, the trigger in the middle of a turn, the hard bound, and a test that pins each new bound.
8. Write the regression case, with the session ID and the counts above, in the evidence file, and show that the new triggers fire before 273,544 tokens.

## Acceptance

- The verify command passes.
- The lab replay of the regression case starts the handoff before the window, and the resume submits.
- The main session runs one live handover in `just sandbox` and writes it to the evidence file.
  When the live run disagrees with the replay, it tells the user and asks before it goes on.

## Boundaries

- Change a bound only in `handoff/limits.ts`.
- Do not change the env block of `prompt/slice.ts`, which P151 owns, or the handoff text, which P152 owns.
- Tests check decisions and states, not prompt text (REQ-17).
