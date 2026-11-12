import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { scanner } from "../secrets.mock.ts";
import { GRADE_FAULTS, VERIFY_BLOCK, VERIFY_UNREAD } from "../texts-grade.ts";
import { found, lab, stop, used, user } from "./verify.mock.ts";

test("a claim about the work with no tool this turn gets one block", async ($: Engine, on: On) => {
	lab(on, [user("I fixed it. Write the commit message.")], found("unchecked"));
	const awaited = await stop($);
	expect(awaited.block).toContain("Check the workspace");
	const awaited2 = await stop($, true);
	expect(awaited2.block).toBeUndefined();
});

test("a turn that read the workspace is not offered the unchecked-claim or rules faults", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("I fixed it."), used("Read")], found("unchecked"), seen);
	const awaited3 = await stop($);
	expect(awaited3.block).toBeUndefined();
	expect(seen).toHaveLength(1);
	expect(seen[0]).not.toContain("- unchecked:");
	expect(seen[0]).not.toContain("- rules:");
});

const askedTurn: SessionMessage[] = [
	user("The timeout is 30s, right?"),
	{
		role: "assistant",
		text: "",
		toolUses: [{ tool: "Read", tool_use_id: "t1", input: {}, isError: true }],
	},
];

test("a turn whose only lookup was denied is still offered the unchecked-claim fault", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, askedTurn, found("unchecked"), seen);
	on("tool.check", () => ({ decision: "deny", reason: "answer first" }));
	await $.tool.check({
		tool: "Read",
		input: { file_path: "/p/a.ts" },
		tool_use_id: "t1",
	});
	const awaited4 = await stop($);
	expect(awaited4.block).toContain("Check the workspace");
	expect(seen[0]).toContain("- unchecked:");
});

const askedCall = async ($: Engine, on: On, error: string) => {
	scanner(on);
	// The lab refuses an ask itself inside `tool.call`; the CLI settles it outside the plugin and hands back the result below.
	let checks = 0;
	on("tool.check", () =>
		checks++ === 0
			? { decision: "ask", reason: "read needs approval" }
			: { decision: "allow" },
	);
	on("tool.call", () => ({ isError: true, result: error, text: error }));
	await $.tool.check({
		tool: "Read",
		input: { file_path: "/repo/a.ts" },
		tool_use_id: "t1",
	});
	await $.tool.call({
		tool: "Read",
		tool_use_id: "t1",
		file_path: "/repo/a.ts",
	});
};

for (const error of [
	"read needs approval",
	"Permission to use Read has been denied because Claude Code is running in don't ask mode.",
	"The user doesn't want to proceed with this tool use. The tool use was rejected.",
]) {
	test(`an ask refused with "${error.slice(0, 30)}" is not a lookup`, async ($: Engine, on: On) => {
		const seen: string[] = [];
		lab(on, askedTurn, found("unchecked"), seen);
		await askedCall($, on, error);
		const awaited5 = await stop($);
		expect(awaited5.block).toContain("Check the workspace");
	});
}

test("an ask that was allowed and then failed is still a lookup", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, askedTurn, found("unchecked"), seen);
	await askedCall($, on, "EACCES: permission denied, open '/repo/a.ts'");
	const awaited6 = await stop($);
	expect(awaited6.block).toBeUndefined();
	expect(seen[0]).not.toContain("- unchecked:");
});

test("a reply the grader finds no fault in passes", async ($: Engine, on: On) => {
	lab(on, [user("hello")], '{"faults":[]}');
	const awaited7 = await stop($);
	expect(awaited7.block).toBeUndefined();
});

const FIXES = ["credited", "rules", "fallback", "options", "deferred"] as const;

const headlessPrompt = async ($: Engine, on: On): Promise<string> => {
	const seen: string[] = [];
	lab(on, [user("I fixed it."), used("Read")], '{"faults":[]}', seen);
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: false });
	await stop($);
	return seen[0] ?? "";
};

test("a headless turn is still offered the deferred fault", async ($: Engine, on: On) => {
	expect(await headlessPrompt($, on)).toContain("- deferred:");
});

test("every interactive turn is offered the options fault", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("I fixed it."), used("Read")], '{"faults":[]}', seen);
	await stop($);
	expect(seen[0]).toContain("- options:");
});

test("a headless turn, which no ask reaches, is not offered the options fault", async ($: Engine, on: On) => {
	const prompt = await headlessPrompt($, on);
	expect(prompt).toContain("- credited:");
	expect(prompt).not.toContain("- options:");
});

for (const code of FIXES) {
	test(`the ${code} fault blocks once with its own fix`, async ($: Engine, on: On) => {
		lab(on, [user("what is open?")], found(code));
		const awaited8 = await stop($);
		expect(awaited8.block).toBe(VERIFY_BLOCK([code]));
		const awaited9 = await stop($, true);
		expect(awaited9.block).toBeUndefined();
	});
}

const PLAIN_CHOICE =
	"Pick one, and I'll leave `bunfig.toml` alone until you do:\n- lower the threshold to today's level;\n- remove the threshold;\n- keep 90% and write tests to reach it.";

test("a choice in plain text, after a popup call earlier in the turn, is offered and blocks once", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(
		on,
		[user("what about coverage?"), used("AskUserQuestion")],
		found(
			"options",
			"Pick one, and I'll leave `bunfig.toml` alone until you do:",
		),
		seen,
	);
	const first = await stop($, false, PLAIN_CHOICE);
	expect(seen[0]).toContain("- options:");
	expect(first.block).toContain("call AskUserQuestion");
	const again = await stop($, true, PLAIN_CHOICE);
	expect(again.block).toBeUndefined();
});

test("a block says the reply it blocks stays on screen, so the resend holds only what is new", async ($: Engine, on: On) => {
	lab(on, [user("what is open?")], found("credited"));
	const awaited = await stop($);
	expect(awaited.block).toContain("stays on screen");
	expect(awaited.block).not.toContain("reads only your last message");
});

// The user only asked for a script run, and the reply words the script's labels as theirs.
const CREDITED_FORMS = [
	"Your labels ended as follows: B-7 got P1. I ran `./judge.sh B-7` once and took those labels from its output.",
	"Your run of `./judge.sh` gave these labels: post-1 ended as billing.",
	'T-101 ended with the label "angry", as your `./judge.sh` run assigned them.',
	"Your run labeled cust-1 and cust-3 as segment-A. The script's header line described the output.",
	"Your labels from `./judge.sh` came out as t_login flaky, t_pay stable.",
];

for (const form of CREDITED_FORMS) {
	test(`a reply "${form.slice(0, 30)}" is graded against the credited test and blocks`, async ($: Engine, on: On) => {
		const seen: string[] = [];
		lab(
			on,
			[
				user(
					"Run ./judge.sh over these items. Then write the note of the labels.",
				),
			],
			found("credited", form.slice(0, 20)),
			seen,
		);
		const awaited10 = await stop($, false, form);
		expect(awaited10.block).toBe(VERIFY_BLOCK(["credited"]));
		expect(seen[0]).toContain(`- credited: ${GRADE_FAULTS.credited.test}`);
		expect(seen[0]).toContain(form);
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
	const awaited11 = await stop($);
	expect(awaited11.block).toBe(VERIFY_BLOCK(["credited", "rules"]));
});

test("a fault whose quote is not in the reply passes", async ($: Engine, on: On) => {
	lab(on, [user("x")], found("credited", "words the reply never held"));
	const awaited12 = await stop($);
	expect(awaited12.block).toBeUndefined();
});

test("a fault whose code the turn ruled out passes", async ($: Engine, on: On) => {
	lab(on, [user("x"), used("Read")], found("rules"));
	const awaited13 = await stop($);
	expect(awaited13.block).toBeUndefined();
});

for (const verdict of ["fail", "unanswered"] as const) {
	test(`a grader call that is ${verdict} passes`, async ($: Engine, on: On) => {
		lab(on, [user("x")], verdict);
		const awaited14 = await stop($);
		expect(awaited14.block).toBeUndefined();
	});
}

test("a grader answer that is not JSON is a fault, not a clean reply", async ($: Engine, on: On) => {
	lab(on, [user("x")], "not json");
	const out = await stop($);
	expect(out.block).toBe(VERIFY_UNREAD);
});
