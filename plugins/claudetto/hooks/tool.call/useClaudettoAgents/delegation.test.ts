import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { scanner } from "../../secrets.mock";
import { AGENT_TEXT } from "../../texts";

interface Seen {
	subagent_type?: string;
	run_in_background?: boolean;
}

// The stub stands for the engine's Agent tool: it records the call it receives.
const lab = (on: On): Seen[] => {
	scanner(on);
	const seen: Seen[] = [];
	on("clock.now", () => ({ value: 0 }));
	on("tool.call", { tool: "Agent" }, (_$, e) => {
		seen.push({
			...(e.subagent_type === undefined
				? {}
				: { subagent_type: e.subagent_type }),
			...(e.run_in_background === undefined
				? {}
				: { run_in_background: e.run_in_background }),
		});
		return {
			result: { agentId: "a1", content: [], agentType: e.subagent_type },
		};
	});
	return seen;
};

const call = (subagent_type?: string, run_in_background?: boolean) => ({
	tool: "Agent" as const,
	description: "d",
	prompt: "p",
	...(subagent_type === undefined ? {} : { subagent_type }),
	...(run_in_background === undefined ? {} : { run_in_background }),
});

const refused: [string | undefined, boolean | undefined][] = [
	[undefined, undefined],
	["", undefined],
	["general-purpose", undefined],
	["claude", undefined],
	["work", undefined],
	["Explore", false],
	["Plan", false],
	["Explore", undefined],
	["search", true],
	["claudetto:search", undefined],
	["claudetto:plan", undefined],
	["claudetto:sweep", undefined],
	["sweep", true],
];

for (const [type, background] of refused) {
	test(`a call typed ${JSON.stringify(type)} is refused with its exact form, never rewritten`, async ($: Engine, on: On) => {
		const seen = lab(on);

		const out = await $.tool.call(call(type, background));

		expect(seen).toEqual([]);
		expect(out.deny).toBeDefined();
	});
}

test("a call in the exact form reaches the engine as it was", async ($: Engine, on: On) => {
	const seen = lab(on);

	await $.tool.call(call("claudetto:search", true));
	await $.tool.call(call("claudetto:search", false));
	await $.tool.call(call("claudetto:work"));

	expect(seen).toEqual([
		{ subagent_type: "claudetto:search", run_in_background: true },
		{ subagent_type: "claudetto:search", run_in_background: false },
		{ subagent_type: "claudetto:work" },
	]);
});

for (const type of ["fork", "statusline-setup", "claude-code-guide"]) {
	test(`${type} passes through unchanged`, async ($: Engine, on: On) => {
		const seen = lab(on);

		await $.tool.call(call(type));

		expect(seen).toEqual([{ subagent_type: type }]);
	});
}

test("the result of a search call reads as Explore", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.tool.call(call("claudetto:search", false));

	expect(out.result).toMatchObject({ agentType: "Explore" });
});

test("the result of a work call keeps its agent type", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.tool.call(call("claudetto:work"));

	expect(out.result).toMatchObject({ agentType: "claudetto:work" });
});

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
		agent: "claudetto:search",
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

test("a call that names isolation reaches the engine as it is", async ($: Engine, on: On) => {
	const seen = lab(on);

	await $.tool.call({ ...call("claudetto:work"), isolation: "worktree" });

	expect(seen).toEqual([{ subagent_type: "claudetto:work" }]);
});

const LISTING = [
	"Available agent types for the Agent tool:",
	"- claudetto:search: search",
	"- claudetto:work: default",
	"",
	"Use subagent_type.",
].join("\n");

test("the listing keeps only its agent lines", async ($: Engine, on: On) => {
	on("prompt.attachment", (_$, e) => ({ text: e.text }));

	const out = await $.prompt.attachment({
		type: "agent_listing_delta",
		text: LISTING,
		origin: { kind: "engine" },
	});

	expect(out.text).toBe(
		"- claudetto:search: search\n- claudetto:work: default",
	);
});

test("another attachment is left as it is", async ($: Engine, on: On) => {
	on("prompt.attachment", (_$, e) => ({ text: e.text }));

	const out = await $.prompt.attachment({
		type: "skill_listing",
		text: LISTING,
		origin: { kind: "engine" },
	});

	expect(out.text).toBe(LISTING);
});
