import { describe, expect, test } from "claude-code/testing";

import { isNoteRead, type Row, withRow } from "../rows";

const DAY = 86_400_000;

describe("withRow", () => {
	test("puts the new row first and replaces its older one", () => {
		const rows = withRow([{ id: "a" }, { id: "b" }], {
			id: "b",
			offeredTurn: "t"
		});
		expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
	});

	test("past 32 rows drops the oldest rows without an open note first", () => {
		const open: Row = {
			id: "open",
			view: { kind: "offer", line: "x", shownAt: 1000 }
		};
		const rest = Array.from({ length: 31 }, (_, i) => ({ id: `s${i}` }));
		const rows = withRow([...rest, open], { id: "new" }, 2000);
		expect(rows.length).toBe(32);
		expect(rows.some((r) => r.id === "open")).toBe(true);
		expect(rows.some((r) => r.id === "s30")).toBe(false);
	});
});

describe("isNoteRead", () => {
	const view = { kind: "offer", line: "x", shownAt: 5 } as const;

	test("needs two seconds of idle time on the same showing", () => {
		const entry = { shownAt: 5, line: "x", idle: { ms: 1999 } };
		expect(isNoteRead(entry, view, 0)).toBe(false);
		expect(isNoteRead({ ...entry, idle: { ms: 2000 } }, view, 0)).toBe(true);
		expect(
			isNoteRead({ ...entry, shownAt: 6, idle: { ms: 9000 } }, view, 0)
		).toBe(false);
	});

	test("counts idle time running since a moment", () => {
		expect(
			isNoteRead({ shownAt: 5, line: "x", idle: { since: 1000 } }, view, 3000)
		).toBe(true);
	});

	test("is never read once the off button is armed", () => {
		expect(
			isNoteRead(
				{ shownAt: 5, line: "x", idle: { ms: 9000 } },
				{ ...view, isOffArmed: true },
				0
			)
		).toBe(false);
	});
});

const closed = (id: string): Row => ({ id });
const open = (id: string, shownAt: number): Row => ({
	id,
	view: { kind: "offer", line: "x", shownAt }
});

describe("withRow keeps 32 rows", () => {
	test("the oldest closed row goes first when there are 33", () => {
		// Arrange
		const now = 10 * DAY;
		const others = [
			...Array.from({ length: 30 }, (_, i) => open(`o${i}`, now - 1000)),
			closed("c1"),
			closed("c0")
		];

		// Act
		const rows = withRow(others, { id: "new" }, now);

		// Assert
		expect(rows).toHaveLength(32);
		expect(rows.some((r) => r.id === "c0")).toBe(false);
		expect(rows.some((r) => r.id === "c1")).toBe(true);
	});

	test("an open note shown over three days ago goes before one shown within three days", () => {
		// Arrange
		const now = 10 * DAY;
		const others = [
			...Array.from({ length: 30 }, (_, i) => open(`o${i}`, now - 1000)),
			open("recent", now - DAY),
			open("stale", now - 3 * DAY - 1)
		];

		// Act
		const rows = withRow(others, { id: "new" }, now);

		// Assert
		expect(rows.some((r) => r.id === "stale")).toBe(false);
		expect(rows.some((r) => r.id === "recent")).toBe(true);
	});
});
