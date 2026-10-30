import type { Fixed, Track } from "./replay.ts";
import { replay } from "./replay.ts";

export const CONTEXT_WINDOW = 300_000;
export const COMPACT_OUTPUT_RESERVE = 20_000;
export const HAIKU_TRIGGER = 90_000;
const HEADROOM = 13_000;

export interface Derived {
	readonly trigger: number;
	readonly pct: number;
	readonly fires: number;
	readonly haikuWindow: number;
	readonly haikuFires: number;
}

const firesAt = (window: number, pct: number): number => {
	const effective = window - COMPACT_OUTPUT_RESERVE;
	return Math.min(Math.floor((effective * pct) / 100), effective - HEADROOM);
};

export const derive = (trigger: number): Derived => {
	const pct =
		Math.floor((trigger / (CONTEXT_WINDOW - COMPACT_OUTPUT_RESERVE)) * 1e6) /
		1e4;
	const haikuWindow =
		Math.floor(HAIKU_TRIGGER / (pct / 100)) + COMPACT_OUTPUT_RESERVE;
	return {
		trigger,
		pct,
		fires: firesAt(CONTEXT_WINDOW, pct),
		haikuWindow,
		haikuFires: firesAt(haikuWindow, pct),
	};
};

export interface Step {
	readonly threshold: number;
	readonly compactions: number;
	readonly billed: number;
	readonly wasted: number;
	readonly together: number;
}

export const sweep = (
	tracks: readonly Track[],
	fixed: Fixed,
	charge: number,
	bounds: { from: number; to: number; step: number },
): Step[] => {
	const steps: Step[] = [];
	for (
		let threshold = bounds.from;
		threshold <= bounds.to;
		threshold += bounds.step
	) {
		const row = replay(tracks, threshold, fixed);
		const wasted = row.compactions * charge;
		steps.push({
			threshold,
			compactions: row.compactions,
			billed: row.billed,
			wasted,
			together: row.billed + wasted,
		});
	}
	return steps;
};

export const bestOf = (
	steps: readonly Step[],
): { best: Step; low: number; high: number } | undefined => {
	const [first] = steps;
	if (first === undefined) {
		return undefined;
	}
	let best = first;
	for (const step of steps) {
		if (step.together < best.together) {
			best = step;
		}
	}
	const near = steps.filter((step) => step.together <= best.together * 1.01);
	return {
		best,
		low: Math.min(...near.map((step) => step.threshold)),
		high: Math.max(...near.map((step) => step.threshold)),
	};
};
