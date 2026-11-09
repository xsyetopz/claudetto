import type { On, SessionMessage } from "claude-code";
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
	on("session.messages", () => ({ value: messages as SessionMessage[] }));
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("session.start", () => ({ cwd: "/repo" }));
	on("model.complete", (_$, e) => {
		seen.push(e.prompt);
		models.push(e.model ?? "");
		if (verdict === "fail") {
			throw new Error("timed out");
		}
		const usage = {
			input_tokens: 1,
			output_tokens: 1,
			cache_read_input_tokens: 0,
			cache_creation_input_tokens: 0,
		};
		return {
			value:
				verdict === "unanswered"
					? { isAnswered: false as const, reason: "empty-reply" as const, usage }
					: {
							isAnswered: true as const,
							text: byModel[e.model ?? ""] ?? verdict,
							usage,
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
	fallback: "fallback or a compatibility path",
	padding: "Delete each sentence that apologizes",
	options: "call mcp__claudetto__ask-user-question",
};

test("every turn is offered the padding and options faults", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("I fixed it."), used("Read")], '{"faults":[]}', seen);
	await stop($);
	expect(seen[0]).toContain("- padding:");
	expect(seen[0]).toContain("- options:");
});

test("a headless turn, which no ask reaches, is not offered the options fault", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("I fixed it."), used("Read")], '{"faults":[]}', seen);
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: false });
	await stop($);
	expect(seen[0]).toContain("- padding:");
	expect(seen[0]).not.toContain("- options:");
});

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
		expect(seen[0]).toContain("- credited: The reply says a label");
		expect(seen[0]).toContain("did not give its output");
		expect(seen[0]).toContain("even when the reply says the script ran");
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
	expect(block).toContain(
		"The user reads only your last message: keep the answer to their message in it.",
	);
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

test("the grader sees each popup answer, before and in this turn, as the person's words", async ($: Engine, on: On) => {
	const seen: string[] = [];
	const answered = (tool: string, text: string) => ({
		role: "assistant",
		text: "",
		toolUses: [{ tool, tool_use_id: text, input: {}, text }],
	});
	lab(
		on,
		[
			user("set up the branch"),
			answered("AskUserQuestion", '"Which branch?"="feat/2.1.319+1"'),
			user("go on"),
			answered("mcp__claudetto__ask-user-question", '"Which port?"="8080"'),
		],
		'{"faults":[]}',
		seen,
	);
	await stop($);
	expect(seen[0]).toContain('- Popup answer: "Which branch?"="feat/2.1.319+1"');
	expect(seen[0]).toContain('- Popup answer: "Which port?"="8080"');
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
	expect(seen[0]).toContain("a status the background-task list shows");
});

test("the grader is told the turn fact that offers its codes: no look", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("It's 30s now, confirm it.")], '{"faults":[]}', seen);
	await stop($);
	expect(seen[0]).toContain("Fact: no call this turn read the workspace.");
});

test("a turn that looked is not told it made no look", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("confirm it"), used("Read")], '{"faults":[]}', seen);
	await stop($);
	expect(seen[0]).not.toContain("Fact: no call");
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
	expect(sonnet).toContain("hidden from the user");
	expect(sonnet).toContain("- Bash git diff\n+# setup block");
	expect(haiku).not.toContain("- unseen:");
	expect(haiku).not.toContain("hidden from the user");
});

test("the unseen rule leaves a reply that reports the assistant's own edit and its test result unflagged", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("fix it"), ran("Bash", "+ x + 5 + 1")], '{"faults":[]}', seen);
	await stop($, false, "I fixed `f5` in `src/lib.ts`; all 40 tests pass.");
	const sonnet = seen.find((p) => p.includes("hidden from the user")) ?? "";
	expect(sonnet).toContain("reports its own edit and test result");
	expect(sonnet).not.toContain("with its file:line");
});

test("sonnet sees the other codes beside unseen, and a fallback fault it finds does not block", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(
		on,
		[user("commit"), ran("Bash", "+# setup block")],
		'{"faults":[]}',
		seen,
		[],
		{ sonnet: found("fallback", "Committed.") },
	);
	expect((await stop($, false, UNSEEN_REPLY)).block).toBeUndefined();
	const sonnet = seen.find((p) => p.includes("hidden from the user")) ?? "";
	expect(sonnet).toContain("- credited:");
	expect(sonnet).toContain("- fallback:");
});

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
	const sonnet = seen.find((p) => p.includes("hidden from the user")) ?? "";
	expect(sonnet).not.toContain("cmd1\n");
	expect(sonnet).toContain("cmd2\nout2");
	expect(sonnet).toContain("cmd9\nout9");
	expect(sonnet).not.toContain("x".repeat(400));
});


const failedRun = (text: string, command: string, id = "t") => ({
	role: "assistant",
	text: "",
	toolUses: [
		{ tool: "Bash", tool_use_id: id, input: { command }, text, isError: true },
	],
});
const RERUN = "Apply it, rerun the command";

for (const [error, command, reply] of [
	[
		"Not logged in · Please run /login",
		"bun probe.ts",
		"My probe failed: Not logged in.",
	],
	[
		"error: required option '--env-file <path>' not specified",
		"bun run probe",
		"The probe is blocked: it needs --env-file.",
	],
] as const) {
	test(`a reply that reports "${error.slice(0, 24)}" as the outcome gets one block that asks for the fix and the rerun`, async ($: Engine, on: On) => {
		const seen: string[] = [];
		const models: string[] = [];
		lab(
			on,
			[user("run the probe"), failedRun(error, command)],
			found("unfixed", reply),
			seen,
			models,
		);
		expect((await stop($, false, reply)).block).toContain(RERUN);
		const haiku = seen[models.indexOf("haiku")] ?? "";
		expect(haiku).toContain("- unfixed:");
		expect(haiku).toContain(
			`Fact: the last command this turn failed:\n- Bash ${command}\n${error}`,
		);
		expect((await stop($, true, reply)).block).toBeUndefined();
	});
}

test("a failed command whose fix needs the user is not the unfixed fault", async ($: Engine, on: On) => {
	const reply = "The probe needs your login: please run ! claude and log in.";
	const seen: string[] = [];
	lab(
		on,
		[user("run the probe"), failedRun("Not logged in", "claude -p hi")],
		'{"faults":[]}',
		seen,
	);
	expect((await stop($, false, reply)).block).toBeUndefined();
	expect(seen.join("\n")).toContain(
		"Not this fault: a fix only the user can give (a `! <command>`, an interactive login with no token in reach, a permission).",
	);
});

test("a turn whose last Bash call succeeded is not offered the unfixed fault", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(
		on,
		[
			user("run it"),
			failedRun("Not logged in", "bun probe.ts"),
			ran("Bash", "ok", "bun --env-file=.env probe.ts"),
		],
		found("unfixed"),
		seen,
	);
	expect((await stop($)).block).toBeUndefined();
	expect(seen.join("\n")).not.toContain("- unfixed:");
});

test("a turn whose last Bash call was denied is not offered the unfixed fault", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(
		on,
		[user("run it"), failedRun("denied", "git push --force", "d1")],
		found("unfixed"),
		seen,
	);
	on("fs.exists", () => ({ value: false }));
	on("tool.check", () => ({ decision: "deny", reason: "not yours" }));
	await $.tool.check({
		tool: "Bash",
		input: { command: "git push --force" },
		tool_use_id: "d1",
	});
	expect((await stop($)).block).toBeUndefined();
	expect(seen.join("\n")).not.toContain("- unfixed:");
});
