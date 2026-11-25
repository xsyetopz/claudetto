/**
 * Claude Code's own colours, so the status line reads as part of the screen in
 * every built-in theme. Each value is copied from claude 2.1.329's theme
 * tables (the objects the theme switch `UX` returns: `w` dark, `x` light, `D`
 * dark-daltonized, `P` light-daltonized, `W` dark-ansi, `I` light-ansi), for the
 * keys the line paints with. An `ansi:` value is a terminal palette slot, so the
 * ANSI themes follow the terminal's own colours as Claude Code does.
 */

/** The theme keys the status line paints with, named as Claude Code names them. */
export type ThemeKey =
	| "claude"
	| "success"
	| "warning"
	| "error"
	| "inactive"
	| "permission"
	| "planMode"
	| "autoAccept"
	| "fastMode"
	| "rate_limit_fill"
	| "rate_limit_empty"
	| "promptBorder"
	| "cyan_FOR_SUBAGENTS_ONLY"
	| "green_FOR_SUBAGENTS_ONLY"
	| "purple_FOR_SUBAGENTS_ONLY";

/** The built-in theme names claude 2.1.329 accepts for `theme`, besides `auto`. */
export type ThemeName =
	| "dark"
	| "light"
	| "dark-daltonized"
	| "light-daltonized"
	| "dark-ansi"
	| "light-ansi";

type Palette = Readonly<Record<ThemeKey, string>>;

const DARK: Palette = {
	claude: "rgb(215,119,87)",
	success: "rgb(78,186,101)",
	warning: "rgb(255,193,7)",
	error: "rgb(255,107,128)",
	inactive: "rgb(153,153,153)",
	permission: "rgb(177,185,249)",
	planMode: "rgb(72,150,140)",
	autoAccept: "rgb(175,135,255)",
	fastMode: "rgb(255,120,20)",
	rate_limit_fill: "rgb(177,185,249)",
	rate_limit_empty: "rgb(80,83,112)",
	promptBorder: "rgb(136,136,136)",
	cyan_FOR_SUBAGENTS_ONLY: "rgb(8,145,178)",
	green_FOR_SUBAGENTS_ONLY: "rgb(22,163,74)",
	purple_FOR_SUBAGENTS_ONLY: "rgb(130,125,189)"
};

const LIGHT: Palette = {
	claude: "rgb(215,119,87)",
	success: "rgb(44,122,57)",
	warning: "rgb(150,108,30)",
	error: "rgb(171,43,63)",
	inactive: "rgb(102,102,102)",
	permission: "rgb(87,105,247)",
	planMode: "rgb(0,102,102)",
	autoAccept: "rgb(135,0,255)",
	fastMode: "rgb(255,106,0)",
	rate_limit_fill: "rgb(87,105,247)",
	rate_limit_empty: "rgb(213,218,253)",
	promptBorder: "rgb(138,138,138)",
	cyan_FOR_SUBAGENTS_ONLY: "rgb(8,145,178)",
	green_FOR_SUBAGENTS_ONLY: "rgb(22,163,74)",
	purple_FOR_SUBAGENTS_ONLY: "rgb(130,125,189)"
};

const DARK_DALTONIZED: Palette = {
	claude: "rgb(255,153,51)",
	success: "rgb(51,153,255)",
	warning: "rgb(255,204,0)",
	error: "rgb(255,102,102)",
	inactive: "rgb(153,153,153)",
	permission: "rgb(153,204,255)",
	planMode: "rgb(102,153,153)",
	autoAccept: "rgb(175,135,255)",
	fastMode: "rgb(255,120,20)",
	rate_limit_fill: "rgb(153,204,255)",
	rate_limit_empty: "rgb(69,92,115)",
	promptBorder: "rgb(136,136,136)",
	cyan_FOR_SUBAGENTS_ONLY: "rgb(102,204,204)",
	green_FOR_SUBAGENTS_ONLY: "rgb(102,255,102)",
	purple_FOR_SUBAGENTS_ONLY: "rgb(178,102,255)"
};

const LIGHT_DALTONIZED: Palette = {
	claude: "rgb(255,153,51)",
	success: "rgb(0,102,153)",
	warning: "rgb(255,153,0)",
	error: "rgb(204,0,0)",
	inactive: "rgb(102,102,102)",
	permission: "rgb(51,102,255)",
	planMode: "rgb(51,102,102)",
	autoAccept: "rgb(135,0,255)",
	fastMode: "rgb(255,106,0)",
	rate_limit_fill: "rgb(51,102,255)",
	rate_limit_empty: "rgb(204,217,255)",
	promptBorder: "rgb(138,138,138)",
	cyan_FOR_SUBAGENTS_ONLY: "rgb(0,178,178)",
	green_FOR_SUBAGENTS_ONLY: "rgb(0,204,0)",
	purple_FOR_SUBAGENTS_ONLY: "rgb(128,0,128)"
};

const DARK_ANSI: Palette = {
	claude: "ansi:redBright",
	success: "ansi:greenBright",
	warning: "ansi:yellowBright",
	error: "ansi:redBright",
	inactive: "ansi:white",
	permission: "ansi:blueBright",
	planMode: "ansi:cyanBright",
	autoAccept: "ansi:magentaBright",
	fastMode: "ansi:redBright",
	rate_limit_fill: "ansi:yellow",
	rate_limit_empty: "ansi:blackBright",
	promptBorder: "ansi:white",
	cyan_FOR_SUBAGENTS_ONLY: "ansi:cyanBright",
	green_FOR_SUBAGENTS_ONLY: "ansi:greenBright",
	purple_FOR_SUBAGENTS_ONLY: "ansi:magentaBright"
};

const LIGHT_ANSI: Palette = {
	claude: "ansi:redBright",
	success: "ansi:green",
	warning: "ansi:yellow",
	error: "ansi:red",
	inactive: "ansi:blackBright",
	permission: "ansi:blue",
	planMode: "ansi:cyan",
	autoAccept: "ansi:magenta",
	fastMode: "ansi:red",
	rate_limit_fill: "ansi:blue",
	rate_limit_empty: "ansi:white",
	promptBorder: "ansi:white",
	cyan_FOR_SUBAGENTS_ONLY: "ansi:cyan",
	green_FOR_SUBAGENTS_ONLY: "ansi:green",
	purple_FOR_SUBAGENTS_ONLY: "ansi:magenta"
};

const PALETTES: Readonly<Record<ThemeName, Palette>> = {
	dark: DARK,
	light: LIGHT,
	"dark-daltonized": DARK_DALTONIZED,
	"light-daltonized": LIGHT_DALTONIZED,
	"dark-ansi": DARK_ANSI,
	"light-ansi": LIGHT_ANSI
};

/** The ANSI theme of the same lightness, for a terminal that draws no 256 colours. */
const ANSI_OF: Readonly<Record<ThemeName, ThemeName>> = {
	dark: "dark-ansi",
	light: "light-ansi",
	"dark-daltonized": "dark-ansi",
	"light-daltonized": "light-ansi",
	"dark-ansi": "dark-ansi",
	"light-ansi": "light-ansi"
};

const isTheme = (name: string): name is ThemeName => name in PALETTES;

/** Whether `name` is a theme key the line has a colour for, as /context names its rows' colours. */
export const isThemeKey = (name: string): name is ThemeKey => name in DARK;

type Env = Readonly<Record<string, string | undefined>>;

/**
 * The theme for the `theme` value `name`. `auto` reads the terminal background
 * from `COLORFGBG` (background 7 or 15 is light); Claude Code asks the terminal
 * itself, which a status line command cannot. A custom or unknown name falls to
 * `dark`, as claude 2.1.329's theme switch does for a name it does not list.
 */
export const themeOf = (name: string | undefined, env: Env): ThemeName => {
	if (name === "auto") {
		const background = (env["COLORFGBG"] ?? "").split(";").at(-1);
		return background === "7" || background === "15" ? "light" : "dark";
	}
	return name !== undefined && isTheme(name) ? name : "dark";
};

/** Colour depth: 3 is 24-bit, 2 is 256 colours, 1 is the 16 basic colours. */
export type Depth = 1 | 2 | 3;

/** The terminal's colour depth by the variables supports-color reads, which chalk and so Claude Code use. */
export const depthOf = (env: Env): Depth => {
	const colorterm = env["COLORTERM"] ?? "";
	if (colorterm === "truecolor" || colorterm === "24bit") {
		return 3;
	}
	const term = env["TERM"] ?? "";
	return term.includes("256") || env["TERM_PROGRAM"] === "Apple_Terminal"
		? 2
		: 1;
};

/** The eight basic colours in SGR order: black is 30 (90 bright), white 37 (97). */
const ANSI_NAMES: readonly string[] = [
	"black",
	"red",
	"green",
	"yellow",
	"blue",
	"magenta",
	"cyan",
	"white"
];

/** The SGR foreground code of an `ansi:` slot: 30-37, and 90-97 for a `Bright` one. */
const ansiCode = (slot: string): string => {
	const bright = slot.endsWith("Bright");
	const base = bright ? slot.slice(0, -"Bright".length) : slot;
	const index = ANSI_NAMES.indexOf(base);
	return String((bright ? 90 : 30) + Math.max(0, index));
};

/** One channel's step in the 6x6x6 colour cube of the 256-colour palette. */
const cube = (n: number): number => Math.round((n / 255) * 5);

/** chalk's `rgbToAnsi256`, so a 256-colour terminal gets the shade Claude Code itself draws there. */
const ansi256 = (r: number, g: number, b: number): number => {
	if (r === g && g === b) {
		if (r < 8) {
			return 16;
		}
		return r > 248 ? 231 : Math.round(((r - 8) / 247) * 24) + 232;
	}
	return 16 + 36 * cube(r) + 6 * cube(g) + cube(b);
};

const RGB = /^rgb\((\d+),(\d+),(\d+)\)$/u;

/** The SGR code that draws theme key `key` of `theme` at colour depth `depth`. */
export const sgrOf = (
	theme: ThemeName,
	key: ThemeKey,
	depth: Depth
): string => {
	const value = PALETTES[depth === 1 ? ANSI_OF[theme] : theme][key];
	const rgb = RGB.exec(value);
	if (rgb === null) {
		return ansiCode(value.slice("ansi:".length));
	}
	const r = Number(rgb[1]);
	const g = Number(rgb[2]);
	const b = Number(rgb[3]);
	return depth === 3 ? `38;2;${r};${g};${b}` : `38;5;${ansi256(r, g, b)}`;
};
