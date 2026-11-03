import { describe, expect, test } from "bun:test";
import type { ScreenState } from "../screen.ts";
import { newTurns, nextAction } from "../turns.ts";

const run = (states: readonly ScreenState[], prompts: number): string[] => {
	const turns = newTurns();
	return states.map((state) => nextAction(state, turns, prompts));
};

describe("nextAction", () => {
	test("types the first prompt once the input box has stayed idle for three reads", () => {
		expect(run(["starting", "idle", "idle", "idle"], 2)).toEqual([
			"wait",
			"wait",
			"wait",
			"type",
		]);
	});

	test("after a prompt, waits through idle reads until its turn has shown busy, then types the next one", () => {
		expect(
			run(
				[
					"idle",
					"idle",
					"idle",
					"idle",
					"idle",
					"idle",
					"busy",
					"idle",
					"idle",
					"idle",
				],
				2,
			),
		).toEqual([
			"wait",
			"wait",
			"type",
			"wait",
			"wait",
			"wait",
			"wait",
			"wait",
			"wait",
			"type",
		]);
	});

	test("ends once the last prompt's turn has run and gone idle", () => {
		expect(
			run(["idle", "idle", "idle", "busy", "idle", "idle", "idle"], 1).at(-1),
		).toBe("finished");
	});

	test("goes on after a long idle when a turn ended before any read saw it busy", () => {
		const actions = run(
			[
				...Array.from({ length: 3 }, (): ScreenState => "idle"),
				...Array.from({ length: 30 }, (): ScreenState => "idle"),
			],
			2,
		);

		expect(actions.filter((action) => action === "type")).toHaveLength(2);
	});

	test("chooses `Yes` in the trust dialog before it confirms, and denies a permission question", () => {
		expect(run(["trust-move", "trust", "asking"], 1)).toEqual([
			"down",
			"enter",
			"escape",
		]);
	});
});
