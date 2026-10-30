// A tree grader is a command: its exit status is the verdict, so no model reads anything. A command
// that could not run says nothing about the case, so that is kept apart from a fail.

import type { CommandResult } from "./command.ts";

/** How a grader decided a session: `error` means the session could not be graded, which is kept apart from a `fail`. */
export type Verdict = "pass" | "fail" | "error";

/** A verdict with a one-line reason, which is the last non-empty line of the grader's stdout, or of its stderr when the grader ended with a status other than 0 or 1. */
export interface Score {
	readonly verdict: Verdict;
	/** Why, in one line, for a fail or an error. */
	readonly detail: string;
}

/** The last non-empty line of `text`, which is where a grader says why. */
const lastLine = (text: string): string =>
	text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line !== "")
		.at(-1) ?? "";

/**
 * The verdict of a grader command: exit 0 passes, exit 1 fails, and anything else (a timeout, a
 * missing program, a crash, another status) is an error, which counts for neither arm.
 */
export const scoreTree = (result: CommandResult): Score => {
	if (result.timedOut) {
		return { verdict: "error", detail: "the grader timed out" };
	}
	if (result.code === 0) {
		return { verdict: "pass", detail: lastLine(result.stdout) };
	}
	if (result.code === 1) {
		return { verdict: "fail", detail: lastLine(result.stdout) };
	}
	const status =
		result.code === undefined ? "no status" : `status ${result.code}`;
	return {
		verdict: "error",
		detail: `the grader ended with ${status}: ${lastLine(result.stderr)}`,
	};
};
