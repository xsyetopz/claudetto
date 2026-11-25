import {
	type Depth,
	isThemeKey,
	sgrOf,
	type ThemeKey,
	type ThemeName
} from "./theme";

/** An ANSI style: the text wrapped in its code and a reset, so a cut never leaks colour. */
export type Style = (text: string) => string;

const RESET = "\u001B[0m";
const BOLD = "1";

/** Color is off when `NO_COLOR` is set and not empty (no-color.org). */
export const colorOff = (
	env: Readonly<Record<string, string | undefined>>
): boolean => (env["NO_COLOR"] ?? "") !== "";

const styleOf =
	(on: boolean, code: string): Style =>
	(text) =>
		on ? `\u001B[${code}m${text}${RESET}` : text;

/** Success below 60 percent, warning below 85, error from 85: the key of a use reading. */
const levelKey = (percent: number): ThemeKey => {
	if (percent < 60) {
		return "success";
	}
	return percent < 85 ? "warning" : "error";
};

/** How a render draws: colour on or off, the Claude Code theme, and the terminal's colour depth. */
export interface Look {
	readonly on: boolean;
	readonly theme: ThemeName;
	readonly depth: Depth;
}

/** The styles the line paints with, each a Claude Code theme key; each adds nothing when colour is off. */
export const paintOf = ({ on, theme, depth }: Look) => {
	const key = (name: ThemeKey): string => sgrOf(theme, name, depth);
	return {
		ok: styleOf(on, key("success")),
		warn: styleOf(on, key("warning")),
		bad: styleOf(on, key("error")),
		/** The model name, in Claude's own orange. */
		model: styleOf(on, key("claude")),
		info: styleOf(on, key("permission")),
		branch: styleOf(on, key("planMode")),
		agent: styleOf(on, key("autoAccept")),
		fast: styleOf(on, key("fastMode")),
		dim: styleOf(on, key("inactive")),
		bold: styleOf(on, BOLD),
		alert: styleOf(on, `${BOLD};${key("warning")}`),
		/** The filled cells of a bar, as Claude Code's `/usage` draws them. */
		fill: styleOf(on, key("rate_limit_fill")),
		/** The empty cells of a bar, as Claude Code's `/usage` draws them. */
		empty: styleOf(on, key("rate_limit_empty")),
		/** Success below 60 percent, warning below 85, error from 85: the colour of a use reading. */
		level: (percent: number): Style => styleOf(on, key(levelKey(percent))),
		/** The colour /context gives a breakdown row, by its theme key; a key the line lacks draws dim. */
		tone: (name: string): Style =>
			styleOf(on, key(isThemeKey(name) ? name : "inactive"))
	};
};

/** The styles of one render. */
export type Paint = ReturnType<typeof paintOf>;
