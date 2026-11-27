---
status: accepted
date: 2026-11-18
---
# Build Ten Blocks Over Vanilla 2.1.327; OpenSpec Stays Out

## Context and Problem Statement

[ADR-0177](0177-pragmatism-gate.md) ships a component only if it beats vanilla Claude Code on a measured check. Which baseline blocks are worth rebuilding on 2.1.327 is the user's call, because the gain each block must show is a product judgement, not a measurement the agent can make alone.

## Considered Options

- Build every block of the baseline.
- Build only the blocks the user names, and move the open items of the others to scope Out.

## Decision Outcome

Chosen: build the blocks the user named. In: `kernel` (it serves the others), `guards`, `edit`, `handover`, `delegation`, `reply`, `cost`, `setup`, `verification` and `you-should-know`. Out: `openspec`. Its requirements move to `prd/README.md` scope Out. The `claudetto-openspec` plugin files stay in the tree untouched, because only items the user names are removed.

## Consequences

- ADR-0192 (2026-11-21) brings OpenSpec back In as claudetto-spec; the other blocks' scope stands.
- Each built block still passes ADR-0177 item by item: a requirement without a measured gain over vanilla moves to scope Out with that reason.
- OpenSpec work in the rebuild stops at the 2.1.327 engines bump of its manifest.

Source: user decision, 2026-11-18, AskUserQuestion in session 5ec39a40-e3d5-4f0b-a8ac-97f52d27fa0f (blocks chosen: edit, guards, reply, delegation, cost, verification, setup; openspec left unchecked).
