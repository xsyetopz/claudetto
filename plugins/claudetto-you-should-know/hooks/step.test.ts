import { describe, expect, test } from "claude-code/testing";

import { isCheckStep } from "./step";

describe("isCheckStep", () => {
	test("never fires on the first step", () => {
		expect(isCheckStep(0)).toBe(false);
	});

	test("fires first on step 3, then on every sixth step", () => {
		expect(isCheckStep(3)).toBe(true);
		expect([1, 2, 4, 5, 7, 9, 11].some(isCheckStep)).toBe(false);
		expect([6, 12, 18].every(isCheckStep)).toBe(true);
	});
});
