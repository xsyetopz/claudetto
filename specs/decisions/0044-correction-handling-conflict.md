---
status: accepted
date: 2026-11-14 (date of the handoff that records it; day of decision not recorded)
---
# Correction Handling

## Context and Problem Statement

The user dossier holds both "corrections are updates to context" and "pushback is not Evidence" (left open for the user); a probe or item adds that waiting after a correction conflicts with applying a fix at once when the correction names it. The plan settles only the third-party-claim reading.

Transcript record tx-x02/act-on-correction-now: The root prompt said to report and wait after a bang command or a correction, which made the agent report instead of fix. The user wants the fix done now.

## Considered Options

* Treat a correction as an update and apply it at once
* Treat pushback as no evidence and hold the position until new evidence
* Apply at once when the correction names the fix; otherwise wait
* Keep report and wait after a correction.
* Fix at once; only a bang command keeps report and wait.

## Decision Outcome

Chosen: treat a correction as an update and apply the fix at once; only a bang command keeps report and wait (user decision, recorded in the 2026-11-14 handoff (day of decision not recorded)).

## Consequences

* Good, because a correction gets its fix in the same turn.
* Bad, because a stop request ends the turn with no text.

Transcript record tx-x02/act-on-correction-now decided: fix at once. The rule Report and Wait After a Bang Command or a Correction is removed from the agent-conduct spec. A stop request ends the turn with no text.

Source: openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:296; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:297; user decision, 2026-11-14 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).
