import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { scanner } from "../../secrets.mock.ts";

const lab = (on: On) => {
	scanner(on);
	on("classic.Stop", () => ({}));
	on("session.messages", () => ({ value: [] }));
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
};

const stop = ($: Engine, reply: string) =>
	$.classic.Stop({
		stop_hook_active: false,
		last_assistant_message: reply,
		background_tasks: [],
	});

for (const reply of [
	"You're right: my own commit is mine to finish.",
	"You’re right, the test passes the bug.",
	"You are correct. The file holds two entries.",
	"Good catch — the path was wrong.",
	"Fair point. The flag is unset.",
	"Agreed, and the fix keeps a sandbox in place.",
]) {
	test(`a reply that opens by agreeing is blocked: ${reply}`, async ($: Engine, on: On) => {
		lab(on);

		const out = await stop($, reply);

		expect(out.block).toContain("agree");
	});
}

test("a reply that opens with the fact passes", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"The commit failed at the Swift guard. You're right that it is mine to finish.",
	);

	expect(out.block).toBeUndefined();
});
