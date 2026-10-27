// Lab tests of the `agents` slice: the `agent.offer` hook and the `tool.call` hook of `Agent`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const offer = ($: Engine, agent: string, plugin: string) =>
	$.agent.offer({
		agent,
		description: "x",
		source: plugin === "engine" ? "built-in" : "plugin",
		provider: { plugin, tier: plugin === "engine" ? "core" : "append" },
	});

test("`agent.offer` hides each built-in agent", async ($: Engine) => {
	const agents = [
		"general-purpose",
		"Explore",
		"Plan",
		"claude",
		"claude-code-guide",
		"statusline-setup",
	];
	const answers = await Promise.all(
		agents.map((agent) => offer($, agent, "engine")),
	);
	for (const answer of answers) {
		expect(answer).toStrictEqual({ isOffered: false });
	}
});

test("`agent.offer` hides `claudetto:main`, the agent of the main thread", async ($: Engine) => {
	expect(await offer($, "claudetto:main", "claudetto")).toStrictEqual({
		isOffered: false,
	});
});

test("`agent.offer` offers a plugin agent", async ($: Engine, on: On) => {
	on("agent.offer", () => ({ isOffered: true }));
	expect(await offer($, "claudetto:Artemis", "claudetto")).toStrictEqual({
		isOffered: true,
	});
});

const called = async ($: Engine, on: On, input: { subagent_type?: string }) => {
	let type: unknown;
	on("tool.call", { tool: ["Agent"] }, (_$, e) => {
		type = "subagent_type" in e ? e.subagent_type : undefined;
		return { result: "ok" };
	});
	await $.tool.call({
		tool: "Agent",
		description: "Read",
		prompt: "Read a.txt.",
		...input,
	});
	return type;
};

test("`tool.call` gives an `Agent` call with no type the type `claudetto:Hephaestus`", async ($: Engine, on: On) => {
	expect(await called($, on, {})).toBe("claudetto:Hephaestus");
});

test("`tool.call` keeps the type that an `Agent` call names", async ($: Engine, on: On) => {
	expect(await called($, on, { subagent_type: "claudetto:Artemis" })).toBe(
		"claudetto:Artemis",
	);
});
