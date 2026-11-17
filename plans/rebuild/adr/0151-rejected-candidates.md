---
status: accepted
date: recorded in openspec/changes/2-1-325-rearchitecture/design.md:281 (day of decision not recorded)
---

# Candidates Rejected In The 2.1.325 Design

## Context and Problem Statement

A design pass listed candidates: lower `autoCompactWindow` for Opus and Sonnet (measured), Athena on Fable, lines the stock prompt already says (user email out of requests, parallel calls, Edit versus Write), "background job dies with its subagent turn" (probe disproved), a cold-cache send warning (the status line shows TTL), a lock per expensive job, a registry of user-owned values with an ask hook, Stop gates, `maxTurns` on agents, and UI recipes (no UI shipped).

## Considered Options

- Adopt them.
- Reject each, with the reason in Context.

## Decision Outcome

Chosen option: reject each. Athena on Fable is rejected by the owner's rule of 2026-11-13 (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)); the others by measurement, probe, or duplication of the stock prompt.

## Consequences

Good: the list stops reappearing. Settled: agents set no `maxTurns` (CHANGELOG.md:108@088a227c: the old caps of 40/30/60 each cost a resume call), so the rejection stands and plan:1111 loses.

Source: openspec/changes/2-1-325-rearchitecture/design.md:281; openspec/changes/2-1-325-rearchitecture/design.md:61 (probes 1-4 never compacted); user decision, 2026-11-13.
