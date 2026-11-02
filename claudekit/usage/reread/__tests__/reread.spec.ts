import { describe, expect, test } from "bun:test";
import {
	assistant,
	boundary,
	makeRoot,
	toolResult,
	userText,
	writeTranscript,
} from "../../__tests__/fixture.ts";
import { formatReread, measureReread } from "../reread.ts";

const OPEN = {
	since: Date.parse("2026-10-27"),
	until: Number.POSITIVE_INFINITY,
};
const tool = (id: string, name: string) => ({
	type: "tool_use",
	id,
	name,
	input: {},
});

const session = (): string[] => [
	assistant({
		id: "a",
		at: "2026-10-28T01:00:00Z",
		read: 1000,
		output: 100,
		content: [tool("t1", "Bash")],
	}),
	toolResult("t1", "x".repeat(300)),
	assistant({
		id: "b",
		at: "2026-10-28T01:01:00Z",
		read: 1400,
		output: 50,
		content: [tool("t2", "Read")],
	}),
	toolResult("t2", "y".repeat(100)),
	assistant({ id: "c", at: "2026-10-28T01:02:00Z", read: 1600, output: 10 }),
];

describe("measureReread", () => {
	test("totals the prompt tokens read and the fixed prefix of a segment", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "p/s1.jsonl", session());

		const stats = await measureReread(root, OPEN);

		expect(stats.calls).toBe(3);
		expect(stats.totalRead).toBe(4000);
		expect(stats.fixed).toBe(3000);
	});

	test("charges the growth to what the previous call added and to every call that re-reads it", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "p/s1.jsonl", session());

		const { weight } = await measureReread(root, OPEN);

		// Growth 400 to call b: 100 is the previous output, 300 is the Bash result, re-read by b and c.
		expect(weight.get("assistant output (no thinking)")).toBe(100 * 2 + 50);
		expect(weight.get("tool Bash")).toBe(300 * 2);
		expect(weight.get("tool Read")).toBe(150);
	});

	test("calls output with thinking blocks apart", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "p/s1.jsonl", [
			assistant({
				id: "a",
				at: "2026-10-28T01:00:00Z",
				read: 1000,
				output: 100,
				content: [{ type: "thinking", thinking: "" }],
			}),
			assistant({ id: "b", at: "2026-10-28T01:01:00Z", read: 1100 }),
		]);

		expect(
			(await measureReread(root, OPEN)).weight.get(
				"assistant output (with thinking)",
			),
		).toBe(100);
	});

	test("starts a new segment at a compaction and charges its first call to the segment start", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "p/s1.jsonl", [
			assistant({ id: "a", at: "2026-10-28T01:00:00Z", read: 1000 }),
			assistant({ id: "b", at: "2026-10-28T01:01:00Z", read: 1200 }),
			boundary(),
			assistant({ id: "c", at: "2026-10-28T01:02:00Z", read: 500 }),
		]);

		const stats = await measureReread(root, OPEN);

		expect(stats.fixed).toBe(1000 + 1000 + 500);
		expect(stats.weight.get("segment start (summary, first prompt)")).toBe(0);
	});

	test("leaves out sidechain calls and counts a response written twice once", async () => {
		const root = await makeRoot();
		const line = assistant({ id: "a", at: "2026-10-28T01:00:00Z", read: 1000 });
		await writeTranscript(root, "p/s1.jsonl", [
			line,
			line,
			assistant({
				id: "s",
				at: "2026-10-28T01:00:30Z",
				read: 9000,
				sidechain: true,
			}),
			userText("go"),
		]);

		expect(await measureReread(root, OPEN)).toMatchObject({
			calls: 1,
			totalRead: 1000,
		});
	});

	test("records tool calls per API call and result sizes by tool", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "p/s1.jsonl", session());

		const stats = await measureReread(root, OPEN);

		expect([...stats.toolsPerCall].sort((a, b) => a[0] - b[0])).toEqual([
			[0, 1],
			[1, 2],
		]);
		expect(stats.resultSize.get("Bash")).toEqual([300]);
	});
});

describe("formatReread", () => {
	test("prints the totals, the largest parts, and the result sizes", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "p/s1.jsonl", session());

		const lines = formatReread(await measureReread(root, OPEN)).split("\n");

		expect(lines[0]).toBe(
			"calls 3, prompt tokens read in all 0.000B, attributed 0.000B",
		);
		expect(lines[1]).toContain("fixed prefix");
		expect(lines.some((l) => l.startsWith("tool Bash"))).toBe(true);
		expect(
			lines.some((l) => l.startsWith("tool calls per API call: [[0,1],[1,2]]")),
		).toBe(true);
		expect(lines.some((l) => l.startsWith("result chars Bash"))).toBe(true);
	});
});
