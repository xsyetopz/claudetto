---
id: P43
deps: [P42]
owns: ["src/plugins/dotclaude/slices/agents/hooks/", "src/plugins/dotclaude/slices/agents/lab/", "tests/dotclaude/agents/resume.test.ts", "evidence/resume-mandate.md"]
verify: just check, just lab, and one session in just sandbox where an agent stops without a report and the root resumes it
agent: main session
---

# P43 Resume Mandate

## Goal

The root resumes a stopped agent with `SendMessage`, and it cannot start a new agent for the work of that agent.

## Context

- The decision of the user: `change.md`, decisions, 2026-10-13.
- Claude Code returns a stopped run "marked as partial", and the root can resume it with `SendMessage`, with its full history (reports 03 and 05).
  `Explore` and `Plan` cannot be resumed.
- Each start of a new agent pays a cold cache of 8.3K to 17.2K tokens and reads the files again (report 16).

## Steps

1. In `just sandbox`, find out how a hook can tell that an agent stopped without a final report: the `SubagentStop` input, the agent transcript, and the result that the root gets.
   Write the findings, with the method, to `evidence/resume-mandate.md`.
2. A `SubagentStop` hook records each agent that stopped without a report, in a file of `.dotclaude/` keyed by the session id.
3. A `PreToolUse` hook on `Agent` refuses each new start while a recorded agent is not resumed.
   The message names the agent id and tells the root to call `SendMessage`.
   No setting, env var, or text of the model turns the refusal off.
4. The record of an agent clears when the root resumes it, or when the resume fails because the context of that agent is full.
   Without this second case, the session cannot go on.

## Acceptance

- The lab covers a stop, a refused start, a resume, and a full context.
- A sandbox session shows the refusal and the resume.

## Boundaries

- Use only the hook events of Claude Code.
- Refuse an `Agent` start only for an agent that is not resumed.
