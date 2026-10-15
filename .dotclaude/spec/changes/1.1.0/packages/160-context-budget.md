---
schema: dotclaude-spec/2
kind: package
id: P160
title: Context budget of the first turn
wave: 1
deps: []
owns: [".dotclaude/spec/changes/1.1.0/evidence/context-budget.md","tools/limits.ts","tests/tools/context-budget.test.ts","the override keys of P160 in src/plugins/dotclaude/slices/prompt/slice.ts","tests/dotclaude/prompt/context-overrides.test.ts","wiki/claude-code/Undocumented-Settings.md"]
satisfies: ["REQ-27"]
verify: just test tests/tools/context-budget.test.ts && bun run lint:md
agent: implementer
status: verified
---

## Goal

Each text that dotclaude adds to the first turn has a budget in characters, and a test fails when a text goes over it.
The evidence names each part of the first turn, its size, its source, and its override point.

## Context

- The measurement of 2026-10-14, transcript `035ae9d1-b3d5-4d70-b718-47e3e0f354fe.jsonl`, rows 10 to 33:
  the request of the first turn was 22,886 tokens (2 input, 13,128 cache write, 9,756 cache read), and `/context` showed 13.2k.
  The attachments of the first turn were 34,342 characters: the system prompt 8,741 (about 6,600 from dotclaude), `sandbox_instructions` 7,642, the `CLAUDE.md` of the repository 4,748, `skill_listing` 4,464, `agent_listing_delta` 2,841, `mcp_instructions_delta` 2,241, and `deferred_tools_delta` 2,048.
- The sources in dotclaude: `prompt/texts.ts/*.md`, `prompt/transforms/`, `styles/styles/*.md`, the agent and skill descriptions, `src/fragments/`, and the hook texts, such as the `SessionStart` note of `dotclaude-codegraph` (`graph/domain/graph.ts:24`).
- The status line reads `context_window.total_input_tokens` (`statusline/segments.ts:90-94`), so it shows the real request, and `/context` shows an estimate.
- `Compact buffer: 3k` shows in `/context` although `prompt/slice.ts:65` sets `DISABLE_COMPACT`.
- A repository bound goes only in `tools/limits.ts` (`CLAUDE.md`).
- The texts are cut by P62, P64, P80, P153, and P155, which depend on this package.

## Steps

1. Run one fresh `just sandbox` session with the prompt `Reply with "Ok."`, and read the rows of its first turn.
   Write the size of each part in characters, its source, and the tokens of the request in the evidence file.
2. For each part that Claude Code adds, find each setting, env var, or hook that changes it, documented or not.
   Cite the docs for a documented point, and the bundle offset for an undocumented point.
   Write "no override point" when none exists.
   Read the bundle only for evidence, and do not patch it.
3. Use each override point that makes a part smaller with no loss that the session needs, also an undocumented point (the user, 2026-10-14).
   Set it in `prompt/slice.ts`, pin its value with a test in `context-overrides.test.ts`, and write the size before and after in the evidence file.
4. Document each undocumented point that step 2 finds in `wiki/claude-code/Undocumented-Settings.md`, also a point that dotclaude does not use (the user, 2026-10-14).
   Give its name, its values, its default, its bundle offset, and whether dotclaude uses it.
   P158 adds each used point to the drift check of `tools/cc-internals.ts`.
5. Find in the bundle whether the compact buffer applies with `DISABLE_COMPACT`, and write the answer with its offset.
6. Propose a budget for each dotclaude part, and send the values to Jev (REQ-25).
   Write the picks and their confidence in the evidence file.
7. Put the budgets in `tools/limits.ts`.
8. Write `tests/tools/context-budget.test.ts`: it measures each source text in characters after `just generate`, and fails when a text goes over its budget.
   A text over its budget at the start of 1.1.0 is a known failure, and the test lists it with `test.failing` until its surface package cuts it.

## Acceptance

- The verify command passes.
- The evidence file has each part of the first turn, its size, its source, and its override point.
- The wiki page lists each undocumented override point that step 2 found.

## Boundaries

- Do not cut a dotclaude text, which P62, P64, P80, P153, and P155 do.
- No test asserts the words of a text (REQ-17), only its size.
