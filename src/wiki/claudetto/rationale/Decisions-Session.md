# Decisions: Session Facts

This page holds two facts about what a session costs.
Read it before you change how a slice reports cost or how setup sets the prompt cache.

## Why a Call Reports Its Own `usage`

**Choice:** A hook that calls `$.model.complete` takes the cost and tokens from the `usage` of that result.
It never takes them from `total_cost_usd` of the session.
The `advise` tool reports its model and tokens this way (`resultText` in `slices/advise/advise.ts`).

**Reason:** In all 4 measured runs (Claude Code 2.1.302), `total_cost_usd` did not count the model call of a hook.

**Evidence:** `ModelCompleteResult.usage` in the mod API types.
`src/plugins/claudetto/slices/advise/lab/advise.test.ts` checks the result text.
The runs are on [Evidence](Evidence).

## Why Setup Does Not Set the Prompt Cache TTL

**Choice:** The setup snippet has no `promptCacheTtl` and no `subagentPromptCacheTtl` (D18).
Setup removes a `promptCacheTtl` of `5m` that an earlier setup wrote.

**Reason:** Claude Code picks the TTL itself when the keys are unset.
The main conversation gets 1 hour on a Claude subscription within its usage limits, and 5 minutes on an API key, Bedrock, Vertex, or Foundry.
Everything outside the main conversation gets 5 minutes, unless `ENABLE_PROMPT_CACHING_1H=1`.
A fixed value in the snippet is wrong for one of these accounts.

**Evidence:** Both names are in the settings schema of the installed Claude Code 2.1.303, in `schemas/claude-code-settings.json` and `schemas/claude-code-managed-settings.json`.
`just schema` extracts the schema from the bundle.
The env vars `CLAUDE_CODE_PROMPT_CACHE_TTL` and `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` take precedence over the keys.

## See Also

- [Decisions Engine](Decisions-Engine)
- [Evidence](Evidence)
- [Decisions](Decisions)
