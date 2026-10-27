// The format of the handoff (spec `code-compaction`, "Handoff Format", "Only Words of the User", "One State of Each Task").

import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import {
	handoffText,
	SECTIONS,
} from "../../../../plugins/claudetto/modules/session/handoff/handover.ts";

const PATTERN_1 = /^## /m;
const PATTERN_2 = /next.*`1\.1`/i;
const PATTERN_3 = /none/i;
const PATTERN_4 = /done/i;
const PATTERN_5 = /open/i;
const PATTERN_6 = /next/i;
const PATTERN_7 = /\(([^()]*)\)$/;

const user = (text: string, handle = text.slice(0, 8)): SessionMessage => ({
	role: "user",
	text,
	toolUses: [],
	handle,
});

const assistant = (
	toolUses: SessionMessage["toolUses"] = [],
	text = "",
): SessionMessage => ({ role: "assistant", text, toolUses, handle: "a" });

/** The body of the section `heading` in `text`, without the heading line. */
const sectionOf = (text: string, heading: string): string => {
	const start = text.indexOf(`${heading}\n`);
	if (start < 0) {
		return "";
	}
	const body = text.slice(start + heading.length + 1);
	const end = body.search(PATTERN_1);
	return end < 0 ? body : body.slice(0, end);
};

const NOTE =
	"<task-notification>\n<task-id>t1</task-id>\n<status>completed</status>\n<summary>Agent finished</summary>\n</task-notification>";

test("the sections are the 10 of the spec, in order", () => {
	const text = handoffText({ messages: [user("Build the export.")] });
	const found = [...text.matchAll(/^## .*$/gm)].map((m) => m[0]);
	expect(found).toEqual([...SECTIONS]);
	expect(SECTIONS).toHaveLength(10);
});

test("Running Work: a background agent and a background `Bash` with no notification are listed, and a notified one is not", () => {
	const messages = [
		user("Build the export."),
		assistant([
			{
				tool_use_id: "u1",
				tool: "Agent",
				input: { description: "Fix the parser" },
				result: { status: "async_launched", agentId: "t1" },
				text: "launched",
			},
			{
				tool_use_id: "u2",
				tool: "Agent",
				input: { description: "Rewrite the docs" },
				result: { status: "async_launched", agentId: "t2" },
				text: "launched",
			},
			{
				tool_use_id: "u3",
				tool: "Bash",
				input: { command: "just check", run_in_background: true },
				result: { backgroundTaskId: "b3" },
				text: "started",
			},
			{
				tool_use_id: "u4",
				tool: "Agent",
				input: { description: "Answer at once" },
				result: { status: "completed" },
				text: "done",
			},
		]),
		user(NOTE),
	];

	const running = sectionOf(handoffText({ messages }), "## Running Work");

	expect(running).not.toContain("Fix the parser");
	expect(running).toContain("Rewrite the docs");
	expect(running).toContain("`t2`");
	expect(running).toContain("`just check`");
	expect(running).toContain("`b3`");
	expect(running).not.toContain("Answer at once");
});

test("Pinned Version", () => {
	const rule = "Pin `zod` to `3.23`, and do not touch `src/legacy.ts`.";
	const messages = [
		user(`Start the work. ${rule}`),
		assistant([], "Ok."),
		...Array.from({ length: 30 }, (_, i) => user(`Step ${i} please.`, `s${i}`)),
	];

	const text = handoffText({ messages });

	const rules = sectionOf(text, "## Constraints and Pins");
	expect(rules).toContain("Pin `zod` to `3.23`");
	expect(rules).toContain("do not touch `src/legacy.ts`");
});

test("Task Notification", () => {
	const messages = [
		user("Fix the parser, but never rename `parse`."),
		user(`Now add tests.\n\n${NOTE}`),
		user(NOTE),
	];

	const text = handoffText({ messages });

	expect(text).not.toContain("task-notification");
	expect(text).not.toContain("t1");
	expect(sectionOf(text, "## User Messages")).toContain("Now add tests.");
});

test("a system reminder and a command note are no words of the user", () => {
	const messages = [
		user("Build the export."),
		user("<system-reminder>Do not use this tool.</system-reminder>"),
		user("<local-command-caveat>Caveat: never mind.</local-command-caveat>"),
	];

	const text = handoffText({ messages });

	expect(text).not.toContain("system-reminder");
	expect(text).not.toContain("never mind");
	expect(text).not.toContain("Do not use this tool");
});

test("Next Task Open", () => {
	const tasks = "- [ ] 1.1 First\n- [ ] 1.2 Second\n";

	const text = handoffText({
		messages: [user("Go on.")],
		name: "add-export",
		tasks,
	});

	const body = sectionOf(text, "## Open Change and Tasks");
	expect(body).toMatch(PATTERN_2);
	expect(body).toContain("`1.2`");
	expect(body).not.toMatch(PATTERN_3);
	expect(sectionOf(text, "## Next Step")).toContain("`1.1`");
});

test("an open task keeps its text, so the model need not read `tasks.md` again", () => {
	const tasks =
		"- [ ] 1.1 First\n- [ ] 1.2 Add `src/server.ts` on port 4317\n- [x] 1.3 Box only\n";

	const text = handoffText({
		messages: [user("Go on.")],
		name: "c",
		tasks,
	});

	const body = sectionOf(text, "## Open Change and Tasks");
	expect(body).toContain("`1.2` Add `src/server.ts` on port 4317");
	expect(body).toContain("`1.3` (box checked, no passed check) Box only");
});

test("each task has one state: done, open, or next", () => {
	const tasks =
		"- [x] 2.1 Proved. Check: `just lab`.\n- [x] 2.2 Box only. Check: `just check`.\n- [ ] 2.3 Open next\n- [ ] 2.4 Later\n";

	const text = handoffText({
		messages: [user("Go on.")],
		name: "c",
		tasks,
		checks: ["just lab"],
	});

	const body = sectionOf(text, "## Open Change and Tasks");
	for (const id of ["2.1", "2.2", "2.3", "2.4"]) {
		expect(body.split(`\`${id}\``)).toHaveLength(2);
	}
	expect(body.split("\n").find((l) => l.includes("`2.1`"))).toMatch(PATTERN_4);
	expect(body.split("\n").find((l) => l.includes("`2.2`"))).toMatch(PATTERN_5);
	expect(body.split("\n").find((l) => l.includes("`2.3`"))).toMatch(PATTERN_6);
	expect(body.split("\n").find((l) => l.includes("`2.4`"))).toMatch(PATTERN_5);
});

test("a decision names its question once and its ruled-out options inline", () => {
	const ask = {
		tool_use_id: "q1",
		tool: "AskUserQuestion",
		input: {
			questions: [
				{
					question: "Which store?",
					options: [{ label: "sql" }, { label: "files" }],
				},
			],
		},
		text: 'User has answered your questions: "Which store?"="sql". You can now continue.',
	};

	const text = handoffText({
		messages: [user("Build."), assistant([ask])],
	});

	expect(text.split("Which store?")).toHaveLength(2);
	const body = sectionOf(text, "## Decisions");
	expect(body).toContain("sql");
	expect(body).toContain("files");
});

test("a rule of the user appears once in the text", () => {
	const messages = [user("Never touch `a.ts`. Then add the retry.")];

	const text = handoffText({ messages });

	expect(text.split("Never touch `a.ts`.")).toHaveLength(2);
	expect(sectionOf(text, "## User Messages")).toContain("Then add the retry.");
});

test("a failed command and its fix show under errors", () => {
	const bash = (command: string, isError?: true) =>
		assistant([
			{
				tool_use_id: command,
				tool: "Bash",
				input: { command },
				text: "boom: bad thing\nmore",
				...(isError ? { isError } : {}),
			},
		]);

	const text = handoffText({
		messages: [user("Go."), bash("bun test x", true)],
	});

	expect(sectionOf(text, "## Errors and Fixes")).toContain("bun test x");
	expect(sectionOf(text, "## Errors and Fixes")).toContain("boom: bad thing");
});

test("an earlier handoff keeps its rules, and is no message of the user", () => {
	const first = handoffText({
		messages: [user("Pin `zod` to `3.23`."), user("Add the export.")],
	});
	const resumed = [
		user(`This is the handoff of the earlier part.\n\n${first}`),
		user("Next, add the import."),
	];

	const second = handoffText({ messages: resumed });

	expect(sectionOf(second, "## Constraints and Pins")).toContain(
		"Pin `zod` to `3.23`.",
	);
	expect(sectionOf(second, "## Goal")).toContain("Add the export.");
	expect(sectionOf(second, "## User Messages")).not.toContain("# Handoff");
	expect(second.split("Pin `zod` to `3.23`.")).toHaveLength(2);
});

/** 50 typed rules, more than the rule budget holds. */
const NOISE = Array.from({ length: 50 }, (_, i) =>
	user(`Never touch file ${i}.`, `n${i}`),
);
const rulesOf = (messages: SessionMessage[]) =>
	sectionOf(handoffText({ messages }), "## Constraints and Pins");

test("an early pin and the newest rule stay when 50 later sentences match a rule word", () => {
	const rules = rulesOf([user("Pin `zod` to `3.23`."), ...NOISE]);

	expect(rules).toContain("Pin `zod` to `3.23`");
	expect(rules).toContain("Never touch file 49.");
});

test("a rule of an earlier handoff and a rule of a `CLAUDE.md` edit stay before the typed rules", () => {
	const earlier = handoffText({ messages: [user("Pin `zod` to `3.23`.")] });
	const edit = assistant([
		{
			tool_use_id: "c1",
			tool: "Edit",
			input: { file_path: "/p/CLAUDE.md", new_string: "Never use `any`." },
		},
	]);
	const rules = rulesOf([user(earlier), edit, ...NOISE]);

	expect(rules).toContain("Pin `zod` to `3.23`");
	expect(rules).toContain("Never use `any`.");
});

test("a line that Claude Code puts in a user row is no word of the user", () => {
	const rows = [
		"Caveat: The messages below were generated by the user while running local commands. DO NOT respond to these messages. Never zebra.",
		"Base directory for this skill: /p/skills/x\n\nNever zebra.",
		"Stop hook feedback:\nDo not stop, never zebra.",
		"This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.\n\nSummary:\n- Never zebra.",
		"[Request interrupted by user]",
		"[Request interrupted by user for tool use]",
		"<command-message>never zebra</command-message>",
		"<command-args>never zebra</command-args>",
		"<local-command-stdout>never zebra</local-command-stdout>",
	];
	const messages = [...rows.map((r) => user(r)), user("Build the export.")];

	const text = handoffText({ messages });

	expect(text).not.toContain("zebra");
	expect(text).not.toContain("interrupted");
	expect(sectionOf(text, "## User Messages")).toContain("Build the export.");
});

test("the labels of the rules stay unique across compactions", () => {
	const first = handoffText({
		messages: [user("Never edit `a.ts`."), user("Never edit `b.ts`.")],
	});
	const second = handoffText({
		messages: [
			user(first),
			user("Never edit `c.ts`."),
			user("Pin `x` to `1`."),
		],
	});

	const rules = sectionOf(second, "## Constraints and Pins")
		.split("\n")
		.filter((line) => line.startsWith("- "));
	const sources = rules.map((line) => PATTERN_7.exec(line)?.[1]);

	expect(rules).toHaveLength(4);
	expect(new Set(sources).size).toBe(4);
});

test("the goal has a size cap", () => {
	const text = handoffText({ messages: [user(`${"a".repeat(3000)}.`)] });

	expect(sectionOf(text, "## Goal").length).toBeLessThan(1000);
});

test("`userValuesOf` values survive a second compaction, each once", () => {
	const first = handoffText({
		messages: [
			user("Use port `4317` and pin `zod@3.23`. Do not touch `x.ts`."),
			user("go"),
		],
	});

	const second = handoffText({
		messages: [user(first), user("next thing, use `4317` and `y.ts`")],
	});

	const rules = sectionOf(second, "## Constraints and Pins");
	expect(rules).toContain("`zod@3.23`");
	expect(rules).toContain("`y.ts`");
	const line = rules
		.split("\n")
		.find((l) => l.startsWith("Values of the user"));
	expect(line?.match(/`4317`/g)).toHaveLength(1);
});

/** `count` values in backticks of 150 characters each, so that they pass the budget of the values. */
const BIG = (count: number): string[] =>
	Array.from({ length: count }, (_, i) => `\`v${i}${"x".repeat(150)}\``);

const valuesLine = (text: string) =>
	sectionOf(text, "## Constraints and Pins")
		.split("\n")
		.find((l) => l.startsWith("Values of the user"));

test("a value that the user types again after a compaction counts as new over the budget", () => {
	const [again = "", ...others] = BIG(40);
	const first = handoffText({
		messages: [user(`Use ${again}.`), user(`Add ${others.join(" ")}.`)],
	});

	const line = valuesLine(
		handoffText({ messages: [user(first), user(`Again ${again}.`)] }),
	);
	expect(line).toContain(again);
	expect(line).toContain(others[0] ?? "");
	expect(line).not.toContain(others[20] ?? "");
});

test("a value that the user types again in one session counts as new over the budget", () => {
	const [again = "", ...others] = BIG(40);
	const messages = [
		user(`Use ${again}.`),
		user(`Add ${others.join(" ")}.`),
		user(`Again ${again}.`),
	];

	const line = valuesLine(handoffText({ messages }));

	expect(line).toContain(again);
	expect(line).toContain(others[0] ?? "");
	expect(line).not.toContain(others[20] ?? "");
});

test("`RULE` counts a curly apostrophe in a contraction", () => {
	const text = handoffText({
		messages: [user("Don’t edit `a.ts`."), user("Build the export.")],
	});

	expect(sectionOf(text, "## Constraints and Pins")).toContain(
		"Don’t edit `a.ts`",
	);
	expect(sectionOf(text, "## Goal")).not.toContain("Don’t");
});
