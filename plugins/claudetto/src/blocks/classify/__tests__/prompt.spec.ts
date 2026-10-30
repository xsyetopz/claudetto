import { describe, expect, test } from "bun:test";
import { classifierRules } from "../prompt.ts";

describe("the classifier rules", () => {
	test("still carry an environment section", () => {
		expect(classifierRules()).toContain(`## Environment
- **Trusted internal domains**`);
	});
});
