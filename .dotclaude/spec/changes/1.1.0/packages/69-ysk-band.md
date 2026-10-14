---
schema: dotclaude-spec/2
kind: package
id: P69
title: you-should-know: band, buttons, and feedback
wave: 4
deps: ["P68"]
owns: ["src/plugins/dcc-plugin-you-should-know/slices/notice/adapters/","src/plugins/dcc-plugin-you-should-know/slices/notice/slice.ts","src/plugins/dcc-plugin-you-should-know/slices/notice/lab/",".dotclaude/spec/changes/1.1.0/evidence/ysk-ux.md"]
satisfies: ["REQ-8"]
verify: just lab && just check, and one interactive session in just sandbox with a frame of each state in the evidence file
agent: implementer
status: planned
---

## Goal

The band of the plugin looks and acts as the band of the built-in plugin `cc-plugin-you-should-know@builtin` of 2.1.296.
The code of the plugin is new Bun code, and it copies no code and no text of the built-in (D5).

## Context

- The API table and the gaps: `evidence/ysk-api.md` (P59).
- The domain of P68.
- The current band: `notice/adapters/mod.ts:134-156`, with the choices "Give a heads-up" and "Dismiss" only.
- `notice/slice.ts:48` says "about 9,000 characters", but `MAX_INPUT_CHARS` is 4,000 (the audit of 2026-10-14).
  Make the text agree with the bound of P68.
- The current choice "Give a heads-up" (`notice/adapters/mod.ts:149-183`, registered at `slice.ts:86-97`) sends the topic of the side agent to the next tool result of the main agent.
  The text is "The person gave a heads-up about the change you are making: <topic>" (`notice/domain/notice.ts:196-198`).
  The topic is the answer of `model.fork` (`mod.ts:69` and `:119`), so the note says that the person wrote the words of the side agent.
  On 2026-10-14, the hook added two such notes to the main agent of the dotclaude session, and the person did not write either note.
- The built-in has no `tool.call` hook (bundle of 2.1.296, its manifest near line 351778 of the strings extract).
  Its "Chat in main session" builds "Here is a note offered by a side agent:" and the note (near line 351815).
  It fills the composer with `mode: "replace"`, and the person submits it.
  It calls `prompt.submit` only when the fill fails with the refusal `no_composer`, and it shows a toast for each other refusal (near line 351818).

## Steps

1. On `turn.step`, run the trigger of P68, start the `model.fork` call without a wait, and show the band above the prompt when the answer comes.
2. The header `✦ You should know ·` in the theme color `suggestion`.
3. The collapsed rows `1 Learn more`, `2 Knew this already`, `3 What is this` (a toggle), `4 Disable`, and `0 Dismiss`.
4. The expanded buttons `1 Understood` (adds the topic to the known list), `2 Chat in main session` (fills the composer with a line that names the side agent as the source, and the note, and the person submits it), and `0 Dismiss`.
   When no composer exists, submit the text, and when the fill fails for another reason, show a toast.
5. After a dismiss, the feedback row `1 That was helpful`, `2 Not relevant`, `3 Couldn't understand`, and `4 Turn off`, which closes after 20,000 ms.
6. Remove the heads-up choice and its `tool.call` hook: `mod.ts:147-152` and `:162-183`, `band.ts:4-5` (`HEADS_UP`), and `slice.ts` lines 4, 7, 11-12, 25, 73-77, and 86-98.
   A note goes to the main session only through step 4, and its text names the side agent as the source.
   P68 removes `headsUpNote` (`domain/notice.ts:195-198`), and P82 updates `wiki/add-ons/You-Should-Know.md:6`.
   Run `just generate` for `plugins/dcc-plugin-you-should-know/evals/hooks.json` and the generated tests.
7. For each gap of P59, take the nearest documented API, and record the difference in the evidence file.
8. Lab tests: each row, each key, the toggle, the fill and submit, the feedback timeout, `4 Disable`, and `4 Turn off`.
   Also test that no `tool.call` result of the main agent gets a note of the plugin.
   Replace the heads-up tests at `lab/notice.test.ts:357-386`.

## Acceptance

- `just lab` and `just check` pass.
- The evidence file has a frame of the collapsed band, the expanded band, and the feedback row.

## Boundaries

- Do not import from another plugin.
- Patch nothing in Claude Code.
