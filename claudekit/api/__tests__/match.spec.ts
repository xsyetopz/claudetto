import { describe, expect, test } from "bun:test";
import {
	allOf,
	byModel,
	carriesTools,
	isClassifier,
	mentionsAny,
	streams,
	systemTexts,
} from "../match.ts";

describe("the request matchers", () => {
	test("tells the auto mode classifier request by the opening of its system text", () => {
		const classifier = JSON.stringify({
			system: [
				{ type: "text", text: "x-anthropic-billing-header: v" },
				{
					type: "text",
					text: `You are a security monitor for autonomous AI coding agents.

## Context`,
				},
			],
		});
		const main = JSON.stringify({
			system: [{ type: "text", text: "You are Claude Code" }],
		});

		expect(isClassifier(classifier)).toBe(true);
		expect(isClassifier(main)).toBe(false);
	});

	test("`carriesTools` needs a non-empty `tools` list", () => {
		expect(carriesTools({ tools: [{ name: "Bash" }] })).toBe(true);
		expect(carriesTools({ tools: [] })).toBe(false);
		expect(carriesTools({})).toBe(false);
		expect(carriesTools(null)).toBe(false);
	});

	test("`streams` needs `stream` to be exactly `true`", () => {
		expect(streams({ stream: true })).toBe(true);
		expect(streams({ stream: "true" })).toBe(false);
		expect(streams("x")).toBe(false);
	});

	test("`byModel` compares the whole model name", () => {
		expect(byModel("a")({ model: "a" })).toBe(true);
		expect(byModel("a")({ model: "ab" })).toBe(false);
	});

	test("`allOf` holds only when every matcher holds", () => {
		const both = allOf(streams, carriesTools);
		expect(both({ stream: true, tools: [1] })).toBe(true);
		expect(both({ stream: true })).toBe(false);
		expect(allOf()({})).toBe(true);
	});

	test("`systemTexts` reads a string or a list of blocks", () => {
		expect(systemTexts({ system: "a" })).toEqual(["a"]);
		expect(systemTexts({ system: [{ text: "a" }, {}] })).toEqual(["a", ""]);
	});

	test("`mentionsAny` looks for a marker in the text", () => {
		expect(mentionsAny(["x", "y"])("..y..")).toBe(true);
		expect(mentionsAny(["x"])("abc")).toBe(false);
	});
});
