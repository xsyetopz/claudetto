import { expect, test } from "bun:test";
import { boundText } from "../cut.ts";

const lines = (n: number, text: string): string =>
	Array.from({ length: n }, (_, at) => `${text} ${at}`).join("\n");

test("text within the bound is returned as it is", () => {
	expect(boundText("ok\n", 100, "f.txt")).toBe("ok\n");
});

test("a bound of 0 leaves any text as it is", () => {
	const text = lines(500, "pass");
	expect(boundText(text, 0, "f.txt")).toBe(text);
});

test("the head and the tail stay and the middle goes", () => {
	const text = `START${"x".repeat(5000)}END`;

	const out = boundText(text, 1000, "f.txt");

	expect(out.startsWith("START")).toBe(true);
	expect(out.endsWith("END")).toBe(true);
	expect(out.length).toBeLessThan(1300);
});

test("one line names the cut count and the file", () => {
	const out = boundText(
		"a".repeat(3000),
		1000,
		".claude/claudetto/output/o.txt",
	);

	expect(out).toContain(
		"[claudetto: cut 2200 characters; the full output is in `.claude/claudetto/output/o.txt`]",
	);
});

test("a failure line in the cut middle is kept", () => {
	const text = `${lines(200, "pass")}\nFAIL src/a.test.ts\n${lines(200, "pass")}`;

	const out = boundText(text, 1000, "f.txt");

	expect(out).toContain("FAIL src/a.test.ts");
	expect(out).not.toContain("pass 100");
});

test("kept failure lines stop at their share of the bound", () => {
	const out = boundText(lines(2000, "error: broken"), 1000, "f.txt");

	expect(out.length).toBeLessThan(1500);
});

test("a file that could not be saved is said so", () => {
	const out = boundText("a".repeat(3000), 1000, undefined);

	expect(out).toContain("the full output could not be saved");
});
