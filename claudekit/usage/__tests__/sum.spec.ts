import { describe, expect, test } from "bun:test";
import { formatSum, summarize } from "../sum.ts";
import { assistant, makeRoot, writeTranscript } from "./fixture.ts";

const OPEN = {
	since: Date.parse("2026-10-27"),
	until: Number.POSITIVE_INFINITY,
};

describe("summarize", () => {
	test("adds the four token counts per project, model, and kind", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "-Users-me-repo/s1.jsonl", [
			assistant({
				id: "m1",
				at: "2026-10-28T01:00:00Z",
				input: 1,
				output: 2,
				read: 100,
				write: 10,
			}),
			assistant({
				id: "m2",
				at: "2026-10-28T01:01:00Z",
				input: 1,
				output: 3,
				read: 200,
				write: 20,
			}),
			assistant({
				id: "m3",
				at: "2026-10-28T01:02:00Z",
				read: 7,
				sidechain: true,
			}),
		]);

		const rows = await summarize(root, OPEN);

		expect(rows.get("-Users-me-repo\tclaude-opus-5-5\tmain")).toMatchObject({
			calls: 2,
			input: 2,
			output: 5,
			cacheRead: 300,
			cacheWrite: 30,
		});
		expect(
			rows.get("-Users-me-repo\tclaude-opus-5-5\tsubagent")?.cacheRead,
		).toBe(7);
	});

	test("counts a response written twice once", async () => {
		const root = await makeRoot();
		const line = assistant({ id: "m1", at: "2026-10-28T01:00:00Z", read: 100 });
		await writeTranscript(root, "p/s1.jsonl", [line, line]);
		await writeTranscript(root, "p/s2.jsonl", [line]);

		expect([...(await summarize(root, OPEN)).values()][0]?.calls).toBe(1);
	});

	test("keeps only calls inside the window", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "p/s1.jsonl", [
			assistant({ id: "old", at: "2026-10-26T23:59:59Z", read: 1 }),
			assistant({ id: "in", at: "2026-10-30T00:00:00Z", read: 10 }),
			assistant({ id: "late", at: "2026-11-02T00:00:00Z", read: 100 }),
		]);

		const rows = await summarize(root, {
			since: Date.parse("2026-10-27"),
			until: Date.parse("2026-11-02"),
		});

		expect([...rows.values()].map((r) => r.cacheRead)).toEqual([10]);
	});

	test("folds the throwaway classifier and dump projects into one group", async () => {
		const root = await makeRoot();
		await writeTranscript(
			root,
			"-private-tmp-claudetto-classifier-ab12-repo/s1.jsonl",
			[assistant({ id: "m1", at: "2026-10-28T01:00:00Z", read: 1 })],
		);
		await writeTranscript(
			root,
			"-private-tmp-claudetto-classifier-cd34-repo/s2.jsonl",
			[assistant({ id: "m2", at: "2026-10-28T01:00:00Z", read: 1 })],
		);

		const rows = await summarize(root, OPEN);

		expect([...rows.keys()]).toEqual([
			"tmp-classifier-*\tclaude-opus-5-5\tmain",
		]);
		expect([...rows.values()][0]?.sessions.size).toBe(1);
	});
});

describe("formatSum", () => {
	test("prints a header, rows by weight, and a total with the cache read share", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "small/s1.jsonl", [
			assistant({ id: "m1", at: "2026-10-28T01:00:00Z", read: 10 }),
		]);
		await writeTranscript(root, "big/s2.jsonl", [
			assistant({
				id: "m2",
				at: "2026-10-28T01:00:00Z",
				read: 90,
				write: 5,
				output: 5,
			}),
		]);

		const lines = formatSum(await summarize(root, OPEN)).split("\n");

		expect(lines[0]).toBe(
			"project\tmodel\tkind\tsessions\tcalls\tinput\tcacheWrite\tcacheRead\toutput",
		);
		expect(lines[1]?.startsWith("big\t")).toBe(true);
		expect(lines.at(-1)).toBe(
			"total 110 tokens in 2 calls, cache reads 100 (90.9%)",
		);
	});
});
