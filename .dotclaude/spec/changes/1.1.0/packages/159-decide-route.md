---
schema: dotclaude-spec/2
kind: package
id: P159
title: Decisions go to Jev first, then to the user
wave: 5
deps: ["P64","P87","P113"]
owns: ["src/plugins/dotclaude/slices/decide/","the decision lines of src/plugins/dotclaude/slices/prompt/texts.ts/doing-tasks.md","tests/dotclaude/decide/","wiki/dotclaude/Decisions.md",".dotclaude/spec/changes/1.1.0/evidence/decide-route.md"]
satisfies: ["REQ-25"]
verify: just test tests/dotclaude/decide && just lab && test -s .dotclaude/spec/changes/1.1.0/evidence/decide-route.md
agent: implementer
status: planned
---

## Goal

Claude sends each decision that facts can settle to Jev first, and asks the user with `AskUserQuestion` only when Jev is not available.
No fallback model gives a pick in place of Jev.

## Context

- In session `2bb59b8b` of 2026-10-14, Claude put D13 and D14 to the user, although `second_opinion` was available.
  The user said: "You have Jev for decision, yet you keep asking the user", and "this is a 1.0.0 problem".
- `decide/adapters/mod.ts:2-4,78-80`: `tool.call` tries Jev when `TYPESAFE_API_KEY` is set, and the fallback model (`FALLBACK_MODEL` `haiku`, `decide/limits.ts:21`) when Jev gives no answer.
- `decide/ports.ts:28-30`: the reasons `no-key` and `model-failed`.
- `decide/adapters/mod.ts:89-90`: `onAskUserQuestion` adds the pick of Jev to each facts question of an `AskUserQuestion` call.
- `prompt/texts.ts/doing-tasks.md`: it tells Claude to ask the user when a request has two readings.
- The tool description of `second_opinion`: a neutral question, one fact for and one against each option, and no lean.
- The prose rule of `design.md`: a hook acts only on structured facts.
  The choice to ask Jev is a behavior of the model, so the prompt fixes it, and `just eval` measures it.
- dotclaude session `ef21d7f2` of 2026-10-14 repeats the defect with `second_opinion` available.
  Claude put the route of 2 stopped packages (P75, P160) to the user 3 times: as plain text "Which option do you want for P75?", as "Still needed from you", and before that the commit route with `AskUserQuestion`.
  The user said: "No. Ask Jev, then do what Jev says.
  Stop asking user for things that you can do yourself", and "that's ALSO a 1.0.0 problem that 1.1.0 should fix".
  After that, Claude asked Jev, and Jev gave `split` (0.49).
  The approvals in that session (the deletion of tags and a cost bound) stayed with the user, as REQ-25 says.

## Steps

1. Remove the fallback model from the pick path.
   When Jev gives no answer, the tool result says that Jev is not available, gives the reason from `ports.ts`, and tells Claude to ask the user with `AskUserQuestion`.
   Remove `FALLBACK_MODEL`, `FALLBACK_MAX_TOKENS`, `FALLBACK_TIMEOUT_MS`, and `adapters/fallback.ts` if nothing else uses them.
2. Rewrite the decision lines of `doing-tasks.md` and the description of `second_opinion`:
   Jev first for a decision that facts can settle, the user through `AskUserQuestion` when Jev is not available, and the rules against gaming of REQ-25.
   Keep goals, preferences, and approvals with the user.
3. Add `just eval` cases that a model judges:
   a facts decision with Jev available goes to `second_opinion` first;
   the same decision with Jev not available goes to `AskUserQuestion`;
   a preference goes to the user;
   a leading question fails the grader.
   Each grader passes a known-good run and fails a known-bad run before its first use (REQ-17).
   The cases fail on 1.0.0.
4. Tests on decisions: the tool result for each reason of `ports.ts`, and no call of the model when Jev gives no answer.
5. Write `wiki/dotclaude/Decisions.md`: the route, the reasons, and what stays with the user.
6. Write the method and the results in the evidence file.

## Acceptance

- The verify command passes.
- With no key, a timeout, or an error, the tool result tells Claude to ask the user, and no fallback model runs.
- The eval cases fail on 1.0.0 and pass after the change.

## Boundaries

- Do not change the TypeSafe client or `JEV_TIMEOUT_MS`.
- Do not change the other lines of `doing-tasks.md`, which P64 owns.
