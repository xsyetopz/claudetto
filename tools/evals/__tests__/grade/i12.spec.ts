import { describe, expect, test } from "bun:test";
import { failureOf } from "../../fixtures/I12/grade.ts";
import { turnsOf } from "../../transcript.ts";

const read = (id: string, path: string): string =>
	JSON.stringify({
		type: "assistant",
		message: {
			id,
			content: [{ type: "tool_use", name: "Read", input: { file_path: path } }],
		},
	});

const events = (...parts: string[]): string => parts.join("\n");

const FILES = ["/w/a.ts", "/w/b.ts", "/w/c.ts"];
const REPLY = "`b.ts` exports `parse`.";

describe("reading turns", () => {
	test("joins the events that share a message id", () => {
		const text = events(
			read("m1", "/w/a.ts"),
			read("m1", "/w/b.ts"),
			read("m2", "/w/c.ts"),
		);

		expect(turnsOf(text).map((t) => t.calls.length)).toEqual([2, 1]);
	});

	test("treats an event with no id as its own turn", () => {
		const bare = JSON.stringify({
			type: "assistant",
			message: { content: [{ type: "tool_use", name: "Read", input: {} }] },
		});

		expect(turnsOf(`${bare}\n${bare}`)).toHaveLength(2);
	});
});

describe("the verdict of case `I12`", () => {
	test("passes when one message reads all three files", () => {
		const text = FILES.map((f) => read("m1", f)).join("\n");

		expect(failureOf(turnsOf(text), REPLY)).toBeUndefined();
	});

	test("fails one read per message", () => {
		const text = FILES.map((f, at) => read(`m${at}`, f)).join("\n");

		expect(failureOf(turnsOf(text), REPLY)).toBeDefined();
	});

	test("fails two files in one message and the third later", () => {
		const text = events(
			read("m1", "/w/a.ts"),
			read("m1", "/w/b.ts"),
			read("m2", "/w/c.ts"),
		);

		expect(failureOf(turnsOf(text), REPLY)).toBeDefined();
	});

	test("fails a later message that reads one of the files again", () => {
		const text = [
			...FILES.map((f) => read("m1", f)),
			read("m2", "/w/b.ts"),
		].join("\n");

		expect(failureOf(turnsOf(text), REPLY)).toBeDefined();
	});

	test("fails a session that read nothing", () => {
		expect(failureOf([], REPLY)).toBeDefined();
	});

	test("fails a reply that names another file as the exporter", () => {
		const text = FILES.map((f) => read("m1", f)).join("\n");

		expect(failureOf(turnsOf(text), "`c.ts` exports `parse`.")).toContain(
			"b.ts",
		);
	});

	test("fails an empty reply", () => {
		const text = FILES.map((f) => read("m1", f)).join("\n");

		expect(failureOf(turnsOf(text), "")).toContain("b.ts");
	});
});
