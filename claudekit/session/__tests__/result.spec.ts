import { describe, expect, test } from "bun:test";
import { readResult } from "../result.ts";

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
