import { describe, expect, test } from "claude-code/testing";

import { TOOL_FULL_NAME } from "../texts";
import { pageRange, registerRead } from "../tool";
import { CWD, wire } from "./harness";

describe("read PDFs", () => {
	test("labels each extracted page", async ($, on) => {
		// Arrange
		wire(
			on,
			{ "/repo/d.pdf": "" },
			{
				exitCode: 0,
				stdout: JSON.stringify({ total: 9, pages: ["alpha", "beta "] }),
				stderr: ""
			}
		);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: "/repo/d.pdf",
			pages: "2-3"
		});

		// Assert
		expect(r.result).toBe(
			"--- page 2 of 9 ---\nalpha\n\n--- page 3 of 9 ---\nbeta"
		);
	});

	test("denies a failed extraction with its stderr", async ($, on) => {
		// Arrange
		wire(on, {}, { exitCode: 1, stdout: "", stderr: "boom" });
		registerRead(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: "/repo/d.pdf"
		});

		// Assert
		expect(r.text).toBe(
			"read failed for /repo/d.pdf: PDF text extraction failed: boom"
		);
	});

	test("parses page ranges and refuses more than 20 pages", () => {
		// Arrange
		const inputs = [undefined, "3", "1-5", "1-21", "x", "5-2"];

		// Act
		const ranges = inputs.map((p) => pageRange(p));

		// Assert
		expect(ranges).toEqual([
			{ from: 1, to: 20 },
			{ from: 3, to: 3 },
			{ from: 1, to: 5 },
			{ error: "pages spans over 20 pages" },
			{ error: 'pages "x" is not like 3 or 1-5' },
			{ error: 'pages "5-2" is not like 3 or 1-5' }
		]);
	});
});

describe("read permission check", () => {
	test("a deny rule on Read for a path denies it through read", async ($, on) => {
		// Arrange
		on("session.cwd", () => ({ value: CWD }));
		registerRead(on);
		on("tool.check", { tool: TOOL_FULL_NAME }, () => ({ decision: "allow" }));
		on("tool.check", { tool: "Read" }, () => ({
			decision: "deny",
			reason: "Read(**/.env) is denied"
		}));

		// Act
		const v = await $.tool.check({
			tool: TOOL_FULL_NAME,
			input: { file_path: "/repo/.env" }
		});

		// Assert
		expect(v.decision).toBe("deny");
		expect(v.reason).toContain("Read(**/.env)");
	});

	test("a path Read allows is allowed through read", async ($, on) => {
		// Arrange
		on("session.cwd", () => ({ value: CWD }));
		registerRead(on);
		on("tool.check", { tool: TOOL_FULL_NAME }, () => ({ decision: "ask" }));
		on("tool.check", { tool: "Read" }, () => ({ decision: "allow" }));

		// Act
		const v = await $.tool.check({
			tool: TOOL_FULL_NAME,
			input: { file_path: "/repo/a.txt" }
		});

		// Assert
		expect(v.decision).toBe("allow");
	});
});
