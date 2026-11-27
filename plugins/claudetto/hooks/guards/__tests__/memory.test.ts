import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

const reading = (free: number) =>
	`The system has 34359738368 (2097152 pages with a page size of 16384).\nSystem-wide memory free percentage: ${free}%\n`;

/** Stands in for `memory_pressure` and the Bash tool; the test sets what the machine reports. */
const machine = (on: On) => {
	const state: { exitCode: number; stdout: string } = {
		exitCode: 0,
		stdout: reading(50)
	};
	const ran: string[] = [];
	on("process.run", () => ({
		value: {
			...state,
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false
		}
	}));
	on("tool.check", () => ({ decision: "allow" }));
	on("tool.call", { tool: "Bash" }, (_$, e) => {
		if (e.tool === "Bash") {
			ran.push(e.command);
		}
		return { result: "ok" };
	});
	return { state, ran };
};

describe("memory hold", () => {
	test("on a machine whose memory read throws, a token in a Bash result still reaches the model masked", async ($, on) => {
		// Arrange: no memory_pressure, no scanner, no env files.
		on("process.run", (_$, e) => {
			if (e.argv[0] === "memory_pressure") {
				throw new Error("spawn memory_pressure ENOENT");
			}
			return {
				value: {
					exitCode: 127,
					stdout: "",
					stderr: "",
					isStdoutTruncated: false,
					isStderrTruncated: false
				}
			};
		});
		on("session.root", () => ({ value: "/repo" }));
		on("fs.exists", () => ({ value: false }));
		on("tool.check", () => ({ decision: "allow" }));
		on("tool.call", { tool: "Bash" }, () => ({
			result: "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz0123"
		}));

		// Act
		const r = await $.tool.call({ tool: "Bash", command: "env" });

		// Assert
		expect(JSON.stringify(r)).not.toContain(
			"ghp_abcdefghijklmnopqrstuvwxyz0123"
		);
	});

	test("a Bash call is refused with the measured free share while free memory is under the floor", async ($, on) => {
		// Arrange
		const { state, ran } = machine(on);
		state.stdout = reading(12);

		// Act
		const low = await $.tool
			.call({ tool: "Bash", command: "echo low" })
			.catch((error: unknown) => error);

		// Assert
		expect(JSON.stringify(low)).toContain("12% free");
		expect(ran).toEqual([]);
	});

	test("a Bash call runs while free memory is above the floor", async ($, on) => {
		// Arrange
		const { state, ran } = machine(on);
		state.stdout = reading(35);

		// Act
		await $.tool.call({ tool: "Bash", command: "echo ok" });

		// Assert
		expect(ran).toHaveLength(1);
	});

	test("a Bash call runs when the reading fails or holds no figure", async ($, on) => {
		// Arrange
		const { state, ran } = machine(on);

		// Act
		state.exitCode = 1;
		state.stdout = "";
		await $.tool.call({ tool: "Bash", command: "echo failed" });
		state.exitCode = 0;
		state.stdout = "no reading here";
		await $.tool.call({ tool: "Bash", command: "echo unread" });

		// Assert
		expect(ran).toHaveLength(2);
		expect(ran[1]).toContain("echo unread");
	});
});
