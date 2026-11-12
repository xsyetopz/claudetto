import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { VERIFY_BLOCK } from "../../texts-grade";
import {
	answered,
	failedRun,
	found,
	lab,
	promptTo,
	ran,
	sonnetOf,
	stop,
	UNSEEN_REPLY,
	used,
	user,
} from "./verify.mock";

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
	lab(
		on,
		[
			user("set up the branch"),
			answered("AskUserQuestion", '"Which branch?"="feat/2.1.319+1"'),
			user("go on"),
			answered("AskUserQuestion", '"Which port?"="8080"'),
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
});

test("a turn that read nothing is graded for the unchecked fault", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("It's 30s now, confirm it.")], '{"faults":[]}', seen);
	await stop($);
	expect(seen[0]).toContain("- unchecked:");
});

test("a turn that looked is not graded for the unchecked fault", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [user("confirm it"), used("Read")], '{"faults":[]}', seen);
	await stop($);
	expect(seen[0]).not.toContain("- unchecked:");
});

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
	const awaited15 = await stop($, false, UNSEEN_REPLY);
	expect(awaited15.block).toBe(VERIFY_BLOCK(["unseen"]));
	expect([...models].toSorted((a, b) => a.localeCompare(b))).toEqual([
		"claude-haiku-5-5",
		"claude-sonnet-5-5",
	]);
	const haiku = promptTo(seen, models, "claude-haiku-5-5");
	const sonnet = promptTo(seen, models, "claude-sonnet-5-5");
	expect(sonnet).toContain("- unseen:");
	expect(sonnet).toContain("- Bash git diff\n+# setup block");
	expect(haiku).not.toContain("- unseen:");
	expect(haiku).not.toContain("+# setup block");
});

test("sonnet sees the other codes beside unseen, and a fallback fault it finds does not block", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(
		on,
		[user("commit"), ran("Bash", "+# setup block")],
		'{"faults":[]}',
		seen,
		[],
		{ "claude-sonnet-5-5": found("fallback", "Committed.") },
	);
	const awaited16 = await stop($, false, UNSEEN_REPLY);
	expect(awaited16.block).toBeUndefined();
	const sonnet = sonnetOf(seen);
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
		{ "claude-sonnet-5-5": found("credited", "Committed.") },
	);
	const awaited17 = await stop($, false, UNSEEN_REPLY);
	expect(awaited17.block).toBe(VERIFY_BLOCK(["credited"]));
});

test("a turn with no tool output makes one call and cannot raise the unseen fault", async ($: Engine, on: On) => {
	const models: string[] = [];
	lab(on, [user("hi")], found("unseen"), [], models);
	const awaited18 = await stop($);
	expect(awaited18.block).toBeUndefined();
	expect(models).toEqual(["claude-haiku-5-5"]);
});

test("the grader sees the latest 8 tool results, 400 characters each", async ($: Engine, on: On) => {
	const seen: string[] = [];
	const calls = Array.from({ length: 10 }, (_, i) =>
		ran("Bash", `out${i}${"x".repeat(500)}`, `cmd${i}`),
	);
	lab(on, [user("go"), ...calls], '{"faults":[]}', seen);
	await stop($);
	const sonnet = sonnetOf(seen);
	expect(sonnet).not.toContain("cmd1\n");
	expect(sonnet).toContain("cmd2\nout2");
	expect(sonnet).toContain("cmd9\nout9");
	expect(sonnet).not.toContain("x".repeat(400));
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
		const awaited19 = await stop($, false, reply);
		expect(awaited19.block).toContain(RERUN);
		const haiku = promptTo(seen, models, "claude-haiku-5-5");
		expect(haiku).toContain("- unfixed:");
		expect(haiku).toContain(
			`Fact: the last command this turn failed:\n- Bash ${command}\n${error}`,
		);
		const awaited20 = await stop($, true, reply);
		expect(awaited20.block).toBeUndefined();
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
	const awaited21 = await stop($, false, reply);
	expect(awaited21.block).toBeUndefined();
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
	const awaited22 = await stop($);
	expect(awaited22.block).toBeUndefined();
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
	const awaited23 = await stop($);
	expect(awaited23.block).toBeUndefined();
	expect(seen.join("\n")).not.toContain("- unfixed:");
});

const OFFER_REPLIES = [
	"If you want, I'll read both lists and add the chosen libraries to `design.md` and `tasks.md`.",
	"Not checked: the 20 held-out branch cases were not rerun with the new wording.",
	'If you want it settled, paste the case and I will check.\nReply "fix the runner" and I will make it.',
];

for (const reply of OFFER_REPLIES) {
	test(`the deferred test names an offer and an unrun check, and "${reply.slice(0, 24)}" blocks once`, async ($: Engine, on: On) => {
		const seen: string[] = [];
		lab(on, [user("go on"), used("Read")], found("deferred", reply), seen);
		const first = await stop($, false, reply);
		expect(first.block).toBe(VERIFY_BLOCK(["deferred"]));
		expect(seen[0]).toContain(reply);
		expect(seen[0]).toContain(
			"an offer to do work it can do now, made conditional on the user's reply",
		);
		expect(seen[0]).toContain(
			"a check it lists as not run when its own tools could run it",
		);
		expect(seen[0]).toContain(
			"an offer or an unrun check that needs something only the user holds",
		);
		const second = await stop($, true, reply);
		expect(second.block).toBeUndefined();
	});
}
