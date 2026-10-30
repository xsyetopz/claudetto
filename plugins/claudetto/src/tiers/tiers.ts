// The tier table: one row for each plan the tier reader knows. A field is set only where a reading
// backs it, and the models and the effort come from the role table of `docs/models.md`, which the
// spec of `tier-profiles` names as their source.

import {
	CONTEXT_WINDOW,
	HAIKU_CONTEXT_WINDOW,
	HAIKU_HANDOFF_TRIGGER_TOKENS,
	HANDOFF_TRIGGER_TOKENS,
} from "../threshold.ts";
import { describedTools } from "../tools/tools.ts";

/**
 * The subagent cap of each plan, by the `organizationRateLimitTier` or `organizationType` of
 * `.claude.json`. The values come from `design.md`, "Tier Table", with the version caveat stated
 * there. No key enforces the cap, so the `agent.spawn` hook of `run-limits` does.
 */
export const PLAN_CAPS = {
	claude_pro: 3,
	default_claude_max_5x: 4,
	default_claude_max_20x: 5,
} as const;

/**
 * The prompt length above which Haiku 5.5 reprices the whole request, cache reads and writes
 * included: "a request whose prompt is over 100,000 tokens pays higher prices" (the "Long context
 * pricing" section of the Anthropic pricing page, read 2026-10-27, `docs/models.md`).
 */
export const HAIKU_PRICE_STEP = 100_000;

/** The model whose window and trigger a row carries on its own. */
export const HAIKU_MODEL = "claude-haiku-5-5";

/** One plan of the tier table. A field marked optional is set only where a reading backs it, and a row that omits it writes no key. */
export interface TierRow {
	/** A key of `PLAN_CAPS`. */
	readonly tier: string;
	readonly subagentCap: number;
	/** The value of `CLAUDE_CODE_SUBAGENT_MODEL`. A row that omits it writes the key for no one. */
	readonly subagentModel?: string;
	/** The value of `model`. A row that omits it leaves the user's own model alone. */
	readonly mainModel?: string;
	/** The value of `effortLevel`, which is where a model starts rather than a ceiling. */
	readonly effort?: string;
	/**
	 * Whether `session.compact` is answered with one `$.model.complete` call on `HAIKU_MODEL`. It is
	 * ours and no program key takes it, so `snippet.ts` does not write it. Every row leaves it off
	 * until rows of `window-budget` price a compaction answered this way against the engine's.
	 */
	readonly cheapSummary?: boolean;
	/** The window, in tokens, that `autoCompactWindow` carries for every model but Haiku. */
	readonly contextCap: number;
	/** The prompt tokens at which the harness compacts and the handoff is written. */
	readonly handoffTokens: number;
	/** The same two for a Haiku session. */
	readonly haiku: {
		readonly contextCap: number;
		readonly handoffTokens: number;
	};
	/** The tools the row writes a `tool.describe` text for, each of which needs a decision page. */
	readonly describeSet?: readonly string[];
}

/**
 * What every row carries. No reading splits any of it by plan, so the cap is the one field the rows
 * tell apart. The windows and triggers are the measured ones of
 * `docs/evidence/compaction/threshold.md` and the vendor-sourced Haiku one.
 *
 * The models and the effort are the role table of `docs/models.md`: the lead row gives
 * `claude-opus-5-5` at `medium`, and `claude-sonnet-5-5` is the worker row, which is the role of an
 * agent that makes a planned edit. One value has to serve every agent, because an agent file names
 * no model, and the worker row is the highest of the three roles a subagent fills here, so a search
 * or a check agent gets more model than its row asks for rather than less.
 */
const SHARED = {
	subagentModel: "claude-sonnet-5-5",
	mainModel: "claude-opus-5-5",
	effort: "medium",
	cheapSummary: false,
	contextCap: CONTEXT_WINDOW,
	handoffTokens: HANDOFF_TRIGGER_TOKENS,
	haiku: {
		contextCap: HAIKU_CONTEXT_WINDOW,
		handoffTokens: HAIKU_HANDOFF_TRIGGER_TOKENS,
	},
	describeSet: describedTools(),
};

/** The rows for Pro, Max 5x, and Max 20x. They differ only in `subagentCap`, because the rest is `SHARED`. */
export const TIERS: readonly TierRow[] = [
	{ tier: "claude_pro", subagentCap: PLAN_CAPS.claude_pro, ...SHARED },
	{
		tier: "default_claude_max_5x",
		subagentCap: PLAN_CAPS.default_claude_max_5x,
		...SHARED,
	},
	{
		tier: "default_claude_max_20x",
		subagentCap: PLAN_CAPS.default_claude_max_20x,
		...SHARED,
	},
];

/** The row of `tier`, or none when the table has no such row. */
export const rowFor = (tier: string): TierRow | undefined =>
	TIERS.find((row) => row.tier === tier);
