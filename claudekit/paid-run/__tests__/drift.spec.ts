import { describe, expect, test } from "bun:test";
import { replayRun } from "../count.ts";

const user = (text: string) => ({ role: "user", content: text });

const request = (
	system: readonly string[],
	messages: readonly unknown[],
): Record<string, unknown> => ({
	model: "claude-sonnet-5-5",
	tools: [{ name: "Read" }],
	system: system.map((text) => ({ type: "text", text })),
	messages,
});

const RULES = ["billing 1", "rules of the session", "memory file"];
const turns = [user("first"), user("second"), user("third")];

// A change in any earlier byte re-reads everything after it, so each series is held to the first body.
const prefixesOf = async (bodies: readonly unknown[]) =>
	(await replayRun(bodies, { count: () => 1 })).rows.map((row) => row.prefix);

describe("a prefix that holds across dumped bodies", () => {
	test("a series that only appends messages keeps every part", async () => {
		const rows = await prefixesOf([
			request(RULES, turns.slice(0, 1)),
			request(RULES, turns.slice(0, 2)),
			request(RULES, turns),
		]);

		expect(rows.every((row) => row.system && row.messages)).toBe(true);
	});

	test("a changed byte in an early `system` block breaks `system` of the later body", async () => {
		const [, later] = await prefixesOf([
			request(RULES, turns.slice(0, 1)),
			request(["billing 2", "rules of the session!", "memory file"], turns),
		]);

		expect(later?.system).toBe(false);
	});

	test("a changed byte in the last `system` block breaks `system` too", async () => {
		const [, later] = await prefixesOf([
			request(RULES, turns.slice(0, 1)),
			request(["billing 1", "rules of the session", "memory fil3"], turns),
		]);

		expect(later?.system).toBe(false);
	});

	test("a rewritten prior message breaks `messages` of the later body", async () => {
		const [, later] = await prefixesOf([
			request(RULES, turns.slice(0, 2)),
			request(RULES, [user("first"), user("secons"), user("third")]),
		]);

		expect(later?.messages).toBe(false);
	});

	test("the billing header, which changes on every request, is not a break", async () => {
		const [, later] = await prefixesOf([
			request(RULES, turns.slice(0, 1)),
			request(["billing 2", ...RULES.slice(1)], turns),
		]);

		expect(later?.system).toBe(true);
	});
});
