import { expect, test } from "bun:test";

import { usageByRequest, type UsageEntry } from "./usage.ts";

const entry = (requestId: string, output: number): UsageEntry => ({
	requestId,
	usage: {
		input_tokens: 3,
		output_tokens: output,
		cache_read_input_tokens: 100,
		cache_creation_input_tokens: 30,
		cache_creation: {
			ephemeral_5m_input_tokens: 10,
			ephemeral_1h_input_tokens: 20,
		},
	},
});

test("counts a requestId once when its usage repeats per content block", () => {
	const rows = usageByRequest([entry("r1", 5), entry("r1", 5), entry("r2", 7)]);
	expect(rows).toEqual([
		{ requestId: "r1", cacheRead: 100, write5m: 10, write1h: 20, output: 5 },
		{ requestId: "r2", cacheRead: 100, write5m: 10, write1h: 20, output: 7 },
	]);
});

test("keeps the last output of a requestId, because a stream's output grows", () => {
	const rows = usageByRequest([entry("r1", 1), entry("r1", 9)]);
	expect(rows[0]?.output).toBe(9);
});

test("books a write with no TTL split as 5m", () => {
	const rows = usageByRequest([
		{
			requestId: "r1",
			usage: {
				output_tokens: 1,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: 40,
			},
		},
	]);
	expect(rows[0]).toMatchObject({ write5m: 40, write1h: 0 });
});
