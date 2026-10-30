// Hold Subagent Fan-Out (`specs/run-limits/spec.md`): `agent.spawn` is refused with a reason that
// names the count and the setting to change, once the agents running at the same time pass the cap
// or the starts inside the window do. The cap of the plan row is the starting value, and the option
// `subagentCap` replaces it. The stubs stand for the engine: the agents it lists, the file that
// names the plan, and the start itself.

import type {
	AgentInfo,
	AgentSpawnInput,
	On,
	PluginOptions,
} from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const agent = (id: string, status: AgentInfo["status"]): AgentInfo => ({
	id,
	description: "work",
	type: "claudetto:Hephaestus",
	status,
});

const running = (n: number): AgentInfo[] =>
	Array.from({ length: n }, (_, i) => agent(`a${i}`, "running"));

const MAX_20X = JSON.stringify({
	oauthAccount: { organizationRateLimitTier: "default_claude_max_20x" },
});

/** The answers beneath the plugin: the agents listed, the login file, and a start that succeeds. */
const lab = (on: On, listed: AgentInfo[], login = MAX_20X): void => {
	mock.clock(on, { now: 0 });
	on("agent.list", () => ({ value: listed }));
	on("env.get", () => ({ value: "/home/me" }));
	on("fs.read", () => ({ value: login }));
	on("agent.spawn", () => ({ model: "sonnet", agentId: "started" }));
};

const SPAWN: AgentSpawnInput = {
	tool_use_id: "toolu_1",
	prompt: "Read README.md.",
	description: "read",
	subagentType: "claudetto:Hephaestus",
	provider: { plugin: "claudetto", tier: "core" },
	parentModel: "opus",
	background: false,
	fork: false,
};

const start = ($: Engine) => $.agent.spawn(SPAWN);

const options = (set: PluginOptions): { options: PluginOptions } => ({
	options: set,
});

test(
	"a start past the cap of running subagents is refused with the count and the setting",
	options({ subagentCap: 2 }),
	async ($: Engine, on: On) => {
		lab(on, running(2));

		const out = await start($);

		expect(out.deny).toContain("2");
		expect(out.deny).toContain("subagentCap");
		expect(out.agentId).toBeUndefined();
	},
);

test(
	"a start under the cap goes through",
	options({ subagentCap: 2 }),
	async ($: Engine, on: On) => {
		lab(on, running(1));

		const out = await start($);

		expect(out.deny).toBeUndefined();
		expect(out.agentId).toBe("started");
	},
);

test(
	"an agent that has ended does not count against the cap",
	options({ subagentCap: 1 }),
	async ($: Engine, on: On) => {
		lab(on, [agent("a", "completed"), agent("b", "killed")]);

		const out = await start($);

		expect(out.deny).toBeUndefined();
	},
);

test("with no option the cap is the one of the plan row", async ($: Engine, on: On) => {
	lab(on, running(5));

	const out = await start($);

	expect(out.deny).toContain("5");
});

test("a login the table has no row for gets no cap of its own", async ($: Engine, on: On) => {
	lab(on, running(50), "{}");

	const out = await start($);

	expect(out.deny).toBeUndefined();
});

test(
	"the next start inside the window is refused once the starts reach the start cap",
	options({ startCap: 2 }),
	async ($: Engine, on: On) => {
		lab(on, []);
		await start($);
		await start($);

		const out = await start($);

		expect(out.deny).toContain("2");
		expect(out.deny).toContain("startCap");
	},
);

test(
	"a start after the window has passed counts from zero",
	options({ startCap: 1, windowSeconds: 60, subagentCap: 9 }),
	async ($: Engine, on: On) => {
		const clock = mock.clock(on, { now: 0 });
		on("agent.list", () => ({ value: [] }));
		on("agent.spawn", () => ({ model: "sonnet", agentId: "started" }));
		await start($);
		await clock.advance(61_000);

		const out = await start($);

		expect(out.deny).toBeUndefined();
	},
);

test(
	"an option above the plan cap lets a start through where the plan would refuse it",
	options({ subagentCap: 8 }),
	async ($: Engine, on: On) => {
		lab(on, running(5));

		const out = await start($);

		expect(out.deny).toBeUndefined();
	},
);
