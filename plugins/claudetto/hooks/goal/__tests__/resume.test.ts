import {
	describe,
	expect,
	mock,
	test,
	type TestBody
} from "claude-code/testing";

import { fieldOf, stringsOf } from "../../shared/field";
import { goalIn } from "../resume";

type Dollar = Parameters<TestBody>[0];
type Mocks = Parameters<TestBody>[1];

const TRANSCRIPT = "/work/session.jsonl";
const DELEGATING = "Delegate to sonnet workers in worktrees until tests pass";

const wrap = (name: string, args: string): string =>
	`<command-name>/${name}</command-name>\n            <command-message>${name}</command-message>\n            <command-args>${args}</command-args>`;

/** A `/goal <args>` the person typed, as the transcript stores it (a user row). */
const typed = (args: string): string =>
	JSON.stringify({
		type: "user",
		message: { role: "user", content: wrap("goal", args) }
	});

/** A system row: a `/goal clear` or an engine reply, as the transcript stores it. */
const local = (content: string): string =>
	JSON.stringify({ type: "system", subtype: "local_command", content });

/** The engine's own goal record, written while a goal is active. */
const status = (condition: string, met: boolean): string =>
	JSON.stringify({
		type: "attachment",
		attachment: { type: "goal_status", met, condition }
	});

const prose = (text: string): string =>
	JSON.stringify({ type: "user", message: { role: "user", content: text } });

const jsonl = (...rows: string[]): string => `${rows.join("\n")}\n`;

const ALIASES = ["clear", "stop", "off", "reset", "none", "cancel"];

describe("goalIn", () => {
	test("finds the last goal the person set", () => {
		// Arrange
		const text = jsonl(typed("first"), prose("go on"), typed(DELEGATING));
		// Act
		const goal = goalIn(text);
		// Assert
		expect(goal).toBe(DELEGATING);
	});

	test("returns nothing when no goal was set", () => {
		// Arrange
		const text = jsonl(prose("hello"), prose(wrap("review", "x")));
		// Act
		const goal = goalIn(text);
		// Assert
		expect(goal).toBeUndefined();
	});

	for (const alias of ALIASES) {
		test(`does not resurrect a goal cleared with ${alias}`, () => {
			// Arrange
			const text = jsonl(
				typed(DELEGATING),
				local(wrap("goal", alias)),
				local(
					`<local-command-stdout>Goal cleared: ${DELEGATING}</local-command-stdout>`
				)
			);
			// Act
			const goal = goalIn(text);
			// Assert
			expect(goal).toBeUndefined();
		});
	}

	test("returns a goal set after an earlier one was cleared", () => {
		// Arrange
		const text = jsonl(
			typed("old"),
			local(wrap("goal", "clear")),
			typed(DELEGATING)
		);
		// Act
		const goal = goalIn(text);
		// Assert
		expect(goal).toBe(DELEGATING);
	});

	test("does not return a goal the evaluator recorded as met", () => {
		// Arrange
		const text = jsonl(
			typed(DELEGATING),
			status(DELEGATING, false),
			status(DELEGATING, true)
		);
		// Act
		const goal = goalIn(text);
		// Assert
		expect(goal).toBeUndefined();
	});

	test("ignores a /goal the engine refused", () => {
		// Arrange
		const text = jsonl(
			typed("kept"),
			typed("too long"),
			local(
				"<local-command-stdout>Goal condition is limited to 4000 characters (got 4318)</local-command-stdout>"
			)
		);
		// Act
		const goal = goalIn(text);
		// Assert
		expect(goal).toBe("kept");
	});

	test("ignores a bare /goal status query and unreadable rows", () => {
		// Arrange
		const text = jsonl(typed(DELEGATING), typed(""), "{not json", "");
		// Act
		const goal = goalIn(text);
		// Assert
		expect(goal).toBe(DELEGATING);
	});
});

/** The engine beneath the plugin: `/goal` sets, every tool call succeeds, the transcript reads as given. */
const engine = (on: Mocks, transcript?: string): void => {
	on("command.run", (_$, e) => ({ text: `Goal set: ${e.args}` }));
	on("session.cwd", () => ({ value: "/work" }));
	on("fs.exists", () => ({ value: true }));
	on("fs.read", (_$, e) => {
		if (transcript === undefined || e.path !== TRANSCRIPT) {
			throw new Error(`ENOENT: ${e.path}`);
		}
		return { value: transcript };
	});
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
	on("ui.notify", () => ({
		value: { isSent: true, channel: "terminal_bell" }
	}));
	on("ui.log", () => ({ value: undefined }));
	on("env.get", () => ({ value: undefined }));
	on("tool.call", () => ({ result: "ok" }));
	on("classic.SessionStart", () => ({}));
	mock.clock(on);
};

const start = (
	$: Dollar,
	source: "startup" | "resume" | "clear" | "compact" | "fork"
) => $.classic.SessionStart({ source, transcript_path: TRANSCRIPT });

const edit = async ($: Dollar): Promise<string[]> => {
	const r = await $.tool.call({
		tool: "Edit",
		file_path: "/work/src/a.ts",
		old_string: "a",
		new_string: "b"
	});
	return stringsOf(fieldOf(r, "context")) ?? [];
};

describe("goal recovery on session start", () => {
	for (const source of ["resume", "compact"] as const) {
		test(`nudges a delegating goal recovered on ${source}`, async ($, on) => {
			// Arrange
			engine(on, jsonl(typed(DELEGATING), prose("working")));
			await start($, source);
			// Act
			const notes = await edit($);
			// Assert
			expect(notes.some((note) => note.includes("Agent tool"))).toBe(true);
		});
	}

	test("stays quiet when the recovered goal was cleared", async ($, on) => {
		// Arrange
		engine(on, jsonl(typed(DELEGATING), local(wrap("goal", "clear"))));
		await start($, "resume");
		// Act
		const notes = await edit($);
		// Assert
		expect(notes).toEqual([]);
	});

	test("stays quiet on a fresh start, which holds no goal to recover", async ($, on) => {
		// Arrange
		engine(on, jsonl(typed(DELEGATING)));
		await start($, "startup");
		// Act
		const notes = await edit($);
		// Assert
		expect(notes).toEqual([]);
	});

	test("drops the tracked goal on /clear, which removes the engine's", async ($, on) => {
		// Arrange
		engine(on);
		await $.command.run({
			command: "goal",
			args: DELEGATING,
			origin: { kind: "composer" },
			presentation: { isFullscreen: false, columns: 80 }
		});
		await start($, "clear");
		// Act
		const notes = await edit($);
		// Assert
		expect(notes).toEqual([]);
	});

	test("lets the session start when the transcript cannot be read", async ($, on) => {
		// Arrange
		engine(on);
		// Act
		const result = await start($, "resume");
		// Assert
		expect(result).toEqual({});
	});
});
