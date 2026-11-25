import type { Paint } from "./color";
import type { Rec } from "./input";
import type { Resources } from "./resources";
import type { LiveState } from "./state";

/** What a segment reads: the stdin JSON, the hook-written state, the machine's figures, and how to draw. */
export interface Ctx {
	readonly input: Rec;
	readonly state: LiveState | undefined;
	readonly branch: string | undefined;
	readonly resources: Resources | undefined;
	readonly paint: Paint;
	/** Epoch milliseconds. */
	readonly now: number;
	/** Countdowns instead of clock times, for a row that does not fit. */
	readonly compact: boolean;
}

/** One piece of a row, or nothing when its figure is absent. */
export type Text = string | undefined;

/** The pieces that have a figure, joined by a space. */
export const words = (
	...items: readonly (string | false | undefined)[]
): string => items.filter(Boolean).join(" ");
