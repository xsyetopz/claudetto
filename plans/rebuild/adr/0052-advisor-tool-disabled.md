---
status: accepted
date: 2026-11-16
---
# The Advisor Tool Stays Disabled

## Context and Problem Statement

A prompt cache is keyed to its model, so a Fable call cannot read the main thread's cache, and each advisor question of the rebuilt advisor paid full input price on Fable. Does claudetto keep a rebuilt advisor tool and `/advisor` command?

`settings.ts:178` writes `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`, while `/advisor` exists in 2.1.326 (chunk-4h798pp0.js:2480217).

Transcript record tx-x02/advisor-stays-disabled: The advisor tool is too expensive.

## Considered Options

- Keep the rebuilt `mcp__claudetto__advisor` tool and `/claudetto:advisor` command (the earlier D321 choice).
- Delete both and keep the built-in advisor off with `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`.
- Disable the advisor tool.
- Enable it.
- Enable the advisor pattern.
- Keep it disabled.

## Decision Outcome

Chosen: delete the rebuild (`advisor`, `/advisor`, `useAdvisorTool`, `useAdvisorCommand`) and keep `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`. Migration: ask the `Athena` agent for a review, or switch the session model with `/model`.

Same decision, other record: it stays off (`CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`), because it costs too much (user decision, 2026-11-16).

## Consequences

- On 2.1.325 the `/advisor` slash command and the env key are present; `advisor` is absent from the tool list.
- Setup writes `CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "1"` (`settings.ts:178` at 088a227c).

`/advisor` exists but the tool is disabled.

Transcript record tx-x02/advisor-stays-disabled decided: keep it disabled. Setup writes `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`.

Source: openspec/changes/archive/2026-11-16-2-1-323/specs/decide/spec.md:17 (Reason and Migration); plugins/claudetto/hooks/features/setup/settings.ts:178@088a227c; user decision, 2026-11-16 (User Answers); chunk-4h798pp0.js:2480217 (claude 2.1.326 binary); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352.
