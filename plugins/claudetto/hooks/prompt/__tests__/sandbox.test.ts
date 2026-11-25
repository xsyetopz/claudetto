import { describe, expect, test, type TestBody } from "claude-code/testing";

import { SANDBOX_2_1_329 as FIXTURE } from "./fixtures/sandbox";

type Dollar = Parameters<TestBody>[0];
type Mocks = Parameters<TestBody>[1];

const HOME = "/Users/dev";
const CWD = "/Users/dev/work/app";

/** The text of a `sandbox_instructions` attachment after the plugin's hook. */
const sandboxText = async (
	$: Dollar,
	on: Mocks,
	text: string
): Promise<string> => {
	on("env.get", () => ({ value: HOME }));
	on("session.cwd", () => ({ value: CWD }));
	on("prompt.attachment", (_$, e) => ({ text: e.text }));
	const out = await $.prompt.attachment({
		type: "sandbox_instructions",
		text,
		origin: { kind: "engine" }
	});
	return out.text ?? "";
};

describe("sandbox instructions", () => {
	test("the engine's sandbox attachment goes out shorter and keeps its heading", async ($, on) => {
		// Act
		const short = await sandboxText($, on, FIXTURE);

		// Assert
		expect(short.length).toBeLessThan(FIXTURE.length);
		expect(short.startsWith("## Bash command sandbox\n")).toBe(true);
	});

	test("a rule the plugin has no short text for goes out unchanged", async ($, on) => {
		// Arrange
		const text =
			"## Bash command sandbox\n - A rule from a later build.\n  - Its detail.\n";

		// Act
		const short = await sandboxText($, on, text);

		// Assert
		expect(short).toBe(text);
	});

	test("a filesystem config line gives paths relative to home and the working directory", async ($, on) => {
		// Arrange
		const text = `## Bash command sandbox\nFilesystem: {"read":{"denyOnly":["${HOME}/.netrc"]},"write":{"allowOnly":[".","${CWD}/out"]}}\n`;

		// Act
		const short = await sandboxText($, on, text);

		// Assert
		expect(short).toContain("~/.netrc");
		expect(short).toContain("./out");
		expect(short).not.toContain(HOME);
	});

	test("a config line that is not JSON goes out unchanged", async ($, on) => {
		// Arrange
		const text = "## Bash command sandbox\nFilesystem: {not json\n";

		// Act
		const short = await sandboxText($, on, text);

		// Assert
		expect(short).toBe(text);
	});
});

describe("sandbox hook", () => {
	test("another attachment kind goes out as it came", async ($, on) => {
		// Arrange
		on("env.get", () => ({ value: HOME }));
		on("session.cwd", () => ({ value: CWD }));
		on("prompt.attachment", (_$, e) => ({ text: e.text }));

		// Act
		const other = await $.prompt.attachment({
			type: "date",
			text: "Today is a day.",
			origin: { kind: "engine" }
		});

		// Assert
		expect(other.text).toBe("Today is a day.");
	});
});
