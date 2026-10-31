import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const TASKS = "/p/openspec/changes/c/tasks.md";
const OPEN = `- [x] 2.2 Done.
- [ ] 2.3 Build it. Verify: a test.
`;

const apply: SessionMessage = {
	role: "assistant",
	text: "",
	toolUses: [
		{
			tool_use_id: "a",
			tool: "Skill",
			input: { skill: "openspec-apply-change" },
		},
	],
};

const edit = (path: string, id: string): SessionMessage => ({
	role: "assistant",
	text: "",
	toolUses: [{ tool_use_id: id, tool: "Edit", input: { file_path: path } }],
});

interface Lab {
	messages: SessionMessage[];
	tasks: string;
	readonly lines: string[];
}

const lab = (on: On, messages: SessionMessage[], tasks = OPEN): Lab => {
	const state: Lab = { messages, tasks, lines: [] };
	on("session.messages", () => ({ value: state.messages }));
	on("fs.read", (_$, e) =>
		e.path === TASKS ? { value: state.tasks } : { deny: "absent" },
	);
	on("ui.log", (_$, e) => {
		state.lines.push(e.text);
		return { value: undefined };
	});
	on("classic.Stop", () => ({}));
	return state;
};

type Tasks = Parameters<Engine["classic"]["Stop"]>[0]["background_tasks"];

const stop = ($: Engine, tasks: Tasks = []) =>
	$.classic.Stop({ stop_hook_active: false, background_tasks: tasks });

/** Each stop waits for the one before, since each reads the count the last one left. */
const stops = async ($: Engine, count: number): Promise<boolean[]> => {
	if (count === 0) {
		return [];
	}
	const blocked = (await stop($)).block !== undefined;
	return [blocked, ...(await stops($, count - 1))];
};

test("an applied change with `- [ ] 2.3` open blocks the stop and names `2.3`", async ($: Engine, on: On) => {
	lab(on, [apply, edit(TASKS, "e1")]);

	const out = await stop($);

	expect(out.block).toContain("2.3");
	expect(out.block).toContain("Build it.");
});

test("a session that applied no change stops", async ($: Engine, on: On) => {
	lab(on, [edit(TASKS, "e1")]);

	const out = await stop($);

	expect(out.block).toBeUndefined();
});

test("a `tasks.md` with every box ticked stops", async ($: Engine, on: On) => {
	lab(on, [apply, edit(TASKS, "e1")], "- [x] 2.3 Done.\n");

	const out = await stop($);

	expect(out.block).toBeUndefined();
});

test("a background task in flight lets the stop through, since its notice wakes the session", async ($: Engine, on: On) => {
	lab(on, [apply, edit(TASKS, "e1")]);

	const out = await stop($, [
		{ id: "bg-1", type: "shell", status: "running", description: "build" },
	]);

	expect(out.block).toBeUndefined();
});

test("five blocks with no file change let the sixth stop through with a note", async ($: Engine, on: On) => {
	const state = lab(on, [apply, edit(TASKS, "e1")]);

	const blocks = await stops($, 6);

	expect(blocks).toEqual([true, true, true, true, true, false]);
	expect(state.lines).toHaveLength(1);
	expect(state.lines[0]).toContain("5");
});

test("a file edit between stops starts the count again", async ($: Engine, on: On) => {
	const state = lab(on, [apply, edit(TASKS, "e1")]);

	await stops($, 5);
	state.messages = [...state.messages, edit("/p/src/a.ts", "e2")];
	const out = await stop($);

	expect(out.block).toContain("2.3");
});

test("`/goal x` reaches the built-in `command.run` with its text unchanged", async ($: Engine, on: On) => {
	on("command.run", (_$, e) => ({ text: `built-in /${e.command} ${e.args}` }));

	const out = await $.command.run({
		command: "goal",
		args: "x",
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 },
	});

	expect(out).toEqual({ text: "built-in /goal x" });
});

test("a unreadable `tasks.md` stops, since the loop is a help", async ($: Engine, on: On) => {
	lab(on, [apply, edit("/p/gone/tasks.md", "e1")]);

	const out = await stop($);

	expect(out.block).toBeUndefined();
});
