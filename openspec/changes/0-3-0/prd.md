## Problem

claudetto 0.2.0 costs the user time, tokens, and trust in real sessions.
The evidence is in `research/` and in `.claudetto/0.3.0-findings.md` (40 faults at the time of writing, with the sessions report to add).

- Friction:
  - The settings snippet asks before each recursive `rm`, with 92 generated `ask` rules (`src/plugins/claudetto/slices/prompt/domain/rm-ask.ts`).
  - Its narrow `allow` list sends ordinary commands to the auto-mode classifier, which blocked a read-only `git diff | grep` 3 times in a row in another session (the user, 2026-10-21).
  - The sandbox that the snippet turns on breaks Swift builds and the `openspec init` that `/claudetto:spec` runs (findings, faults 1 and 2).
- Cost:
  - claudetto ships no agent, so each `Agent` call goes to a built-in agent with the full tool list and `CLAUDE.md` (findings, fault 9).
    A thread measured about 116k tokens for each call on `general-purpose` against about 30k on a custom agent with one tool (`research/references-web.md`).
  - Auto mode stays on, with a classifier prompt of about 19k to 35k tokens (`research/claude-code.md`, section 2).
  - The "tokens left" reminder, the built-in `Explore` and `Plan` agents, and forks on the main model stay on (findings, faults 35 to 37).
- Behavior:
  - The prompt texts tell Claude to wait for an agent and not to work in the meantime (`prompts/tool-agent.md:9`).
  - They allow a subagent to skip a check with a note (`prompts/verify-line.md`).
  - They never name `AskUserQuestion` for a decision (findings, faults 10, 11, and 33).
- Weight:
  - The core plugin has 10,623 lines of TypeScript (`find src/plugins/claudetto -name '*.ts'`, without tests).
  - 7 controls record no incident (findings, fault 24).
  - Features stay that are off by default or that Claude Code may already have, such as `decide`, `advise`, and `goal` (findings, faults 28, 31, and 32).

## Users

- The owner of claudetto, who uses it on Max 20x across about 9 projects (`~/.claude/projects/`), in Swift, TypeScript, and Python, and who tests each alpha more than once.
- Other Claude Code users who install the plugins from the marketplace and run `/claudetto:setup`.
- Claude itself, as the reader of each prompt text, agent body, hook message, and skill that claudetto ships.

## Goals

1. Gate only an action that loses bytes for good, tampers with the system, or reads a secret (design D4).
   Each other action runs with no prompt and no classifier call.
2. Replace the built-in agents with claudetto agents, each with its own `model`, `effort`, and a narrow tool list.
3. Cut each token, request, and second that does not buy a result, also a small one (the user, 2026-10-21).
4. Ship only what is needed.
   Each part that stays has a recorded incident, or a measured saving, or a user need.
5. Fix each fault in the findings and in the sessions report, or record why it stays.
6. Make each instruction that claudetto gives Claude agree with the tools that Claude has, and with the other instructions.

## Non-Goals

- No patch of the Claude Code CLI or its npm package (`CLAUDE.md`).
- No new feature that does not come from a fault, a measured saving, or a request of the user.
- No change to the add-on plugins beyond what a fault or the minimum goal needs.
- Not a stable release: `0.3.0-alpha.1` gets more test rounds before `0.3.0` (the user, 2026-10-21).

## Success Measures

Each measure has a check that runs, and the baseline is 0.2.0 on Claude Code 2.1.306.

- Prompts: an ordinary session (build, test, `git` reads, `rm -rf` of a build folder) shows 0 permission prompts.
  Each destructive case in the eval set shows a prompt or a deny.
- Classifier: 0 auto-mode classifier calls in a session with the claudetto settings.
- Agents: 0 calls to a built-in agent type.
  The start context of a claudetto agent is below that of `general-purpose`, measured in the transcript `usage`.
- Tokens: the empty-session context of the claudetto settings is below the 0.2.0 one, measured the same way as `docs/how-it-works/context-budget.md` of the `claude-code-docs` repository.
- Faults: each fault in the findings and the sessions report has a test that failed before the fix and passes after it, or a recorded reason to keep it.
- Weight: the line count of the core plugin goes down, and no control records `incident: "none recorded"`.
- Checks: `just docker check` passes.
- Repeat runs: each eval case passes on repeat runs, with the number of runs set in the design.
