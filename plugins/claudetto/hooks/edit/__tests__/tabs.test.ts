import { describe, expect, test } from "claude-code/testing";

import { TAB_NOTE, readPrefixFix } from "./tabs";

const FILE = 'export function f() {\n\tif (a) {\n\t\tconst x = 1;\n\t\tconst y = 2;\n\t}\n}\n';

describe("edit tab fix", () => {
	test("drops the Read prefix tab from both strings when only the shortened text is in the file", () => {
		// Act
		const fix = readPrefixFix(FILE, "\t\t\tconst x = 1;\n\t\t\tconst y = 2;", "\t\t\tconst z = 3;\n\n\t\t\tconst y = 2;", false);

		// Assert
		expect(fix).toEqual({ old: "\t\tconst x = 1;\n\t\tconst y = 2;", new: "\t\tconst z = 3;\n\n\t\tconst y = 2;" });
	});

	test("leaves a string that is in the file, one with an untabbed line, and an ambiguous match alone", () => {
		// Act and Assert
		expect(readPrefixFix(FILE, "\t\tconst x = 1;", "\t\tconst x = 9;", false)).toBeUndefined();
		expect(readPrefixFix(FILE, "\t\t\tconst x = 1;\n}", "", false)).toBeUndefined();
		expect(readPrefixFix("\t\ta;\n\t\ta;\n", "\t\t\ta;", "\t\t\tb;", false)).toBeUndefined();
		expect(readPrefixFix("\t\ta;\n\t\ta;\n", "\t\t\ta;", "\t\t\tb;", true)).toEqual({ old: "\t\ta;", new: "\t\tb;" });
	});

	test("an Edit with the extra tab runs with it dropped and tells the model why", async ($, on) => {
		// Arrange
		on("fs.read", () => ({ value: FILE }));
		on("tool.check", () => ({ decision: "allow" }) as never);
		const ran: { old: string; new: string }[] = [];
		on("tool.call", { tool: "Edit" }, (_$, e) => {
			if (e.tool === "Edit") ran.push({ old: e.old_string, new: e.new_string });
			return { result: "ok" } as never;
		});

		// Act
		const r = await $.tool.call({ tool: "Edit", file_path: "/p/f.ts", old_string: "\t\t\tconst x = 1;", new_string: "\t\t\tconst x = 2;" });

		// Assert
		expect(ran).toEqual([{ old: "\t\tconst x = 1;", new: "\t\tconst x = 2;" }]);
		expect((r as { context?: readonly string[] }).context).toEqual([TAB_NOTE]);
	});

	test("an Edit whose string is in the file runs as written with no note", async ($, on) => {
		// Arrange
		on("fs.read", () => ({ value: FILE }));
		on("tool.check", () => ({ decision: "allow" }) as never);
		const ran: string[] = [];
		on("tool.call", { tool: "Edit" }, (_$, e) => {
			if (e.tool === "Edit") ran.push(e.old_string);
			return { result: "ok" } as never;
		});

		// Act
		const r = await $.tool.call({ tool: "Edit", file_path: "/p/f.ts", old_string: "\t\tconst x = 1;", new_string: "\t\tconst x = 2;" });

		// Assert
		expect(ran).toEqual(["\t\tconst x = 1;"]);
		expect((r as { context?: readonly string[] }).context ?? []).toEqual([]);
	});
});
