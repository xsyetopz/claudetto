// A command that could not run says nothing about the case, so it is kept apart from a fail.

import type { CommandResult } from "./command.ts";

export type Verdict = "pass" | "fail" | "error";

export interface Score {
	readonly verdict: Verdict;
	readonly detail: string;
}

const lastLine = (text: string): string =>
	text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line !== "")
		.at(-1) ?? "";

/** Exit 0 passes, 1 fails; anything else is an error, which counts for neither arm. */
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
