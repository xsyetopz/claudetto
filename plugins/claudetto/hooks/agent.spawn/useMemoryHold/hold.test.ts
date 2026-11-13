import type { AgentSpawnInput, On, PluginOptions } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const MEMORY_PRESSURE = "/usr/bin/memory_pressure";
const MEMINFO = "/proc/meminfo";
const PS = "  4242 00:30 9437184 tsgolint\n  77 01:00:00 1048576 claude\n";

const SPAWN: AgentSpawnInput = {
	tool_use_id: "toolu_1",
	prompt: "Read README.md.",
	description: "read",
	subagentType: "claudetto:work",
	provider: { plugin: "claudetto", tier: "core" },
	parentModel: "opus",
	background: false,
	fork: false,
};

const set = (options: PluginOptions): { options: PluginOptions } => ({
	options,
});

const usage = (tokens: number) => ({
	startedAt: 0,
	context: { tokens, window: 1_000_000, percent: 0 },
	rateLimits: [],
});

const ok = {
	exitCode: 0,
	stdout: "",
	stderr: "",
	isStdoutTruncated: false,
	isStderrTruncated: false,
};

const capLab = (on: On, tokens = 100_000) => {
	const clock = mock.clock(on, { now: 0 });
	on("session.usage", () => ({ value: usage(tokens) }));
	on("tool.check", () => ({ decision: "allow" }));
	return clock;
};

const webFetch = ($: Engine, input: Record<string, unknown>) =>
	$.tool.check({ tool: "WebFetch", input, tool_use_id: crypto.randomUUID() });

test(
	"the call past the cap at heavy context is held with the cap named and one line that gives the count",
	set({ maxHeavyToolCalls: 2 }),
	async ($: Engine, on: On) => {
		capLab(on, 450_000);
		await webFetch($, { n: 1 });
		await webFetch($, { n: 2 });

		const held = await webFetch($, { n: 3 });

		expect(held.decision).toBe("deny");
		expect(held.reason).toContain("maxHeavyToolCalls");
		expect(held.reason).toContain("2");
		expect(held.reason?.split("\n")).toHaveLength(1);
	},
);

test(
	"a query without a tool_use_id is never held",
	set({ maxHeavyToolCalls: 1 }),
	async ($: Engine, on: On) => {
		capLab(on, 450_000);
		await webFetch($, { n: 1 });

		const out = await $.tool.check({ tool: "WebFetch", input: { n: 2 } });

		expect(out.decision).toBe("allow");
	},
);

test(
	"a light context is never capped",
	set({ maxHeavyToolCalls: 1 }),
	async ($: Engine, on: On) => {
		capLab(on, 100_000);
		await webFetch($, { n: 1 });

		const out = await webFetch($, { n: 2 });

		expect(out.decision).toBe("allow");
	},
);

test(
	"the calls under the cap at heavy context go through",
	set({ maxHeavyToolCalls: 2 }),
	async ($: Engine, on: On) => {
		capLab(on, 450_000);
		await webFetch($, { n: 1 });

		const out = await webFetch($, { n: 2 });

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
		await webFetch($, { n: 1 });
		await webFetch($, { n: 2 });
		tokens = 100_000;
		await webFetch($, { n: 3 });
		tokens = 450_000;

		const out = await webFetch($, { n: 4 });

		expect(out.decision).toBe("allow");
	},
);

test(
	"a call after the period has passed is counted from zero",
	set({ maxHeavyToolCalls: 2, limitPeriodSeconds: 60 }),
	async ($: Engine, on: On) => {
		const clock = capLab(on, 450_000);
		await webFetch($, { n: 1 });
		await webFetch($, { n: 2 });
		await clock.advance(61_000);

		const out = await webFetch($, { n: 3 });

		expect(out.decision).toBe("allow");
	},
);

test(
	"a heavy-context threshold from the options replaces the default",
	set({ maxHeavyToolCalls: 1, heavyContextTokens: 50_000 }),
	async ($: Engine, on: On) => {
		capLab(on, 100_000);
		await webFetch($, { n: 1 });

		const out = await webFetch($, { n: 2 });

		expect(out.decision).toBe("deny");
	},
);

test(
	"a context reading that fails holds nothing",
	set({ maxHeavyToolCalls: 1 }),
	async ($: Engine, on: On) => {
		mock.clock(on, { now: 0 });
		on("session.usage", () => {
			throw new Error("no reading");
		});
		on("tool.check", () => ({ decision: "allow" }));
		await webFetch($, { n: 1 });

		const out = await webFetch($, { n: 2 });

		expect(out.decision).toBe("allow");
	},
);

/** Each argv the guard ran; `free` is the share `memory_pressure` reports. */
const lab = (on: On, free: number, present = MEMORY_PRESSURE) => {
	const runs: string[][] = [];
	mock.clock(on, { now: 0 });
	mock.env(on, {});
	on("session.cwd", () => ({ value: "/p" }));
	on("session.root", () => ({ value: "/p" }));
	on("session.id", () => ({ value: "S1" }));
	on("session.messages", () => ({ value: [] }));
	on("tool.check", () => ({ decision: "allow" }));
	on("agent.list", () => ({ value: [] }));
	on("agent.spawn", () => ({ model: "sonnet", agentId: "started" }));
	on("fs.exists", (_$, e) => ({ value: e.path === present }));
	on("fs.read", (_$, e) => {
		if (e.path !== MEMINFO) {
			throw new Error(`ENOENT: ${e.path}`);
		}
		return {
			value: `MemTotal:       32000000 kB\nMemFree:          100000 kB\nMemAvailable:    ${free * 320_000} kB\n`,
		};
	});
	on("process.run", (_$, e) => {
		runs.push([...e.argv]);
		const stdout =
			e.argv[0] === "ps" ? PS : `System-wide memory free percentage: ${free}%`;
		return { value: { ...ok, stdout } };
	});
	return runs;
};

const bash = ($: Engine, command: string) =>
	$.tool.check({
		tool: "Bash",
		input: { command },
		tool_use_id: crypto.randomUUID(),
	});

test("a new command on a machine short of memory is denied with the largest processes", async ($: Engine, on: On) => {
	const runs = lab(on, 12);

	const out = await bash($, "bunx oxlint src/a.ts");

	expect(out.decision).toBe("deny");
	expect(out.reason).toContain("12%");
	expect(out.reason).toContain("4242 9.0 GB tsgolint");
	expect(out.reason).toContain("memoryFreeMinPercent");
	expect(runs.filter(([program]) => program === MEMORY_PRESSURE)).toHaveLength(
		1,
	);
});

test("a kill or a look at the processes goes on while memory is short", async ($: Engine, on: On) => {
	lab(on, 12);

	const kill = await bash($, "kill 4242");
	const look = await bash($, "ps -ax");

	// The memory guard passes the kill on; the kill gate behind it judges whose pid it is.
	expect(kill.reason).not.toContain("memoryFreeMinPercent");
	expect(kill.reason).toContain("not a process this session started");
	expect(look.decision).toBe("allow");
});

test("a subagent start on a machine short of memory is denied, with a hint to retry", async ($: Engine, on: On) => {
	lab(on, 12);

	const out = await $.agent.spawn(SPAWN);

	expect(out.deny).toContain("12%");
	expect(out.deny).toContain("Retry this subagent start");
});

test("a command denial carries no subagent retry hint", async ($: Engine, on: On) => {
	lab(on, 12);

	const out = await bash($, "bunx oxlint src/a.ts");

	expect(out.reason).not.toContain("Retry this subagent start");
});

test("the share comes from /proc/meminfo where it exists", async ($: Engine, on: On) => {
	const runs = lab(on, 10, MEMINFO);

	const out = await bash($, "bunx oxlint src/a.ts");

	expect(out.decision).toBe("deny");
	expect(out.reason).toContain("10%");
	expect(runs.filter(([program]) => program === MEMORY_PRESSURE)).toHaveLength(
		0,
	);
});

test("a command goes on with enough memory", async ($: Engine, on: On) => {
	lab(on, 60);

	const out = await bash($, "bunx oxlint src/a.ts");

	expect(out.decision).toBe("allow");
});

test(
	"a command goes on with the limit off",
	set({ memoryFreeMinPercent: 0 }),
	async ($: Engine, on: On) => {
		lab(on, 5);

		const out = await bash($, "bunx oxlint src/a.ts");
		const spawned = await $.agent.spawn(SPAWN);

		expect(out.decision).toBe("allow");
		expect(spawned.deny).toBeUndefined();
	},
);
