---
status: superseded by ADR-0168
date: 2026-11-13
---
# Fault Policy for Gating Hooks

## Context and Problem Statement

A `tool.check` or `tool.call` hook can throw or overrun 10 s. 64 of 92 catches bound no error and hid defects; a bare `parseFaults catch { return [] }` turned a bad answer into a clean reply.

## Considered Options

- One `tool.check` and one `tool.call` hook per plugin, each with one `.catch`.
- No catch: a fault fails open.

## Decision Outcome

Chosen at the time: one catch each. A `tool.check` fault asks ("The gate failed: `<error>`. A person must approve this call."); a `tool.call` fault denies, and if `next.called` replays `next` and withholds the result; a guard without `.catch` fails open (throw allows; overrun over 10 s allows); every other `catch` logs through `$.ui.log` or rethrows. Superseded by hook-fault-policy-engine-verdict.

## Consequences

- A `tool.check` fault asked a person on every gate error.

Source: openspec/changes/archive/2026-11-13-feat-2-1-321/specs/mod-architecture/spec.md:57; openspec/specs/mod-architecture/spec.md:128.
