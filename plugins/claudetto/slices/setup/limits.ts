// The bounds of the `setup` slice.
/**
 * The subagent cap of each plan (design D4), by the `organizationRateLimitTier` or the `organizationType` of `.claude.json`.
 * The bundle of Claude Code 2.1.308 maps `claude_pro` to the plan `pro`, and names the tiers `default_claude_max_5x` and `default_claude_max_20x`.
 * At 6 the sessions of the user on Max 20x hit "Concurrent subagent limit" 14 times (`research/incidents.md`, row 39).
 */
export const PLAN_CAPS: Record<string, number> = {
  claude_pro: 3,
  default_claude_max_5x: 4,
  default_claude_max_20x: 5,
};

/** Most lines of the global `~/.claude/CLAUDE.md`: it loads in each session of the user (design D21). */
export const GLOBAL_CLAUDE_MD_MAX_LINES = 20;

/** The folders of a project where the inventory looks for a `CLAUDE.md` of a vendored package, one or two levels down. */
export const VENDOR_DIRS = [
  "node_modules",
  "vendor",
  "third_party",
  "external",
];
