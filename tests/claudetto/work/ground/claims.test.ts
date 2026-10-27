// One test for each kind of claim of the table of 2026-10-17 (`trim-0-2-0`, step 9):
// the claim fails with no source and passes with its source.

import { expect, test } from "bun:test";
import {
	type Files,
	findUnsourced,
	type Msg,
} from "../../../../plugins/claudetto/modules/work/ground/domain/claims.ts";
import {
	inScenario,
	planText,
} from "../../../../plugins/claudetto/modules/work/ground/domain/plan.ts";

const msg = (role: Msg["role"], text: string, results: string[] = []): Msg => ({
	role,
	text,
	results,
});
const none: Files = {};

test("a number with no source fails, and a number in a user message or a tool result passes", () => {
	const text = "The goal prints 9000 or less, and the repo has 31,839 lines.";
	expect(findUnsourced(text, [], none)).toHaveLength(2);
	const msgs = [
		msg("user", "Keep it at 9000."),
		msg("user", "", ["33,219 total", "31839"]),
	];
	expect(findUnsourced(text, msgs, none)).toStrictEqual([]);
});

test("a number that is a date, a version, a short number, or marked `(proposed)` passes", () => {
	expect(
		findUnsourced("On 2026-10-17 at 0.2.0 of step 12.", [], none),
	).toStrictEqual([]);
	expect(findUnsourced("The bound is 9000 (proposed)", [], none)).toStrictEqual(
		[],
	);
	expect(
		findUnsourced("9000 [NEEDS CLARIFICATION: which bound?]", [], none),
	).toStrictEqual([]);
});

test("a number in a fenced code block passes", () => {
	expect(findUnsourced("```\nout: 31839\n```", [], none)).toStrictEqual([]);
});

test("a reference to a line out of range fails, a line in range passes, and a file that does not resolve is skipped", () => {
	const text = "See `setup/slice.ts:119` and `setup/facts.ts:5-15`.";
	expect(findUnsourced(text, [], none)).toStrictEqual([]);
	expect(
		findUnsourced(text, [msg("user", "setup/slice.ts:119")], none),
	).toStrictEqual([]);
	const files = {
		"setup/slice.ts": "a\n".repeat(50),
		"setup/facts.ts": "a\n".repeat(20),
	};
	const unsourced = findUnsourced(text, [], files);
	expect(unsourced).toHaveLength(1);
	expect(unsourced[0]).toContain("`setup/slice.ts:119`");
	expect(unsourced[0]).toContain("50");
	expect(findUnsourced("See setup/facts.ts:5-15.", [], files)).toStrictEqual(
		[],
	);
});

test("an attribution, a claim of done, or a package manager command in prose is no claim", () => {
	const files: Files = { "bun.lock": "", "uv.lock": "" };
	for (const line of [
		"The user chose a weekly release schedule.",
		"The tests pass now.",
		"Run `npx markdownlint-cli2` for the docs.",
		"Run pip install x first.",
	]) {
		expect(findUnsourced(line, [msg("user", "Go.")], files)).toStrictEqual([]);
	}
});

test("`planText` reads a plan file and no other call", () => {
	const w = {
		tool: "Write",
		file_path: "/p/openspec/changes/c/tasks.md",
		content: "x",
	};
	expect(planText(w)).toBe("x");
	expect(
		planText({ tool: "Edit", file_path: "/p/design.md", new_string: "y" }),
	).toBe("y");
	expect(
		planText({ tool: "Write", file_path: "/p/src/a.ts", content: "x" }),
	).toBeNull();
});

test("a number in the name of a standard is no claim, and the same number in plain prose fails", () => {
	const text = "Files use ISO 8601 basic time, RFC 3339 stamps, and RFC 7763.";
	expect(findUnsourced(text, [], none)).toStrictEqual([]);
	expect(findUnsourced("The port is 8601 here.", [], none)).toHaveLength(1);
});

test("a number with an underscore separator in a tool result is a source", () => {
	const text = "The cap is 1,000,000 characters.";
	expect(findUnsourced(text, [], none)).toHaveLength(1);
	const msgs = [msg("user", "", ["export const MAX = 1_000_000;"])];
	expect(findUnsourced(text, msgs, none)).toStrictEqual([]);
});

test("a number that is the difference of two cells of its row passes, and a number that is not fails", () => {
	const row = (d: string) => `| lsp | 3,257 | 2,252 | ${d} |`;
	const msgs = [msg("user", "", ["lsp 3257 and 2252"])];
	expect(findUnsourced(row("+1,005"), msgs, none)).toStrictEqual([]);
	expect(findUnsourced(row("+1,006"), msgs, none)).toHaveLength(1);
});

test("a sum or a difference of two numbers in prose is no source, and a doubled number fails", () => {
	const msgs = [msg("user", "", ["500 and 700"])];
	expect(findUnsourced("The total is 1200.", msgs, none)).toHaveLength(1);
	expect(findUnsourced("We cut it to 1000 from 500.", msgs, none)).toHaveLength(
		1,
	);
});

test("a size in a binary unit passes with its value in bytes, and fails with another value", () => {
	expect(
		findUnsourced("The cap is 16 MiB (16,777,216 bytes).", [], none),
	).toStrictEqual([]);
	expect(
		findUnsourced("The cap is 16 MiB (16,777,217 bytes).", [], none),
	).toHaveLength(1);
});

test("a total of three rows or more passes, and a total that is not the sum fails", () => {
	const rows = [
		"| Part | Lines |",
		"| --- | --- |",
		"| a | 1,000 |",
		"| b | 2,000 |",
		"| c | 4,000 |",
	];
	const msgs = [msg("user", "", ["1000 2000 4000"])];
	const table = (total: string) => [...rows, `| Total | ${total} |`].join("\n");
	expect(findUnsourced(table("7,000"), msgs, none)).toStrictEqual([]);
	expect(findUnsourced(table("7,001"), msgs, none)).toHaveLength(1);
	// Two rows only: the total 3,000 is not enough evidence.
	expect(
		findUnsourced(
			["| a | 1,000 |", "| b | 2,000 |", "| Total | 3,000 |"].join("\n"),
			[msg("user", "", ["1000 2000"])],
			none,
		),
	).toHaveLength(1);
});

test("the number after a standard name is a claim", () => {
	expect(findUnsourced("RFC 9110 has 7777 cases.", [], none)).toHaveLength(1);
});

test("an answer of `AskUserQuestion` counts as a source", () => {
	const ask = { ...msg("assistant", ""), answers: ['"Cap?"="4096"'] };
	expect(findUnsourced("The cap is 4096.", [ask], none)).toStrictEqual([]);
	expect(findUnsourced("The cap is 8192.", [ask], none)).toHaveLength(1);
});

test("`planText` skips the scenario blocks of a spec file, a test file, and a fixture", () => {
	const spec = "/p/openspec/changes/c/specs/x/spec.md";
	const content =
		"#### Scenario: A\n\n- 292 lines\n\n### Requirement: B\n\n- 777";
	expect(planText({ tool: "Write", file_path: spec, content })).toBe(
		"### Requirement: B\n\n- 777",
	);
	for (const file_path of [
		"/p/openspec/changes/c/a.test.ts",
		"/p/openspec/changes/c/fixtures/a.md",
	]) {
		expect(planText({ tool: "Write", file_path, content })).toBeNull();
	}
});

test("`inScenario` is true for text inside a scenario block, and false after the next heading", () => {
	const file = "### R\n\nx 1\n\n#### Scenario: A\n\n- 292\n\n### R2\n\n- 777";
	expect(inScenario(file, "292")).toBe(true);
	expect(inScenario(file, "777")).toBe(false);
	expect(inScenario(file, "none")).toBe(false);
});
