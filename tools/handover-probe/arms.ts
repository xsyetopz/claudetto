import type { Event } from "./events.ts";

/** `CLAUDE_CODE_AUTO_COMPACT_WINDOW`. */
export const WINDOW = 200_000;

/** `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` is a percent of the window less a 20,000 output reserve (`L4` and `Ure` in Claude Code 2.1.319). */
const EFFECTIVE = WINDOW - 20_000;

/** Never reached by the 40-turn task, so the handover stays off. */
export const OFF = 100_000_000;

export interface Arm {
	readonly name: string;
	readonly label: string;
	/** `handoverThresholdTokens`. */
	readonly handoverTokens: number;
	/** The fake model calls the handoff tool where a prompt ends a task. */
	readonly handoffOnBoundary: boolean;
	/** `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`; none turns the built-in compaction off. */
	readonly autoCompactPct: number | undefined;
	/** After this many built-in compactions the run restarts with `--continue`, the built-in compaction off and the handover on: `/compact` is off in claudetto, and one threshold pair cannot order two compactions before a handover. */
	readonly handoverAfterCompactions?: number;
	readonly expects: string;
}

const pctAt = (tokens: number): number => (tokens * 100) / EFFECTIVE;

const thousands = (tokens: number): string => tokens.toLocaleString("en-US");

/** A real 40-turn run spans about 25,000 to 65,000 tokens (paid run 1), so every threshold sits inside that span. */
const fork = (tokens: number): Arm => ({
	name: `B${tokens / 1000}`,
	label: `forked handover at ${thousands(tokens)} tokens`,
	handoverTokens: tokens,
	handoffOnBoundary: false,
	autoCompactPct: undefined,
	expects: `handovers, the first at ${thousands(tokens)} tokens`,
});

const C_AT = 53_000;

export const ARMS: readonly Arm[] = [
	{
		name: "A",
		label: "never compact: handoff and clear at each task boundary",
		handoverTokens: OFF,
		handoffOnBoundary: true,
		autoCompactPct: undefined,
		expects: "3 clears with handoffs",
	},
	fork(35_000),
	fork(45_000),
	fork(53_000),
	{
		name: "C",
		label: `built-in compaction near ${thousands(C_AT)} tokens`,
		handoverTokens: OFF,
		handoffOnBoundary: false,
		autoCompactPct: pctAt(C_AT),
		expects: `a compaction near ${thousands(C_AT)} tokens`,
	},
	{
		name: "D",
		label:
			"two built-in compactions at 40,000 tokens, then a handover at 45,000",
		handoverTokens: 45_000,
		handoverAfterCompactions: 2,
		handoffOnBoundary: false,
		autoCompactPct: pctAt(40_000),
		expects: "2 compactions, then handovers",
	},
];

const names = (events: readonly Event[]): string =>
	events.map((e) => e.type).join(", ") || "none";

/** Claude Code checks an estimate, so a real compaction can start under its threshold: paid run 1 saw 49,416 for 50,400. The fake moves in steps of 5,000. */
const NEAR_C = [C_AT - 5000, C_AT + 5000] as const;

/** "ok", or why the arm's event did not fire as the spec says. */
export const verdict = (arm: Arm, events: readonly Event[]): string => {
	switch (arm.name) {
		case "A": {
			return events.length === 3 && events.every((e) => e.type === "clear")
				? "ok"
				: `expected 3 clears, got ${names(events)}`;
		}
		case "C": {
			const c = events.find((e) => e.type === "compaction");
			if (c === undefined) {
				return `no compaction, got ${names(events)}`;
			}
			return c.tokens >= NEAR_C[0] && c.tokens <= NEAR_C[1]
				? "ok"
				: `the first compaction at ${c.tokens} tokens is not near ${thousands(C_AT)}`;
		}
		case "D": {
			return /^compaction, compaction(, handover)+$/.test(names(events))
				? "ok"
				: `expected 2 compactions, then handovers, got ${names(events)}`;
		}
		default: {
			const h = events.find((e) => e.type === "handover");
			if (h === undefined) {
				return `no handover, got ${names(events)}`;
			}
			return h.tokens >= arm.handoverTokens
				? "ok"
				: `the first handover at ${h.tokens} tokens fired before ${arm.handoverTokens}`;
		}
	}
};
