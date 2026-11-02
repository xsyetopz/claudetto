import { describe, expect, test } from "bun:test";
import type { Difference } from "../diff.ts";
import { askKept, KEEP_MINE, questionsOf } from "../questions.ts";
import { CODE_RULES } from "../rules.ts";

const diff = (id: string, group = "Models and windows"): Difference => ({
	id,
	group,
	claudetto: "x",
});

const ids = (count: number, group?: string): Difference[] =>
	Array.from({ length: count }, (_, i) => diff(`key${i}`, group));

describe("`questionsOf` makes questions the dialog can show", () => {
	test("a group of nine keys becomes three questions of at most four options", () => {
		const questions = questionsOf(ids(9));

		expect(questions.map((q) => q.options.length)).toEqual([4, 4, 2]);
	});

	test("a question of one key is padded with the keep-mine label so the dialog has two options", () => {
		const [only] = questionsOf(ids(1));

		expect(only?.options).toEqual(["key0", KEEP_MINE]);
		expect(only?.multiSelect).toBe(false);
	});

	test("a header is at most twelve characters", () => {
		for (const q of questionsOf(ids(2, "Sandbox and auto mode"))) {
			expect(q.header.length).toBeLessThanOrEqual(12);
		}
	});

	test("the `sandbox.enabled` pair is one single-select question with a neither label", () => {
		const questions = questionsOf([
			diff("sandbox.enabled", "Sandbox and auto mode"),
			diff("sandbox.enabled=false", "Sandbox and auto mode"),
			diff("sandbox.network.allowLocalBinding=true", "Sandbox and auto mode"),
		]);

		const pair = questions.find((q) => q.options.includes("sandbox.enabled"));
		expect(pair?.multiSelect).toBe(false);
		expect(pair?.options).toEqual([
			"sandbox.enabled",
			"sandbox.enabled=false",
			KEEP_MINE,
		]);
		expect(questions).toHaveLength(2);
	});

	test("the code rules file is a question of its own", () => {
		const questions = questionsOf([
			...ids(2),
			{ id: CODE_RULES, group: "Code rules", claudetto: "the shipped file" },
		]);

		const rules = questions.filter((q) => q.options.includes(CODE_RULES));
		expect(rules).toHaveLength(1);
		expect(rules[0]?.options).toEqual([CODE_RULES, KEEP_MINE]);
	});

	test("a question names the user's value and claudetto's value of each key", () => {
		const [q] = questionsOf([
			{ id: "model", group: "G", now: "opus", claudetto: "fable" },
		]);

		expect(q?.text).toContain("model");
		expect(q?.text).toContain('"opus"');
		expect(q?.text).toContain('"fable"');
	});
});

describe("`askKept` returns the ids that were kept", () => {
	test("it keeps the labels of every answer and drops the keep-mine label and free text", async () => {
		const answers = ["key0,key2", KEEP_MINE, "typed under Other"];
		const kept = await askKept(
			async () => answers.shift() ?? "",
			[
				...ids(4),
				...ids(1).map((d) => ({ ...d, id: "other" })),
				diff("z", "Other"),
			],
		);

		expect(kept).toEqual(["key0", "key2"]);
	});

	test("a dismissed dialog gives `undefined`, so nothing is written", async () => {
		const kept = await askKept(async () => {
			throw new Error("dismissed");
		}, ids(2));

		expect(kept).toBeUndefined();
	});
});
