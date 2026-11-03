// A shorter request is not a saving: the character score and the bill are different measurements.

import { BUILTIN_CHARS } from "./builtins.ts";

export interface CostReading {
	/** Billed-cost change in percent; negative is cheaper. */
	readonly shift: number;
	readonly source: string;
}

export interface Cut {
	readonly name: string;
	/** Negative for a piece the tree adds, so the inventory still sums to the whole fall. */
	readonly chars: number;
	readonly cost?: CostReading;
}

/** The arm runs `planSetup`, so it carries the keys a user's settings carry. */
export const SHIPPED_TOTAL = 25_067;

/**
 * The fall of the shipped arm that no row accounts for: the gaps where removals interact, since each row is read alone.
 * The pairs read: the git switches with `tool texts` 674, the cron and fork switches with `tool texts` 327 and with `built-in surface` 350,
 * the Explore and Plan denies and the `Agent` denies with `agent listing` 182 each, the git switches with `handoff context` 27,
 * `main agent body` with `output style` -40, and 48 among the plugin pieces, which leaves about 47 of higher order.
 */
export const UNEXPLAINED_RESIDUAL = 1797;

export const SHIPPED_TOOL_COUNT = 8;

export const SANDBOX_CHARS = 7220;

export const CLASSIFIER_CALL_CHARS = 140_718;

export const SHIPPED_CUTS: readonly Cut[] = [
	// `ScheduleWakeup` 4887 and `ReportFindings` 2178. `Workflow` reads 0 here, because `enableWorkflows: false` takes it out too.
	{ name: "deny list", chars: 7065 },
	// Names only leave the deferred list. In the interactive request each rule also adds its `permissions.deny` entry to `safeguards`, 92 characters for the two, so that request grows by 68.
	{ name: "deferred tool denies", chars: 24 },
	// Read: the shipped arm with the `tool-describe` block detached from the catalog, less the shipped arm. Counts `AskUserQuestion`, `Agent`, `Skill`, and `ListAgents` moved behind `ToolSearch`, 2947 of it for the first three.
	{ name: "tool texts", chars: 9615 },
	// Needs the deny list: with `Workflow` offered, `disableBundledSkills` raises the request.
	{ name: "built-in surface", chars: BUILTIN_CHARS },
	{ name: "docs skill", chars: -71 },
	// The window and the percentage move no request text, only the bill.
	{
		name: "compaction pair",
		chars: 0,
		cost: { shift: -14.2, source: "docs/evidence/compaction/threshold.md" },
	},
	{ name: "idleCompaction off", chars: 0 },
	// The default body it replaces is the one the shipped settings already shortened.
	{ name: "main agent body", chars: -1881 },
	// Takes the memory section out of the default body, so it reads only with `agents/main.md` moved aside.
	{ name: "auto memory off", chars: 2138 },
	// The four agents are delegation targets, so the harness lists them in the first message.
	{ name: "agent listing", chars: -726 },
	{ name: "handoff context", chars: -940 },
	// A deferred tool adds its name to the tool list and an MCP instructions block to the same message.
	{ name: "handoff tool listing", chars: -235 },
	// A style adds to the body instead of replacing it, and its reminder repeats on each user message.
	{ name: "output style", chars: -1844 },
	// Setup writes the suite, but only the classifier call carries the lists.
	{ name: "autoMode lists", chars: 0 },
	// Repays its text: sandbox auto-allow precedes the classifier, so a sandboxed `Bash` call pays none.
	{ name: "sandbox block", chars: -SANDBOX_CHARS },
	// The hook answers with `text` alone, so only the listing row reaches a request.
	{ name: "setup command listing", chars: -48 },
	{ name: "handoff command listing", chars: -61 },
	// With the bundled skills on, the `Workflow` definition carries the workflow guidance, so alone it reads 22,034. Read with `built-in surface` out, it adds to that row exactly.
	{ name: "workflow switches", chars: 5333 },
	// `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS`, `includeGitInstructions`, and `attribution` each take the text out, so any two of them out read 0.
	{ name: "git instructions", chars: 612 },
	// The two `Agent(...)` denies and `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` overlap the same way.
	{ name: "explore and plan agents", chars: 911 },
	// `general-purpose` 311, `claude` 134, `statusline-setup` 113, and the `DesignSync` deny 12.
	{ name: "built-in agent denies", chars: 570 },
	// `CLAUDE_CODE_DISABLE_CRON` 34 and `CLAUDE_CODE_FORK_SUBAGENT` 69.
	{ name: "cron and fork switches", chars: 103 },
	// The `handoff` block nulls the section of the default body, so it reads only with `agents/main.md` moved aside.
	{ name: "context management section", chars: 285 },
	// Not a reading: the difference between the fall of the shipped arm and the rows above.
	{ name: "unexplained residual", chars: UNEXPLAINED_RESIDUAL },
];

/** The widest the budget line can be; it rides `prompt.submit`'s `context`, so it is no row of `SHIPPED_CUTS`. */
export const BUDGET_LINE_MAX_CHARS = 69;

export const shippedChars = (cuts: readonly Cut[] = SHIPPED_CUTS): number => {
	let total = 0;
	for (const cut of cuts) {
		total += cut.chars;
	}
	return total;
};

/** Cuts whose reading shows the bill did not rise; a cut with no reading is excluded. */
export const pricedCuts = (
	cuts: readonly Cut[] = SHIPPED_CUTS,
): readonly Cut[] =>
	cuts.filter((cut) => cut.cost !== undefined && cut.cost.shift <= 0);

export const unpricedCuts = (
	cuts: readonly Cut[] = SHIPPED_CUTS,
): readonly string[] =>
	cuts.filter((cut) => cut.cost === undefined).map((cut) => cut.name);

/** Cuts the score fell for and the bill rose: they are reverted, so this stays empty. */
export const risingCuts = (
	cuts: readonly Cut[] = SHIPPED_CUTS,
): readonly string[] =>
	cuts
		.filter((cut) => cut.cost !== undefined && cut.cost.shift > 0)
		.map((cut) => cut.name);
