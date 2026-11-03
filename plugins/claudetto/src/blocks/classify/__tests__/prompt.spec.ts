import { describe, expect, test } from "bun:test";
import { SOFT_RULES } from "../../../automode/rules.ts";
import { CLASSIFIER_RULES_CAP, classifierRules } from "../prompt.ts";

describe("the classifier rules", () => {
	test("still carry an environment section", () => {
		expect(classifierRules()).toContain(`## Environment
- **Trusted internal domains**`);
	});

	// Every tool call that is not read-only sends this text, so its length is paid on each one.
	test("stay within their cap", () => {
		expect(classifierRules().length).toBeLessThanOrEqual(CLASSIFIER_RULES_CAP);
	});

	// The model writes the verdict last, so the reason it states decides the verdict.
	test("ask for the reason before the block", () => {
		const rules = classifierRules();
		expect(rules.indexOf("<reason>")).toBeGreaterThan(-1);
		expect(rules.indexOf("<reason>")).toBeLessThan(rules.indexOf("<block>"));
	});

	// The list of surfaces bounds the rule, and the paid cases `doc-comment-in-test`, `docs-file-edit`,
	// and `nested-claude-in-tmux` check that the classifier reads it so.
	test("bound `Rewire the Agent` by its list of instruction surfaces alone", () => {
		const rule = SOFT_RULES.find((r) => r.name === "Rewire the Agent");
		expect(rule?.text).toContain(
			"what this or a later agent reads as instructions",
		);
		expect(rule?.text).toContain("output styles");
		expect(rule?.text).not.toContain("are not instruction surfaces");
	});

	test("state the reason and the allow step as what to write and do", () => {
		const rules = classifierRules();
		expect(rules).not.toContain("no rule name");
		expect(rules).not.toContain("Never block for");
	});

	test("name each soft rule with what the user must name, in the frame's own words", () => {
		const rules = classifierRules();
		for (const rule of SOFT_RULES) {
			expect(rules).toContain(`${rule.name} (must name ${rule.mustName}):`);
		}
		expect(rules).not.toContain("named+specifics");
	});
});
