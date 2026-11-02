// Helpers that the dialog tests of `/claudetto:setup` share.

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
