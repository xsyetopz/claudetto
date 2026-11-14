import type { On, PluginOptions } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import { scanned } from "../../secrets.mock";

const SYSCTL = "/usr/sbin/sysctl";
const TOTAL_BYTES = 34_359_738_368;
const KB_PER_GB = 1_048_576;

const set = (options: PluginOptions): { options: PluginOptions } => ({
	options,
});

const ok = {
	exitCode: 0,
	stdout: "",
	stderr: "",
	isStdoutTruncated: false,
	isStderrTruncated: false,
};

type Clock = ReturnType<typeof mock.clock>;
type Call = () => Promise<{
	result: { stdout: string; stderr: string; backgroundTaskId?: string };
	text: string;
}>;

interface Machine {
	/** The `ps` rows: pid, parent pid, elapsed time, resident size in kilobytes, name. */
	ps: string;
	/** The number of `ps` runs that fail before one answers. */
	psFailures: number;
	readonly runs: string[][];
	readonly logs: string[];
	readonly psTimeouts: (number | undefined)[];
}

/** A machine whose `ps` lists `ps`; `call` is what the `Bash` call does. */
const watchLab = (on: On, ps: string, call: (clock: Clock) => Call) => {
	const machine: Machine = {
		ps,
		psFailures: 0,
		runs: [],
		logs: [],
		psTimeouts: [],
	};
	const clock = mock.clock(on, { now: 0 });
	mock.env(on, { HOME: "/h" });
	on("session.id", () => ({ value: "s1" }));
	on("fs.list", () => ({
		value: [
			{
				name: "500.json",
				kind: "file" as const,
				size: 0,
				mtimeMs: 0,
				isLink: false,
			},
		],
	}));
	on("fs.read", () => ({ value: '{"pid":500,"sessionId":"s1"}' }));
	on("session.cwd", () => ({ value: "/p" }));
	on("session.root", () => ({ value: "/p" }));
	on("fs.exists", () => ({ value: false }));
	on("ui.log", (_$, e) => {
		machine.logs.push(e.text);
		return { value: undefined };
	});
	on("process.run", (_$, e) => {
		const found = scanned(e);
		if (found !== undefined) {
			return found;
		}
		machine.runs.push([...e.argv]);
		if (e.argv[0] === "ps") {
			machine.psTimeouts.push(e.init?.timeoutMs);
		}
		if (e.argv[0] === "ps" && machine.psFailures > 0) {
			machine.psFailures -= 1;
			throw new Error("ps failed to start");
		}
		const stdout =
			{ ps: machine.ps, [SYSCTL]: `${TOTAL_BYTES}\n` }[e.argv[0] ?? ""] ?? "";
		return { value: { ...ok, stdout } };
	});
	on("tool.call", call(clock));
	return { machine, clock };
};

/** A call that runs 60 s on the mock clock. */
const slow =
	(clock: Clock): Call =>
	async () => {
		await clock.sleep(60_000);
		return { result: { stdout: "done", stderr: "" }, text: "done" };
	};

/** A call that returns at once, as `run_in_background` and a timeout do. */
const background = (): Call => () =>
	Promise.resolve({
		result: { stdout: "", stderr: "", backgroundTaskId: "b1" },
		text: "started",
	});

const bashCall = ($: Engine) =>
	$.tool.call({
		tool: "Bash",
		tool_use_id: "toolu_1",
		command: "bunx oxlint src",
	});

const watched = async ($: Engine, clock: Clock) => {
	const pending = bashCall($);
	await clock.settle();
	await clock.advance(5000);
	await clock.advance(60_000);
	return pending;
};

const ran = (machine: Machine, program: string): boolean =>
	machine.runs.some(([name]) => name === program);

const psRuns = (machine: Machine): number =>
	machine.runs.filter(([name]) => name === "ps").length;

const GROWN = `  4242 500 00:04 ${9 * KB_PER_GB} tsgolint\n  77 500 02:10:00 ${12 * KB_PER_GB} claude\n  90 4242 00:04 ${KB_PER_GB} node\n`;
const SMALL = `  4242 500 00:04 ${3 * KB_PER_GB} tsgolint\n`;

test("a command whose process passes the cap is stopped by its pid, and the result says so", async ($: Engine, on: On) => {
	const { machine, clock } = watchLab(on, GROWN, slow);
	const out = await watched($, clock);

	expect(machine.runs).toContainEqual(["kill", "4242"]);
	expect(machine.runs).not.toContainEqual(["kill", "77"]);
	expect(out.text).toContain("4242");
	expect(out.text).toContain("tsgolint");
});

test("a process that is no descendant of the session is left alone, however big and new", async ($: Engine, on: On) => {
	const { machine, clock } = watchLab(
		on,
		`  5151 1 00:04 ${12 * KB_PER_GB} bun\n  4242 500 00:04 ${KB_PER_GB} node\n`,
		slow,
	);
	await watched($, clock);

	expect(ran(machine, "kill")).toBe(false);
});

test("the machine's memory size is read by the absolute path of sysctl", async ($: Engine, on: On) => {
	const { machine, clock } = watchLab(on, GROWN, slow);
	await watched($, clock);

	expect(machine.runs).toContainEqual([SYSCTL, "-n", "hw.memsize"]);
	expect(ran(machine, "sysctl")).toBe(false);
});

test("a process that began before the command is left alone", async ($: Engine, on: On) => {
	const { machine, clock } = watchLab(
		on,
		`  77 500 02:10:00 ${12 * KB_PER_GB} claude\n`,
		slow,
	);
	const out = await watched($, clock);

	expect(ran(machine, "kill")).toBe(false);
	expect(out.text).toBe("done");
});

test("a process under the cap is left alone", async ($: Engine, on: On) => {
	const { machine, clock } = watchLab(on, SMALL, slow);
	await watched($, clock);

	expect(ran(machine, "kill")).toBe(false);
});

test(
	"a cap of 0 watches nothing",
	set({ memoryProcessMaxPercent: 0 }),
	async ($: Engine, on: On) => {
		const { machine, clock } = watchLab(on, GROWN, slow);
		await watched($, clock);

		expect(ran(machine, "ps")).toBe(false);
	},
);

test("a failed poll does not end the watch", async ($: Engine, on: On) => {
	const { machine, clock } = watchLab(on, GROWN, slow);
	machine.psFailures = 1;
	await watched($, clock);

	expect(machine.runs).toContainEqual(["kill", "4242"]);
	expect(machine.logs.join("\n")).not.toContain("memory watch");
});

test("a run of failed polls is noted once", async ($: Engine, on: On) => {
	const { machine, clock } = watchLab(on, SMALL, slow);
	machine.psFailures = 5;
	await watched($, clock);

	expect(
		machine.logs.filter((log) => log.includes("memory watch")),
	).toHaveLength(1);
});

test("a poll gives `ps` no more time than the gap between polls", async ($: Engine, on: On) => {
	const { machine, clock } = watchLab(on, SMALL, slow);
	await watched($, clock);

	expect(new Set(machine.psTimeouts)).toEqual(new Set([5000]));
});

test("a call that is cancelled leaves no watch and no notice", async ($: Engine, on: On) => {
	const { machine, clock } = watchLab(on, SMALL, (at) => async () => {
		await at.sleep(1000);
		throw new Error("cancelled");
	});
	const pending = bashCall($).catch(() => null);
	await clock.settle();
	await clock.advance(1000);
	await pending;
	const before = psRuns(machine);
	await clock.advance(60_000);

	expect(psRuns(machine)).toBe(before);
	expect(machine.logs.join("\n")).not.toContain("memory watch stopped");
});

test("a command that runs in the background is watched, and its process is stopped at the cap", async ($: Engine, on: On) => {
	const { machine, clock } = watchLab(on, GROWN, background);

	const out = await bashCall($);
	await clock.advance(5000);

	expect(out.text).toBe("started");
	expect(machine.runs).toContainEqual(["kill", "4242"]);
});

test("a background command is watched while its process runs", async ($: Engine, on: On) => {
	const { machine, clock } = watchLab(on, SMALL, background);

	await bashCall($);
	await clock.advance(5000);
	await clock.advance(30_000);
	const whileRunning = psRuns(machine);
	machine.ps = GROWN;
	await clock.advance(5000);

	expect(whileRunning).toBeGreaterThan(2);
	expect(machine.runs).toContainEqual(["kill", "4242"]);
});

test("the watch of a background command ends with its process", async ($: Engine, on: On) => {
	const { machine, clock } = watchLab(on, SMALL, background);

	await bashCall($);
	await clock.advance(5000);
	machine.ps = "";
	await clock.advance(5000);
	const before = psRuns(machine);
	await clock.advance(60_000);

	expect(psRuns(machine)).toBe(before);
});
