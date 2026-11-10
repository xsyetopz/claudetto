import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { scanner } from "../secrets.mock.ts";

const user = (text: string) => ({ role: "user", text, toolUses: [] });
const used = (tool: string) => ({
	role: "assistant",
	text: "",
	toolUses: [{ tool, id: "t" }],
});

const REPLY = "Fix total() by removing slice(1). The cache never expires.";
const found = (code: string, quote = "Fix total() by removing slice(1).") =>
	JSON.stringify({ faults: [{ code, quote }] });

type Verdict = string | "fail" | "unanswered";

const lab = (
	on: On,
	messages: unknown[],
	verdict: Verdict,
	seen: string[] = [],
) => {
	on("classic.Stop", () => ({}));
	on("session.messages", () => ({ value: messages }));
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("model.complete", (_$, e) => {
		seen.push(e.prompt);
		if (verdict === "fail") {
			throw new Error("timed out");
		}
		return {
			value: {
				isAnswered: verdict !== "unanswered",
				text: verdict,
				usage: { inputTokens: 1, outputTokens: 1 },
			},
		};
	});
};
const stop = ($: Engine, active = false, reply = REPLY) =>
	$.classic.Stop({
		stop_hook_active: active,
		last_assistant_message: reply,
		background_tasks: [],
	});

test("a claim about the work with no tool this turn gets one block", async ($: Engine, on: On) => {
	lab(on, [user("I fixed it. Write the commit message.")], found("unchecked"));
	expect((await stop($)).block).toContain("Check the workspace");
	expect((await stop($, true)).block).toBeUndefined();
});

test("a turn that read the workspace is not offered the unchecked-claim or rules faults", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("I fixed it."), used("Read")], found("unchecked"), seen);
	expect((await stop($)).block).toBeUndefined();
	expect(seen).toHaveLength(1);
	expect(seen[0]).not.toContain("- unchecked:");
	expect(seen[0]).not.toContain("- rules:");
});

test("a reply the grader finds no fault in passes", async ($: Engine, on: On) => {
	lab(on, [user("hello")], '{"faults":[]}');
	expect((await stop($)).block).toBeUndefined();
});

const FIXES = {
	credited: "credits the user",
	rules: "recited the rules",
	unfiled: "open-issues file",
	fallback: "fallback or a compatibility path",
};

for (const [code, fix] of Object.entries(FIXES)) {
	test(`the ${code} fault blocks once with its own fix`, async ($: Engine, on: On) => {
		lab(on, [user("what is open?")], found(code));
		expect((await stop($)).block).toContain(fix);
		expect((await stop($, true)).block).toBeUndefined();
	});
}

test("several faults make one block that holds each fix", async ($: Engine, on: On) => {
	lab(
		on,
		[user("what is open?")],
		JSON.stringify({
			faults: [
				{ code: "rules", quote: "Fix total()" },
				{ code: "credited", quote: "The cache never expires." },
			],
		}),
	);
	const block = (await stop($)).block ?? "";
	expect(block).toContain("recited the rules");
	expect(block).toContain("credits the user");
});

test("a fault whose quote is not in the reply passes", async ($: Engine, on: On) => {
	lab(on, [user("x")], found("credited", "words the reply never held"));
	expect((await stop($)).block).toBeUndefined();
});

test("a fault whose code the turn ruled out passes", async ($: Engine, on: On) => {
	lab(on, [user("x"), used("Read")], found("rules"));
	expect((await stop($)).block).toBeUndefined();
});

for (const verdict of ["fail", "unanswered", "not json"] as const) {
	test(`a grader call that is ${verdict} passes`, async ($: Engine, on: On) => {
		lab(on, [user("x")], verdict);
		expect((await stop($)).block).toBeUndefined();
	});
}

test("a turn that wrote the issues file is not offered the unfiled fault", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("fix the typo"), used("Read")], found("unfiled"), seen);
	scanner(on);
	on("tool.call", () => ({ result: {} }));
	await $.tool.call({
		tool: "Edit",
		tool_use_id: "t1",
		file_path: "/repo/ISSUES-2026-11-06.md",
		old_string: "a",
		new_string: "b",
	});
	expect((await stop($)).block).toBeUndefined();
	expect(seen[0]).not.toContain("- unfiled:");
	await stop($, true);
	await stop($);
	expect(seen.at(-1)).toContain("- unfiled:");
});

test("the grader sees the earlier person and assistant messages", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(
		on,
		[
			user("label only the red rows"),
			{ role: "assistant", text: "Done, 5 rows.", toolUses: [] },
			user("now summarize"),
		],
		'{"faults":[]}',
		seen,
	);
	await stop($);
	expect(seen[0]).toContain("- label only the red rows");
	expect(seen[0]).toContain("- Done, 5 rows.");
	expect(seen[0]).toContain(
		"User message that opened this turn: now summarize",
	);
});
