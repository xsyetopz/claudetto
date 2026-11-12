import { describe, expect, test } from "claude-code/testing";

import { applyBlock, BLOCK_END, BLOCK_START, diffOf } from "./ignore-block";

const block = (...lines: string[]): string =>
	`${[BLOCK_START, ...lines, BLOCK_END].join("\n")}\n`;

describe("`applyBlock`", () => {
	test("a CRLF file keeps one block on a rerun, in CRLF", () => {
		const first = applyBlock("x\r\n", ["a"]);
		const second = applyBlock(first, ["a", "b"]);

		expect(first).toBe(`x\r\n\r\n${block("a").replaceAll("\n", "\r\n")}`);
		expect(second).toBe(`x\r\n\r\n${block("a", "b").replaceAll("\n", "\r\n")}`);
	});

	test("a missing file becomes the block alone", () => {
		expect(applyBlock(undefined, ["a", "b"])).toBe(block("a", "b"));
	});

	test("a file with user lines gets the block after one blank line", () => {
		expect(
			applyBlock(
				`x
y
`,
				["a"],
			),
		).toBe(`x\ny\n\n${block("a")}`);
	});

	test("a file that lacks a final newline still gets one blank line", () => {
		expect(applyBlock("x", ["a"])).toBe(`x\n\n${block("a")}`);
	});

	test("a file that ends with a blank line gets no second one", () => {
		expect(applyBlock("x\n\n", ["a"])).toBe(`x\n\n${block("a")}`);
	});

	test("a path the user already names is left out, with or without a slash", () => {
		const held = `dist
/build/
node_modules/
`;

		const text = applyBlock(held, ["dist/", "build/", "node_modules/", "tmp/"]);

		expect(text).toBe(`${held}\n${block("tmp/")}`);
	});

	test("a negation counts as naming the path", () => {
		const held = `*.log
!keep.log
`;

		const text = applyBlock(held, ["keep.log", "other.log"]);

		expect(text).toBe(`${held}\n${block("other.log")}`);
	});

	test("a comment or a blank line names nothing", () => {
		const held = "# dist\n\n";

		expect(applyBlock(held, ["dist"])).toBe(`${held}${block("dist")}`);
	});

	test("a rerun with the same lines is byte for byte the same", () => {
		const once = applyBlock(
			`x
!y
`,
			["a", "y", "b"],
		);

		expect(applyBlock(once, ["a", "y", "b"])).toBe(once);
	});

	test("a rerun replaces the block and keeps the lines around it", () => {
		const held = `top\n${block("a")}bottom\n`;

		const text = applyBlock(held, ["a", "b"]);

		expect(text).toBe(`top\n${block("a", "b")}bottom\n`);
	});

	test("a block that holds a path the user later names drops it", () => {
		const held = `${block("a", "b")}a\n`;

		expect(applyBlock(held, ["a", "b"])).toBe(`${block("b")}a\n`);
	});

	test("no lines and no block leaves the file as it is", () => {
		expect(applyBlock("x\n", [])).toBe("x\n");
		expect(applyBlock(undefined, [])).toBeUndefined();
	});

	test("a block with no closing marker is left as it is", () => {
		const held = `x\n${BLOCK_START}\na\n`;

		expect(applyBlock(held, ["b"])).toBe(held);
	});
});

describe("`diffOf`", () => {
	test("a new file shows every line as added", () => {
		expect(
			diffOf(
				".ignore",
				undefined,
				`a
b
`,
			),
		).toBe(`+++ .ignore
+a
+b`);
	});

	test("an edit shows the removed and added lines only", () => {
		const before = `top\n${block("a")}bottom\n`;
		const after = `top\n${block("a", "b")}bottom\n`;

		expect(diffOf(".gitignore", before, after)).toBe(`+++ .gitignore
+b`);
	});

	test("a removed line shows with a minus", () => {
		expect(
			diffOf(
				"f",
				`a
b
c
`,
				`a
c
`,
			),
		).toBe(`+++ f
-b`);
	});

	test("no change shows nothing", () => {
		expect(diffOf("f", "a\n", "a\n")).toBe("");
	});
});
