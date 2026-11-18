import { describe, expect, test } from "claude-code/testing";

import { limitCommand, minutes } from "./limit";

describe("time limit", () => {
	test("uses 30 by default, accepts 0 as off and rejects a negative or text value", () => {
		// Act and Assert
		expect(minutes(undefined)).toBe(30);
		expect(minutes(0)).toBe(0);
		expect(minutes(90)).toBe(90);
		expect(minutes(-5)).toBe(30);
		expect(minutes("10")).toBe(30);
	});

	test("runs the command inside the watchdog and keeps its own status", () => {
		// Act
		const wrapped = limitCommand("make test", 120);

		// Assert
		expect(wrapped).toContain("{ make test\n}\n__claudetto_s=$?");
		expect(wrapped).toEndWith("(exit $__claudetto_s)");
	});
});
