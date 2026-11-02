import { describe, expect, test } from "bun:test";
import { prefixDiff } from "../diff.ts";

const body = (over: Record<string, unknown> = {}): string =>
	JSON.stringify({
		model: "m",
		tools: [{ name: "Read" }, { name: "Bash" }],
		system: [{ type: "text", text: "S" }],
		messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
		...over,
	});

const turn2 = (over: Record<string, unknown> = {}): string =>
	body({
		messages: [
			{ role: "user", content: [{ type: "text", text: "hi" }] },
			{ role: "assistant", content: [{ type: "text", text: "ok" }] },
			{ role: "user", content: [{ type: "text", text: "more" }] },
		],
		...over,
	});

describe("`prefixDiff`", () => {
	test("a later request that only appends messages keeps the prefix", () => {
		expect(prefixDiff(body(), turn2())).toEqual({ kept: true });
	});

	test("a moved `cache_control` marker is no change", () => {
		const marked = body({
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: "hi", cache_control: { type: "ephemeral" } },
					],
				},
			],
		});
		expect(prefixDiff(marked, turn2())).toEqual({ kept: true });
	});

	test("a string `content` and the same text as one block are no change", () => {
		const plain = body({ messages: [{ role: "user", content: "hi" }] });
		expect(prefixDiff(plain, turn2())).toEqual({ kept: true });
	});

	test("a changed tool names `tools[1]` and its byte offset", () => {
		const changed = turn2({ tools: [{ name: "Read" }, { name: "Edit" }] });
		const found = prefixDiff(body(), changed);
		expect(found.kept).toBe(false);
		expect(found.where).toBe("tools[1]");
		expect(found.offset).toBe(JSON.stringify({ name: "Read" }).length + 2);
	});

	test("an added tool names its index", () => {
		const found = prefixDiff(
			body(),
			turn2({ tools: [{ name: "Read" }, { name: "Bash" }, { name: "Mcp" }] }),
		);
		expect(found.where).toBe("tools[2]");
	});

	test("a changed system block names `system[0]`", () => {
		const found = prefixDiff(
			body(),
			turn2({ system: [{ type: "text", text: "T" }] }),
		);
		expect(found.where).toBe("system[0]");
	});

	test("a rewritten first message names `messages[0]`", () => {
		const found = prefixDiff(
			body(),
			body({ messages: [{ role: "user", content: "other" }] }),
		);
		expect(found.where).toBe("messages[0]");
	});

	test("a changed `model` is named though it is no block", () => {
		const found = prefixDiff(body(), turn2({ model: "n" }));
		expect(found.where).toBe("model");
	});

	test("a changed `thinking` field is named", () => {
		const found = prefixDiff(body(), turn2({ thinking: { type: "enabled" } }));
		expect(found.where).toBe("thinking");
	});
});
