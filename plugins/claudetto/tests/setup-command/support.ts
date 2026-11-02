// Helpers that the dialog tests of `/claudetto:setup` share.

import type { On } from "claude-code";
import type { Engine } from "claude-code/testing";
import { SETUP_COMMAND } from "../../src/blocks/setup-command/setup.ts";

export const questionOf = (input: object): string => {
	const first: unknown =
		"questions" in input && Array.isArray(input.questions)
			? input.questions[0]
			: undefined;
	if (typeof first === "object" && first !== null && "question" in first) {
		return String(first.question);
	}
	throw new Error("not a dialog");
};

export const run = async ($: Engine): Promise<string> =>
	(
		await $.command.run({
			command: SETUP_COMMAND,
			args: "",
			origin: { kind: "composer" },
			presentation: { isFullscreen: false, columns: 80 },
		})
	).text ?? "";

/** The result of a `process.run` that exited with `exitCode` after printing `stdout`. */
export const processResult = (stdout: string, exitCode: number) => ({
	value: {
		stdout,
		stderr: "",
		exitCode,
		isStdoutTruncated: false,
		isStderrTruncated: false,
	},
});

/** Backs `$.store` with `held`, so a test reads what a hook wrote. */
export const storeStub = (on: On, held: Map<string, unknown>): void => {
	on("store.get", (_$, e) => ({ value: held.get(e.key) }));
	on("store.set", (_$, e) => {
		held.set(e.key, e.value);
		return { value: undefined };
	});
};

/** Answers each `AskUserQuestion` with what `pick` returns for its text, and keeps the questions in `asked`. A throw dismisses it. */
export const answering = (
	on: On,
	asked: string[],
	pick: (question: string) => string,
): void => {
	on("tool.call", (_$, e, next) => {
		if (e.tool !== "AskUserQuestion") {
			return next(e);
		}
		const question = questionOf(e);
		asked.push(question);
		return { result: { answers: { [question]: pick(question) } } };
	});
};
