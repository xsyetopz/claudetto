---
schema: dotclaude-spec/2
kind: package
id: P68
title: you-should-know: trigger, side agent, and store
wave: 3
deps: ["P59","P101","P127"]
owns: ["src/plugins/dcc-plugin-you-should-know/slices/notice/domain/","src/plugins/dcc-plugin-you-should-know/slices/notice/limits.ts","tests/dcc-plugin-you-should-know/"]
satisfies: ["REQ-8"]
verify: just test tests/dcc-plugin-you-should-know
agent: implementer
status: planned
---

## Goal

The domain of the plugin has the trigger, the side-agent prompt and its parser, the bounds, and the store rules of the built-in plugin `cc-plugin-you-should-know@builtin` of 2.1.296.
The code of the plugin is new Bun code, and it copies no code and no text of the built-in (D5).

## Context

- The UX facts and the API table: `.dotclaude/spec/changes/1.1.0/evidence/ysk-api.md` (P59).
- The current domain: `notice/domain/notice.ts`, with a Haiku call of 120 tokens and 5 s, and a seen list of 10.
- D5: the UX of the built-in, with the prompt text in the words of dotclaude.
  No text of the built-in is copied.
- The false truncation warning ("1.0.0 reported another issue", the user, 2026-10-14): `clip` cuts the input at `MAX_INPUT_CHARS` 4,000 (`notice/domain/notice.ts:101-102`, `limits.ts:19`), and the side-agent prompt does not say that the plugin cut it.
  The audit of 2026-10-14: `clip` adds the marker `[cut]` after the cut (`notice.ts:101-102`), `actionOf` cuts the JSON of the tool input, so a long `Write` or `Edit` body is cut (`:105-109`), `RULES` and `SYSTEM` never say what `[cut]` means (`:112-125`), and `notice.test.ts:54-58` checks only the marker.
- `adapters/mod.ts:69` calls `$.model.fork({ prompt })` with no tools field, and only the prompt text keeps the fork from tools.
- The store is `$.store`, and the plugin calls no `$.telemetry` (`evidence/ysk-api.md`).

## Steps

1. The trigger: step 0 and each 6th step of `turn.step`, in the main session only.
2. The typing-past backoff: 0 steps for 2 or fewer, else `min(16, 2^(n-3))` steps.
3. Find in the types file whether `$.model.fork` takes a field that gives the fork no tools, use it if it exists, and write the answer in the evidence file.
   The side-agent prompt for a `model.fork` call with no tools, by D5, and the parser of `learn:`, `tag:`, `explain:`, and `learn: none`.
4. The input cut: the prompt says that the plugin cut the input, and gives the head and the tail of the content with the count of the characters left out.
   A regression test checks the decision: an input over the bound gives the cut marker and the count, and an input under the bound gives none.
5. The caps in `limits.ts`: title 120, learn 240, text 4,000, sketch 12 by 120, 4 cards, seen and known 50, 32 sessions, and offers kept 3 days.
6. The store rules: the known list, the seen list, and the expiry, as pure functions.
7. Remove the `tool.check` trigger and the Haiku path, and their tests.
   Also remove `headsUpNote` (`notice.ts:195-198`), because P69 removes the heads-up choice that uses it.
8. Tests: the step rule, the backoff, the parser on each output form, each cap, and the store rules.

## Acceptance

- `just test tests/dcc-plugin-you-should-know` passes.

## Boundaries

- Do not edit `adapters/`, which P69 owns.
- Do not import from another plugin.
