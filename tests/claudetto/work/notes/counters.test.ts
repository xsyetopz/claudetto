// The counters of the slice `notes`: back-off, dedupe, one note at a time, and the repeat counts.

import { expect, test } from "bun:test";
import {
	admit,
	clearFail,
	countAsk,
	countFail,
	EMPTY,
	type Notes,
	signOf,
	skipFor,
	typedPast,
	used,
} from "../../../../plugins/claudetto/modules/work/notes/domain/counters.ts";

const note = (line: string) => ({ tag: "Heads up", line, explain: line });

/** The state after the user typed past `n` notes in a row. */
const ignoredRun = (n: number): Notes => {
	let state = EMPTY;
	for (let i = 0; i < n; i++) {
		state = { ...state, skip: 0 };
		state = admit(state, note(`line ${i}`));
		state = typedPast(typedPast(state));
	}
	return state;
};

test("the back-off is 2^(n-3) checks for n of 3 or more, up to 16", () => {
	expect([0, 1, 2, 3, 4, 5, 9].map(skipFor)).toEqual([0, 0, 0, 1, 2, 4, 16]);
});

test("after 4 ignored notes the next 2 checks are skipped", () => {
	let state = ignoredRun(4);
	expect(state.skip).toBe(2);
	state = admit(state, note("a"));
	state = admit(state, note("b"));
	expect(state.shown).toBeNull();
	expect(admit(state, note("c")).shown?.line).toBe("c");
});

test("a note stays for 2 prompts, and a note that the user used ends the run", () => {
	let state = admit(EMPTY, note("a"));
	state = typedPast(state);
	expect(state.shown?.left).toBe(1);
	expect(typedPast(state).shown).toBeNull();
	expect(used(ignoredRun(4)).ignored).toBe(0);
});

test("a line that matches one of the last 50 lines shows no note", () => {
	const recent = [
		"same line",
		...Array.from({ length: 49 }, (_, i) => `other ${i}`),
	];
	expect(admit({ ...EMPTY, recent }, note("Same Line")).shown).toBeNull();
	const full = admit({ ...EMPTY, recent }, note("new line"));
	expect(full.recent).toHaveLength(50);
	expect(full.recent).not.toContain("same line");
});

test("the newer note replaces the older one", () => {
	const state = admit(admit(EMPTY, note("a")), note("b"));
	expect(state.shown?.line).toBe("b");
});

test("notes off show nothing", () => {
	expect(admit({ ...EMPTY, isOff: true }, note("a")).shown).toBeNull();
});

test("the same failing test in a row counts up, another test restarts, and a pass clears", () => {
	let s = EMPTY;
	const counts: number[] = [];
	for (const sign of ["t1", "t1", "t2", "t2", "t2"]) {
		const c = countFail(s, "just check", sign);
		s = c.state;
		counts.push(c.count);
	}
	expect(counts).toEqual([1, 2, 1, 2, 3]);
	expect(clearFail(s, "just check").fails).toEqual({});
});

test("the same rule counts up", () => {
	const a = countAsk(EMPTY, "Bash(rm:*)");
	expect(
		countAsk(countAsk(a.state, "Bash(rm:*)").state, "Bash(rm:*)").count,
	).toBe(3);
});

test("the failing test is the first fail line", () => {
	expect(signOf("a\n(fail) parses a goal [2ms]\nFAIL other")).toBe(
		"parses a goal [2ms]",
	);
	expect(signOf("all fine")).toBe("");
});
