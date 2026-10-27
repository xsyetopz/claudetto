// `eachInOrder` and `mapInOrder` of `tools/ordered.ts`: the steps run one after the other.

import { expect, test } from "bun:test";
import { eachInOrder, mapInOrder } from "../../tools/ordered.ts";

const later = (ms: number): Promise<void> =>
	new Promise((done) => setTimeout(done, ms));

test("`eachInOrder` ends each step before it starts the next, also when a later step is faster", async () => {
	const events: string[] = [];
	await eachInOrder([30, 1, 10], async (ms) => {
		events.push(`start ${ms}`);
		await later(ms);
		events.push(`end ${ms}`);
	});
	expect(events).toEqual([
		"start 30",
		"end 30",
		"start 1",
		"end 1",
		"start 10",
		"end 10",
	]);
});

test("`eachInOrder` stops at the first step that fails and starts no later step", async () => {
	const seen: number[] = [];
	const run = eachInOrder([1, 2, 3], async (n) => {
		seen.push(n);
		if (n === 2) {
			throw new Error("step 2");
		}
	});
	await expect(run).rejects.toThrow("step 2");
	expect(seen).toEqual([1, 2]);
});

test("`mapInOrder` gives the results in the order of the items", async () => {
	const results = await mapInOrder(new Set([3, 1, 2]), async (n) => {
		await later(n);
		return n * 10;
	});
	expect(results).toEqual([30, 10, 20]);
});

test("`eachInOrder` and `mapInOrder` accept no items", async () => {
	await eachInOrder([], async () => {
		throw new Error("no step runs");
	});
	expect(await mapInOrder([], async () => 1)).toEqual([]);
});
