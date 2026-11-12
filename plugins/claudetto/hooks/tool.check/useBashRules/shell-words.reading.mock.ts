import { expect, test } from "claude-code/testing";

import { parse, programOf } from "./shell-words";

/** Each row freezes what `parse` and `programOf` return for one command, read by hand against POSIX sh, so a change in how a quote, an operator, a redirect, a heredoc, or a wrapper is read shows as a failed row. */
export const checkReadings = (
	cases: readonly (readonly [string, string])[],
) => {
	for (const [command, expected] of cases) {
		test(`reads ${JSON.stringify(command)}`, () => {
			const parsed = parse(command);

			expect(
				JSON.stringify({
					...parsed,
					commands: parsed.commands.map(({ ends: _ends, ...c }) => c),
					programs: parsed.commands.map((c) => programOf(c)),
				}),
			).toBe(expected);
		});
	}
};
