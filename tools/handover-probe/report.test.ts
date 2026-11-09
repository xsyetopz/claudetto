import { expect, test } from "bun:test";
import { ARMS } from "./arms.ts";
import { renderArm } from "./report.ts";
import type { LogRecord } from "./server.ts";

const rec = (n: number, over: Partial<LogRecord>): LogRecord => ({
	n,
	path: "/v1/messages",
	host: "127.0.0.1:1",
	requestId: `req_${n}`,
	kind: "main",
	calledHandoff: false,
	contextTokens: 50_000,
	toolNames: [],
	lastUserText: "",
	cacheControlTtls: [],
	usage: {
		output_tokens: n,
		cache_read_input_tokens: n * 100,
		cache_creation_input_tokens: n * 10,
		cache_creation: {
			ephemeral_5m_input_tokens: n * 10,
			ephemeral_1h_input_tokens: 0,
		},
	},
	...over,
});

const arm = ARMS.find((a) => a.name === "C");
if (arm === undefined) {
	throw new Error("no arm C");
}

const records = [
	rec(1, {}),
	rec(2, { kind: "summarizer", contextTokens: 145_000 }),
	rec(3, {}),
	rec(4, {}),
	rec(5, {}),
	rec(6, {}),
];

const table = renderArm(arm, [{ records, turnOf: new Map([[2, 21]]) }]);

test("the table says its numbers are fake", () => {
	expect(table).toContain("FAKE");
});

test("an event shows its summarizer request and the 3 requests after it, once each", () => {
	const rows = table.split("\n").filter((l) => l.startsWith("| run 1"));
	expect(rows).toHaveLength(4);
	expect(rows[0]).toContain("req_2");
	expect(rows[0]).toContain("summarizer");
	expect(rows.map((r) => r.includes("req_6"))).toEqual([false, false, false, false]);
	expect(rows[3]).toContain("req_5");
});

test("the table names the expected events and the verdict", () => {
	expect(table).toContain("a compaction near 140,000 tokens");
	expect(table).toContain("1 compaction");
});

test("usage columns come from the requestId's row", () => {
	const first = table.split("\n").find((l) => l.includes("req_2")) ?? "";
	expect(first).toContain("| 200 | 20 | 0 | 2 |");
});
