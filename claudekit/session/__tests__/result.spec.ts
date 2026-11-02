import { describe, expect, test } from "bun:test";
import { readResult, readTokens } from "../result.ts";

const RESULT = {
	type: "result",
	subtype: "success",
	is_error: false,
	result: "done",
	total_cost_usd: 0.25,
	permission_denials: [
		{ tool_name: "Bash", tool_use_id: "t1", tool_input: { command: "ls" } },
	],
};

describe("readResult", () => {
	test("reads the single object of `--output-format json`", () => {
		const got = readResult(JSON.stringify(RESULT));

		expect(got).toEqual({
			isError: false,
			subtype: "success",
			text: "done",
			totalCostUsd: 0.25,
			permissionDenials: [
				{ toolName: "Bash", toolUseId: "t1", toolInput: { command: "ls" } },
			],
		});
	});

	test("reads the last `result` of an array of events", () => {
		const got = readResult(
			JSON.stringify([{ type: "system" }, { ...RESULT, total_cost_usd: 1 }]),
		);

		expect(got?.totalCostUsd).toBe(1);
	});

	test("reads the last `result` line of a stream", () => {
		const stream = `${JSON.stringify({ type: "system" })}
${JSON.stringify(RESULT)}
not json
`;

		expect(readResult(stream)?.permissionDenials).toHaveLength(1);
	});

	test("reports no denials and no cost when the run states none", () => {
		const got = readResult(JSON.stringify({ type: "result", is_error: true }));

		expect(got?.isError).toBe(true);
		expect(got?.totalCostUsd).toBeUndefined();
		expect(got?.permissionDenials).toEqual([]);
	});

	test("is `undefined` for text that holds no result", () => {
		expect(readResult("")).toBeUndefined();
		expect(readResult("garbage")).toBeUndefined();
		expect(readResult(JSON.stringify({ type: "system" }))).toBeUndefined();
	});
});

describe("readTokens", () => {
	const usage = (
		input: number,
		output: number,
		read: number,
		write: number,
	) => ({
		inputTokens: input,
		outputTokens: output,
		cacheReadInputTokens: read,
		cacheCreationInputTokens: write,
		costUSD: 1,
	});

	test("sums the four token counts of every model of the last `result`", () => {
		const stream = `${JSON.stringify({ type: "system" })}
${JSON.stringify({
	...RESULT,
	modelUsage: {
		"claude-opus-5-5": usage(1, 2, 300, 40),
		"claude-haiku-5-5": usage(5, 6, 0, 0),
	},
})}
`;

		expect(readTokens(stream)).toBe(354);
	});

	test("is `undefined` when the result states no model usage", () => {
		expect(readTokens(JSON.stringify(RESULT))).toBeUndefined();
		expect(readTokens("")).toBeUndefined();
	});
});
