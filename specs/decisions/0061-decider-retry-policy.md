---
status: accepted
date: 2026-11-16
---
# Decider Retry Policy

## Context and Problem Statement

How does the decider call retry and fail? The decide spec holds one policy and the plan holds three other statements.

Transcript record tx-x02/decider-newest-spec-wins: Old specs said the decider retried 3 times on 429/529 with 1 s doubling backoff and an 18 s cap, no fallback on 400/401/422, named JEV_GIVE_BACK. The 2-1-325-rearchitecture decide spec replaced them. The subagent-prompts spec of 2-1-323 added effort and maxTurns.

## Considered Options

* Spec: each try 5,000 ms; retry only 429 and 529, at most 3 tries, backoff 1,000 ms doubling; the whole call within 18 s; 400 and 422 hand back after one try with status and at most 200 characters of body; 401 replies its status with no key and the give-back text; no model fallback
* Plan: one try, no retry in a hook; one try with the 429/529 backoff kept; a single try; a 400 goes to Haiku or to `deciderModel`
* Keep the older values.
* Take the newest spec.

## Decision Outcome

Chosen: the newest spec, the 2-1-325-rearchitecture decide spec. The older values (3 tries on 429 and 529, 1 s doubling backoff, 18 s cap, no fallback on 400, 401 and 422, the name JEV_GIVE_BACK) are recorded as superseded. This is the agent's decision, not the user's.

## Consequences

* Good, because the decide block can be specified from one spec.
* Bad, because the user has not confirmed it.

Transcript record tx-x02/decider-newest-spec-wins decided: the newest spec; the older values are recorded as superseded. Agent decision, not the user's.

Source: openspec/specs/decide/spec.md:77; openspec/specs/decide/spec.md:87-93; openspec/specs/decide/spec.md:149; observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8799).
