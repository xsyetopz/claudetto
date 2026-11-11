import type { AgentInfo, On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import { set, SPAWN, usage } from "./hold.mock.ts";

const agent = (id: string, status: AgentInfo["status"]): AgentInfo => ({
	id,
	description: "work",
	type: "claudetto:Heracles",
	status,
});

const spawnLab = (on: On, running: number | AgentInfo[], cap?: string) => {
	const clock = mock.clock(on, { now: 0 });
	on("agent.list", () => ({
		value:
			typeof running === "number"
				? Array.from({ length: running }, (_, i) => agent(`a${i}`, "running"))
				: running,
	}));
	mock.env(
		on,
		cap === undefined ? {} : { CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: cap },
	);
	on("agent.spawn", () => ({ model: "sonnet", agentId: "started" }));
	on("fs.exists", () => ({ value: false }));
	return clock;
};

test("a start past the environment's cap of running subagents is refused", async ($: Engine, on: On) => {
	spawnLab(on, 2, "2");

	const out = await $.agent.spawn(SPAWN);

	expect(out.deny).toContain("CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS");
});

test("a start under the cap goes through", async ($: Engine, on: On) => {
	spawnLab(on, 1, "2");

	const out = await $.agent.spawn(SPAWN);

	expect(out.deny).toBeUndefined();
});

test(
	"starts past maxSubagentStarts in the period are refused",
	set({ maxSubagentStarts: 2 }),
	async ($: Engine, on: On) => {
		spawnLab(on, 0);
		await $.agent.spawn(SPAWN);
		await $.agent.spawn(SPAWN);

		const out = await $.agent.spawn(SPAWN);

		expect(out.deny).toContain("maxSubagentStarts");
	},
);

test("an agent that has ended does not count against the cap", async ($: Engine, on: On) => {
	spawnLab(on, [agent("a", "completed"), agent("b", "killed")], "1");

	const out = await $.agent.spawn(SPAWN);

	expect(out.deny).toBeUndefined();
});

test(
	"a start after the period has passed counts from zero",
	set({ maxSubagentStarts: 1, limitPeriodSeconds: 60 }),
	async ($: Engine, on: On) => {
		const clock = spawnLab(on, 0);
		await $.agent.spawn(SPAWN);
		await clock.advance(61_000);

		const out = await $.agent.spawn(SPAWN);

		expect(out.deny).toBeUndefined();
	},
);

test("with no option the start cap is 12", async ($: Engine, on: On) => {
	spawnLab(on, 0);
	await Promise.all(Array.from({ length: 12 }, () => $.agent.spawn(SPAWN)));

	const out = await $.agent.spawn(SPAWN);

	expect(out.deny).toContain("12");
});

test("a start with no cap in the environment is not refused for the count of running subagents", async ($: Engine, on: On) => {
	spawnLab(on, 30);

	const out = await $.agent.spawn(SPAWN);

	expect(out.deny).toBeUndefined();
});

/** A subagent `started`, spawned at 0, whose calls the engine would allow. */
const runLab = async ($: Engine, on: On) => {
	const clock = spawnLab(on, 0);
	on("session.usage", () => ({ value: usage(100_000) }));
	on("tool.check", () => ({ decision: "allow" }));
	await $.agent.spawn(SPAWN);
	return clock;
};

const callIn = ($: Engine, agentId?: string) =>
	$.tool.check({
		tool: "Read",
		input: { file_path: "/a" },
		tool_use_id: crypto.randomUUID(),
		...(agentId === undefined ? {} : { agentId }),
	});

test(
	"a subagent's call past agentMaxMinutes is refused, and the main loop's still goes",
	set({ agentMaxMinutes: 1 }),
	async ($: Engine, on: On) => {
		const clock = await runLab($, on);
		await clock.advance(30_000);
		const early = await callIn($, "started");
		await clock.advance(31_000);

		const late = await callIn($, "started");
		const main = await callIn($);

		expect([early.decision, late.decision, main.decision]).toEqual([
			"allow",
			"deny",
			"allow",
		]);
	},
);

test("with no option a subagent runs 15 minutes", async ($: Engine, on: On) => {
	const clock = await runLab($, on);
	await clock.advance(14 * 60_000);
	const early = await callIn($, "started");
	await clock.advance(2 * 60_000);

	const late = await callIn($, "started");

	expect([early.decision, late.decision]).toEqual(["allow", "deny"]);
});

test(
	"agentMaxMinutes 0 turns the time limit off",
	set({ agentMaxMinutes: 0 }),
	async ($: Engine, on: On) => {
		const clock = await runLab($, on);
		await clock.advance(24 * 3_600_000);

		const out = await callIn($, "started");

		expect(out.decision).toBe("allow");
	},
);
