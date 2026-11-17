---
status: accepted
date: recorded in openspec/changes/archive/2026-11-16-2-1-323/design.md:123 (day of decision not recorded)
---
# Tool check fault leaves verdict beneath

## Context and Problem Statement

D321 asked on a `tool.check` fault. D323 replaced that fault policy by leaving the verdict beneath in place.

After D321 a thrown scan error could let an unscanned result reach the model, and the `tool.check` catch made a second ask of its own.

## Considered Options

- Ask on `tool.check` fault
- Leave the verdict beneath in place
- Keep the D321 catches.
- Delete the `tool.check` catch and leave the engine verdict.

## Decision Outcome

Chosen: leave the verdict beneath in place.

Same decision, other record: delete the `tool.check` catch in `register.ts` and `checkFault`, so a guard fault leaves the engine verdict (no ask of its own); the `tool.call` catch returns the `next(e)` result once the tool has run; `secretCall` denies on scan failure ("withheld", holds no key); each `tool.check` guard that does not judge a tool returns before its first `$` call (timed on an MCP call); `claude plugin validate --strict --json` shows `hasCatch` false for `tool.check` and true for `tool.call`; an overrun in `tool.call` names kind `timeout`; no `catch` turns a fault into a normal answer; lab test `faults.test.ts`.

## Consequences

A faulting check cannot raise a popup of its own.

- Released as 2.1.325; supersedes D321.
- A guard fault no longer opens its own prompt.

Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:123; openspec/changes/archive/2026-11-16-2-1-323/specs/mod-architecture/spec.md:5 (not located: the exact D323 lines); plugins/claudetto/hooks/faults.test.ts@088a227c; plugins/claudetto/hooks/register.ts@088a227c. Basis: measured (probes), reported.
