import { describedTools } from "../blocks/tool-describe/tools.ts";
import {
	CONTEXT_WINDOW,
	HAIKU_CONTEXT_WINDOW,
	HAIKU_HANDOFF_TRIGGER_TOKENS,
	HANDOFF_TRIGGER_TOKENS,
} from "../threshold.ts";

export const PLAN_CAPS = {
	claude_pro: 3,
	default_claude_max_5x: 4,
	default_claude_max_20x: 5,
} as const;

export const HAIKU_PRICE_STEP = 100_000;

export const HAIKU_MODEL = "claude-haiku-5-5";

export interface TierRow {
	readonly tier: string;
	readonly subagentCap: number;
	/** The value of `CLAUDE_CODE_SUBAGENT_MODEL`. A row that omits it writes the key for no one. */
	readonly subagentModel?: string;
	/** The value of `model`. A row that omits it leaves the user's own model alone. */
	readonly mainModel?: string;
	/** The value of `effortLevel`, which is where a model starts rather than a ceiling. */
	readonly effort?: string;
	readonly cheapSummary?: boolean;
	readonly contextCap: number;
	readonly handoffTokens: number;
	readonly haiku: {
		readonly contextCap: number;
		readonly handoffTokens: number;
	};
	readonly describeSet?: readonly string[];
}

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

const PRO: TierRow = {
	tier: "claude_pro",
	subagentCap: PLAN_CAPS.claude_pro,
	...SHARED,
};

export const TIERS: readonly TierRow[] = [
	PRO,
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

export const SNIPPET_ROW: TierRow = PRO;

export const rowFor = (tier: string): TierRow | undefined =>
	TIERS.find((row) => row.tier === tier);
