---
status: accepted
date: 2026-11-14
---
# You-Should-Know Recreates the Builtin

## Context and Problem Statement

Should claudetto-you-should-know stay or give way to `cc-plugin-you-should-know@builtin`?

Transcript record tx-x01b/you-should-know-stays-improved: Does `claudetto-you-should-know` stay in the rebuild?

Transcript record tx-x02/ysk-recreation-and-builtin-disable: Claude Code 2.1.325 ships `cc-plugin-you-should-know@builtin`. claudetto's own plugin must replace it.

## Considered Options

- Drop the plugin and use the builtin.
- Keep a recreated version from an older 2.1.3xx with fixes, compared to the latest binary's code.
- Drop it.
- Keep it and improve it.
- Keep the builtin and the plugin side by side.
- Recreate the builtin in full and disable all actual `@builtin`s at runtime, enforced.

## Decision Outcome

Chosen: Keep and improve claudetto-you-should-know; the user chose it, and the phrase "beside the built-in" was the agent's, not the user's (2026-11-16). Matches the settled decision that it fully recreates the builtin.

## Consequences

Timing and relevance faults get fixed against real sessions.

Transcript record tx-x01b/you-should-know-stays-improved decided: It stays and is improved. Matches the settled decision that claudetto-you-should-know recreates the builtin. Good: its fix (denied calls logged with outcome) ships. Bad: none noted.

Transcript record tx-x02/ysk-recreation-and-builtin-disable decided: full recreation plus an enforced runtime disable of all `@builtin`s. A plugin cannot refuse a builtin at `plugin.register`; the disable goes through settings (see `[ADR-0057](0057-builtin-disable-in-user-settings.md)`).

Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10891); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057 (handoff Decisions); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4661); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297.
