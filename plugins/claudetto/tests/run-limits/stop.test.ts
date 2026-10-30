import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

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
	command: "bun run docs",
};

const lab = (on: On): void => {
	on("classic.Stop", () => ({}));
};

const stopped = ($: Engine, tasks: (typeof MONITOR)[]) =>
	$.classic.Stop({ stop_hook_active: false, background_tasks: tasks });

test("a monitor that still runs at Stop is listed in the reply", async ($: Engine, on: On) => {
	lab(on);

	const out = await stopped($, [MONITOR]);

	const text = (out.additionalContext ?? []).join("\n");
	expect(text).toContain(MONITOR.id);
	expect(text).toContain(MONITOR.description);
});

test("each task in flight is listed, not only the first", async ($: Engine, on: On) => {
	lab(on);

	const out = await stopped($, [MONITOR, SHELL]);

	const text = (out.additionalContext ?? []).join("\n");
	expect(text).toContain(MONITOR.id);
	expect(text).toContain(SHELL.id);
});

test("a Stop with nothing in flight adds nothing", async ($: Engine, on: On) => {
	lab(on);

	const out = await stopped($, []);

	expect(out.additionalContext ?? []).toEqual([]);
});

test("a Stop that carries no list adds nothing", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.classic.Stop({ stop_hook_active: false });

	expect(out.additionalContext ?? []).toEqual([]);
});

test("a Stop with no task in flight adds nothing to additionalContext", async ($: Engine, on: On) => {
	lab(on);

	const out = await stopped($, []);

	expect(out.additionalContext).toBeUndefined();
});

test("a Stop that a stop hook already continued adds nothing even with a task in flight", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.classic.Stop({
		stop_hook_active: true,
		background_tasks: [MONITOR],
	});

	expect(out.additionalContext ?? []).toEqual([]);
});

test("a Stop adds no budget line, since that text would continue the turn", async ($: Engine, on: On) => {
	lab(on);
	on("session.usage", () => ({
		value: {
			startedAt: 0,
			context: { window: 200_000, percent: 0 },
			rateLimits: [],
		},
	}));

	const out = await stopped($, [MONITOR]);

	expect((out.additionalContext ?? []).join("\n")).not.toContain("Budget");
});
