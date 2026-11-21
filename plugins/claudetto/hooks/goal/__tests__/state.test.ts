import { describe, expect, test } from "claude-code/testing";

import {
	capNote,
	capOf,
	DEFAULT_CAP,
	endGoal,
	isNearCap,
	setGoal,
	type Tracker
} from "../state";

describe("goal state", () => {
	test("reads the cap from the environment, defaulting when unset or invalid", () => {
		// Arrange, Act and Assert
		expect(capOf()).toBe(DEFAULT_CAP);
		expect(capOf("abc")).toBe(DEFAULT_CAP);
		expect(capOf("-3")).toBe(DEFAULT_CAP);
		expect(capOf("2")).toBe(2);
		expect(capOf("0")).toBe(0);
	});

	test("warns from two blocks before the cap and never when the cap is off", () => {
		// Arrange, Act and Assert
		expect(isNearCap(5, 8)).toBe(false);
		expect(isNearCap(6, 8)).toBe(true);
		expect(isNearCap(8, 8)).toBe(true);
		expect(isNearCap(50, 0)).toBe(false);
	});

	test("the cap note names the count, the limit and the ways out", () => {
		// Arrange and Act
		const note = capNote(7, 8);

		// Assert
		expect(note).toContain("7 times");
		expect(note).toContain("after 9");
		expect(note).toContain("clear_goal");
		expect(note).toContain("pause_goal");
	});

	test("a paused goal keeps its condition until a new goal is set", () => {
		// Arrange
		const tracker: Tracker = {};
		setGoal(tracker, "tests pass");

		// Act
		endGoal(tracker, true);

		// Assert
		expect(tracker).toEqual({ paused: "tests pass" });
		setGoal(tracker, "lint passes");
		expect(tracker).toEqual({ goal: { condition: "lint passes", blocks: 0 } });
	});
});
