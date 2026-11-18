import { describe, expect, test } from "claude-code/testing";

import { floor, freeShare, reason } from "./memory";

const SAMPLE = "The system has 34359738368 (2097152 pages with a page size of 16384).\nSystem-wide memory free percentage: 12%\n";

describe("memory hold", () => {
	test("reads the free share from memory_pressure output and passes on text without one", () => {
		// Act and Assert
		expect(freeShare(SAMPLE)).toBe(12);
		expect(freeShare("no reading here")).toBeUndefined();
	});

	test("uses 20 by default, accepts 0 as off and rejects values outside 0 to 100", () => {
		// Act and Assert
		expect(floor(undefined)).toBe(20);
		expect(floor(0)).toBe(0);
		expect(floor(35)).toBe(35);
		expect(floor(150)).toBe(20);
		expect(floor("30")).toBe(20);
	});

	test("states the measured free share", () => {
		// Act
		const text = reason(12, 20);

		// Assert
		expect(text).toContain("12% free");
	});

	test("parses 1,000 readings in under 100 ms", () => {
		// Arrange
		const start = performance.now();

		// Act
		for (let i = 0; i < 1000; i++) freeShare(SAMPLE);

		// Assert
		expect(performance.now() - start).toBeLessThan(100);
	});
});
