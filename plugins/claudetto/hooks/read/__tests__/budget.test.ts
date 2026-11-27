import { describe, expect, test } from "claude-code/testing";

import { TOOL_FULL_NAME } from "../texts";
import { registerRead } from "../tool";
import { wire } from "./harness";

/** 2000 lines of 100 characters: about 53,000 tokens by the engine's 4-characters estimate. */
const BIG = Array.from({ length: 2000 }, (_, i) =>
	`${i + 1}`.padEnd(100, "x")
).join("\n");

describe("TOOLS-034 read size budget", () => {
	test("a file over the built-in Read's 25,000-token budget comes back cut at a whole line with where to continue", async ($, on) => {
		// Arrange
		wire(on, { "/repo/big.txt": BIG });
		registerRead(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: "/repo/big.txt"
		});

		// Assert
		const text = String(r.result);
		expect(text.length).toBeLessThanOrEqual(25_000 * 4 + 100);
		expect(text).toMatch(/continue with `offset` \d+\)$/u);
	});

	test("the budget follows CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS", async ($, on) => {
		// Arrange
		wire(on, { "/repo/big.txt": BIG }, undefined, {
			CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: "100"
		});
		registerRead(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: "/repo/big.txt"
		});

		// Assert: 100 tokens hold three 107-character rows within 400 characters.
		expect(String(r.result)).toMatch(
			/^ {5}1\t[^\n]*\n {5}2\t[^\n]*\n {5}3\t[^\n]*\n\(1997 more lines; continue with `offset` 4\)$/u
		);
	});
});
