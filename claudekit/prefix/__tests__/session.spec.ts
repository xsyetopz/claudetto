import { describe, expect, test } from "bun:test";
import { sleep } from "bun";
import { SCENARIOS } from "../scenarios.ts";
import { inOrder } from "../session.ts";

describe("`inOrder`", () => {
	test("starts an item only after the one before it has finished", async () => {
		const events: string[] = [];
		await inOrder(["a", "b"], async (item) => {
			events.push(`start ${item}`);
			await sleep(5);
			events.push(`end ${item}`);
		});
		expect(events).toEqual(["start a", "end a", "start b", "end b"]);
	});
});

describe("`SCENARIOS`", () => {
	test("every scenario has a step, and a step does something", () => {
		for (const scenario of Object.values(SCENARIOS)) {
			expect(scenario.steps.length).toBeGreaterThan(0);
			for (const step of scenario.steps) {
				expect(step.text !== undefined || step.keys !== undefined).toBe(true);
			}
		}
	});
});
