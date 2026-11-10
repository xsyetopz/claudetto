import { expect, test } from "bun:test";

import { ARMS } from "./arms.ts";
import { QUESTIONS } from "./recall.ts";
import { renderArm } from "./report.ts";
import { rec } from "./testing.ts";

const arm = ARMS.find((a) => a.name === "C");
if (arm === undefined) {
	throw new Error("no arm C");
}

const records = [
	rec(1, {}),
	rec(2, { kind: "summarizer", contextTokens: 55_000 }),
	rec(3, {}),
	rec(4, {}),
	rec(5, {}),
	rec(6, {}),
];

const table = renderArm(
	arm,
	[{ records, turnOf: new Map([[2, 21]]), answers: [] }],
	false,
);

test("the table says its numbers are fake", () => {
	expect(table).toContain("FAKE");
});

test("an event shows its summarizer request and the 3 requests after it, once each", () => {
	const rows = table.split("\n").filter((l) => l.startsWith("| run 1"));
	expect(rows).toHaveLength(4);
	expect(rows[0]).toContain("req_2");
	expect(rows[0]).toContain("summarizer");
	expect(rows.map((r) => r.includes("req_6"))).toEqual([
		false,
		false,
		false,
		false,
	]);
	expect(rows[3]).toContain("req_5");
});

const rowFor = (id: string): string =>
	table.split("\n").find((l) => l.includes(id)) ?? "";

const lastQuestionBlank = (q: (typeof QUESTIONS)[number], i: number): string =>
	i === 3 ? "" : q.expect.join(" ");

test("the table names the expected events and the verdict", () => {
	expect(table).toContain("a compaction near 53,000 tokens");
	expect(table).toContain("1 compaction");
});

test("usage columns come from the requestId's row", () => {
	expect(rowFor("req_2")).toContain("| 200 | 20 | 0 | 2 |");
});

test("a paid table drops the FAKE label and scores recall per run", () => {
	const answers = QUESTIONS.map((q, i) => lastQuestionBlank(q, i));
	const paid = renderArm(arm, [{ records, turnOf: new Map(), answers }], true);
	expect(paid).not.toContain("FAKE");
	expect(paid).toContain(
		"| 1 | ok | 0 clears, 1 compaction, 0 handovers | 9/10, lost q4-ids |",
	);
});
