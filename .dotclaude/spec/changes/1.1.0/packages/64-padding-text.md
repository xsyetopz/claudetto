---
schema: dotclaude-spec/2
kind: package
id: P64
title: Prompt surface: prompt and surface texts
wave: 4
deps: ["P90","P116","P98","P124","P157","P160"]
owns: ["src/plugins/dotclaude/slices/prompt/texts.ts/","src/plugins/dotclaude/slices/prompt/transforms/","src/plugins/dotclaude/slices/surface/texts.ts/",".dotclaude/spec/changes/1.1.0/evidence/surface-prompt.md"]
satisfies: ["REQ-3","REQ-4","REQ-23"]
verify: just test tests/dotclaude/prompt && just test tests/dotclaude/surface && just lab
agent: implementer
status: planned
---

## Goal

The always-on prompt and the surface texts follow the guidance of Anthropic for Opus 5.5 and Fable 5.1.
They start the reply with the answer, with no padding, they name the fact behind an agreement, they ask through `AskUserQuestion` after a first try, and they route each task to the right agent.

## Context

- The prompt-audit guide `.claude/skills/claude-api/shared/prompt-audit.md`, and `.claude/skills/claude-api/shared/model-migration.md`.
  Read both from disk, because the `$n` argument substitution of the skill corrupts dollar text.
- `prompt/texts.ts/doing-tasks.md:5-6,14`: "ask" with no tool name.
- `prompt/transforms/communication.ts`: the communication section of the `prompt.compose` variant, and `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT: "1"` at `prompt/slice.ts:62`.
- `decide/slice.ts:39-42`: a question that facts settle goes to the decisions API.
- I06 (`02-verification-and-honesty.md:143-200`), I13 recipe 1 and 6 (`06-autonomy-and-consent.md:59-65`).
- The override points: `--append-system-prompt` for users, `PreToolUse` `updatedInput`, `PostToolUse` `updatedToolOutput`, and hook `additionalContext` with a cap of 10,000 characters for each string.
- The eval cases of P157.

## Steps

1. Run the prompt-audit flow on `prompt/texts.ts/`, `prompt/transforms/`, and `surface/texts.ts/`: an inventory with `file:line`, each dated pattern, each contradiction, and each instruction that the repository outgrew.
   Write it and a proposed diff to the evidence file.
2. Rewrite each text to `model-migration.md`, with the rules of `.claude/rules/ste-messages.md`: give the reason, say what to do, and use no forceful words.
3. Name `AskUserQuestion` for each question to the user, keep the route of `decide`, and add the I13 rule: try first, ask only when the answer changes a costly or irreversible step, and bundle the questions.
   A subagent puts its question in its report.
4. Start with the answer: no apology, agreement opener, flattery, preamble, or self-narration, and an agreement names the fact or the check that shows it.
5. The completion rule: call a task done only when its check ran in this session, and name the command and its exit status (P77 gates the spec states).
6. Name the right agent for each kind of task, with the `searcher` of P135.
7. Use each override point that a surface misses, documented or not, and record each in the evidence file.
   Use the list of undocumented points of P160 in `wiki/claude-code/Undocumented-Settings.md`.
   Write each new undocumented point in the evidence file, and P138 adds it to the wiki page.
8. Run the transform tests, and run the eval cases of P157, which must now pass.

## Acceptance

- Each text of this package meets its budget of P160 (`tests/tools/context-budget.test.ts`).
- The verify command passes.
- The P157 cases for openers, questions, and routing pass, and the evidence file has their runs.

## Boundaries

- No hook, regex, or test acts on the words of a reply or of this text (REQ-17).
- Do not change `styles/`, which P153 owns, or the agent files, which P80 owns.
