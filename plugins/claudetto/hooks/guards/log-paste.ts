import type { On } from "claude-code";

import { fault } from "../shared/fault";

/** The origins a person types or pastes into: the terminal, Remote Control, and an SDK host's `-p`. */
const TYPED = new Set(["composer", "bridge", "sdk"]);

/**
 * The prompt size from which a paste counts as a log: 40 lines and 4,000
 * characters. A shorter paste costs less to carry than the note costs to read.
 */
export const MIN_LINES = 40;
export const MIN_CHARS = 4000;

/** The share of non-empty lines that look like log output for the prompt to count as one. */
export const LOG_SHARE = 0.6;

/** What the model reads beside a pasted log (GUARDS-087). */
export const NOTE =
	"The prompt holds a pasted raw log. It rides in every later request, so do not quote or repeat it. " +
	'Save it once to a file under `$TMPDIR` (`Bash`, `cat > "$TMPDIR/pasted.log"`), then grep that file for the errors and lines you need. ' +
	"For a command that prints a log, tee its output to a file under $TMPDIR and grep that.";

/** A line that starts like log output: a timestamp, a level, a logcat tag, a stack frame. */
const LOG_LINE =
	/^\s*(?:\[?\d{4}-\d\d-\d\d|\[?\d\d:\d\d:\d\d|\d\d-\d\d \d\d:\d\d|[VDIWEF]\/\S+|[[<(]?(?:TRACE|DEBUG|INFO|NOTICE|WARN(?:ING)?|ERROR|FATAL|SEVERE)\b|at \S+[ (]|#\d+ +\S)/u;

/**
 * Whether a prompt is a pasted log: at least `MIN_LINES` lines and `MIN_CHARS`
 * characters, with `LOG_SHARE` of its non-empty lines starting like log output.
 *
 * @param text The prompt as typed.
 * @returns True for a long paste of log lines.
 */
export const isPastedLog = (text: string): boolean => {
	if (text.length < MIN_CHARS) {
		return false;
	}
	const lines = text.split("\n").filter((line) => line.trim() !== "");
	return (
		lines.length >= MIN_LINES &&
		lines.filter((line) => LOG_LINE.test(line)).length / lines.length >=
			LOG_SHARE
	);
};

/** Matches every prompt text; a second `prompt.submit` hook needs a matcher beside the secret check. */
const ANY = /^/u;

/**
 * Adds context to a typed prompt that holds a long pasted log, telling the
 * model to save it under $TMPDIR and grep it (GUARDS-087). The prompt itself
 * is never held or rewritten: the person gave the model that text.
 */
export function registerPromptLog(on: On): void {
	on("prompt.submit", { text: ANY }, (_$, e, next) =>
		TYPED.has(e.origin.kind) && isPastedLog(e.text)
			? next({ ...e, context: [...(e.context ?? []), NOTE] })
			: next(e)
	).catch(($, e, next) => {
		fault($, "pasted log note", next.error);
		return next(e);
	});
}
