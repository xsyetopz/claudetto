import { describe, expect, test } from "bun:test";
import { bare, tableRows } from "../md-table.ts";

describe("the rows under a heading", () => {
	test("prose between the heading and its table is skipped", () => {
		const page = `## A

Some prose.

| X | Y |
| --- | --- |
| 1 | 2 |
`;

		expect(tableRows(page, "## A")).toEqual([["1", "2"]]);
	});

	test("a section with no table of its own borrows none from a later section", () => {
		const page = `## A

No table yet.

## B

| X | Y |
| --- | --- |
| 1 | 2 |
`;

		expect(tableRows(page, "## A")).toEqual([]);
	});

	test("a table stops at the first line that is not a row", () => {
		const page = `## A

| X | Y |
| --- | --- |
| 1 | 2 |

| 3 | 4 |
`;

		expect(tableRows(page, "## A")).toEqual([["1", "2"]]);
	});

	test("a page without the heading has no rows", () => {
		const page = `## B

| X |
| --- |
| 1 |
`;

		expect(tableRows(page, "## A")).toEqual([]);
	});
});

describe("a cell with code ticks", () => {
	test("the ticks come off", () => {
		expect(bare("`agents/main.md`")).toBe("agents/main.md");
	});

	test("a cell of prose is unchanged", () => {
		expect(bare("The user runs it by name")).toBe("The user runs it by name");
	});
});
