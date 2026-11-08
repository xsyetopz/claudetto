import type {
	AgentInfo,
	AgentSpawnInput,
	On,
	PluginOptions,
} from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const ERROR = "connect ECONNREFUSED 127.0.0.1:9";

const SAME = { url: "https://example.com/a", prompt: "go" };

const usage = (tokens: number) => ({
	startedAt: 0,
	context: { tokens, window: 1_000_000, percent: 0 },
	rateLimits: [],
});

const lab = (on: On, tokens = 100_000) => {
	const clock = mock.clock(on, { now: 0 });
	on("session.usage", () => ({ value: usage(tokens) }));
	on("classic.PostToolUseFailure", () => ({}));
	on("tool.check", () => ({ decision: "allow" }));
	return clock;
};

const failed = (
	$: Engine,
	input: Record<string, unknown> = SAME,
	error = ERROR,
) =>
	$.classic.PostToolUseFailure({
		tool_name: "WebFetch",
		tool_input: input,
		tool_use_id: crypto.randomUUID(),
		error,
	});

const check = ($: Engine, input: Record<string, unknown> = SAME) =>
	$.tool.check({ tool: "WebFetch", input, tool_use_id: crypto.randomUUID() });

const set = (options: PluginOptions): { options: PluginOptions } => ({
	options,
});

test(
	"an identical call is refused after the failure limit, with the earlier error",
	set({ maxIdenticalFailures: 2 }),
	async ($: Engine, on: On) => {
		lab(on);
		await failed($);
		await failed($);

		const out = await check($);

		expect(out.decision).toBe("deny");
		expect(out.reason).toContain(ERROR);
		expect(out.reason).toContain("maxIdenticalFailures");
	},
);

test(
	"a call under the failure limit, or with other input, goes through",
	set({ maxIdenticalFailures: 2 }),
	async ($: Engine, on: On) => {
		lab(on);
		await failed($);
		await failed($);

		const other = await check($, {
			url: "https://example.com/b",
			prompt: "go",
		});
		await failed($, { url: "https://example.com/c", prompt: "go" });
		const once = await check($, { url: "https://example.com/c", prompt: "go" });

		expect(other.decision).toBe("allow");
		expect(once.decision).toBe("allow");
	},
);

test(
	"a failure after the period passes",
	set({ maxIdenticalFailures: 2, limitPeriodSeconds: 60 }),
	async ($: Engine, on: On) => {
		const clock = lab(on);
		await failed($);
		await failed($);
		await clock.advance(61_000);

		const out = await check($);

		expect(out.decision).toBe("allow");
	},
);

test(
	"a user's interrupt is not counted as a failure",
	set({ maxIdenticalFailures: 1 }),
	async ($: Engine, on: On) => {
		lab(on);
		await $.classic.PostToolUseFailure({
			tool_name: "WebFetch",
			tool_input: SAME,
			tool_use_id: "i1",
			error: "interrupted",
			is_interrupt: true,
		});

		const out = await check($);

		expect(out.decision).toBe("allow");
	},
);

test(
	"a query without a tool_use_id is never held",
	set({ maxIdenticalFailures: 1 }),
	async ($: Engine, on: On) => {
		lab(on);
		await failed($);

		const out = await $.tool.check({ tool: "WebFetch", input: SAME });

		expect(out.decision).toBe("allow");
	},
);

test(
	"the call past the cap at heavy context is held with the cap named and one line that gives the count",
	set({ maxHeavyToolCalls: 2 }),
	async ($: Engine, on: On) => {
		lab(on, 450_000);
		await check($, { n: 1 });
		await check($, { n: 2 });

		const held = await check($, { n: 3 });

		expect(held.decision).toBe("deny");
		expect(held.reason).toContain("maxHeavyToolCalls");
		expect(held.reason).toContain("2");
		expect(held.reason?.split("\n")).toHaveLength(1);
	},
);

test(
	"a light context is never capped",
	set({ maxHeavyToolCalls: 1 }),
	async ($: Engine, on: On) => {
		lab(on, 100_000);
		await check($, { n: 1 });

		const out = await check($, { n: 2 });

		expect(out.decision).toBe("allow");
	},
);

test(
	"failures with different errors do not add up",
	set({ maxIdenticalFailures: 2 }),
	async ($: Engine, on: On) => {
		lab(on);
		await failed($, SAME, "first error");
		await failed($, SAME, "second error");

		const out = await check($);

		expect(out.decision).toBe("allow");
	},
);

test("with no option the failure limit is 3", async ($: Engine, on: On) => {
	lab(on);
	await failed($);
	await failed($);
	const beforeThird = await check($);
	await failed($);

	const afterThird = await check($);

	expect(beforeThird.decision).toBe("allow");
	expect(afterThird.decision).toBe("deny");
});

test(
	"the calls under the cap at heavy context go through",
	set({ maxHeavyToolCalls: 2 }),
	async ($: Engine, on: On) => {
		lab(on, 450_000);
		await check($, { n: 1 });

		const out = await check($, { n: 2 });

		expect(out.decision).toBe("allow");
	},
);

test(
	"a context that falls back below the heavy line starts the count again",
	set({ maxHeavyToolCalls: 2 }),
	async ($: Engine, on: On) => {
		let tokens = 450_000;
		mock.clock(on, { now: 0 });
		on("session.usage", () => ({ value: usage(tokens) }));
		on("tool.check", () => ({ decision: "allow" }));
		await check($, { n: 1 });
		await check($, { n: 2 });
		tokens = 100_000;
		await check($, { n: 3 });
		tokens = 450_000;

		const out = await check($, { n: 4 });

		expect(out.decision).toBe("allow");
	},
);

test(
	"a call after the period has passed is counted from zero",
	set({ maxHeavyToolCalls: 2, limitPeriodSeconds: 60 }),
	async ($: Engine, on: On) => {
		const clock = lab(on, 450_000);
		await check($, { n: 1 });
		await check($, { n: 2 });
		await clock.advance(61_000);

		const out = await check($, { n: 3 });

		expect(out.decision).toBe("allow");
	},
);

test(
	"a heavy-context threshold from the options replaces the default",
	set({ maxHeavyToolCalls: 1, heavyContextTokens: 50_000 }),
	async ($: Engine, on: On) => {
		lab(on, 100_000);
		await check($, { n: 1 });

		const out = await check($, { n: 2 });

		expect(out.decision).toBe("deny");
	},
);

const agent = (id: string, status: AgentInfo["status"]): AgentInfo => ({
	id,
	description: "work",
	type: "claudetto:Heracles",
	status,
});

const SPAWN: AgentSpawnInput = {
	tool_use_id: "toolu_1",
	prompt: "Read README.md.",
	description: "read",
	subagentType: "claudetto:Heracles",
	provider: { plugin: "claudetto", tier: "core" },
	parentModel: "opus",
	background: false,
	fork: false,
};

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

test(
	"a context reading that fails holds nothing",
	set({ maxHeavyToolCalls: 1 }),
	async ($: Engine, on: On) => {
		mock.clock(on, { now: 0 });
		on("session.usage", () => {
			throw new Error("no reading");
		});
		on("classic.PostToolUseFailure", () => ({}));
		on("tool.check", () => ({ decision: "allow" }));
		await check($, { n: 1 });

		const out = await check($, { n: 2 });

		expect(out.decision).toBe("allow");
	},
);
