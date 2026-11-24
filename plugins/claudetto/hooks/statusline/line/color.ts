/** An ANSI style: the text wrapped in its code and a reset, so a cut never leaks colour. */
export type Style = (text: string) => string;

const RESET = "\u001B[0m";

/** The colours of ProjectArchitect's status line: basic 16-colour codes, so the terminal theme picks the shade. */
const CODE = {
	green: "0;32",
	yellow: "0;33",
	red: "0;31",
	magenta: "0;35",
	cyan: "0;36",
	dim: "0;90",
	boldYellow: "1;33",
	boldRed: "1;31",
	bold: "1"
} as const;

/** Color is off when `NO_COLOR` is set and not empty (no-color.org). */
export const colorOff = (
	env: Readonly<Record<string, string | undefined>>
): boolean => (env["NO_COLOR"] ?? "") !== "";

/** The code of a use reading: green below 60 percent, yellow below 85, red from 85. */
const levelCode = (percent: number): string => {
	if (percent < 60) {
		return CODE.green;
	}
	return percent < 85 ? CODE.yellow : CODE.red;
};

const styleOf =
	(on: boolean, code: string): Style =>
	(text) =>
		on ? `\u001B[${code}m${text}${RESET}` : text;

/** The styles the line paints with; each adds nothing when `on` is false. */
export const paintOf = (on: boolean) => ({
	ok: styleOf(on, CODE.green),
	warn: styleOf(on, CODE.yellow),
	bad: styleOf(on, CODE.red),
	model: styleOf(on, CODE.magenta),
	info: styleOf(on, CODE.cyan),
	dim: styleOf(on, CODE.dim),
	bold: styleOf(on, CODE.bold),
	alert: styleOf(on, CODE.boldYellow),
	alarm: styleOf(on, CODE.boldRed),
	/** Green below 60 percent, yellow below 85, red from 85: the colour of a use reading. */
	level: (percent: number): Style => styleOf(on, levelCode(percent))
});

/** The styles of one render. */
export type Paint = ReturnType<typeof paintOf>;
