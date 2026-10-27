// The rules of the handover (task 6.2 and 6.3, spec `handover`): the case of a turn end, the path of a case, the steps of a path,
// and the handoff text that code builds with no model call.
// The hook lab (`plugins/claudetto/tests/handover.test.ts`) runs the handover path through the hooks module,
// and it cannot swap the path table, so these tests show the other two paths.

import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import { handoffPath } from "../../../../plugins/claudetto/modules/session/handoff/compact.ts";
import {
	caseOf,
	decisionsOf,
	groupOf,
	handoffText,
	modelOf,
	optionOf,
	pathOf,
	stepsOf,
	userValuesOf,
} from "../../../../plugins/claudetto/modules/session/handoff/handover.ts";
import {
	HANDOVER_AGE_MS,
	HANDOVER_CONTEXT_TOKENS,
	PATH_TABLE,
	type PathRow,
} from "../../../../plugins/claudetto/modules/session/handoff/limits.ts";
import {
	ASK as ask,
	MESSAGES,
} from "../../../../plugins/claudetto/tests/stubs/messages.ts";

const END = {
	tokens: 1000,
	startedAt: 0,
	now: 1000,
	group: "3",
	before: "3",
};

test("Context Bound", () => {
	expect(caseOf({ ...END, tokens: HANDOVER_CONTEXT_TOKENS + 1 })).toBe(
		"context",
	);
	expect(caseOf({ ...END, tokens: HANDOVER_CONTEXT_TOKENS })).toBeNull();
});

test("Next Task Group", () => {
	expect(caseOf({ ...END, group: "4" })).toBe("group");
	expect(caseOf({ ...END, group: "3" })).toBeNull();
	expect(caseOf({ ...END, before: null, group: "4" })).toBeNull();
	expect(caseOf({ ...END, group: null })).toBeNull();
	expect(groupOf("6.2")).toBe("6");
	expect(groupOf(null)).toBeNull();
});

test("a session older than 8 hours is a case, and one of 8 hours is not", () => {
	expect(caseOf({ ...END, now: HANDOVER_AGE_MS + 1 })).toBe("age");
	expect(caseOf({ ...END, now: HANDOVER_AGE_MS })).toBeNull();
});

const rows = (path: PathRow["path"]): PathRow[] => [
	{ case: "context", tokensMax: 200_000, path, model: "sonnet" },
	{
		case: "context",
		tokensMax: Number.POSITIVE_INFINITY,
		path: "handover",
		model: null,
	},
];

test("Cheaper Model Wins: the model column names the model of the first step", () => {
	expect(modelOf("context", 200_000, rows("handover"))).toBe("sonnet");
	expect(modelOf("context", 200_001, rows("handover"))).toBeNull();
	expect(modelOf("idle", 1, rows("handover"))).toBeNull();
});

test("the first step after a handover runs on `haiku` in each case (task 11.7)", () => {
	for (const kind of ["context", "idle", "group", "age"] as const) {
		expect(modelOf(kind, 150_001)).toBe("haiku");
	}
});

test("Table Names Handover", () => {
	expect(pathOf("context", 200_000, "auto", rows("handover"))).toBe("handover");
});

test("Table Names Compact", () => {
	expect(pathOf("context", 200_000, "auto", rows("compact"))).toBe("compact");
	expect(stepsOf("compact", false)).toEqual(["compact"]);
});

test("Table Names Both", () => {
	expect(pathOf("context", 200_000, "auto", rows("handoff-then-compact"))).toBe(
		"handoff-then-compact",
	);
	expect(stepsOf("handoff-then-compact", false)).toEqual(["write", "compact"]);
});

test("the first row whose size bound holds the context decides", () => {
	expect(pathOf("context", 200_001, "auto", rows("compact"))).toBe("handover");
});

test("the steps of a handover are the file, `/clear`, and the resume, which holds the held prompt", () => {
	expect(stepsOf("handover", false)).toEqual(["write", "clear", "resume"]);
	expect(stepsOf("handover", true)).toEqual(["write", "clear", "resume"]);
	expect(stepsOf("compact", true)).toEqual(["compact", "held"]);
});

test("Auto: a `group` case up to 75k tokens compacts, and each other case hands over (task 11.6)", () => {
	expect(PATH_TABLE[0]).toMatchObject({ case: "group", tokensMax: 75_000 });
	expect(pathOf("group", 75_000, "auto")).toBe("compact");
	expect(pathOf("group", 75_001, "auto")).toBe("handover");
	for (const kind of ["context", "idle", "age"] as const) {
		expect(pathOf(kind, 1, "auto")).toBe("handover");
	}
	expect(pathOf("context", 150_001, undefined)).toBe("handover");
});

test("Handover: the option forces a handover for a case that the table maps to compact", () => {
	expect(pathOf("context", 1, "handover", rows("compact"))).toBe("handover");
});

test("Built-In: the option starts no path", () => {
	expect(pathOf("context", 1, "built-in", rows("compact"))).toBeNull();
});

test("an unknown option value is `auto`", () => {
	expect(optionOf({ compaction: "handoff" })).toBe("auto");
	expect(optionOf({ compaction: "handover" })).toBe("handover");
	expect(optionOf({ compaction: "built-in" })).toBe("built-in");
	expect(optionOf(undefined)).toBe("auto");
});

/** Whether `value` is a message of the session, with a role and a list of tool uses. */
const isMessage = (value: unknown): value is SessionMessage =>
	typeof value === "object" &&
	value !== null &&
	"role" in value &&
	"toolUses" in value;
const messageOf = (value: unknown): SessionMessage => {
	if (!isMessage(value)) {
		throw new Error("the value is not a message of the session");
	}
	return value;
};

test("a multi-select answer rules out only the options that the user left", () => {
	const multi = {
		...ask,
		text: 'User has answered your questions: "Which store?"="sql, kv".',
	};
	const [decision] = decisionsOf([
		messageOf({ ...MESSAGES[1], toolUses: [multi] }),
	]);
	expect(decision?.ruledOut).toEqual(["files"]);
});

test("the values of the user in backticks are in `userValuesOf`, and a value of a tool result is not", () => {
	const tool = { ...ask, tool: "Read", text: "Value `from-a-tool`" };
	const messages = [
		...MESSAGES,
		messageOf({ role: "assistant", text: "", toolUses: [tool] }),
	];
	expect(userValuesOf(messages)).toEqual(["csv"]);
});

test("a command with no arguments is no message of the user, and a command with arguments is `/name args`", () => {
	const command = (name: string, args = ""): SessionMessage => ({
		role: "user",
		text: `<command-name>/${name}</command-name>\n<command-args>${args}</command-args>`,
		toolUses: [],
		handle: name,
	});
	expect(handoffText({ messages: [command("clear"), ...MESSAGES] })).toContain(
		"## Goal\nBuild the export.",
	);
	expect(
		handoffText({ messages: [command("claudetto:apply", "2.1")] }),
	).toContain("> /claudetto:apply 2.1");
});

test("Open Change: the path of a handoff is in `.claude/claudetto/handoffs/`", () => {
	expect(handoffPath(new Date("2026-10-23T10:10:10Z"))).toBe(
		".claude/claudetto/handoffs/handoff-20261023T101010Z.md",
	);
});

test("the code option starts no path", () => {
	expect(optionOf({ compaction: "code" })).toBe("code");
	expect(pathOf("context", 1, "code")).toBeNull();
});
