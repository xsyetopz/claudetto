import { describe, expect, test } from "claude-code/testing";

import { TOOL_DESCRIPTION, TOOL_FULL_NAME } from "../texts";
import { READ_TOOL, registerRead } from "../tool";
import { wire } from "./harness";

const lines = (n: number): string =>
	Array.from({ length: n }, (_, i) => `l${i + 1}`).join("\n");

describe("read tool registration", () => {
	test("its whole entry stays under 450 characters of JSON", () => {
		// Arrange
		const entry = JSON.stringify({
			name: READ_TOOL.name,
			description: READ_TOOL.description,
			inputSchema: READ_TOOL.inputSchema
		});

		// Act
		const size = entry.length;

		// Assert
		expect(size).toBeLessThan(450);
		expect(TOOL_DESCRIPTION.length).toBeLessThan(200);
	});
});

describe("read text", () => {
	test("numbers lines like cat -n", async ($, on) => {
		// Arrange
		wire(on, { "/repo/a.txt": "one\ntwo\n" });
		registerRead(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: "/repo/a.txt"
		});

		// Assert
		expect(r.result).toBe("     1\tone\n     2\ttwo");
	});

	test("honours offset and limit and names where to continue", async ($, on) => {
		// Arrange
		wire(on, { "/repo/a.txt": lines(10) });
		registerRead(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: "/repo/a.txt",
			offset: 3,
			limit: 2
		});

		// Assert
		expect(r.result).toBe(
			"     3\tl3\n     4\tl4\n(6 more lines; continue with offset 5)"
		);
	});

	test("denies a missing file with its path", async ($, on) => {
		// Arrange
		wire(on, {});
		registerRead(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: "/repo/none.txt"
		});

		// Assert
		expect(r.text).toContain("read failed for /repo/none.txt: ");
	});

	test("reports an empty file and an offset past the end", async ($, on) => {
		// Arrange
		wire(on, { "/repo/e.txt": "", "/repo/s.txt": "x\n" });
		registerRead(on);

		// Act
		const empty = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: "/repo/e.txt"
		});
		const past = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: "/repo/s.txt",
			offset: 9
		});

		// Assert
		expect(empty.result).toBe("(the file is empty)");
		expect(past.result).toBe(
			"(offset 9 is past the end: the file has 1 lines)"
		);
	});
});

describe("read default window", () => {
	test("shows 2000 lines and points at line 2001", async ($, on) => {
		// Arrange
		wire(on, { "/repo/big.txt": lines(2500) });
		registerRead(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: "/repo/big.txt"
		});

		// Assert
		expect("result" in r && String(r.result)).toContain(
			"(500 more lines; continue with offset 2001)"
		);
		expect("result" in r && String(r.result)).toContain("  2000\tl2000");
	});
});

describe("read images", () => {
	test("returns an image block with base64 and mime", async ($, on) => {
		// Arrange
		wire(on, { "/repo/p.PNG": "PNGDATA" });
		registerRead(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: "/repo/p.PNG"
		});

		// Assert
		expect(r.result).toEqual([
			{
				type: "image",
				source: {
					type: "base64",
					media_type: "image/png",
					data: btoa("PNGDATA")
				}
			}
		]);
	});
});

describe("read notebooks", () => {
	test("renders cells with stream, result and error outputs", async ($, on) => {
		// Arrange
		const nb = {
			cells: [
				{ cell_type: "markdown", source: ["# Title\n", "text"] },
				{
					cell_type: "code",
					source: "print(1)",
					outputs: [
						{ output_type: "stream", text: ["1\n"] },
						{
							output_type: "display_data",
							data: { "text/plain": "<Fig>", "image/png": "abc" }
						},
						{ output_type: "error", ename: "ValueError", evalue: "bad" }
					]
				}
			]
		};
		wire(on, { "/repo/n.ipynb": JSON.stringify(nb) });
		registerRead(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: "/repo/n.ipynb"
		});

		// Assert
		expect(r.result).toBe(
			[
				"# Cell 0 [markdown]\n# Title\ntext",
				"# Cell 1 [code]\nprint(1)\n## Output\n1\n<Fig>\n[image output omitted]\nValueError: bad"
			].join("\n\n")
		);
	});

	test("falls back to numbered lines when the JSON is no notebook", async ($, on) => {
		// Arrange
		wire(on, { "/repo/n.ipynb": "not json" });
		registerRead(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: "/repo/n.ipynb"
		});

		// Assert
		expect(r.result).toBe("     1\tnot json");
	});
});
