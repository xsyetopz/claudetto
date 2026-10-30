import { expect, test } from "bun:test";
import {
	activeMark,
	GOAL_CHARS_MAX,
	GOAL_TEXT_MAX,
	goalArgs,
	OUTPUT_TAIL_CHARS,
	outputTail,
} from "../goal.ts";
import { GOAL_CAP, RETRY, START } from "../prompts.ts";

test("no args asks for the status", () => {
	expect(goalArgs("  ")).toEqual({ kind: "status" });
});

test("each word the built-in `/goal` clears with clears, in any case", () => {
	for (const word of ["clear", "stop", "off", "reset", "none", "CANCEL"]) {
		expect(goalArgs(word)).toEqual({ kind: "clear" });
	}
});

test("a shell command sets the goal, with one pair of backticks cut", () => {
	expect(goalArgs(" just check ")).toEqual({
		kind: "set",
		check: "just check",
	});
	expect(goalArgs("`bun test`")).toEqual({ kind: "set", check: "bun test" });
});

test("a slash command is refused, and a path is not", () => {
	expect(goalArgs("/claudetto:setup")).toEqual({
		kind: "slash",
		check: "/claudetto:setup",
	});
	expect(goalArgs("/usr/bin/true")).toEqual({
		kind: "set",
		check: "/usr/bin/true",
	});
});

test("a command over the limit is refused with its length", () => {
	const long = "x".repeat(GOAL_CHARS_MAX + 1);
	expect(goalArgs(long)).toEqual({ kind: "long", length: long.length });
	expect(goalArgs("x".repeat(GOAL_CHARS_MAX)).kind).toBe("set");
});

test("the active mark reads as the built-in's, with the age in its largest unit", () => {
	expect(activeMark(59_999)).toBe("◎ /goal active");
	expect(activeMark(37 * 60_000 + 59_000)).toBe("◎ /goal active (37m)");
	expect(activeMark(2 * 3_600_000 + 1)).toBe("◎ /goal active (2h)");
	expect(activeMark(86_400_000)).toBe("◎ /goal active (1d)");
});

test("the output keeps its last characters, where the error is", () => {
	const tail = outputTail(`${"a".repeat(OUTPUT_TAIL_CHARS)}\n`, "boom");
	expect(tail).toHaveLength(OUTPUT_TAIL_CHARS);
	expect(tail.endsWith("boom")).toBe(true);
});

test("each text the model reads stays within the limit at the longest command and output", () => {
	const check = "x".repeat(GOAL_CHARS_MAX);
	const output = "y".repeat(OUTPUT_TAIL_CHARS);
	expect(GOAL_TEXT_MAX).toBe(4000);
	expect(START({ check }).length).toBeLessThanOrEqual(GOAL_TEXT_MAX);
	expect(RETRY({ check, output }).length).toBeLessThanOrEqual(GOAL_TEXT_MAX);
	expect(GOAL_CAP({ check }).length).toBeLessThanOrEqual(GOAL_TEXT_MAX);
});
