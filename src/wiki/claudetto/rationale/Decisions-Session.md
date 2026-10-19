# Decisions: Session Facts

This page holds the engine fact D63, which follows [Engine Facts](Decisions-Engine).
It rests on a fact of the Claude Code engine that the code alone does not show.
Read it before you change how a slice reports the cost of a model call.
The index is [Decisions](Decisions).
The id D62 is removed.

## D63 The Cost of a Model Call Comes From Its Own `usage`

**Problem:** A hook that makes a model call with `$.model.complete` needs the cost and the tokens of that call.
The `total_cost_usd` of the session does not hold them.

**Choice:** The figure of a call comes from the `usage` of its own `$.model.complete` result, and never from the `total_cost_usd` of the session.
The tool `advise` reports the model and the token counts of its call from `usage` (`resultText` in `slices/advise/advise.ts`).

**Evidence:** In all 4 runs of an earlier measurement (Claude Code 2.1.302), the `result` message did not count the model call of a hook in `total_cost_usd`.
`ModelCompleteResult.usage` in the types of the mod API gives the tokens of one call.
The runs are on [Evidence](Evidence).
`src/plugins/claudetto/slices/advise/lab/advise.test.ts` checks the result text.

## Related Pages

- [Engine Facts](Decisions-Engine)
- [Evidence](Evidence)
- [Decisions](Decisions)
