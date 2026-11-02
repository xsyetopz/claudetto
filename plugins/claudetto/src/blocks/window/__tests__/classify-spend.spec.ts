import { describe, expect, test } from "bun:test";
import type { ModelCompleteResult } from "claude-code";
import { classifyOf, classifyRowOf, keepClassify } from "../classify-spend.ts";
import { classifyLine, NOT_MEASURED, reportText } from "../report.ts";
import { KEEP_MS, type TurnRow } from "../window.ts";

const usage = (input: number, output: number, read = 0, write = 0) => ({
	input_tokens: input,
	output_tokens: output,
	cache_read_input_tokens: read,
	cache_creation_input_tokens: write,
});

const answered = (used: ReturnType<typeof usage>): ModelCompleteResult => ({
	isAnswered: true,
	text: "<block>no</block>",
	usage: used,
});

const turn = (tokens: number): TurnRow => ({
	at: 0,
	turn: "t",
	task: "a",
	source: "main",
	model: "claude-opus-5-5",
	inputTokens: tokens,
	outputTokens: 0,
	cacheReadTokens: 0,
	cacheWriteTokens: 0,
});

const ROW = {
	at: 1,
	model: "m",
	inputTokens: 100,
	outputTokens: 100,
	cacheReadTokens: 700,
	cacheWriteTokens: 100,
};

describe("the classify block's spend", () => {
	test("a row holds the four token counts of the call and its model", () => {
		const made = classifyRowOf(
			"claude-haiku-5-5",
			answered(usage(10, 20, 300, 40)),
			5,
		);

		expect(made).toEqual({
			at: 5,
			model: "claude-haiku-5-5",
			inputTokens: 10,
			outputTokens: 20,
			cacheReadTokens: 300,
			cacheWriteTokens: 40,
		});
	});

	test("a call cut by an abort keeps the tokens it spent", () => {
		const cut: ModelCompleteResult = {
			isAnswered: false,
			reason: "aborted",
			usage: usage(5, 0),
		};

		expect(classifyRowOf("m", cut, 5).inputTokens).toBe(5);
	});

	test("rows older than the week are dropped when one is added", () => {
		const old = { ...ROW, at: 0 };
		const fresh = { ...ROW, at: KEEP_MS + 1 };

		expect(keepClassify([old], fresh)).toEqual([fresh]);
	});

	test("stored junk is ignored", () => {
		expect(classifyOf([{ nope: 1 }, "x"])).toEqual([]);
		expect(classifyOf(undefined)).toEqual([]);
	});

	test("the line gives the total and the share of the week's tokens", () => {
		expect(classifyLine([ROW], [turn(3000)])).toBe(
			"Classify block: 1,000 tokens in 1 call, 25.0% of the week's 4,000 tokens",
		);
	});

	test("with no recorded call the line says not measured and why", () => {
		expect(classifyLine([], [turn(3000)])).toBe(
			`Classify block: ${NOT_MEASURED}, no model call recorded`,
		);
	});

	test("the report carries the line", () => {
		expect(reportText([], [turn(3000)], [ROW])).toContain(
			"Classify block: 1,000 tokens",
		);
	});
});
