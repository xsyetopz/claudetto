import {
	describe,
	expect,
	mock,
	test,
	type TestBody
} from "claude-code/testing";

import { fieldOf, stringsOf } from "../../shared/field";
import { isSource, namesDelegation, NUDGE_NOTE } from "../nudge";

type Dollar = Parameters<TestBody>[0];
type Mocks = Parameters<TestBody>[1];

/** The engine beneath the plugin: `/goal` sets, every tool call succeeds. */
const engine = (on: Mocks): void => {
	on("command.run", (_$, e) => ({ text: `Goal set: ${e.args}` }));
	on("session.cwd", () => ({ value: "/work" }));
	on("fs.exists", () => ({ value: true }));
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
	on("ui.notify", () => ({
		value: { isSent: true, channel: "terminal_bell" }
	}));
	on("ui.log", () => ({ value: undefined }));
	on("env.get", () => ({ value: undefined }));
	on("tool.call", () => ({ result: "ok" }));
	mock.clock(on);
};

const setGoal = ($: Dollar, args: string) =>
	$.command.run({
		command: "goal",
		args,
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 }
	});

const edit = async (
	$: Dollar,
	file_path: string,
	agentId?: string
): Promise<string[]> => {
	const r = await $.tool.call({
		tool: "Edit",
		file_path,
		old_string: "a",
		new_string: "b",
		...(agentId === undefined ? {} : { agentId })
	});
	return stringsOf(fieldOf(r, "context")) ?? [];
};

const DELEGATING = "Delegate to sonnet workers in worktrees until tests pass";

describe("goal delegation nudge", () => {
	test("notes the Agent tool when the main loop edits source under a delegating goal", async ($, on) => {
		// Arrange
		engine(on);
		await setGoal($, DELEGATING);

		// Act
		const notes = await edit($, "/work/src/a.ts");

		// Assert
		expect(notes).toContain(NUDGE_NOTE);
	});

	test("notes once per session", async ($, on) => {
		// Arrange
		engine(on);
		await setGoal($, DELEGATING);
		await edit($, "/work/src/a.ts");

		// Act
		const notes = await edit($, "/work/src/b.ts");

		// Assert
		expect(notes).not.toContain(NUDGE_NOTE);
	});

	test("stays quiet for a subagent edit", async ($, on) => {
		// Arrange
		engine(on);
		await setGoal($, DELEGATING);

		// Act
		const notes = await edit($, "/work/src/a.ts", "agent-1");

		// Assert
		expect(notes).not.toContain(NUDGE_NOTE);
	});

	test("stays quiet for a doc file", async ($, on) => {
		// Arrange
		engine(on);
		await setGoal($, DELEGATING);

		// Act
		const notes = await edit($, "/work/README.md");

		// Assert
		expect(notes).not.toContain(NUDGE_NOTE);
	});

	test("stays quiet when the goal does not name delegation", async ($, on) => {
		// Arrange
		engine(on);
		await setGoal($, "all tests pass");

		// Act
		const notes = await edit($, "/work/src/a.ts");

		// Assert
		expect(notes).not.toContain(NUDGE_NOTE);
	});

	test("stays quiet when the goal refuses delegation", async ($, on) => {
		// Arrange
		engine(on);
		await setGoal($, "Don't delegate; no subagents, tests pass");

		// Act
		const notes = await edit($, "/work/src/a.ts");

		// Assert
		expect(notes).toEqual([]);
	});

	test("stays quiet when no goal is set", async ($, on) => {
		// Arrange
		engine(on);

		// Act
		const notes = await edit($, "/work/src/a.ts");

		// Assert
		expect(notes).not.toContain(NUDGE_NOTE);
	});

	test("never denies the edit", async ($, on) => {
		// Arrange
		engine(on);
		await setGoal($, DELEGATING);

		// Act
		const r = await $.tool.call({
			tool: "Write",
			file_path: "/work/src/a.ts",
			content: "x"
		});

		// Assert
		expect(fieldOf(r, "deny")).toBeUndefined();
		expect(fieldOf(r, "result")).toBe("ok");
	});

	test("notes a notebook edit", async ($, on) => {
		// Arrange
		engine(on);
		await setGoal($, DELEGATING);

		// Act
		const r = await $.tool.call({
			tool: "NotebookEdit",
			notebook_path: "/work/a.ipynb",
			new_source: "x"
		});

		// Assert
		expect(stringsOf(fieldOf(r, "context"))).toContain(NUDGE_NOTE);
	});
});

describe("goal delegation words", () => {
	test("match delegate, subagent and worker forms only", () => {
		// Arrange
		const named = ["Delegate it", "use subagents", "sub-agent", "3 workers"];
		const unnamed = ["all tests pass", "the network works", "agentic"];

		// Act
		const hits = [...named, ...unnamed].map((text) => namesDelegation(text));

		// Assert
		expect(hits).toEqual([true, true, true, true, false, false, false]);
	});

	test("a goal that refuses delegation does not count", () => {
		// Arrange
		const refusals = [
			"Don't delegate; fix the bug yourself",
			"do not delegate to subagents",
			"no subagents, one agent only",
			"Never use workers",
			"tests pass without sub-agents",
			"Avoid delegating the work",
			"don\u2019t use subagents",
			"Delegation is not allowed",
			"instead of workers, edit directly"
		];
		const requests = [
			"Delegate the slices, don't edit yourself",
			"Do not stop until tests pass; delegate to workers",
			"Fix it. No shortcuts, delegate each file to a subagent",
			"all tests pass, but delegate the refactor to workers"
		];

		// Act
		const refused = refusals.map((text) => namesDelegation(text));
		const asked = requests.map((text) => namesDelegation(text));

		// Assert
		expect(refused.every((hit) => !hit)).toBe(true);
		expect(asked.every(Boolean)).toBe(true);
	});

	test("a note stays within 200 characters and docs are not source", () => {
		// Arrange
		const docs = ["a.md", "b.MDX", "c.txt"];

		// Act
		const flags = [...docs, "d.ts"].map((path) => isSource(path));

		// Assert
		expect(NUDGE_NOTE.length).toBeLessThanOrEqual(200);
		expect(flags).toEqual([false, false, false, true]);
	});
});
