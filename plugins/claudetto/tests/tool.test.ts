// Lab tests of the `tool.describe` hook of the `prompt` slice: the `Agent` description and the deferral of `ListAgents`.
// The stub of the engine answers as the engine does, so the handler gets the built-in answer from `next`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const BUILT_IN = "x".repeat(4000);

const describe = ($: Engine, on: On, tool: string, description = BUILT_IN) => {
	on("tool.describe", () => ({ description: BUILT_IN }));
	return $.tool.describe({
		tool,
		description,
		provider: { plugin: "engine", tier: "core" },
	});
};

test("`tool.describe` replaces the built-in `Agent` description with a shorter one", async ($: Engine, on: On) => {
	const answer = await describe($, on, "Agent");
	expect(answer.description.length).toBeLessThan(BUILT_IN.length);
	expect(answer.isDeferred).toBeUndefined();
});

test("`tool.describe` keeps a built-in `Agent` description that is shorter", async ($: Engine, on: On) => {
	on("tool.describe", () => ({ description: "short" }));
	const answer = await $.tool.describe({
		tool: "Agent",
		description: "short",
		provider: { plugin: "engine", tier: "core" },
	});
	expect(answer.description).toBe("short");
});

test("`tool.describe` defers `ListAgents` and keeps its built-in description", async ($: Engine, on: On) => {
	const answer = await describe($, on, "ListAgents");
	expect(answer.isDeferred).toBe(true);
	expect(answer.description).toBe(BUILT_IN);
});

test("`tool.describe` passes an unknown tool on with no change", async ($: Engine, on: On) => {
	const answer = await describe($, on, "Grep", "x");
	expect(answer).toStrictEqual({ description: BUILT_IN });
});

test("`tool.describe` gives each kept tool a shorter text, and does not defer `ToolSearch`", async ($: Engine, on: On) => {
	on("tool.describe", () => ({ description: BUILT_IN }));
	await Array.fromAsync(
		["Bash", "Edit", "Read", "ToolSearch", "Write"],
		async (tool) => {
			const answer = await $.tool.describe({
				tool,
				description: BUILT_IN,
				provider: { plugin: "engine", tier: "core" },
			});
			expect(answer.description.length, tool).toBeLessThan(BUILT_IN.length);
			expect(answer.isDeferred, tool).toBeUndefined();
		},
	);
});

test("`tool.describe` defers `Workflow`", async ($: Engine, on: On) => {
	expect((await describe($, on, "Workflow")).isDeferred).toBe(true);
});

test("D20: a tool that under 10% of the sessions use is deferred with its built-in text, and a roster tool stays on the base prompt", async ($: Engine, on: On) => {
	on("tool.describe", () => ({ description: BUILT_IN }));
	const ask = (tool: string) =>
		$.tool.describe({
			tool,
			description: BUILT_IN,
			provider: { plugin: "engine", tier: "core" },
		});
	const deferred = await ask("Workflow");
	expect(deferred.isDeferred).toBe(true);
	expect(deferred.description).toBe(BUILT_IN);
	await Array.fromAsync(
		["Bash", "Read", "Grep", "Glob", "Monitor", "WebFetch"],
		async (tool) => {
			expect((await ask(tool)).isDeferred, tool).toBeUndefined();
		},
	);
});

test("D20: `Skill` is deferred and keeps the shorter claudetto text", async ($: Engine, on: On) => {
	const answer = await describe($, on, "Skill");
	expect(answer.isDeferred).toBe(true);
	expect(answer.description.length).toBeLessThan(BUILT_IN.length);
});

test("Deferred Text: `tool.describe` fires for a deferred tool, and the answer holds the shorter claudetto text and the deferral", async ($: Engine, on: On) => {
	on("tool.describe", () => ({ description: BUILT_IN }));
	await Array.fromAsync(["EnterWorktree", "ExitWorktree"], async (tool) => {
		const answer = await $.tool.describe({
			tool,
			description: BUILT_IN,
			provider: { plugin: "engine", tier: "core" },
		});
		expect(answer.isDeferred, tool).toBe(true);
		expect(answer.description.length, tool).toBeLessThan(BUILT_IN.length);
	});
});

test("Deferred Text: `SendMessage` keeps the shorter claudetto text and stays on the base prompt", async ($: Engine, on: On) => {
	const answer = await describe($, on, "SendMessage");
	expect(answer.isDeferred).toBeUndefined();
	expect(answer.description.length).toBeLessThan(BUILT_IN.length);
});
