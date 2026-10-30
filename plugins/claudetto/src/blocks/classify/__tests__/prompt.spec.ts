import { describe, expect, test } from "bun:test";
import { environmentEntries } from "../../../automode/environment.ts";
import { classifierRules } from "../prompt.ts";

describe("the classifier rules", () => {
	// The hook runs in every repository a user opens, so a fact read from this one would mislead its judge.
	test("carry no environment fact of this repository", () => {
		const rules = classifierRules();

		expect(
			environmentEntries().filter((entry) => rules.includes(entry)),
		).toEqual([]);
	});

	test("still carry an environment section", () => {
		expect(classifierRules()).toContain(`## Environment
- **Trusted internal domains**`);
	});
});
