import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import { set, SPAWN } from "./hold.mock.ts";

const MEMORY_PRESSURE = "/usr/bin/memory_pressure";
const MEMINFO = "/proc/meminfo";
const PS = "  4242 9437184 tsgolint\n  77 1048576 claude\n";

const ok = {
	exitCode: 0,
	stdout: "",
	stderr: "",
	isStdoutTruncated: false,
	isStderrTruncated: false,
};

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

test("a subagent start on a machine short of memory is denied", async ($: Engine, on: On) => {
	lab(on, 12);

	const out = await $.agent.spawn(SPAWN);

	expect(out.deny).toContain("12%");
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
