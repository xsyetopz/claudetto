---
status: accepted
date: 2026-11-17
---
# Opener Check with or without a Judge Call

## Context and Problem Statement

A reply that opens with agreement, praise, or apology ("You're right", "Great point", "Good catch", "I apologize", "Sorry") hides the finding. Replies opened with agreement 4x as often as disagreement; in about 1,900 sessions "you're right" appeared 175 times and "absolutely right" 13 (other source, n=1). The sources disagree on how to check the opener.

## Considered Options

- A prompt-type Stop hook that judges the first sentence only and blocks once. Cost: one small model call per turn end. Held by the dossier schedule and its session log (the agent built this hook after answering a correction with "You're right", session e473653f).
- An output-style rule to open with the next action or the changed fact, with an eval case and no Stop-time model call. Held by the OpenSpec agent-conduct spec: a judge adds one call to every stop and a full turn to every blocked stop.
- The register question `apologizes_or_agrees` through the Decider at Stop (shipped, blocking, in claim-check).

## Decision Outcome

Chosen option: an output-style rule to open with the next action or the changed fact, with an eval case, and no Stop-time model call (user decision, AskUserQuestion 2026-11-17). The Decider question `apologizes_or_agrees` at Stop and a prompt-type Stop judge are not shipped for openers.

## Consequences

The first option adds one call per turn end. The second option has wording-level enforcement only. The third option exists at the cost of the Decider call on a held-and-shipped question set.

Source: openspec/specs/agent-conduct/spec.md:160; external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:47; external/please-use-me-often/agent-failure-dossier/judged/other.jsonl:40; openspec/specs/claim-check/spec.md:162.
