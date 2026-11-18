import { describe, expect, test } from "claude-code/testing";

import { isCheckStep } from "./step";

describe("isCheckStep", () => {
	test("never fires on the first step", () => {
		expect(isCheckStep(0)).toBe(false);
	});

	test("fires on every sixth step", () => {
		expect([1, 2, 3, 4, 5, 7, 11].some(isCheckStep)).toBe(false);
		expect([6, 12, 18].every(isCheckStep)).toBe(true);
	});
});
