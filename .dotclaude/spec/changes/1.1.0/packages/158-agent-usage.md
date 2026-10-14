---
schema: dotclaude-spec/2
kind: package
id: P158
title: Usage notes for the main session and subagents, and the soft context note
wave: 4
deps: ["P57","P61","P89","P94","P96","P115","P120","P122","P107","P133","P160"]
owns: [".dotclaude/spec/changes/1.1.0/evidence/agent-usage.md","the env key CLAUDE_CODE_TOTAL_TOKENS_REMINDER in src/plugins/dotclaude/slices/prompt/slice.ts","src/kernel/usage.ts","src/kernel/budget.ts","src/plugins/dotclaude/slices/usage/","src/plugins/dotclaude/slices/statusline/domain/pace.ts","src/plugins/dotclaude/slices/spec/domain/runs.ts","src/plugins/dotclaude/slices/statusline/domain/usage.ts","src/plugins/dotclaude/slices/spec/limits.ts","src/plugins/dotclaude/slices/handoff/domain/context.ts","src/plugins/dotclaude/slices/handoff/adapters/mod.ts","src/plugins/dotclaude/slices/handoff/lab/","tools/cc-internals.ts","the check recipe of justfile","tests/tools/cc-internals.test.ts","wiki/claude-code/Undocumented-Settings.md","tests/kernel/usage.test.ts","tests/dotclaude/usage/","tests/dotclaude/handoff/agent-usage.test.ts"]
satisfies: ["REQ-24","REQ-26"]
verify: just test tests/kernel/usage.test.ts tests/dotclaude/usage tests/dotclaude/handoff && just lab
agent: implementer
status: planned
---

## Goal

The main session knows when a `five_hour` or `seven_day` window nears its end or goes into deficit, and takes the less costly path.
Each subagent gets the same note, and a soft note before its context bound.
When usage is normal, no note goes, so the cost is zero tokens.

## Context

- `statusline/adapters/cli.ts:8,85-96`: the status line saves the last `rate_limits` at `RATE_LIMITS_FILE` (`src/kernel/paths.ts:35`).
- `statusline/domain/pace.ts`: `paceOf` gives the used percent minus the elapsed percent of a window.
  A positive value is a deficit (`statusline/segments.ts:116-121`).
- `spec/domain/runs.ts:13-20`: `UsageSample` and `parseSample`.
  `statusline/domain/usage.ts:8` has a second `UsageSample` (the audit of 2026-10-14).
  `spec/limits.ts:13`: `USAGE_SAMPLE_MAX_MS` is 10 minutes.
  `statusline/limits.ts:18` gives half of it as the rewrite age.
- A slice imports only `src/kernel/` and its own folder (`.claude/rules/slice-imports.md`), so the sample type, its parser, `paceOf`, and the age bound move to `src/kernel/`.
  A shared runtime bound goes only in `src/kernel/budget.ts` (`AGENTS.md`).
- `handoff/adapters/mod.ts:109-131`: `onTurnStep` keeps the context of each subagent, and `onToolCall` adds the report-now note of P57 over the bound.
- `wiki/claude-code/Hook-Events.md:86`: `agent.spawn` maps to `SubagentStart`, which returns `additionalContext`.
- `.claude/rules/hooks-module.md`: the hooks module has no `node:` and no `Bun`.
  It reads the sample through a mod API or through `$.process.run` of a bin, as `runBin` does (`handoff/adapters/mod.ts:99-107`).
- `design.md`, "Context facts in Claude Code 2.1.296", and D13 and D14.
- `.claude/rules/ste-messages.md` and the prose rule of `design.md`.

## Steps

1. Move `UsageSample`, `parseSample`, and `paceOf` to `src/kernel/usage.ts`, and `USAGE_SAMPLE_MAX_MS` to `src/kernel/budget.ts`.
   The `spec` and `statusline` slices import them from there, and the old copies go, also the copy in `statusline/domain/usage.ts`.
2. Find the least costly way for the hooks module to read the sample: a mod API that reads a file, or one `$.process.run` with a time gate so that it runs at most once in `USAGE_READ_MIN_MS`.
   Write the answer, with the line of the types file, in the evidence file.
3. Add the `usage` slice.
   Its domain gives the light of REQ-26 (`src/kernel/light.ts`, from P61) for each window, from the sample and the time, with the gauge and the marks of REQ-26.
   A deficit, a positive pace after `PACE_MIN_FRACTION` of the window, makes a green or yellow light blink.
   Find out whether the status object gives a structured fact for extra usage, and write the answer in the evidence file.
   If it gives none, red blinking comes only from 100%.
   A sample older than `USAGE_SAMPLE_MAX_MS` gives no light, which sends no note.
4. Main session: on `tool.call` and `turn.complete`, send one note when the light of a window drops to yellow or below.
   The note names dotclaude as its source and gives the window, the light, the percent, the pace, and the reset time, and the instruction of the light from the table of REQ-26.
   A light that goes up, or a reset, sends no note.
5. Subagents: `agent.spawn` adds the active note to the start context.
   On a tool call of a subagent, a change of light sends a new note one time for that agent.
6. `handoff`: the context of a subagent gets its gauge and light of REQ-26.
   Yellow gives one soft note with the tokens used and the tokens left, and tells the agent to fit the rest of its task in that room.
   Red is the report-now note of P57.
   Red blinking applies only to a Haiku 5.5 subagent from 100,000 tokens.
7. Apply D14 in the env of `prompt/slice.ts`, and pin the value with a test.
   Confirm the bundle facts with one `just sandbox` session: an `investigator` prints each `<total_tokens>` block that it got.
   If the session disagrees with the bundle facts, stop and tell the user.
8. Add a check to `just check` that reads the installed Claude Code bundle, and fails when `totalTokensReminder`, its env var, its `countdown` mode, or an undocumented override point that P160 uses is missing.
   When no bundle is installed, the check prints that it did not run, and it does not pass in silence.
   Add the check to `wiki/claude-code/Undocumented-Settings.md`.
   A test shows that each note and bound of this package works with the reminder `off`.
9. Tests: the state of a window at each mark and below it, a deficit and a reserve, a stale sample, and no sample.
   A lab test for each note: the main session, a subagent start, a change during a subagent run, the one-time rule, and no note when usage is normal.
   Assert the decision and the numbers in the note, not its words (REQ-17).
10. Write the method and the results in `.dotclaude/spec/changes/1.1.0/evidence/agent-usage.md`.

## Acceptance

- The verify command passes.
- With each window under its mark and in reserve, no note goes to any agent.
- A second tool call in the same state gets no second note.

## Boundaries

- Do not change `SUBAGENT_CONTEXT_MAX`, `HAIKU_CONTEXT_MAX`, `REPORT_MAX_WORDS`, or `USAGE_SAMPLE_MAX_MS`.
- The values of `USAGE_BANDS`, `AGENT_CONTEXT_SOFT_PERCENT`, and `USAGE_READ_MIN_MS` are the values of D13.
- Do not change the context trigger of the main session, which P70 owns.
- Do not change the agent prompts, which P80 owns.
