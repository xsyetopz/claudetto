import type { Event } from "./events.ts";

/** The window the fake context is measured against. */
export const WINDOW = 200_000;

/** Never reached by the 40-turn task, so the handover stays off. */
export const OFF = 100_000_000;

export interface Arm {
	readonly name: string;
	readonly label: string;
	/** `handoverThresholdTokens`. */
	readonly handoverTokens: number;
	/** The fake model calls the handoff tool where a prompt ends a task. */
	readonly handoffOnBoundary: boolean;
	/** `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: the built-in compaction's place, as a percent of the window; none turns it off. */
	readonly autoCompactPct: number | undefined;
	/** After this many built-in compactions the run restarts with `--continue`, the built-in compaction off and the handover on: `/compact` is off in claudetto, and one threshold pair cannot order two compactions before a handover. */
	readonly handoverAfterCompactions?: number;
	readonly expects: string;
}

const fork = (pct: number): Arm => ({
	name: `B${pct}`,
	label: `forked handover at ${pct}% of the window`,
	handoverTokens: (WINDOW * pct) / 100,
	handoffOnBoundary: false,
	autoCompactPct: undefined,
	expects: `handovers, the first at ${pct}%`,
});

export const ARMS: readonly Arm[] = [
	{
		name: "A",
		label: "never compact: handoff and clear at each task boundary",
		handoverTokens: OFF,
		handoffOnBoundary: true,
		autoCompactPct: undefined,
		expects: "3 clears with handoffs",
	},
	fork(25),
	fork(50),
	fork(70),
	{
		name: "C",
		label: "built-in compaction near 140,000 tokens",
		handoverTokens: OFF,
		handoffOnBoundary: false,
		autoCompactPct: 78,
		expects: "a compaction near 140,000 tokens",
	},
	{
		name: "D",
		label: "two built-in compactions, then a handover",
		handoverTokens: WINDOW / 2,
		handoverAfterCompactions: 2,
		handoffOnBoundary: false,
		autoCompactPct: 28,
		expects: "2 compactions, then 1 handover",
	},
];

const names = (events: readonly Event[]): string =>
	events.map((e) => e.type).join(", ") || "none";

const NEAR_140K = [130_000, 160_000] as const;

/** "ok", or why the arm's event did not fire as the spec says. */
export const verdict = (arm: Arm, events: readonly Event[]): string => {
	switch (arm.name) {
		case "A":
			return events.length === 3 && events.every((e) => e.type === "clear")
				? "ok"
				: `expected 3 clears, got ${names(events)}`;
		case "C": {
			const c = events.find((e) => e.type === "compaction");
			if (c === undefined) {
				return `no compaction, got ${names(events)}`;
			}
			return c.tokens >= NEAR_140K[0] && c.tokens <= NEAR_140K[1]
				? "ok"
				: `the first compaction at ${c.tokens} FAKE tokens is not near 140,000`;
		}
		case "D":
			return names(events) === "compaction, compaction, handover"
				? "ok"
				: `expected compaction, compaction, handover, got ${names(events)}`;
		default: {
			const h = events.find((e) => e.type === "handover");
			if (h === undefined) {
				return `no handover, got ${names(events)}`;
			}
			const pct = Number(arm.name.slice(1));
			const floor = (WINDOW * pct) / 100;
			return h.tokens >= floor
				? "ok"
				: `the first handover at ${h.tokens} FAKE tokens fired before ${floor}`;
		}
	}
};
