// A fine sweep of the threshold, and the settings a chosen value implies.
//
// The formula is the harness's, and where the engine then fires is the documented one: the effective window is
// the window less the output reserve, and the compaction threshold is the smaller
// of the percent of it and 13,000 tokens below it (`clawdipedia`
// `how-it-works/context-and-compaction`, "When Compaction Runs").

import type { Fixed, Track } from "./replay.ts";
import { replay } from "./replay.ts";

/** The context window the replay assumes, in tokens, from which the effective window is derived. */
export const CONTEXT_WINDOW = 300_000;
/** The tokens the engine keeps back from the window for the summary output, in tokens; the effective window is the window less this. */
export const COMPACT_OUTPUT_RESERVE = 20_000;
/** The Haiku trigger, sourced to Anthropic's own cost page (`references.md`). */
export const HAIKU_TRIGGER = 90_000;
/** The engine's own floor below the effective window. */
const HEADROOM = 13_000;

/** A handoff trigger turned into its settings: `pct` is a percent of the effective window, `fires` and `haikuFires` are token counts where the engine then compacts, and `haikuWindow` is a window in tokens. */
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

/** The two derived tier values of a handoff trigger, and where each one fires. */
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

/** One threshold of the sweep, in tokens, with its compaction count and the dollars billed, wasted on lost work, and the two together. */
export interface Step {
	readonly threshold: number;
	readonly compactions: number;
	readonly billed: number;
	readonly wasted: number;
	readonly together: number;
}

/** Every threshold from `from` to `to` by `step`, billed and charged. */
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

/** The cheapest step, and the band within one percent of it. */
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
