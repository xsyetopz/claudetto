import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { scanner } from "../../secrets.mock.ts";

const BLOCK = "The goal is not met: keep working.";

type Writes = "ok" | "denied" | "failed";

const blockOf = (block: string | null) => (block === null ? {} : { block });

const lab = (on: On, block: string | null = BLOCK, writes: Writes = "ok") => {
	scanner(on);
	on("classic.Stop", () => blockOf(block));
	on("session.messages", () => ({ value: [] }));
	on("tool.list", () => ({ value: [] }));
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("tool.call", () => {
		if (writes === "denied") {
			return { deny: "no" };
		}
		return writes === "failed"
			? { isError: true, result: "no such file", text: "no such file" }
			: { result: {} };
	});
};

const stop = ($: Engine, reply = "Done.") =>
	$.classic.Stop({
		stop_hook_active: false,
		last_assistant_message: reply,
		background_tasks: [],
	});

const edit = ($: Engine) =>
	$.tool.call({
		tool: "Edit",
		tool_use_id: "t1",
		file_path: "/p/a.ts",
		old_string: "a",
		new_string: "b",
	});

const bash = ($: Engine) =>
	$.tool.call({ tool: "Bash", tool_use_id: "t2", command: "bun test" });

const read = ($: Engine) =>
	$.tool.call({ tool: "Read", tool_use_id: "t3", file_path: "/p/a.ts" });

test("a block after a stretch with no write ends the turn and names /goal clear", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($);

	expect(out.preventContinuation).toBe(true);
	expect(out.stopReason).toContain("/goal clear");
	expect(out.stopReason).toContain(BLOCK);
});

test("a block after a stretch that wrote passes unchanged, every time", async ($: Engine, on: On) => {
	lab(on);

	await edit($);
	const first = await stop($);
	await edit($);
	const second = await stop($);

	expect(first.block).toBe(BLOCK);
	expect(second.block).toBe(BLOCK);
	expect(second.preventContinuation).toBeUndefined();
});

test("a write, a block, then a stretch with no write ends at the second block", async ($: Engine, on: On) => {
	lab(on);

	await edit($);
	const first = await stop($);
	const second = await stop($);

	expect(first.preventContinuation).toBeUndefined();
	expect(second.preventContinuation).toBe(true);
});

test("a stretch whose only progress is Bash ends at the first block", async ($: Engine, on: On) => {
	lab(on);

	await bash($);
	const out = await stop($);

	expect(out.preventContinuation).toBe(true);
});

test("a read-only stretch ends at the first block", async ($: Engine, on: On) => {
	lab(on);

	await read($);
	const out = await stop($);

	expect(out.preventContinuation).toBe(true);
});

test("a denied write leaves the flag clear", async ($: Engine, on: On) => {
	lab(on, BLOCK, "denied");

	await edit($);
	const out = await stop($);

	expect(out.preventContinuation).toBe(true);
});

test("a write that failed leaves the flag clear", async ($: Engine, on: On) => {
	lab(on, BLOCK, "failed");

	await edit($);
	const out = await stop($);

	expect(out.preventContinuation).toBe(true);
});

test("a block of the user's own Stop hook is stopped the same way", async ($: Engine, on: On) => {
	lab(on, "run the linter again");

	const out = await stop($);

	expect(out.stopReason).toContain("run the linter again");
});

test("the open-items block is not stopped", async ($: Engine, on: On) => {
	lab(on, null);

	const out = await stop($, "- [ ] add the test");

	expect(out.block).toContain("add the test");
	expect(out.preventContinuation).toBeUndefined();
});

test("a stall stop comes before the open-items check", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, "- [ ] add the test");

	expect(out.preventContinuation).toBe(true);
	expect(out.stopReason).not.toContain("add the test");
});

test("a Stop that nothing blocks changes nothing", async ($: Engine, on: On) => {
	lab(on, null);

	const out = await stop($);

	expect(out).toEqual({});
});

test("a changed list of background tasks is added once", async ($: Engine, on: On) => {
	lab(on, null);
	const tasks = [
		{ id: "b1", type: "shell", status: "running", description: "watch" },
	];
	const run = () =>
		$.classic.Stop({
			stop_hook_active: false,
			last_assistant_message: "Done.",
			background_tasks: tasks,
		});

	const first = await run();
	const second = await run();

	expect(first.additionalContext?.join("\n")).toContain("`b1`");
	// The notice wakes the model: it keeps the sent reply and watches a task the user waits on.
	expect(first.additionalContext?.join("\n")).toContain(
		"Your last reply stands as sent",
	);
	expect(first.additionalContext?.join("\n")).toContain("with Monitor,");
	expect(first.additionalContext?.join("\n")).not.toContain("mcp__");
	expect(second.additionalContext).toBeUndefined();
});

const MONITOR = {
	id: "bg-monitor-1",
	type: "monitor",
	status: "running",
	description: "watch the build log",
};

const SHELL = {
	id: "bg-shell-2",
	type: "shell",
	status: "running",
	description: "serve the docs",
};

const stopWith = (
	$: Engine,
	tasks: (typeof MONITOR)[],
	stopHookActive = false,
) =>
	$.classic.Stop({
		stop_hook_active: stopHookActive,
		last_assistant_message: "Done.",
		background_tasks: tasks,
	});

const listed = (out: { additionalContext?: readonly string[] }): string =>
	(out.additionalContext ?? []).join("\n");

test("a monitor that still runs at Stop is listed in the reply", async ($: Engine, on: On) => {
	lab(on, null);

	const out = await stopWith($, [MONITOR]);

	expect(listed(out)).toContain(MONITOR.id);
	expect(listed(out)).toContain(MONITOR.description);
});

test("each task in flight is listed, not only the first", async ($: Engine, on: On) => {
	lab(on, null);

	const out = await stopWith($, [MONITOR, SHELL]);

	expect(listed(out)).toContain(MONITOR.id);
	expect(listed(out)).toContain(SHELL.id);
});

test("a Stop with nothing in flight, or with no list, adds no additionalContext", async ($: Engine, on: On) => {
	lab(on, null);

	const none = await stopWith($, []);
	const absent = await $.classic.Stop({
		stop_hook_active: false,
		last_assistant_message: "Done.",
	});

	expect(none.additionalContext).toBeUndefined();
	expect(absent.additionalContext).toBeUndefined();
});

test("a Stop that a stop hook already continued adds nothing even with a task in flight", async ($: Engine, on: On) => {
	lab(on, null);

	const out = await stopWith($, [MONITOR], true);

	expect(out.additionalContext).toBeUndefined();
});

test("a Stop adds no budget line, since that text would continue the turn", async ($: Engine, on: On) => {
	lab(on, null);
	on("session.usage", () => ({
		value: {
			startedAt: 0,
			context: { window: 200_000, percent: 0 },
			rateLimits: [],
		},
	}));

	const out = await stopWith($, [MONITOR]);

	expect(listed(out)).not.toContain("Budget");
});

test("a task whose status changed is listed again, and a new task joins the list", async ($: Engine, on: On) => {
	lab(on, null);

	await stopWith($, [MONITOR]);
	const changed = await stopWith($, [{ ...MONITOR, status: "stalled" }]);
	const joined = await stopWith($, [{ ...MONITOR, status: "stalled" }, SHELL]);

	expect(listed(changed)).toContain("stalled");
	expect(listed(joined)).toContain(SHELL.id);
});

test("a file written between the blocks starts the stretch again", async ($: Engine, on: On) => {
	lab(on);

	const first = await stop($);
	await edit($);
	const second = await stop($);

	expect(first.preventContinuation).toBe(true);
	expect(second.preventContinuation).toBeUndefined();
	expect(second.block).toBe(BLOCK);
});

test("a Stop that nothing blocks starts the count again", async ($: Engine, on: On) => {
	let block: string | null = null;
	on("classic.Stop", () => blockOf(block));
	on("session.messages", () => ({ value: [] }));
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("tool.call", () => ({ result: {} }));
	await edit($);
	await stop($);
	block = BLOCK;

	const out = await stop($);

	expect(out.preventContinuation).toBe(true);
});
