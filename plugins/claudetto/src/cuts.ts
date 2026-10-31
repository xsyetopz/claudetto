// A shorter request is not a saving: the character score and the bill are different measurements.

import { BUILTIN_CHARS } from "./builtins.ts";
import { BASELINE_TOTAL, DENIED_TOGETHER_TOTAL } from "./deny.ts";

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
export const SHIPPED_TOTAL = 29_433;

export const SHIPPED_TOOL_COUNT = 9;

export const SANDBOX_CHARS = 7230;

export const CLASSIFIER_CALL_CHARS = 140_718;

export const SHIPPED_CUTS: readonly Cut[] = [
	{ name: "deny list", chars: BASELINE_TOTAL - DENIED_TOGETHER_TOTAL },
	// The residual: hiding our tool texts hides the plugin itself, and it holds request text no row names.
	{ name: "tool texts", chars: 7319 },
	// Needs the deny list: with `Workflow` offered, `disableBundledSkills` raises the request.
	{ name: "built-in surface", chars: BUILTIN_CHARS },
	{ name: "dedupe skill", chars: -155 },
	{ name: "docs skill", chars: -71 },
	// The window and the percentage move no request text, only the bill.
	{
		name: "compaction pair",
		chars: 0,
		cost: { shift: -14.2, source: "docs/evidence/compaction/threshold.md" },
	},
	{ name: "idleCompaction off", chars: 0 },
	// The default body it replaces is the one the shipped settings already shortened.
	{ name: "main agent body", chars: 72 },
	// Takes the memory section out of the default body, so it reads only with `agents/main.md` moved aside.
	{ name: "auto memory off", chars: 2138 },
	// The four agents are delegation targets, so the harness lists them in the first message.
	{ name: "agent listing", chars: -1045 },
	{ name: "handoff context", chars: -773 },
	// A style adds to the body instead of replacing it, and its reminder repeats on each user message.
	{ name: "output style", chars: -1644 },
	// Setup writes the suite, but only the classifier call carries the lists.
	{ name: "autoMode lists", chars: 0 },
	// Repays its text: sandbox auto-allow precedes the classifier, so a sandboxed `Bash` call pays none.
	{ name: "sandbox block", chars: -SANDBOX_CHARS },
	// The hook answers with `text` alone, so only the listing row reaches a request.
	{ name: "setup command listing", chars: -48 },
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
