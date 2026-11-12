import {
	GRADIENT_AMBER_PERCENT,
	GRADIENT_GREEN_PERCENT,
	GRADIENT_RED_PERCENT,
} from "./limits";

type Style = (text: string) => string;
type Rgb = readonly [number, number, number];
/** A direct colour, or the SGR code that chalk paints an engine `ansi:` name with. */
type Color = Rgb | number;

interface Palette {
	success: Color;
	warning: Color;
	error: Color;
	inactive: Color;
	claude: Color;
	merged: Color;
}

const DARK: Palette = {
	success: [78, 186, 101],
	warning: [255, 193, 7],
	error: [255, 107, 128],
	inactive: [153, 153, 153],
	claude: [215, 119, 87],
	merged: [175, 135, 255],
};

/**
 * The roles the line paints, copied from the engine's built-in theme tables (`chunk-w5ysqthb.js`, 2.1.319);
 * `palette-drift.test.ts` checks them against the installed engine.
 */
export const PALETTES: Readonly<Record<string, Palette>> = {
	light: {
		success: [44, 122, 57],
		warning: [150, 108, 30],
		error: [171, 43, 63],
		inactive: [102, 102, 102],
		claude: [215, 119, 87],
		merged: [135, 0, 255],
	},
	"light-ansi": {
		success: 32,
		warning: 33,
		error: 31,
		inactive: 90,
		claude: 91,
		merged: 35,
	},
	"dark-ansi": {
		success: 92,
		warning: 93,
		error: 91,
		inactive: 37,
		claude: 91,
		merged: 95,
	},
	"light-daltonized": {
		success: [0, 102, 153],
		warning: [255, 153, 0],
		error: [204, 0, 0],
		inactive: [102, 102, 102],
		claude: [255, 153, 51],
		merged: [135, 0, 255],
	},
	"dark-daltonized": {
		success: [51, 153, 255],
		warning: [255, 204, 0],
		error: [255, 102, 102],
		inactive: [153, 153, 153],
		claude: [255, 153, 51],
		merged: [175, 135, 255],
	},
	dark: DARK,
};

/** The engine's default branch takes any name with no table of its own. */
const paletteOf = (theme: string): Palette =>
	(Object.hasOwn(PALETTES, theme) ? PALETTES[theme] : undefined) ?? DARK;

/** Color is off when `NO_COLOR` is set and not empty (no-color.org). */
export const colorOff = (
	env: Readonly<Record<string, string | undefined>>,
): boolean => (env["NO_COLOR"] ?? "") !== "";

/** An SGR code cannot be blended, so a mix of two steps to the nearer end. */
const mix = (from: Color, to: Color, at: number): Color => {
	const t = Math.min(1, Math.max(0, at));
	if (typeof from === "number" || typeof to === "number") {
		return t < 0.5 ? from : to;
	}
	const channel = (i: 0 | 1 | 2) => Math.round(from[i] + (to[i] - from[i]) * t);
	return [channel(0), channel(1), channel(2)];
};

const gradient = (p: Palette, percent: number): Color =>
	percent <= GRADIENT_AMBER_PERCENT
		? mix(
				p.success,
				p.warning,
				(percent - GRADIENT_GREEN_PERCENT) /
					(GRADIENT_AMBER_PERCENT - GRADIENT_GREEN_PERCENT),
			)
		: mix(
				p.warning,
				p.error,
				(percent - GRADIENT_AMBER_PERCENT) /
					(GRADIENT_RED_PERCENT - GRADIENT_AMBER_PERCENT),
			);

/**
 * The palette of the Claude Code theme named `theme`, picked as the engine's `RK` picks it, or styles that add
 * nothing when `theme` is `undefined`. Each style closes itself, so a cut never leaks colour.
 */
export const paintOf = (theme: string | undefined) => {
	const p = paletteOf(theme ?? "dark");
	const style =
		(parameters: string): Style =>
		(text) =>
			theme === undefined ? text : `\u001B[${parameters}m${text}\u001B[0m`;
	const paint = (c: Color) =>
		style(typeof c === "number" ? String(c) : `38;2;${c.join(";")}`);
	const [ok, warn, limit, inactive] = [
		paint(p.success),
		paint(p.warning),
		paint(p.error),
		paint(p.inactive),
	];
	// A choice: the color of each `pr.review_state`.
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
		model: paint(p.claude),
		branch: paint(p.merged),
		level: (percent: number): Style => paint(gradient(p, percent)),
		/** Warning at 1 and error at 0: the time to a run-out as a part of the time to the reset. */
		runout: (left: number): Style => paint(mix(p.error, p.warning, left)),
		review: (state: unknown): Style => reviews[String(state)] ?? warn,
	};
};

export type Paint = ReturnType<typeof paintOf>;
