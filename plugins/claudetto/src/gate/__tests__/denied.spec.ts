// Denied Calls Stop (`specs/permission-policy/spec.md`): after a denial the model is told to stop
// and report, with the reason and the exact rule to add, and is not sent looking for another way.
//
// The case reads the returned text for the two values it was given and for the vocabulary of a
// retry, and not for the wording of the sentence, which `~/.claude/rules/claudetto-tests.md` keeps
// out of a test. The refusal itself is raised at `tool.check` and not in the `PermissionDenied`
// hook, because that event's only output is `retry` and it cannot carry our reason
// (`design.md`, "Auto Mode"); the count that reaches this text is the denial counter.

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

	// Each word below is what a hint to work around a denial is written with. None is in the text,
	// and one appearing would mean the model was sent to find another path to a refused call. The
	// text is lowered first, because `Try again` at the start of a sentence is the same hint.
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
