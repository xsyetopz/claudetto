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

	test("name each soft rule with what the user must name, in the frame's own words", () => {
		const rules = classifierRules();
		for (const rule of SOFT_RULES) {
			expect(rules).toContain(`${rule.name} (must name ${rule.mustName}):`);
		}
		expect(rules).not.toContain("named+specifics");
	});
});
