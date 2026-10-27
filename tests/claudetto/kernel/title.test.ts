// Tests of the Chicago Title Case function of `kernel/text.ts` (task 10.11).

import { expect, test } from "bun:test";
import { titleCase } from "../../../plugins/claudetto/kernel/text.ts";

test("the first and last word and each major word get a capital", () => {
	expect(titleCase("the quick brown fox")).toBe("The Quick Brown Fox");
	expect(titleCase("what to look for")).toBe("What to Look For");
});

test("an article, a coordinating conjunction, and a preposition stay in lower case in the middle", () => {
	expect(titleCase("Guide To The Art Of War And Peace")).toBe(
		"Guide to the Art of War and Peace",
	);
	expect(titleCase("Fix a bug in the parser from a file")).toBe(
		"Fix a Bug in the Parser from a File",
	);
	expect(titleCase("Trading For Time Or Space")).toBe(
		"Trading for Time or Space",
	);
});

test("the first word and the last word get a capital, also a small word", () => {
	expect(titleCase("of mice and men")).toBe("Of Mice and Men");
	expect(titleCase("what the code is up to")).toBe("What the Code Is Up To");
});

test("the word after a colon gets a capital", () => {
	expect(titleCase("hooks: a guide to the hooks")).toBe(
		"Hooks: A Guide to the Hooks",
	);
});

test("a code span stays as typed, also with a space inside", () => {
	expect(titleCase("use `git stash` in the guard")).toBe(
		"Use `git stash` in the Guard",
	);
	expect(titleCase("the `tool.call` hook")).toBe("The `tool.call` Hook");
});

test("a word with a digit or an inner capital, a path, a file name, and an all-caps word stay as typed", () => {
	expect(titleCase("add iOS support for x86 and the API")).toBe(
		"Add iOS Support for x86 and the API",
	);
	expect(titleCase("edit kernel/text.ts and package.json")).toBe(
		"Edit kernel/text.ts and package.json",
	);
	expect(titleCase("pass --title to gh")).toBe("Pass --title to Gh");
});

test("a hyphenated compound has a capital on the first part and each major part", () => {
	expect(titleCase("a state-of-the-art tool")).toBe("A State-of-the-Art Tool");
	expect(titleCase("a read-only mode")).toBe("A Read-Only Mode");
});

test("a compound with a prefix keeps the second part in lower case", () => {
	expect(titleCase("an anti-intellectual stance")).toBe(
		"An Anti-intellectual Stance",
	);
	expect(titleCase("Non-Native Speakers")).toBe("Non-native Speakers");
});

test("punctuation stays and the spaces stay", () => {
	expect(titleCase("what is a hook?")).toBe("What Is a Hook?");
	expect(titleCase("(the old way)  and the new")).toBe(
		"(The Old Way)  and the New",
	);
});

test("a title in the right case does not change, and an empty title stays empty", () => {
	const right = "Fresh Install of the `claudetto` Plugin";
	expect(titleCase(right)).toBe(right);
	expect(titleCase("")).toBe("");
});
