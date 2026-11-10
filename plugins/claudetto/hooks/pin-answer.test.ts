import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import {
	check,
	lab,
	person,
	RESULT_ROW,
	spoken,
	submit,
	turn,
} from "./pin.mock.ts";
import { PIN_ANSWER_FIRST } from "./texts-handoff.ts";

test("a remark's first tool call, a read-only one too, is denied with the answer-first text", async ($: Engine, on: On) => {
	await turn("remark")($, on);
	const r = await check($, "Grep", { pattern: "lint" });
	expect(r.decision).toBe("deny");
	expect(r.reason).toBe(PIN_ANSWER_FIRST);
});

test("a remark typed over a running turn holds that turn's next call for an answer", async ($: Engine, on: On) => {
	lab(on, [], [person], [], "remark");
	await $.prompt.submit({
		text: person.text,
		wait: false,
		turnId: "t1",
		origin: { kind: "composer" },
	});
	const r = await check($, "Read", { file_path: "/repo/a.ts" });
	expect(r.decision).toBe("deny");
});

test("a subagent's call passes after the person's remark, since the answer-first gate holds the main loop only", async ($: Engine, on: On) => {
	await turn("remark")($, on);
	const r = await $.tool.check({
		tool: "Bash",
		input: { command: "bun test" },
		agentId: "a1",
	});
	expect(r.decision).not.toBe("deny");
});

test("a question's first call that writes or runs a command is denied, and so is a sibling call of the same batch", async ($: Engine, on: On) => {
	lab(on, [], [person], [], "question");
	await submit($, person.text);
	const awaited19 = await check($, "Bash", { command: "ls" });
	expect(awaited19.decision).toBe("deny");
	const awaited20 = await check($, "Edit", { file_path: "/p/a.ts" });
	expect(awaited20.decision).toBe("deny");
});

for (const [tool, input] of [
	["ListAgents", {}],
	["Read", { file_path: "/p/a.ts" }],
	["Grep", { pattern: "lint" }],
	["Glob", { pattern: "*.ts" }],
] as const) {
	test(`a question's first ${tool} call passes the answer-first gate`, async ($: Engine, on: On) => {
		await turn("question")($, on);
		const awaited21 = await check($, tool, input);
		expect(awaited21.decision).not.toBe("deny");
	});
}

test("a dispute's first lookup or command passes, so the disputed answer can be checked, and its first edit is denied", async ($: Engine, on: On) => {
	await turn("dispute")($, on);
	const awaited22 = await check($, "Bash", { command: "bun test" });
	expect(awaited22.decision).not.toBe("deny");
	const awaited23 = await check($, "Read", { file_path: "/p/a.ts" });
	expect(awaited23.decision).not.toBe("deny");
	const awaited24 = await check($, "Edit", { file_path: "/p/a.ts" });
	expect(awaited24.decision).toBe("deny");
});

test("a remark's call passes once assistant text precedes it in the turn", async ($: Engine, on: On) => {
	await turn("remark", spoken("Nobody did; I misread the task."))($, on);
	const awaited25 = await check($, "Grep", { pattern: "lint" });
	expect(awaited25.decision).not.toBe("deny");
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
	const awaited26 = await check($, "Grep", { pattern: "x" });
	expect(awaited26.decision).toBe("deny");
});

test("a task message is never held for an answer", async ($: Engine, on: On) => {
	await turn("task")($, on);
	const awaited27 = await check($, "Grep", { pattern: "lint" });
	expect(awaited27.decision).not.toBe("deny");
});

test("an unreadable kind leaves the message a task", async ($: Engine, on: On) => {
	await turn("nonsense")($, on);
	const awaited28 = await check($, "Grep", { pattern: "lint" });
	expect(awaited28.decision).not.toBe("deny");
});

test("after a compaction the summary is no new remark, so the resumed turn's first call passes", async ($: Engine, on: On) => {
	const messages: SessionMessage[] = [
		person,
		spoken("Nobody did; I misread the task."),
	];
	lab(on, [], messages, [], "remark");
	on("session.compact", () => ({ skip: "core ran" }));
	await submit($, person.text);
	const awaited29 = await check($, "Grep", {});
	expect(awaited29.decision).not.toBe("deny");
	await $.session.compact({ trigger: "auto", messages });
	messages.splice(0, messages.length, {
		role: "user",
		text: "This session is being continued from a previous conversation that ran out of context.",
		toolUses: [],
	});
	const awaited30 = await check($, "Bash", { command: "ls" });
	expect(awaited30.decision).not.toBe("deny");
});

test("the call that retries after the deny passes once, with no text, because the turn has moved on", async ($: Engine, on: On) => {
	const messages: SessionMessage[] = [person];
	lab(on, [], messages, [], "remark");
	await submit($, person.text);
	const awaited31 = await check($, "Grep", {});
	expect(awaited31.decision).toBe("deny");
	messages.push(spoken("", "Grep"), RESULT_ROW);
	const awaited32 = await check($, "Grep", {});
	expect(awaited32.decision).not.toBe("deny");
});
