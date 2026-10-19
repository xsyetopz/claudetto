# Decisions: Session Facts

This page holds one fact about what a model call costs.
Read it before you change how a slice reports cost.

## Why a Call Reports Its Own `usage`

**Choice:** A hook that calls `$.model.complete` takes the cost and tokens from the `usage` of that result.
It never takes them from `total_cost_usd` of the session.
The `advise` tool reports its model and tokens this way (`resultText` in `slices/advise/advise.ts`).

**Reason:** In all 4 measured runs (Claude Code 2.1.302), `total_cost_usd` did not count the model call of a hook.

**Evidence:** `ModelCompleteResult.usage` in the mod API types.
`src/plugins/claudetto/slices/advise/lab/advise.test.ts` checks the result text.
The runs are on [Evidence](Evidence).

## See Also

- [Decisions Engine](Decisions-Engine)
- [Evidence](Evidence)
- [Decisions](Decisions)
