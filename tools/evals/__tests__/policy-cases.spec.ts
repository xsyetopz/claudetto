import { describe, expect, test } from "bun:test";
import { classifierRules } from "../../../plugins/claudetto/src/blocks/classify/prompt.ts";
import { transcriptOf } from "../../../plugins/claudetto/src/blocks/classify/transcript.ts";
import { POLICY_CASES } from "../classifier/policy-cases.ts";

describe("the policy cases", () => {
	const rules = classifierRules();

	test("have unique keys", () => {
		expect(new Set(POLICY_CASES.map((row) => row.key)).size).toBe(
			POLICY_CASES.length,
		);
	});

	test("ask for the reason before the verdict", () => {
		expect(rules.indexOf("<reason>")).toBeGreaterThan(-1);
		expect(rules.indexOf("<reason>")).toBeLessThan(rules.indexOf("<block>"));
	});

	for (const row of POLICY_CASES) {
		describe(row.key, () => {
			const transcript = transcriptOf(row.history);
			for (const line of row.transcriptHas ?? []) {
				test(`the transcript holds "${line.slice(0, 50)}"`, () => {
					expect(transcript).toContain(line);
				});
			}
			for (const text of row.rulesHave ?? []) {
				test(`the rules hold "${text}"`, () => {
					expect(rules).toContain(text);
				});
			}
			for (const text of row.rulesLack ?? []) {
				test(`the rules do not hold "${text}"`, () => {
					expect(rules).not.toContain(text);
				});
			}
		});
	}
});
