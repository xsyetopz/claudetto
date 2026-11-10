import { expect, test } from "bun:test";

import { type Arm, ARMS } from "./arms.ts";
import { HANDOFF_ASK, promptOf, TURNS } from "./task.ts";

const asksOf = (arm: Arm): number => (arm.handoffOnBoundary ? 3 : 0);

test("only an arm that hands off on a boundary is asked to hand off", () => {
	for (const arm of ARMS) {
		const asked = TURNS.filter((t) =>
			promptOf(t, arm).includes(HANDOFF_ASK),
		).length;
		expect([arm.name, asked]).toEqual([arm.name, asksOf(arm)]);
	}
});
