import { describe, expect, test } from "bun:test";
import { repeatedText, signature } from "../denials.ts";
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
});

describe("the refusal of a call denied with no reason", () => {
	const held = {
		[signature("Bash", { command: "tmux new-session -d claude" })]: {
			count: 2,
			reason:
				"The server-side auto mode classifier judged this action dangerous (it gave no explanation)",
		},
	};
	const refusal = repeatedText(held, "Bash", {
		command: "tmux new-session -d claude",
	});

	test("says that the classifier gave no reason", () => {
		expect(refusal).toContain("gave no reason");
	});

	test("names the `! <command>` form with the exact command", () => {
		expect(refusal).toContain("`! tmux new-session -d claude`");
	});

	test("keeps the plain refusal for a denial that has a reason", () => {
		const plain = repeatedText(
			{ [signature("Bash", { command: "ls" })]: { count: 2, reason: REASON } },
			"Bash",
			{ command: "ls" },
		);
		expect(plain).toContain(REASON);
		expect(plain).not.toContain("gave no reason");
	});
});
