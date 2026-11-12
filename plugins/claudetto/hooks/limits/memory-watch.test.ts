import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import { scanned } from "../secrets.mock.ts";
import { set } from "./hold.mock.ts";

const TOTAL_BYTES = 34_359_738_368;
const KB_PER_GB = 1_048_576;

const ok = {
	exitCode: 0,
	stdout: "",
	stderr: "",
	isStdoutTruncated: false,
	isStderrTruncated: false,
};

interface Machine {
	/** The `ps` rows: pid, elapsed time, resident size in kilobytes, name. */
	ps: string;
	readonly runs: string[][];
}

/** A machine whose `ps` lists `ps`; the `Bash` call itself runs 60 s on the mock clock. */
const lab = (on: On, ps: string) => {
	const machine: Machine = { ps, runs: [] };
	const clock = mock.clock(on, { now: 0 });
	mock.env(on, {});
	on("session.cwd", () => ({ value: "/p" }));
	on("session.root", () => ({ value: "/p" }));
	on("fs.exists", () => ({ value: false }));
	on("process.run", (_$, e) => {
		const found = scanned(e);
		if (found !== undefined) {
			return found;
		}
		machine.runs.push([...e.argv]);
		const stdout =
			{ ps: machine.ps, sysctl: `${TOTAL_BYTES}\n` }[e.argv[0] ?? ""] ?? "";
		return { value: { ...ok, stdout } };
	});
	on("tool.call", async () => {
		await clock.sleep(60_000);
		return { result: { stdout: "done", stderr: "" }, text: "done" };
	});
	return { machine, clock };
};

const watched = async ($: Engine, clock: ReturnType<typeof mock.clock>) => {
	const pending = $.tool.call({
		tool: "Bash",
		tool_use_id: "toolu_1",
		command: "bunx oxlint src",
	});
	await clock.settle();
	await clock.advance(5000);
	await clock.advance(60_000);
	return pending;
};

const ran = (machine: Machine, program: string): boolean =>
	machine.runs.some(([name]) => name === program);

const GROWN = `  4242 00:09 ${9 * KB_PER_GB} tsgolint\n  77 02:10:00 ${12 * KB_PER_GB} claude\n  90 00:09 ${KB_PER_GB} node\n`;

test("a command whose process passes the cap is stopped by its pid, and the result says so", async ($: Engine, on: On) => {
	const { machine, clock } = lab(on, GROWN);
	const out = await watched($, clock);

	expect(machine.runs).toContainEqual(["kill", "4242"]);
	expect(machine.runs).not.toContainEqual(["kill", "77"]);
	expect(out.text).toContain("4242");
	expect(out.text).toContain("tsgolint");
});

test("a process that began before the command is left alone", async ($: Engine, on: On) => {
	const { machine, clock } = lab(
		on,
		`  77 02:10:00 ${12 * KB_PER_GB} claude\n`,
	);
	const out = await watched($, clock);

	expect(ran(machine, "kill")).toBe(false);
	expect(out.text).toBe("done");
});

test("a process under the cap is left alone", async ($: Engine, on: On) => {
	const { machine, clock } = lab(
		on,
		`  4242 00:09 ${3 * KB_PER_GB} tsgolint\n`,
	);
	await watched($, clock);

	expect(ran(machine, "kill")).toBe(false);
});

test(
	"a cap of 0 watches nothing",
	set({ memoryProcessMaxPercent: 0 }),
	async ($: Engine, on: On) => {
		const { machine, clock } = lab(on, GROWN);
		await watched($, clock);

		expect(ran(machine, "ps")).toBe(false);
	},
);
