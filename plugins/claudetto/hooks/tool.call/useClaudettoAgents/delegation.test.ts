import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { scanner } from "../../secrets.mock";
import { AGENT_TEXT } from "../../texts";

const call = (subagent_type?: string, run_in_background?: boolean) => ({
	tool: "Agent" as const,
	description: "d",
	prompt: "p",
	...(subagent_type === undefined ? {} : { subagent_type }),
	...(run_in_background === undefined ? {} : { run_in_background }),
});

const types: [string | undefined, boolean | undefined][] = [
	[undefined, undefined],
	["general-purpose", undefined],
	["Explore", false],
	["Heracles", undefined],
	["claudetto:Artemis", undefined],
	["fork", undefined],
];

for (const [type, background] of types) {
	test(`an Agent call typed ${JSON.stringify(type)} reaches the engine as it was`, async ($: Engine, on: On) => {
		scanner(on);
		on("clock.now", () => ({ value: 0 }));
		const seen: unknown[] = [];
		on("tool.call", { tool: "Agent" }, (_$, e) => {
			seen.push(e);
			return { result: { agentId: "a1", content: [] } };
		});

		const out = await $.tool.call(call(type, background));

		expect(out.deny).toBeUndefined();
		expect(seen).toEqual([expect.objectContaining(call(type, background))]);
	});
}

test("agent.offer withholds a built-in agent and offers a plugin one", async ($: Engine, on: On) => {
	on("agent.offer", () => ({ isOffered: true }));
	const origin = { plugin: "engine", tier: "core" } as const;

	const builtIn = await $.agent.offer({
		agent: "Explore",
		description: "d",
		source: "built-in",
		provider: origin,
	});
	const plugin = await $.agent.offer({
		agent: "claudetto:Artemis",
		description: "d",
		source: "plugin",
		provider: { plugin: "claudetto", tier: "user" },
	});

	expect(builtIn.isOffered).toBe(false);
	expect(plugin.isOffered).toBe(true);
});

test("the Agent text picks a type from the agent list or leaves the work to the caller", async ($: Engine, on: On) => {
	on("tool.describe", (_$, e) => e);

	const out = await $.tool.describe({
		tool: "Agent",
		description: "Launch a new agent (general-purpose by default)",
		provider: { plugin: "engine", tier: "core" },
	});

	expect(out.description).toBe(AGENT_TEXT);
	expect(AGENT_TEXT).toContain('isolation: "worktree" if it commits');
});
