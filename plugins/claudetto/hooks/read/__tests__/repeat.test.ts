import { describe, expect, test } from "claude-code/testing";

import { TOOL_FULL_NAME } from "../texts";
import { registerRead } from "../tool";
import { wire } from "./harness";

const TEXT = "     1\talpha\n     2\tbeta";
const READ = { tool: TOOL_FULL_NAME, file_path: "/repo/a.txt" } as const;

describe("TOOLS-033 repeat reads", () => {
	test("a repeat of an unchanged read gets a short note once, and the next repeat the text again", async ($, on) => {
		// Arrange
		wire(on, { "/repo/a.txt": "alpha\nbeta\n" });
		registerRead(on);

		// Act
		const first = await $.tool.call(READ);
		const second = await $.tool.call(READ);
		const third = await $.tool.call(READ);

		// Assert
		expect(first.result).toBe(TEXT);
		expect(second.result).not.toContain("alpha");
		expect(third.result).toBe(TEXT);
	});

	test("a read after the file changed gets the new text", async ($, on) => {
		// Arrange
		const files = { "/repo/a.txt": "alpha\nbeta\n" };
		wire(on, files);
		registerRead(on);
		await $.tool.call(READ);
		files["/repo/a.txt"] = "alpha\ngamma\n";

		// Act
		const r = await $.tool.call(READ);

		// Assert
		expect(r.result).toBe("     1\talpha\n     2\tgamma");
	});

	test("a read after a compaction gets the text, since the earlier result is gone", async ($, on) => {
		// Arrange
		wire(on, { "/repo/a.txt": "alpha\nbeta\n" });
		registerRead(on);
		on("session.compact", (_$, e) => ({ messages: e.messages }));
		await $.tool.call(READ);
		await $.session.compact({
			trigger: "manual",
			messages: [{ role: "user", text: "earlier", toolUses: [] }]
		});

		// Act
		const r = await $.tool.call(READ);

		// Assert
		expect(r.result).toBe(TEXT);
	});

	test("another range of the same file gets its text", async ($, on) => {
		// Arrange
		wire(on, { "/repo/a.txt": "alpha\nbeta\n" });
		registerRead(on);
		await $.tool.call(READ);

		// Act
		const r = await $.tool.call({ ...READ, offset: 2 });

		// Assert
		expect(r.result).toContain("beta");
	});
});
