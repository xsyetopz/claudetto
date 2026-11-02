import { describe, expect, test } from "bun:test";
import { isMain, lineOf, pairsOf } from "../report.ts";

const request = (over: Record<string, unknown> = {}): string =>
	JSON.stringify({
		model: "m",
		stream: true,
		tools: [{ name: "Read" }],
		system: [{ type: "text", text: "S" }],
		messages: [{ role: "user", content: "hi" }],
		...over,
	});

describe("`isMain`", () => {
	test("holds for a streamed request with tools", () => {
		expect(isMain(request())).toBe(true);
	});

	test("fails for a request with no tools or no stream", () => {
		expect(isMain(request({ tools: [] }))).toBe(false);
		expect(isMain(request({ stream: undefined }))).toBe(false);
	});
});

describe("`lineOf`", () => {
	test("names the model, the tool count, the message count, and the `cache_control` count", () => {
		const raw = request({
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: "a", cache_control: { type: "ephemeral" } },
					],
				},
			],
		});
		expect(lineOf(raw)).toBe("model=m tools=1 system=1 messages=1 markers=1");
	});
});

describe("`pairsOf`", () => {
	test("pairs each request with the one before it", () => {
		const a = request();
		const b = request({ model: "n" });
		const found = pairsOf([a, b]);
		expect(found).toHaveLength(1);
		expect(found[0]?.diff.fields).toEqual(["model"]);
		expect(found[0]?.values).toEqual(['model: "m" -> "n"']);
	});
});
