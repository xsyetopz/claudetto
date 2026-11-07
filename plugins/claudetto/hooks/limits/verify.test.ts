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
	models: string[] = [],
	byModel: Record<string, string> = {},
) => {
	on("classic.Stop", () => ({}));
	on("session.messages", () => ({ value: messages }));
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("model.complete", (_$, e) => {
		seen.push(e.prompt);
		models.push(e.model ?? "");
		if (verdict === "fail") {
			throw new Error("timed out");
		}
		return {
			value: {
				isAnswered: verdict !== "unanswered",
				text: byModel[e.model ?? ""] ?? verdict,
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

test("a reply that leaves a choice to the user in prose gets one block that says to ask", async ($: Engine, on: On) => {
	const seen: string[] = [];
	const reply = "I picked Python 3.12. Tell me if you want another.";
	lab(
		on,
		[user("Which Python should CI use?"), used("Read")],
		found("asks", "I picked Python 3.12."),
		seen,
	);
	const out = await stop($, false, reply);
	expect(out.block).toContain("Ask it now with AskUserQuestion");
	expect(seen[0]).toContain("- asks:");
	expect((await stop($, true, reply)).block).toBeUndefined();
});

test("a turn that made an ask call is not offered the asks fault", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(
		on,
		[user("pick a port"), used("mcp__claudetto__ask-user-question")],
		found("asks"),
		seen,
	);
	expect((await stop($)).block).toBeUndefined();
	expect(seen[0]).not.toContain("- asks:");
});

test("a refused ask call does not keep the asks fault from being offered", async ($: Engine, on: On) => {
	const refused: string[] = [];
	const messages = [
		user("pick a port"),
		{
			role: "assistant",
			text: "",
			toolUses: [{ tool: "AskUserQuestion", tool_use_id: "t9", input: {} }],
		},
	];
	lab(on, messages, found("asks"), refused);
	on("tool.check", () => ({ decision: "deny", reason: "off" }));
	await $.tool.check({ tool: "AskUserQuestion", input: {}, tool_use_id: "t9" });
	await stop($, true);
	await stop($);
	expect(refused.at(-1)).toContain("- asks:");
});

test("a turn whose only lookup was denied is still offered the unchecked-claim fault", async ($: Engine, on: On) => {
	const seen: string[] = [];
	const messages = [
		user("The timeout is 30s, right?"),
		{
			role: "assistant",
			text: "",
			toolUses: [{ tool: "Read", tool_use_id: "t1", input: {}, isError: true }],
		},
	];
	lab(on, messages, found("unchecked"), seen);
	on("tool.check", () => ({ decision: "deny", reason: "answer first" }));
	await $.tool.check({
		tool: "Read",
		input: { file_path: "/p/a.ts" },
		tool_use_id: "t1",
	});
	expect((await stop($)).block).toContain("Check the workspace");
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

const askedTurn = [
	user("The timeout is 30s, right?"),
	{
		role: "assistant",
		text: "",
		toolUses: [{ tool: "Read", tool_use_id: "t1", input: {}, isError: true }],
	},
];

for (const error of [
	"read needs approval",
	"Permission to use Read has been denied because Claude Code is running in don't ask mode.",
	"The user doesn't want to proceed with this tool use. The tool use was rejected.",
]) {
	test(`an ask refused with "${error.slice(0, 30)}" is not a lookup`, async ($: Engine, on: On) => {
		const seen: string[] = [];
		lab(on, askedTurn, found("unchecked"), seen);
		await askedCall($, on, error);
		expect((await stop($)).block).toContain("Check the workspace");
	});
}

test("an ask that was allowed and then failed is still a lookup", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, askedTurn, found("unchecked"), seen);
	await askedCall($, on, "EACCES: permission denied, open '/repo/a.ts'");
	expect((await stop($)).block).toBeUndefined();
	expect(seen[0]).not.toContain("- unchecked:");
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

// The forms 18.9's grader missed: the user only asked for a script run, and the reply words the script's labels as theirs.
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
		expect((await stop($, false, form)).block).toContain("credits the user");
		expect(seen[0]).toContain("- credited: The reply words a label");
		expect(seen[0]).toContain("did not give its labels");
		expect(seen[0]).toContain("still credits the user");
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

const bashCall = ($: Engine, command: string) =>
	$.tool.call({ tool: "Bash", tool_use_id: "t2", command });

test("a turn that wrote the issues file through Bash is not offered the unfiled fault", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("fix the typo"), used("Read")], found("unfiled"), seen);
	scanner(on);
	on("fs.exists", () => ({ value: true }));
	on("tool.check", () => ({ decision: "allow" }));
	on("tool.call", () => ({ result: {} }));
	await bashCall($, "cat <<'EOF' >> ISSUES-2026-11-06.md\n- open\nEOF");
	expect((await stop($)).block).toBeUndefined();
	expect(seen[0]).not.toContain("- unfiled:");
});

test("a Bash call that only reads the issues file or writes another file keeps the unfiled fault", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("fix the typo"), used("Read")], found("unfiled"), seen);
	scanner(on);
	on("fs.exists", () => ({ value: true }));
	on("tool.check", () => ({ decision: "allow" }));
	on("tool.call", () => ({ result: {} }));
	await bashCall($, "cat ISSUES.md");
	await bashCall($, "echo x > notes.md");
	await stop($);
	expect(seen[0]).toContain("- unfiled:");
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

test("the grader sees the background tasks the session lists, which ground a status reply", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("stay put")], '{"faults":[]}', seen);
	await $.classic.Stop({
		stop_hook_active: false,
		last_assistant_message: "The three background shells are still running.",
		background_tasks: [
			{
				id: "b1",
				type: "local_bash",
				status: "running",
				description: "wait loop",
			},
		],
	});
	expect(seen[0]).toContain("- local_bash `b1` (running): wait loop");
	expect(seen[0]).toContain("listed background tasks");
});

test("the grader is told the turn facts that offer its codes: no look, and no issues-file write", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("It's 30s now, confirm it.")], '{"faults":[]}', seen);
	await stop($);
	expect(seen[0]).toContain("Fact: no call this turn read the workspace.");
	expect(seen[0]).toContain(
		"Fact: this turn wrote nothing to the project's open-issues file.",
	);
});

test("a turn that looked is not told it made no look", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("confirm it"), used("Read")], '{"faults":[]}', seen);
	await stop($);
	expect(seen[0]).not.toContain("Fact: no call");
	expect(seen[0]).toContain("Fact: this turn wrote nothing");
});

const ran = (tool: string, text: string, command = "git diff") => ({
	role: "assistant",
	text: "",
	toolUses: [{ tool, id: "t", input: { command }, text }],
});
const UNSEEN_REPLY = "Committed. `.gitignore` also has the setup block.";

test("a turn with tool output is also graded by sonnet for the unseen fault, which sees the output", async ($: Engine, on: On) => {
	const seen: string[] = [];
	const models: string[] = [];
	lab(
		on,
		[user("commit"), ran("Bash", "+# setup block\n+dist/")],
		found("unseen", "also has the setup block"),
		seen,
		models,
	);
	expect((await stop($, false, UNSEEN_REPLY)).block).toContain(
		"not seen in full",
	);
	expect([...models].sort((a, b) => a.localeCompare(b))).toEqual([
		"haiku",
		"sonnet",
	]);
	const [haiku, sonnet] = models[0] === "haiku" ? seen : seen.reverse();
	expect(sonnet).toContain("- unseen:");
	expect(sonnet).toContain("NOT shown to the user");
	expect(sonnet).toContain("- Bash git diff\n+# setup block");
	expect(haiku).not.toContain("- unseen:");
	expect(haiku).not.toContain("NOT shown to the user");
});

test("the unseen rule leaves a reply that reports the assistant's own edit and its test result unflagged", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("fix it"), ran("Bash", "+ x + 5 + 1")], '{"faults":[]}', seen);
	await stop($, false, "I fixed `f5` in `src/lib.ts`; all 40 tests pass.");
	const sonnet = seen.find((p) => p.includes("NOT shown")) ?? "";
	expect(sonnet).toContain("reports an edit the assistant made this turn");
	expect(sonnet).not.toContain("with its file:line");
});

for (const code of ["fallback", "unfiled"]) {
	test(`sonnet sees the other codes beside unseen, and a ${code} fault it finds does not block`, async ($: Engine, on: On) => {
		const seen: string[] = [];
		lab(
			on,
			[user("commit"), ran("Bash", "+# setup block")],
			'{"faults":[]}',
			seen,
			[],
			{ sonnet: found(code, "Committed.") },
		);
		expect((await stop($, false, UNSEEN_REPLY)).block).toBeUndefined();
		const sonnet = seen.find((p) => p.includes("NOT shown")) ?? "";
		expect(sonnet).toContain("- credited:");
		expect(sonnet).toContain("- unfiled:");
	});
}

test("a credited fault only sonnet finds blocks when a tool ran", async ($: Engine, on: On) => {
	lab(
		on,
		[user("run ./judge.sh"), ran("Bash", "T-1: angry", "./judge.sh")],
		'{"faults":[]}',
		[],
		[],
		{ sonnet: found("credited", "Committed.") },
	);
	expect((await stop($, false, UNSEEN_REPLY)).block).toContain(
		"credits the user",
	);
});

test("a turn with no tool output makes one call and cannot raise the unseen fault", async ($: Engine, on: On) => {
	const models: string[] = [];
	lab(on, [user("hi")], found("unseen"), [], models);
	expect((await stop($)).block).toBeUndefined();
	expect(models).toEqual(["haiku"]);
});

test("the grader sees the latest 8 tool results, 400 characters each", async ($: Engine, on: On) => {
	const seen: string[] = [];
	const calls = Array.from({ length: 10 }, (_, i) =>
		ran("Bash", `out${i}${"x".repeat(500)}`, `cmd${i}`),
	);
	lab(on, [user("go"), ...calls], '{"faults":[]}', seen);
	await stop($);
	const sonnet = seen.find((p) => p.includes("NOT shown")) ?? "";
	expect(sonnet).not.toContain("cmd1\n");
	expect(sonnet).toContain("cmd2\nout2");
	expect(sonnet).toContain("cmd9\nout9");
	expect(sonnet).not.toContain("x".repeat(400));
});

test("a reply with unexplained ids gets one block that asks for plain words", async ($: Engine, on: On) => {
	const reply = "R9 and M1 are done.";
	const seen: string[] = [];
	lab(on, [user("status?")], found("jargon", "R9 and M1"), seen);
	expect((await stop($, false, reply)).block).toContain("plain words");
	expect(seen[0]).toContain("- jargon:");
	expect((await stop($, true, reply)).block).toBeUndefined();
});

test("a reply that ends on a promised next step gets one block that asks for the step", async ($: Engine, on: On) => {
	const reply = "I'm now making the change.";
	const seen: string[] = [];
	lab(on, [user("fix it")], found("narrates", "I'm now making"), seen);
	expect((await stop($, false, reply)).block).toContain("Do that step now");
	expect(seen[0]).toContain("- narrates:");
	expect((await stop($, true, reply)).block).toBeUndefined();
});

test("a clean reply is not blocked for jargon or narration", async ($: Engine, on: On) => {
	lab(on, [user("status?")], '{"faults":[]}');
	expect(
		(await stop($, false, "The total now skips no rows.")).block,
	).toBeUndefined();
});
