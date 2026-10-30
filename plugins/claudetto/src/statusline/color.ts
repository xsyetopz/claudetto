import {
	GRADIENT_AMBER_PERCENT,
	GRADIENT_GREEN_PERCENT,
	GRADIENT_RED_PERCENT,
} from "./limits.ts";

type Style = (text: string) => string;
type Rgb = readonly [number, number, number];

const GREEN: Rgb = [78, 186, 101];
const AMBER: Rgb = [255, 193, 7];
const RED: Rgb = [255, 107, 128];

/** Color is off when `NO_COLOR` is set and not empty. */
export const colorOff = (
	env: Readonly<Record<string, string | undefined>>,
): boolean => (env["NO_COLOR"] ?? "") !== "";

const mix = (from: Rgb, to: Rgb, at: number): Rgb => {
	const t = Math.min(1, Math.max(0, at));
	const channel = (i: 0 | 1 | 2) => Math.round(from[i] + (to[i] - from[i]) * t);
	return [channel(0), channel(1), channel(2)];
};

const gradient = (percent: number): Rgb =>
	percent <= GRADIENT_AMBER_PERCENT
		? mix(
				GREEN,
				AMBER,
				(percent - GRADIENT_GREEN_PERCENT) /
					(GRADIENT_AMBER_PERCENT - GRADIENT_GREEN_PERCENT),
			)
		: mix(
				AMBER,
				RED,
				(percent - GRADIENT_AMBER_PERCENT) /
					(GRADIENT_RED_PERCENT - GRADIENT_AMBER_PERCENT),
			);

/** The palette, or styles that add nothing when `color` is `false`. Each style closes itself, so a cut never leaks color. */
export const paintOf = (color: boolean) => {
	const style =
		(parameters: string): Style =>
		(text) =>
			color ? `\u001b[${parameters}m${text}\u001b[0m` : text;
	const rgb = (c: Rgb) => style(`38;2;${c.join(";")}`);
	const [ok, warn, limit] = [rgb(GREEN), rgb(AMBER), rgb(RED)];
	const inactive = style("38;2;153;153;153");
	const reviews: Readonly<Record<string, Style>> = {
		approved: ok,
		pending: warn,
		changes_requested: limit,
		draft: inactive,
	};
	return {
		bold: style("1"),
		dim: style("2"),
		ok,
		warn,
		limit,
		inactive,
		model: style("38;2;215;119;87"),
		branch: style("38;2;175;135;255"),
		level: (percent: number): Style => rgb(gradient(percent)),
		/** Amber at 1 and red at 0: the time to a run-out as a part of the time to the reset. */
		runout: (left: number): Style => rgb(mix(RED, AMBER, left)),
		review: (state: unknown): Style => reviews[String(state)] ?? warn,
	};
};

export type Paint = ReturnType<typeof paintOf>;
