import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { act, fixture, logOf, ON } from "./register.mock";

const KEYSTROKE = {
	tool: "Bash",
	command:
		'osascript -e \'tell application "System Events" to keystroke "hunter2"\'',
} as const;

const TERMINAL = {
	tool: "Bash",
	command:
		'osascript -e \'tell application "Terminal" to do script "sudo -v"\'',
} as const;

test(
	"a check on an osascript call holds the command",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await act($, f, "t1", KEYSTROKE);
		expect(logOf(f.body()).at(-1)).toContain("keystroke");
	},
);

test(
	"a check on a call that drives a terminal window holds the command",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await act($, f, "t1", TERMINAL);
		expect(logOf(f.body()).at(-1)).toContain("Terminal");
	},
);
