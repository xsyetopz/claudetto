import { expect, test } from "bun:test";
import { render, summarize } from "./report.ts";

test("summarize returns the rows and their total", () => {
	const summary = summarize([
		{ name: "a", count: 1 },
		{ name: "b", count: 2 },
	]);

	expect(summary).toEqual({
		rows: [
			{ name: "a", count: 1 },
			{ name: "b", count: 2 },
		],
		total: 3,
	});
});

test("render prints a line per row and the total", () => {
	const text = render(summarize([{ name: "a", count: 1 }]));

	expect(text).toBe("a: 1\ntotal: 1");
});
