---
status: superseded by ADR-0070
date: recorded in openspec/changes/2-1-325-rearchitecture/design.md:64 (day of decision not recorded)
---
# Handoff at Session Age

## Context and Problem Statement

The prompt cache lives one hour, so context older than 59 minutes pays full price for its whole prefix.

Transcript record tx-x02/session-end-at-59-minutes: To respect the 1 h cache on the main session, the user wanted sessions of at most 59 minutes, then a clear by the agent.

Transcript record tx-x03/handover-at-59-minute-context-age: The standing goal fixes 59 minutes, because the prompt cache lives one hour. Probes showed `$.session.compact()` fails from `turn.step` and under `-p`, and works from `turn.complete` in an interactive session.

## Considered Options

- At 59 minutes since the later of session start and the last non-precompute main-loop compaction, `turn.complete` of the main loop calls `$.session.compact()` and the module's own `session.compact` hook answers with the fork handoff. A subagent turn end starts none; at 58 minutes nothing; headless (-p, SDK) keeps auto-compaction only; a mid-turn `turn.step` cannot start one ("a turn is running").
- A trigger on an idle gap, not on age.
- Trigger by session age.
- Trigger by idle gap or context size.
- Rely on core auto compaction.
- Compact at `turn.complete` once the context is 59 minutes old, then fork the handoff.

## Decision Outcome

Chosen: Superseded: age does not cool the cache; an idle gap does. See [ADR-0070](0070-handover-trigger-idle-or-size.md).

## Consequences

- `HANDOFF_MS = 59 * 60_000` is still in handoff.ts:68 at 088a227c.

Transcript record tx-x02/session-end-at-59-minutes decided: Chosen at the time: age, 59 minutes or less. Reversed by `[ADR-0070](0070-handover-trigger-idle-or-size.md)`.

Transcript record tx-x03/handover-at-59-minute-context-age decided: Own compaction at `turn.complete` after 59 minutes, main loop only, interactive sessions only; headless `-p` keeps auto compaction. The 59 minutes is a constant, with no user setting. This matches the settled decision that handover replaces core auto compaction by default. No `handoffMinutes` key exists; tests drive the clock.

Source: openspec/changes/2-1-325-rearchitecture/design.md:64; openspec/changes/2-1-325-rearchitecture/items.json:55; user decision, 2026-11-16 05:57 UTC, hand over when the window is reached, then /clear through the Mod API and resume (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2031; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (handoff, Decisions and Age handoff); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:3402.
