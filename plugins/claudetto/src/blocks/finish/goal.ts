/** The most characters of a text that `/goal` sends the model: the goal text or a block reason. */
export const GOAL_TEXT_MAX = 4000;

/** The most characters of a goal command, so a block reason with the output tail stays within `GOAL_TEXT_MAX`. */
export const GOAL_CHARS_MAX = 2000;

/** The most characters of the output of a failing check that a block reason quotes. The tail has the error. */
export const OUTPUT_TAIL_CHARS = 1500;

/** The most time a goal check may take, in milliseconds. */
export const CHECK_TIMEOUT_MS = 300_000;

// The built-in `/goal` clears on these words, so a person used to it clears ours the same way.
const CLEAR_WORDS = new Set([
	"clear",
	"stop",
	"off",
	"reset",
	"none",
	"cancel",
]);
const SLASH_COMMAND = /^\/[\w.-]+(:[\w.-]+)?(\s|$)/;
const BACKTICKED = /^`([^`]+)`$/;

/** What the text after `/goal` asks for. */
export type GoalArgs =
	| { readonly kind: "status" }
	| { readonly kind: "clear" }
	| { readonly kind: "set"; readonly check: string }
	| { readonly kind: "slash"; readonly check: string }
	| { readonly kind: "long"; readonly length: number };

/** Reads the text after `/goal`. A slash command is refused, since `sh -c` cannot run it; a path such as `/usr/bin/true` has a second `/`. */
export const goalArgs = (args: string): GoalArgs => {
	const text = args.trim();
	if (text === "") {
		return { kind: "status" };
	}
	if (CLEAR_WORDS.has(text.toLowerCase())) {
		return { kind: "clear" };
	}
	const check = text.replace(BACKTICKED, "$1");
	if (check.length > GOAL_CHARS_MAX) {
		return { kind: "long", length: check.length };
	}
	return SLASH_COMMAND.test(check)
		? { kind: "slash", check }
		: { kind: "set", check };
};

const MINUTE_MS = 60_000;
const UNITS = [
	{ ms: 86_400_000, unit: "d" },
	{ ms: 3_600_000, unit: "h" },
	{ ms: MINUTE_MS, unit: "m" },
] as const;

/** The prompt hint mark of an active goal, as the built-in draws it: its age in its largest whole unit, from one minute. */
export const activeMark = (ageMs: number): string => {
	const largest = UNITS.find(({ ms }) => ageMs >= ms);
	return largest === undefined
		? "◎ /goal active"
		: `◎ /goal active (${Math.floor(ageMs / largest.ms)}${largest.unit})`;
};

/** The last `OUTPUT_TAIL_CHARS` characters of a check's output. */
export const outputTail = (stdout: string, stderr: string): string =>
	`${stdout}${stderr}`.trim().slice(-OUTPUT_TAIL_CHARS);
