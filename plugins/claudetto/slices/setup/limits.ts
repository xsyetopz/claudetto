// The bounds of the `setup` slice.

/**
 * The subagent cap of each plan (design D3), by the `organizationRateLimitTier` or the `organizationType` of `.claude.json`.
 * The bundle of Claude Code 2.1.308 maps `claude_pro` to the plan `pro`, and names the tiers `default_claude_max_5x` and `default_claude_max_20x`.
 */
export const PLAN_CAPS: Record<string, number> = {
  claude_pro: 2,
  default_claude_max_5x: 4,
  default_claude_max_20x: 6,
};
