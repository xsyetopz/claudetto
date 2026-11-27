import { describe, expect, test } from "claude-code/testing";

import { bashWorld, contextOf } from "./world";

const installNotes = (notes: readonly string[]) =>
	notes.filter((note) => note.includes("not installed"));

describe("notes on a program lookup", () => {
	test("GUARDS-091 a lookup that finds no program gets the install note", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		world.answer = {
			isError: true as const,
			result: "Error: Exit code 1\ntshark not found",
			text: "Exit code 1\ntshark not found"
		};

		// Act
		const r = await $.tool.call({ tool: "Bash", command: "which tshark" });

		// Assert
		expect(installNotes(contextOf(r))).toHaveLength(1);
		expect(installNotes(contextOf(r))[0]).toContain("tshark");
	});

	test("GUARDS-091 a lookup that finds the program gets no install note", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		world.answer = {
			result: { stdout: "/opt/homebrew/bin/tshark\n", stderr: "" }
		};

		// Act
		const r = await $.tool.call({ tool: "Bash", command: "command -v tshark" });

		// Assert
		expect(installNotes(contextOf(r))).toEqual([]);
	});
});
