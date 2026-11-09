import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const lab = (
	on: On,
	constraints: unknown[],
	messages: unknown[] = [],
	seen: string[] = [],
	kind = "task",
) => {
	on("prompt.submit", (_$, e) => e);
	on("tool.check", () => ({ decision: "allow" }));
	on("session.messages", () => ({ value: messages as SessionMessage[] }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("fs.exists", () => ({ value: false }));
	on("model.complete", (_$, e) => {
		seen.push(e.prompt);
		return {
			value: {
				isAnswered: true,
				text: JSON.stringify({ kind, constraints }),
				usage: {
				input_tokens: 1,
				output_tokens: 1,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: 0,
			},
			},
		};
	});
};
const submit = ($: Engine, text = "Make it pass. Nothing should change on disk.") =>
	$.prompt.submit({ text, wait: false, origin: { kind: "composer" } });
const check = ($: Engine, tool: string, input: Record<string, unknown>) =>
	$.tool.check({ tool, input });
const RO = [
	{
		text: "Nothing should change on disk.",
		rule: "read-only",
		quote: "Nothing should change on disk.",
	},
];

test("a constraint found on one prompt rides the next prompt as context, and the first prompt is not held for it", async ($: Engine, on: On) => {
	lab(on, RO);
	expect((await submit($)).context ?? []).toEqual([]);
	await check($, "Read", { file_path: "/p/a.ts" });
	expect((await submit($)).context?.join("\n")).toContain(
		"Nothing should change on disk.",
	);
});

test("a resumed session's first prompt waits for the constraint its earlier messages hold", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(
		on,
		RO,
		[{ role: "user", text: "Nothing should change on disk.", toolUses: [] }],
		seen,
	);
	expect((await submit($)).context?.join("\n")).toContain(
		"Nothing should change on disk.",
	);
	expect(seen.join("\n")).toContain(
		'a go-ahead ("you can commit now")',
	);
});

test("no constraint adds no context", async ($: Engine, on: On) => {
	lab(on, []);
	expect((await submit($)).context ?? []).toEqual([]);
});

test("read-only denies Edit, Write and writing Bash and lets reads through", async ($: Engine, on: On) => {
	lab(on, RO);
	await submit($);
	expect((await check($, "Edit", { file_path: "/p/a.ts" })).decision).toBe(
		"deny",
	);
	expect((await check($, "Write", { file_path: "/p/a.ts" })).decision).toBe(
		"deny",
	);
	expect(
		(await check($, "Bash", { command: "echo 1 > src/a.ts" })).decision,
	).toBe("deny");
	expect(
		(await check($, "Bash", { command: "sed -i '' s/a/b/ src/a.ts" })).decision,
	).toBe("deny");
	expect(
		(await check($, "Bash", { command: "git commit -am x" })).decision,
	).toBe("deny");
	expect(
		(await check($, "Bash", { command: "bun test 2>&1 | tail -5" })).decision,
	).not.toBe("deny");
	expect((await check($, "Read", { file_path: "/p/a.ts" })).decision).not.toBe(
		"deny",
	);
});

test("no-commit denies git commit only", async ($: Engine, on: On) => {
	lab(on, [{ text: "Do not commit.", rule: "no-commit", quote: "do not commit" }]);
	await submit($, "Fix it, but do not commit.");
	expect(
		(await check($, "Bash", { command: "git commit -m x" })).decision,
	).toBe("deny");
	expect((await check($, "Edit", { file_path: "/p/a.ts" })).decision).not.toBe(
		"deny",
	);
});

test("only-files denies an edit of another file", async ($: Engine, on: On) => {
	lab(on, [
		{
			text: "Only touch src/config.ts.",
			rule: "only-files",
			files: ["src/config.ts"],
			quote: "Only touch src/config.ts.",
		},
	]);
	await submit($, "Only touch src/config.ts.");
	expect(
		(await check($, "Edit", { file_path: "/p/src/config.ts" })).decision,
	).not.toBe("deny");
	expect(
		(await check($, "Edit", { file_path: "/p/src/total.ts" })).decision,
	).toBe("deny");
});

test("the prior messages reach the extractor even when a message has no toolResults field", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(
		on,
		RO,
		[
			{ role: "user", text: "Nothing should change on disk.", toolUses: [] },
			{ role: "assistant", text: "OK.", toolUses: [] },
			{ role: "user", text: "", toolUses: [], toolResults: [{}] },
		],
		seen,
	);
	await submit($);
	expect(seen.join("\n")).toContain("1. Nothing should change on disk.");
});

test("the extractor is told that a file to change or a claim about the code is not a constraint, and that a still-failing report is a task", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [], [], seen);
	await submit($, "Rename the export in src/format.ts and you're finished.");
	expect(seen.join("\n")).toContain(
		'a file to change, or a claim about the code ("callers are done") is not a limit',
	);
	expect(seen.join("\n")).toContain(
		"or a report that work the user asked for earlier still fails",
	);
});

test("each entry rides the note with the person's words that set it", async ($: Engine, on: On) => {
	lab(on, [{ ...RO[0], quote: "nothing should change  on disk" }]);
	await submit($);
	await check($, "Read", { file_path: "/p/a.ts" });
	expect((await submit($)).context?.join("\n")).toContain(
		'Nothing should change on disk. (the user: "nothing should change  on disk")',
	);
});

for (const [name, quote] of [
	["no quote", undefined],
	["a quote only the agent's reply holds", "leave package.json alone"],
] as const) {
	test(`Agent Text Read as a Constraint: an entry with ${name} is dropped`, async ($: Engine, on: On) => {
		lab(
			on,
			[{ text: "Leave alone package.json.", rule: "none", quote }],
			[{ role: "assistant", text: "I will leave package.json alone.", toolUses: [] }],
		);
		await submit($, "Commit the rest.");
		await check($, "Read", { file_path: "/p/a.ts" });
		expect((await submit($, "Go on.")).context ?? []).toEqual([]);
	});
}

test("the extractor is told to quote the user, that a fact is no limit, that a later go-ahead lifts one, and that pasted material with a request is a task", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [], [], seen);
	await submit($);
	const prompt = seen.join("\n");
	expect(prompt).toContain(
		'"quote": the user\'s exact words that set it, copied from one of the user\'s messages',
	);
	expect(prompt).toContain('a statement of fact ("2-1-319 is out") is not a limit');
	expect(prompt).toContain(
		'Drop a limit once a later message of the user allows the act it forbids ("commit those"',
	);
	expect(prompt).toContain(
		'pasted material followed by a request ("continue from here") is a task',
	);
});

test("Yet Another Fault: the extractor is told that a remark a standing instruction covers is a task", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [], [], seen);
	await submit($, "so that is yet another fault to report");
	expect(seen.join("\n")).toContain(
		"a remark is a task only when an earlier message of the user asked for the work it points at",
	);
});

test("the extractor is told that a fault list and an act nobody asked for are tasks, not disputes", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [], [], seen);
	await submit($, "you were not tasked to restore it");
	const prompt = seen.join("\n");
	expect(prompt).toContain("or a list of faults or issues to resolve");
	expect(prompt).toContain(
		'a report that the assistant did what nobody asked ("you were not tasked to restore it"), which also sets a limit against that act',
	);
});

test("no-questions denies both ask tools, before delegation answers them, and nothing else", async ($: Engine, on: On) => {
	lab(on, [
		{
			text: "Stop asking questions.",
			rule: "no-questions",
			quote: "stop asking questions",
		},
	]);
	await submit($, "stop asking questions. fix the problems");
	const asks = await Promise.all([
		$.tool.call({
			tool: "mcp__claudetto__ask-user-question",
			question: "Which?",
			options: ["Alpha", "Beta"],
		}),
		$.tool.call({
			tool: "AskUserQuestion",
			questions: [
				{
					question: "Which?",
					header: "Pick",
					options: [
						{ label: "Alpha", description: "a" },
						{ label: "Beta", description: "b" },
					],
					multiSelect: false,
				},
			],
		}),
	]);
	expect(asks[0]?.deny).toContain("state the reading you took");
	expect(asks[1]?.deny).toContain("state the reading you took");
	expect(asks[0]?.deny).not.toContain("ask whether");
	expect((await check($, "Edit", { file_path: "/p/a.ts" })).decision).not.toBe(
		"deny",
	);
});

const person = {
	role: "user",
	text: "Who told you to lint the docs?",
	toolUses: [],
};
const spoken = (text: string, ...tools: string[]) => ({
	role: "assistant",
	text,
	toolUses: tools.map((tool) => ({ tool_use_id: "t", tool, input: {} })),
});
const turn =
	(kind: string, ...after: unknown[]) =>
	($: Engine, on: On) => {
		lab(on, [], [person, ...after], [], kind);
		return submit($, person.text);
	};

test("a remark's first tool call, a read-only one too, is denied with the answer-first text", async ($: Engine, on: On) => {
	await turn("remark")($, on);
	const r = await check($, "Grep", { pattern: "lint" });
	expect(r.decision).toBe("deny");
	expect(r.reason).toContain("Answer from what the session holds");
});

test("a question's first call that writes or runs a command is denied, and so is a sibling call of the same batch", async ($: Engine, on: On) => {
	lab(on, [], [person], [], "question");
	await submit($, person.text);
	expect((await check($, "Bash", { command: "ls" })).decision).toBe("deny");
	expect((await check($, "Edit", { file_path: "/p/a.ts" })).decision).toBe(
		"deny",
	);
});

for (const [tool, input] of [
	["ListAgents", {}],
	["Read", { file_path: "/p/a.ts" }],
	["Grep", { pattern: "lint" }],
	["Glob", { pattern: "*.ts" }],
] as const) {
	test(`a question's first ${tool} call passes the answer-first gate`, async ($: Engine, on: On) => {
		await turn("question")($, on);
		expect((await check($, tool, input)).decision).not.toBe("deny");
	});
}

test("a dispute's first lookup or command passes, so the disputed answer can be checked, and its first edit is denied", async ($: Engine, on: On) => {
	await turn("dispute")($, on);
	expect((await check($, "Bash", { command: "bun test" })).decision).not.toBe(
		"deny",
	);
	expect((await check($, "Read", { file_path: "/p/a.ts" })).decision).not.toBe(
		"deny",
	);
	expect((await check($, "Edit", { file_path: "/p/a.ts" })).decision).toBe(
		"deny",
	);
});

test("a remark's call passes once assistant text precedes it in the turn", async ($: Engine, on: On) => {
	await turn("remark", spoken("Nobody did; I misread the task."))($, on);
	expect((await check($, "Grep", { pattern: "lint" })).decision).not.toBe(
		"deny",
	);
});

test("text from before the person's message does not count as an answer", async ($: Engine, on: On) => {
	lab(
		on,
		[],
		[spoken("Earlier reply."), person, spoken("", "Grep")],
		[],
		"remark",
	);
	await submit($, person.text);
	expect((await check($, "Grep", { pattern: "x" })).decision).toBe("deny");
});

test("a task message is never held for an answer", async ($: Engine, on: On) => {
	await turn("task")($, on);
	expect((await check($, "Grep", { pattern: "lint" })).decision).not.toBe(
		"deny",
	);
});

test("an unreadable kind leaves the message a task", async ($: Engine, on: On) => {
	await turn("nonsense")($, on);
	expect((await check($, "Grep", { pattern: "lint" })).decision).not.toBe(
		"deny",
	);
});

test("after a compaction the summary is no new remark, so the resumed turn's first call passes", async ($: Engine, on: On) => {
	const messages: unknown[] = [person, spoken("Nobody did; I misread the task.")];
	lab(on, [], messages, [], "remark");
	on("session.compact", () => ({ skip: "core ran" }));
	await submit($, person.text);
	expect((await check($, "Grep", {})).decision).not.toBe("deny");
	await $.session.compact({ trigger: "auto", messages: messages as SessionMessage[] });
	messages.splice(0, messages.length, {
		role: "user",
		text: "This session is being continued from a previous conversation that ran out of context.",
		toolUses: [],
	});
	expect((await check($, "Bash", { command: "ls" })).decision).not.toBe("deny");
});

test("the call that retries after the deny passes once, with no text, because the turn has moved on", async ($: Engine, on: On) => {
	const messages: unknown[] = [person];
	lab(on, [], messages, [], "remark");
	await submit($, person.text);
	expect((await check($, "Grep", {})).decision).toBe("deny");
	messages.push(spoken("", "Grep"), {
		role: "user",
		text: "",
		toolUses: [],
		toolResults: [{}],
	});
	expect((await check($, "Grep", {})).decision).not.toBe("deny");
});
