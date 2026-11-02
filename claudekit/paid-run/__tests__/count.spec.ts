import { describe, expect, test } from "bun:test";
import { replayRun } from "../count.ts";
import { comparePrefix } from "../prefix.ts";

const request = (messages: unknown[], extra: Record<string, unknown> = {}) => ({
	model: "claude-sonnet-5-5",
	tools: [{ name: "Read" }],
	system: [
		{ type: "text", text: "billing 1" },
		{ type: "text", text: "rules" },
	],
	messages,
	...extra,
});

const user = (text: string) => ({ role: "user", content: text });

describe("comparePrefix", () => {
	test("calls equal parts identical, ignoring `cache_control` and a string against a text block", () => {
		const warm = request([user("a")]);
		const later = request(
			[
				{
					role: "user",
					content: [
						{ type: "text", text: "a", cache_control: { type: "ephemeral" } },
					],
				},
				user("b"),
			],
			{
				system: [
					{ type: "text", text: "billing 2" },
					{ type: "text", text: "rules" },
				],
			},
		);
		expect(comparePrefix(warm, later)).toEqual({
			tools: true,
			system: true,
			messages: true,
		});
	});

	test("names the part that differs, and a later request shorter than the warm one", () => {
		const warm = request([user("a"), user("b")]);
		expect(comparePrefix(warm, request([user("a")], { tools: [] }))).toEqual({
			tools: false,
			system: true,
			messages: false,
		});
		expect(comparePrefix(warm, request([user("a"), user("x")])).messages).toBe(
			false,
		);
	});
});

describe("replayRun", () => {
	test("sends each planned request to the fake API and counts its tokens and prefix", async () => {
		const warm = request([user("a".repeat(400))]);
		const later = request([user("a".repeat(400)), user("b".repeat(40))], {
			tools: [],
		});
		const run = await replayRun([warm, later], { count: () => 7 });
		expect(run.rows.map((r) => r.tokens)).toEqual([7, 7]);
		expect(run.total).toBe(14);
		expect(run.rows[0]?.prefix).toEqual({
			tools: true,
			system: true,
			messages: true,
		});
		expect(run.rows[1]?.prefix).toEqual({
			tools: false,
			system: true,
			messages: true,
		});
	});

	test("counts about one token per four characters by default", async () => {
		const run = await replayRun([request([user("a".repeat(4000))])]);
		const [row] = run.rows;
		expect(row?.tokens).toBeGreaterThan(1000);
		expect(row?.tokens).toBeLessThan(1200);
	});

	test("compares with the request at `warm`", async () => {
		const a = request([user("a")]);
		const b = request([user("b")]);
		const run = await replayRun([a, b], { warm: 1 });
		expect(run.rows[0]?.prefix.messages).toBe(false);
		expect(run.rows[1]?.prefix.messages).toBe(true);
	});
});
