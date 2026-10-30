import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

interface Lab {
	exitCode: number;
	messages: SessionMessage[];
	readonly ran: string[][];
	readonly sent: string[];
	readonly lines: string[];
	readonly tools: string[];
	settle: () => Promise<void>;
	advance: (ms: number) => Promise<void>;
}

const lab = (on: On): Lab => {
	const clock = mock.clock(on, { now: 0 });
	const state: Lab = {
		exitCode: 1,
		messages: [],
		ran: [],
		sent: [],
		lines: [],
		tools: [],
		settle: () => clock.settle(),
		advance: (ms) => clock.advance(ms),
	};
	on("session.root", () => ({ value: "/repo" }));
	on("session.messages", () => ({ value: state.messages }));
	on("process.run", (_$, e) => {
		state.ran.push([...e.argv]);
		return {
			value: {
				exitCode: state.exitCode,
				stdout: "1 test failed\n",
				stderr: "expected 2, got 3",
				isStdoutTruncated: false,
				isStderrTruncated: false,
			},
		};
	});
	on("prompt.submit", (_$, e) => {
		state.sent.push(e.text);
		return { text: e.text };
	});
	on("ui.log", (_$, e) => {
		state.lines.push(e.text);
		return { value: undefined };
	});
	// The engine draws the line and the dim `tail` a hook adds after it.
	on("ui.render", { component: "PromptHint" }, (_$, e) => ({
		type: "Text",
		children: [`${e.props.hint}${e.props.tail ?? ""}`],
	}));
	on("tool.register", (_$, e) => {
		state.tools.push(e.name);
		return { value: { tool: `mcp__claudetto__${e.name}` } };
	});
	on("command.run", () => ({ text: "built-in /goal ran" }));
	on("classic.Stop", () => ({}));
	return state;
};

const goal = ($: Engine, args: string) =>
	$.command.run({
		command: "goal",
		args,
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 },
	});

const update = async ($: Engine, status: string, reason: string) => {
	const answer = await $.tool.call({
		tool: "mcp__claudetto__goal",
		status,
		reason,
	});
	return typeof answer.result === "string" ? answer.result : "";
};

const stop = ($: Engine) => $.classic.Stop({ stop_hook_active: false });

const edit = (id: string): SessionMessage => ({
	role: "assistant",
	text: "",
	toolUses: [
		{ tool_use_id: id, tool: "Edit", input: { file_path: "/repo/a.ts" } },
	],
});

/** Each stop waits for the one before, since each reads the count the last one left. */
const stops = async ($: Engine, count: number): Promise<boolean[]> => {
	if (count === 0) {
		return [];
	}
	const blocked = (await stop($)).block !== undefined;
	return [blocked, ...(await stops($, count - 1))];
};

test("`/goal just check` answers in place of the built-in and starts the work", async ($: Engine, on: On) => {
	const state = lab(on);

	const out = await goal($, "just check");
	await state.settle();

	expect(out.text).toBe("Goal set: `just check` must exit 0.");
	expect(state.sent).toHaveLength(1);
	expect(state.sent[0]).toContain("`just check` must exit 0");
});

test("a failing goal check blocks the stop with its last output lines", async ($: Engine, on: On) => {
	const state = lab(on);
	await goal($, "just check");

	const out = await stop($);

	expect(state.ran).toEqual([["sh", "-c", "just check"]]);
	expect(out.block).toContain("`just check` fails");
	expect(out.block).toContain("expected 2, got 3");
});

test("a passing goal check lets the stop through and clears the goal", async ($: Engine, on: On) => {
	const state = lab(on);
	await goal($, "just check");
	state.exitCode = 0;

	const out = await stop($);
	const status = await goal($, "");

	expect(out.block).toBeUndefined();
	expect(status.text).toContain("No goal set");
});

test("five blocks with no file change let the sixth stop through and mark the goal blocked", async ($: Engine, on: On) => {
	const state = lab(on);
	await goal($, "just check");

	const blocks = await stops($, 6);
	const after = await stop($);
	const status = await goal($, "");

	expect(blocks).toEqual([true, true, true, true, true, false]);
	expect(state.lines).toHaveLength(1);
	expect(state.lines[0]).toContain("marked blocked");
	expect(after.block).toBeUndefined();
	expect(status.text).toContain("blocked");
});

test("`/goal` registers the goal tool, so the root agent can stop the goal", async ($: Engine, on: On) => {
	const state = lab(on);

	await goal($, "just check");

	expect(state.tools).toEqual(["goal"]);
});

test("a `blocked` call stops the checks, and `/goal` shows the reason", async ($: Engine, on: On) => {
	const state = lab(on);
	await goal($, "just check");

	const reply = await update($, "blocked", "needs a login");
	const out = await stop($);
	const status = await goal($, "");

	expect(reply).toContain("blocked");
	expect(out.block).toBeUndefined();
	expect(state.ran).toEqual([]);
	expect(status.text).toContain("needs a login");
});

test("`/goal resume` turns a paused goal back on with a fresh count", async ($: Engine, on: On) => {
	const state = lab(on);
	await goal($, "just check");
	await stops($, 5);
	await update($, "paused", "the user asked");

	const resumed = await goal($, "resume");
	const out = await stop($);

	expect(resumed.text).toContain("resumed");
	expect(out.block).toContain("`just check` fails");
	expect(state.ran).toHaveLength(6);
});

test("a goal tool call with no goal or a bad status changes nothing", async ($: Engine, on: On) => {
	lab(on);

	const none = await update($, "blocked", "r");
	await goal($, "just check");
	const bad = await update($, "complete", "r");
	const out = await stop($);

	expect(none).toContain("No goal set");
	expect(bad).toContain("`paused` or `blocked`");
	expect(out.block).toContain("`just check` fails");
});

test("a file edit between stops starts the goal count again", async ($: Engine, on: On) => {
	const state = lab(on);
	await goal($, "just check");

	await stops($, 5);
	state.messages = [edit("e1")];
	const out = await stop($);

	expect(out.block).toContain("`just check` fails");
});

test("`/goal clear` clears the goal, so the next stop runs no check", async ($: Engine, on: On) => {
	const state = lab(on);
	await goal($, "just check");

	const cleared = await goal($, "clear");
	const out = await stop($);

	expect(cleared.text).toBe("Goal cleared: `just check`");
	expect(out.block).toBeUndefined();
	expect(state.ran).toEqual([]);
});

test("a background task in flight lets the stop through with no check", async ($: Engine, on: On) => {
	const state = lab(on);
	await goal($, "just check");

	const out = await $.classic.Stop({
		stop_hook_active: false,
		background_tasks: [
			{ id: "bg-1", type: "shell", status: "running", description: "build" },
		],
	});

	expect(out.block).toBeUndefined();
	expect(state.ran).toEqual([]);
});

test("a slash command sets no goal", async ($: Engine, on: On) => {
	lab(on);

	const out = await goal($, "/claudetto:setup");
	const status = await goal($, "");

	expect(out.text).toContain("is a slash command");
	expect(status.text).toContain("No goal set");
});

test("the `/goal` listing describes a shell command", async ($: Engine, on: On) => {
	on("command.describe", (_$, e) => ({
		description: e.description,
		...(e.argumentHint === undefined ? {} : { argumentHint: e.argumentHint }),
		isHidden: false,
	}));

	const out = await $.command.describe({
		command: "goal",
		description: "Set a goal that Claude checks before it stops",
		argumentHint: "[<condition> | clear]",
		isHidden: false,
		immediate: false,
		provider: { plugin: "claude-code", tier: "core" },
	});

	expect(out.description).toBe(
		"Set a shell command that must exit 0 before Claude stops",
	);
	expect(out.argumentHint).toBe("[<shell command> | clear | resume]");
});

const HINT = {
	plugin: "claudetto",
	surface: "terminal",
	component: "PromptHint",
	props: { isDraft: false, isWorking: true, hint: "esc to interrupt" },
} as const;

const hint = async ($: Engine): Promise<string> => {
	const ui = await $.ui.mount(HINT);
	const text = JSON.stringify(await ui.drawn());
	await ui.unmount();
	return text;
};

test("an active goal adds the built-in's text to the prompt hint, with its age", async ($: Engine, on: On) => {
	const state = lab(on);
	await goal($, "just check");

	await state.advance(37 * 60_000 + 5000);

	expect(await hint($)).toContain("◎ /goal active (37m)");
});

test("a blocked goal shows as blocked in the prompt hint", async ($: Engine, on: On) => {
	lab(on);
	await goal($, "just check");
	await update($, "blocked", "needs a login");

	expect(await hint($)).toContain("◎ /goal blocked");
});

test("with no goal the prompt hint has no goal text", async ($: Engine, on: On) => {
	lab(on);

	expect(await hint($)).not.toContain("/goal active");
});
