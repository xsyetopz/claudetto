---
status: accepted
date: 2026-11-09
---

# Jev May Deny or Ask but Never Allow

## Context and Problem Statement

Jev (the decide tool) answers a permission question for the lead. Which verdicts may it give, when jevwire is not hardened against injection?

## Considered Options

- Jev may allow, ask, or deny.
- Jev may deny or ask, and never allow.

## Decision Outcome

Chosen option: Jev may deny or ask but never allow, because jevwire is not hardened against injection.

## Consequences

- An injected text cannot make Jev open a gate.
- Allowing stays with the user's rules and the built-in classifier.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:176 (reported).
