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

const CLAUDE_CAP = "CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS";

/** `claudeCap` is what the session's `env` setting holds for Claude Code's own cap of subagents. */
const lab = (
	on: On,
	listed: AgentInfo[],
	login = MAX_20X,
	claudeCap?: string,
): void => {
	mock.clock(on, { now: 0 });
	on("agent.list", () => ({ value: listed }));
	mock.env(on, {
		HOME: "/home/me",
		...(claudeCap === undefined ? {} : { [CLAUDE_CAP]: claudeCap }),
	});
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

test("a start past the cap of running subagents is refused with the count and the setting", async ($: Engine, on: On) => {
	lab(on, running(2), MAX_20X, "2");

	const out = await start($);

	expect(out.deny).toContain("2");
	expect(out.deny).toContain(CLAUDE_CAP);
	expect(out.agentId).toBeUndefined();
});

test("a start under the cap goes through", async ($: Engine, on: On) => {
	lab(on, running(1), MAX_20X, "2");

	const out = await start($);

	expect(out.deny).toBeUndefined();
	expect(out.agentId).toBe("started");
});

test("an agent that has ended does not count against the cap", async ($: Engine, on: On) => {
	lab(on, [agent("a", "completed"), agent("b", "killed")], MAX_20X, "1");

	const out = await start($);

	expect(out.deny).toBeUndefined();
});

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
	options({ maxSubagentStarts: 2 }),
	async ($: Engine, on: On) => {
		lab(on, []);
		await start($);
		await start($);

		const out = await start($);

		expect(out.deny).toContain("2");
		expect(out.deny).toContain("maxSubagentStarts");
	},
);

test(
	"a start after the window has passed counts from zero",
	options({ maxSubagentStarts: 1, limitPeriodSeconds: 60 }),
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

test("a cap in the env above the plan cap lets a start through where the plan would refuse it", async ($: Engine, on: On) => {
	lab(on, running(5), MAX_20X, "8");

	const out = await start($);

	expect(out.deny).toBeUndefined();
});

test(
	"a `subagentCap` stored before the rename still caps the subagents when the env sets none",
	options({ subagentCap: 3 }),
	async ($: Engine, on: On) => {
		lab(on, running(3));

		const out = await start($);

		expect(out.deny).toContain("3");
	},
);

test(
	"the env cap of Claude Code wins over a `subagentCap` stored before the rename",
	options({ subagentCap: 3 }),
	async ($: Engine, on: On) => {
		lab(on, running(3), MAX_20X, "9");

		const out = await start($);

		expect(out.deny).toBeUndefined();
	},
);
