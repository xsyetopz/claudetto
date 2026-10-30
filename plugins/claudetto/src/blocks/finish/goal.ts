/** The most characters of a text that `/goal` sends the model: the goal text or a block reason. */
export const GOAL_TEXT_MAX = 4000;

/** The most characters of a goal command, so a block reason with the output tail stays within `GOAL_TEXT_MAX`. */
export const GOAL_CHARS_MAX = 2000;

/** The most characters of the output of a failing check that a block reason quotes. The tail has the error. */
export const OUTPUT_TAIL_CHARS = 1500;

/** The most characters of the reason the root agent gives for stopping a goal. */
export const REASON_CHARS_MAX = 500;

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
const RESUME_WORD = "resume";
const SLASH_COMMAND = /^\/[\w.-]+(:[\w.-]+)?(\s|$)/;
const BACKTICKED = /^`([^`]+)`$/;

/** What the text after `/goal` asks for. */
export type GoalArgs =
	| { readonly kind: "status" }
	| { readonly kind: "clear" }
	| { readonly kind: "resume" }
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
	if (text.toLowerCase() === RESUME_WORD) {
		return { kind: "resume" };
	}
	const check = text.replace(BACKTICKED, "$1");
	if (check.length > GOAL_CHARS_MAX) {
		return { kind: "long", length: check.length };
	}
	return SLASH_COMMAND.test(check)
		? { kind: "slash", check }
		: { kind: "set", check };
};

/** Whether a goal drives the stops: `active` does, and the root agent sets `paused` or `blocked` to stop it. */
export type GoalStatus = "active" | "paused" | "blocked";

/** A stop of the goal that the root agent asked for through the goal tool. */
export interface GoalUpdate {
	readonly status: "paused" | "blocked";
	readonly reason: string;
}

/** Reads the goal tool's input, which is whatever the model sent: a stop status and a reason that is not blank. */
export const goalUpdate = (input: unknown): GoalUpdate | undefined => {
	if (typeof input !== "object" || input === null) {
		return undefined;
	}
	const status = "status" in input ? input.status : undefined;
	const reason =
		"reason" in input && typeof input.reason === "string"
			? input.reason.trim()
			: "";
	if ((status !== "paused" && status !== "blocked") || reason === "") {
		return undefined;
	}
	return { status, reason: reason.slice(0, REASON_CHARS_MAX) };
};

const MINUTE_MS = 60_000;
const UNITS = [
	{ ms: 86_400_000, unit: "d" },
	{ ms: 3_600_000, unit: "h" },
	{ ms: MINUTE_MS, unit: "m" },
] as const;

/** The prompt hint mark of a goal, as the built-in draws it: an active goal's age in its largest whole unit, from one minute, or a stopped goal's status. */
export const activeMark = (ageMs: number, status: GoalStatus): string => {
	if (status !== "active") {
		return `◎ /goal ${status}`;
	}
	const largest = UNITS.find(({ ms }) => ageMs >= ms);
	return largest === undefined
		? "◎ /goal active"
		: `◎ /goal active (${Math.floor(ageMs / largest.ms)}${largest.unit})`;
};

/** The last `OUTPUT_TAIL_CHARS` characters of a check's output. */
export const outputTail = (stdout: string, stderr: string): string =>
	`${stdout}${stderr}`.trim().slice(-OUTPUT_TAIL_CHARS);
