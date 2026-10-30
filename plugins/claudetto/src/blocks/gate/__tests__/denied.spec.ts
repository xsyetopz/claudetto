import { describe, expect, test } from "bun:test";
import { DENY_REPEATED_CALL } from "../prompts.ts";

const REASON =
	"[Data Exfiltration] The call posts a file of the project to a host outside it.";

const RULE = "Bash(curl:*)";

const text = DENY_REPEATED_CALL({ count: 2, reason: REASON, rule: RULE });

describe("the text a denied call gets", () => {
	test("carries the reason of the denial", () => {
		expect(text).toContain(REASON);
	});

	test("carries the exact rule to add and where it goes", () => {
		expect(text).toContain(`\`"${RULE}"\``);
		expect(text).toContain("permissions.allow");
	});

	for (const hint of [
		"retry",
		"try again",
		"instead",
		"workaround",
		"bypass",
	]) {
		test(`offers no ${hint}`, () => {
			expect(text.toLowerCase()).not.toContain(hint);
		});
	}
});
