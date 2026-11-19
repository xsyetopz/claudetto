import { describe, expect, test } from "claude-code/testing";

import { floor, freeShare, reason } from "../memory";

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

	test("states the measured free share and tells the model to wait and retry", () => {
		// Act
		const text = reason(12, 20);

		// Assert
		expect(text).toContain("12% free");
		expect(text).toContain("then retry");
	});

	test("a Bash call is refused while free memory is under the floor and runs when the reading fails", async ($, on) => {
		// Arrange: the plugin registers its own hooks; these stubs stand in for memory_pressure and the tool.
		let reading: { exitCode: number; stdout: string } = { exitCode: 0, stdout: SAMPLE };
		on("process.run", () => ({ value: { ...reading, stderr: "", isStdoutTruncated: false, isStderrTruncated: false } }));
		on("tool.check", () => ({ decision: "allow" }) as never);
		const ran: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") ran.push(e.command);
			return { result: "ok" } as never;
		});

		// Act
		const low = await $.tool.call({ tool: "Bash", command: "echo low" }).catch((error: unknown) => error);
		reading = { exitCode: 1, stdout: "" };
		await $.tool.call({ tool: "Bash", command: "echo unread" }).catch((error: unknown) => error);

		// Assert
		expect(JSON.stringify(low)).toContain("12% free");
		expect(ran.length).toBe(1);
		expect(ran[0]).toContain("echo unread");
	});

	test("parses 1,000 readings in under 100 ms", () => {
		// Arrange
		// The fastest of three samples, so one stall on a loaded machine does not fail the budget.
		const sample = (): number => {
			const start = performance.now();
			for (let i = 0; i < 1000; i++) freeShare(SAMPLE);
			return performance.now() - start;
		};

		// Act
		const fastest = Math.min(sample(), sample(), sample());

		// Assert
		expect(fastest).toBeLessThan(100);
	});
});
