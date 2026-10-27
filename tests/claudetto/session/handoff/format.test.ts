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

test("the sections are the 9 of the spec, in order", () => {
	const text = handoffText({ messages: [user("Build the export.")] });
	const found = [...text.matchAll(/^## .*$/gm)].map((m) => m[0]);
	expect(found).toEqual([...SECTIONS]);
	expect(SECTIONS).toHaveLength(9);
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

test("an early pin stays when 50 later sentences match a rule word", () => {
	const rules = rulesOf([user("Pin `zod` to `3.23`."), ...NOISE]);

	expect(rules).toContain("Pin `zod` to `3.23`");
	expect(rules).not.toContain("Never touch file 49.");
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

test("a value that the user types again after a compaction counts as new under the cap", () => {
	const first = handoffText({
		messages: [user("Use `keep1` and `a1` `a2`."), user("go")],
	});
	const fresh = Array.from({ length: 19 }, (_, i) => `\`n${i}\``).join(" ");

	const second = handoffText({
		messages: [user(first), user("Again `keep1`."), user(`Add ${fresh}.`)],
	});

	const line = sectionOf(second, "## Constraints and Pins")
		.split("\n")
		.find((l) => l.startsWith("Values of the user"));
	expect(line).toContain("`keep1`");
	expect(line).not.toContain("`a1`");
});

test("a value that the user types again in one session counts as new under the cap", () => {
	const others = Array.from({ length: 20 }, (_, i) => `\`o${i}\``).join(" ");
	const messages = [
		user("Use `v0`."),
		user(`Add ${others}.`),
		user("Again `v0`."),
	];

	const line = sectionOf(handoffText({ messages }), "## Constraints and Pins")
		.split("\n")
		.find((l) => l.startsWith("Values of the user"));

	expect(line).toContain("`v0`");
	expect(line).not.toContain("`o0`");
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
