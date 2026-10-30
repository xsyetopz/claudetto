import { describe, expect, test } from "bun:test";
import { subagentsOf } from "../main.ts";
import { plain, width } from "../width.ts";
import { NOW } from "./support.ts";

const env = { COLUMNS: "100", NO_COLOR: "1" };
const parseRow = (line: string): { id: string; content: string } => {
	const row: { id: string; content: string } = JSON.parse(line);
	return row;
};
const rows = (input: unknown, e = env) =>
	subagentsOf(JSON.stringify(input), e, NOW)
		.split("\n")
		.filter(Boolean)
		.map((line) => parseRow(line));

describe("subagent rows", () => {
	test("a running task shows its name, context use, and run time", () => {
		const [row] = rows({
			tasks: [
				{
					id: "a1",
					name: "scout",
					agentType: "claudetto:Artemis",
					status: "running",
					model: "claude-haiku-4-5",
					effort: "low",
					tokenCount: 12_000,
					contextWindowSize: 200_000,
					startTime: NOW - 65_000,
				},
			],
		});
		expect(row?.id).toBe("a1");
		expect(row?.content).toBe(
			"⏵ scout (Artemis) haiku-4-5 low · ◫ 12k/200k 6% · ◔ 1m",
		);
	});

	test("a finished task shows its state in place of the clock", () => {
		const out = rows({
			tasks: [
				{ id: "a", name: "x", status: "completed" },
				{ id: "b", name: "y", status: "failed" },
				{ id: "c", name: "z", status: "killed" },
			],
		}).map((row) => row.content);
		expect(out[0]).toContain("✓ done");
		expect(out[1]).toContain("✗ failed");
		expect(out[2]).toContain("stopped");
	});

	test("a row fits the columns of the input and the description takes what is left", () => {
		const [row] = rows({
			columns: 40,
			tasks: [
				{
					id: "a",
					name: "x",
					status: "completed",
					description: "a long description of the work done here",
				},
			],
		});
		expect(width(plain(row?.content ?? ""))).toBeLessThanOrEqual(36);
		expect(row?.content).toContain("...");
	});

	test("a task without an id is skipped, and bad input prints nothing", () => {
		expect(rows({ tasks: [{ name: "x" }] })).toEqual([]);
		for (const text of ["", "nope", "[]", "{}"]) {
			expect(subagentsOf(text, env, NOW)).toBe("");
		}
	});

	test("at most 20 rows", () => {
		const tasks = Array.from({ length: 30 }, (_, i) => ({
			id: `t${i}`,
			name: "n",
		}));
		expect(rows({ tasks })).toHaveLength(20);
	});
});
