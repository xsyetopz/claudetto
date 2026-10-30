// The check refuses a hand-assembled newline where a multiline template literal would read better.
// Each case plants source text and asserts the faults the check returns, which are the decision, and
// not the wording of the line that reports them. The planted text sits in a template literal so that
// this file never holds the shapes it plants.

import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type Fault,
	faultLine,
	faultsIn,
	hidesShape,
	literalFaults,
} from "../literals.ts";

/** The shapes of the faults in `source`, in line order. */
const shapes = (source: string): string[] =>
	faultsIn("a.ts", source).map((fault) => fault.shape);

/** The lines of the faults in `source`. */
const lines = (source: string): number[] =>
	faultsIn("a.ts", source).map((fault) => fault.line);

describe("join over an array literal", () => {
	test("written in place is a fault", () => {
		const source = `const t = ["one", "two", "three"].join("\\n");`;

		expect(shapes(source)).toEqual(["join"]);
	});

	test("spread over several lines is a fault at the line the array opens", () => {
		const source = `const t =\n\t[\n\t\t"one",\n\t\t\`two \${x}\`,\n\t].join("\\n");`;

		expect(faultsIn("a.ts", source)).toEqual([
			{ file: "a.ts", line: 2, shape: "join" },
		]);
	});

	test("after return is a fault", () => {
		const source = `const f = () => {\n\treturn ["one", "two"].join("\\n");\n};`;

		expect(shapes(source)).toEqual(["join"]);
	});

	test("inside the interpolation of a template is a fault", () => {
		const source = `const t = \`\${["one", "two"].join("\\n")}\\n\`;`;

		expect(shapes(source)).toEqual(["join"]);
	});

	test("holding a spread inside a nested array is still a fault", () => {
		const source = `const t = ["one", [...rest]].join("\\n");`;

		expect(shapes(source)).toEqual(["join"]);
	});

	test("holding a spread of its own is built and is no fault", () => {
		const source = `const t = ["one", ...rest, "two"].join("\\n");`;

		expect(shapes(source)).toEqual([]);
	});

	test("with a separator other than a newline is no fault", () => {
		const source = `const t = ["one", "two"].join(", ");`;

		expect(shapes(source)).toEqual([]);
	});
});

describe("join over a built value", () => {
	test("a mapped value is no fault", () => {
		const source = `const t = rows.map((row) => row.name).join("\\n");`;

		expect(shapes(source)).toEqual([]);
	});

	test("a filtered value is no fault", () => {
		const source = `const t = rows\n\t.filter((row) => row.ok)\n\t.join("\\n");`;

		expect(shapes(source)).toEqual([]);
	});

	test("a variable and a spread of a call are no fault", () => {
		const source = `const a = lines.join("\\n");\nconst b = [...rows.map(f), "end"].join("\\n");`;

		expect(shapes(source)).toEqual([]);
	});

	test("an element of an array reached by an index is no fault", () => {
		const source = `const t = groups[0].join("\\n");`;

		expect(shapes(source)).toEqual([]);
	});
});

describe("a double-quoted literal with escaped newlines", () => {
	test("holding several lines is a fault", () => {
		const source = `const t = "# Handoff\\n\\n## Goal\\n\\nShip it.\\n";`;

		expect(shapes(source)).toEqual(["message"]);
	});

	test("holding one newline between text is a fault", () => {
		const source = `const t = "first\\nsecond";`;

		expect(shapes(source)).toEqual(["message"]);
	});

	test("is reported at the line it opens on", () => {
		const source = `const a = 1;\nconst b = 2;\nconst t = "x\\ny";`;

		expect(lines(source)).toEqual([3]);
	});
});

describe("an escaped newline that is a separator", () => {
	test("as the argument of split and join is no fault", () => {
		const source = `const a = text.split("\\n");\nconst b = rows.map(f).join("\\n");`;

		expect(shapes(source)).toEqual([]);
	});

	test("as the whole literal is no fault", () => {
		const source = `const NEWLINE = "\\n";\nif (c === "\\n") {}`;

		expect(shapes(source)).toEqual([]);
	});
});

describe("the boundary between a message and a separator", () => {
	test("newlines only at the end are a terminator", () => {
		expect(hidesShape("export const a = 1;\\n")).toBe(false);
		expect(hidesShape("done\\n\\n")).toBe(false);
	});

	test("newlines only at the start are a needle", () => {
		expect(hidesShape("\\n---")).toBe(false);
		expect(hidesShape("\\n\\nrest")).toBe(false);
	});

	test("a newline at both ends around text is no message", () => {
		expect(hidesShape("\\nbody\\n")).toBe(false);
	});

	test("a newline with text on both sides is a message", () => {
		expect(hidesShape("a\\nb")).toBe(true);
		expect(hidesShape("\\nhead\\n\\ntail\\n")).toBe(true);
	});

	test("a start marker that ends in a newline is a needle", () => {
		expect(hidesShape("---\\n")).toBe(false);
	});

	test("an escaped backslash before an n is not a newline", () => {
		expect(hidesShape("a\\\\nb")).toBe(false);
	});
});

describe("what the lexer leaves unread", () => {
	test("a comment, a template text, and a regex are not read", () => {
		const source = `// ["a", "b"].join("\\n") and "x\\ny" in a comment
const t = \`"x\\ny" and ["a"].join("\\n")\`;
const r = /"x\\ny"/;`;

		expect(shapes(source)).toEqual([]);
	});

	test("a single-quoted literal is not a double-quoted message", () => {
		const source = `const t = 'a\\nb';`;

		expect(shapes(source)).toEqual([]);
	});

	test("code after a regex with a quote in it is still read", () => {
		const source = `const r = /"(?:a)"/;\nconst t = "x\\ny";`;

		expect(lines(source)).toEqual([2]);
	});
});

describe("the walk", () => {
	test("reads the checked roots, skips node_modules, and names path and line", async () => {
		const root = await mkdtemp(join(tmpdir(), "claudetto-literals-"));
		const plant = async (path: string, text: string): Promise<void> => {
			await mkdir(join(root, path, ".."), { recursive: true });
			await writeFile(join(root, path), text);
		};
		await plant("tools/a.ts", `const t = "x\\ny";\n`);
		await plant("plugins/p/src/b.ts", `const t = ["a", "b"].join("\\n");\n`);
		await plant("tools/node_modules/c/c.ts", `const t = "x\\ny";\n`);
		await plant("archive/d.ts", `const t = "x\\ny";\n`);

		const faults = await literalFaults(root);

		expect(faults.map(({ file, shape }) => [file, shape])).toEqual([
			["plugins/p/src/b.ts", "join"],
			["tools/a.ts", "message"],
		]);
	});

	test("gives each fault as file, line, and a reason", () => {
		const fault: Fault = { file: "tools/a.ts", line: 7, shape: "join" };

		expect(faultLine(fault)).toStartWith("tools/a.ts:7: ");
	});
});
