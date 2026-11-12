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
	"a check on an osascript call holds the command and a rule that a secret in a command is not a message in the chat",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await act($, f, "t1", KEYSTROKE);
		expect(logOf(f.body()).at(-1)).toContain("keystroke");
		const instructions = f.asked[0]?.promptBlocks?.[0]?.text;
		expect(instructions).toContain("Say only what the digest shows");
		expect(instructions).toContain("not typed into the chat");
	},
);

test(
	"a check on a call that drives a terminal window holds the same rule",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await act($, f, "t1", TERMINAL);
		expect(logOf(f.body()).at(-1)).toContain("Terminal");
		expect(f.asked[0]?.promptBlocks?.[0]?.text).toContain(
			"not typed into the chat",
		);
	},
);

test(
	"the instructions ask for the line in the language of the person's messages",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await act($, f, "t1");
		expect(f.asked[0]?.promptBlocks?.[0]?.text).toContain(
			"in the language of the person's messages",
		);
	},
);
