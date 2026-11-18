import { describe, expect, test } from "claude-code/testing";

import { limitCommand, minutes, registerLimit } from "./limit";

describe("time limit", () => {
	test("uses 30 by default, accepts 0 as off and rejects a negative or text value", () => {
		// Act and Assert
		expect(minutes(undefined)).toBe(30);
		expect(minutes(0)).toBe(0);
		expect(minutes(90)).toBe(90);
		expect(minutes(-5)).toBe(30);
		expect(minutes("10")).toBe(30);
	});

	test("a Bash call reaches the tool inside the watchdog with its own status kept", async ($, on) => {
		// Arrange
		registerLimit(on, { bashTimeLimitMinutes: 2 });
		const seen: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") seen.push(e.command);
			return { result: "ok" } as never;
		});

		// Act
		await $.tool.call({ tool: "Bash", command: "make test" });

		// Assert
		expect(seen).toEqual([limitCommand("make test", 120)]);
		expect(seen[0]).toContain("{ make test\n}\n__claudetto_s=$?");
		expect(seen[0]).toEndWith("(exit $__claudetto_s)");
	});
});
