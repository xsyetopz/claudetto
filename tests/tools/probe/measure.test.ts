// The measures of the code-compaction probe, from canned events and temp git folders, with no model call.

import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file as bunFile, write as bunWrite, spawn } from "bun";
import type { Base } from "../../../dev/probe/events.ts";
import { problem } from "../../../dev/probe/events.ts";
import {
	brokenIn,
	buildFixture,
	git,
	PORT,
} from "../../../dev/probe/fixture.ts";
import { measure } from "../../../dev/probe/measure.ts";
import { plan } from "../../../dev/probe/plan.ts";
import { baseProblem, runAll } from "../../../dev/probe/round.ts";
import {
	proven,
	taskLines,
} from "../../../plugins/claudetto/modules/project/domain/checks.ts";

const DIR = "/w";
const base: Base = {
	cost: 1,
	read: new Set([`${DIR}/notes/part-00.md`]),
	edited: new Set([
		`${DIR}/src/greet.ts`,
		`${DIR}/openspec/changes/demo/tasks.md`,
	]),
};
const use = (name: string, file: string) => ({
	type: "tool_use",
	id: `${name}${file}`,
	name,
	input: { file_path: file },
});
const turn = (id: string, usage: object, ...blocks: object[]) => ({
	type: "assistant",
	message: { id, content: blocks, usage },
});
const done = (total: number, over: object = {}) => ({
	type: "result",
	subtype: "success",
	is_error: false,
	session_id: "s1",
	total_cost_usd: total,
	duration_ms: 500,
	...over,
});
const step = (events: Record<string, unknown>[], code = 0) => ({
	code,
	events,
});
const compact = step([
	{
		type: "system",
		subtype: "compact_boundary",
		compact_metadata: { post_tokens: 9000 },
	},
	turn("c1", { input_tokens: 5, cache_creation_input_tokens: 9000 }),
	done(1.5, { duration_ms: 4000 }),
]);
const hop1 = step([
	turn(
		"a1",
		{
			input_tokens: 10,
			cache_creation_input_tokens: 700,
			cache_read_input_tokens: 9000,
		},
		use("Read", `${DIR}/notes/part-00.md`),
		use("Edit", `${DIR}/src/greet.ts`),
	),
	turn(
		"a2",
		{ input_tokens: 1, cache_read_input_tokens: 9700 },
		use("Edit", `${DIR}/openspec/changes/demo/tasks.md`),
	),
	done(2),
]);
const hop2 = step([
	turn("b1", { input_tokens: 1, cache_read_input_tokens: 9900 }),
	done(2.25),
]);
const found = { broken: 0, untested: 0 };
const tasks = "- [x] 1.4 a\n";
const run = (steps: ReturnType<typeof step>[], arm: "B" | "H" = "B") =>
	measure(arm, 80_000, steps, base, found, tasks);

const temp: string[] = [];
afterAll(async () => {
	await Promise.all(temp.map((d) => rm(d, { recursive: true, force: true })));
});

test("Measures: cost, compaction step, context, rereads, and next come from the events", () => {
	const r = run([compact, hop1, hop2]);
	expect(r.invalid).toBeNull();
	expect(r.cost).toBeCloseTo(1.25);
	expect(r.compactCost).toBeCloseTo(0.5);
	expect(r.compactMs).toBe(4000);
	expect(r.context).toBe(9000);
	expect(r.rereads).toBe(1);
	expect(r.next).toBe(1);
	expect(r.firstWrite).toBe(700);
	expect(r.shares[0]).toBeCloseTo(18_700 / 19_411, 3);
});

test("Redone: a source file of tasks 1 to 3 counts, and tasks.md does not", () => {
	expect(run([compact, hop1, hop2]).redone).toBe(1);
});

test("Context: without `post_tokens`, the first request after the compaction gives the size", () => {
	const bare = step(compact.events.filter((e) => e["type"] !== "system"));
	expect(run([bare, hop1, hop2]).context).toBe(9710);
});

test("Handover Arm: the resume turn is the first request, the base cost is 0, and its work counts", () => {
	const h = measure(
		"H",
		80_000,
		[hop1, hop2],
		{ ...base, cost: 0 },
		found,
		tasks,
	);
	expect(h.invalid).toBeNull();
	expect(h.firstWrite).toBe(700);
	expect(h.context).toBe(9710);
	expect(h.rereads).toBe(1);
});

test.each([
	["exit code", step([done(1.5)], 1), "exit 1"],
	["no result", step([turn("x", {})]), "no result"],
	["is_error", step([done(1.5, { is_error: true })]), "is_error"],
	[
		"budget",
		step([done(1.5, { subtype: "error_max_budget_usd" })]),
		"error_max_budget_usd",
	],
	["no session", step([done(1.5, { session_id: undefined })]), "no session_id"],
])("Failed Step, %s: the fork is invalid with the cause", (_n, bad, cause) => {
	const r = run([compact, bad, hop2]);
	expect(r.invalid).toContain(cause);
	expect(problem([compact, hop1, hop2], 1)).toBeNull();
});

test("Total Falls: a step total below the one before marks the fork invalid", () => {
	const r = run([compact, step([done(1.2)]), hop2]);
	expect(r.invalid).toContain("total_cost_usd fell");
});

test("Plan and Measure: a fork with one good step for each command of its plan is valid, in each arm", () => {
	const steps = (n: number) => [compact, hop1, hop2].slice(-n);

	const invalid = plan().map(
		(f) =>
			measure(f.arm, f.size, steps(f.commands.length), base, found, tasks)
				.invalid,
	);

	expect(invalid.every((i) => i === null)).toBe(true);
});

test("Short Fork: a fork that stopped after 1 step is invalid and has no NaN crash", () => {
	expect(run([compact]).invalid).toContain("1 of 3 steps");
	expect(run([hop1], "H").invalid).toContain("1 of 2 steps");
});

const fixture = async (): Promise<string> => {
	const dir = await mkdtemp(path.join(os.tmpdir(), "probe-fixture-"));
	temp.push(dir);
	await buildFixture(dir, 0);
	await git(dir, "tag", "base");
	return dir;
};

test("Missing server.ts: the port is not tested, and it is no pass", async () => {
	const dir = await fixture();
	expect(await brokenIn(dir)).toEqual({ broken: 0, untested: 1 });
});

test("Constraint Checks: the port, the pin, and the untouched file each count once", async () => {
	const dir = await fixture();
	await bunWrite(path.join(dir, "src/server.ts"), `listen(${PORT});\n`);
	expect(await brokenIn(dir)).toEqual({ broken: 0, untested: 0 });
	await bunWrite(path.join(dir, "src/server.ts"), "listen(3000);\n");
	await bunWrite(
		path.join(dir, "package.json"),
		'{"dependencies":{"left-pad":"1.4.0"}}',
	);
	await bunWrite(path.join(dir, "src/legacy.ts"), "export const pad = 1;\n");
	expect(await brokenIn(dir)).toEqual({ broken: 3, untested: 0 });
});

test("Committed Edit: a change of the untouched file that the model commits still counts", async () => {
	const dir = await fixture();
	await bunWrite(path.join(dir, "src/server.ts"), `listen(${PORT});\n`);
	await bunWrite(path.join(dir, "src/legacy.ts"), "export const pad = 1;\n");
	await git(dir, "add", "-A");
	await git(dir, "commit", "-qm", "x");
	expect((await brokenIn(dir)).broken).toBe(1);
});

test("Missing Pin File: a deleted package.json breaks the pin and does not throw", async () => {
	const dir = await fixture();
	await rm(path.join(dir, "package.json"));
	expect((await brokenIn(dir)).broken).toBe(1);
});

test("Tickable Tasks: each task names a check that passes in the fixture, so the gate of claudetto lets the model tick it", async () => {
	const dir = await fixture();
	const text = await bunFile(
		path.join(dir, "openspec/changes/demo/tasks.md"),
	).text();
	const lines = [...taskLines(text).values()].map((t) => t.line);
	const smoke = spawn(["bun", "test"], {
		cwd: dir,
		stdout: "ignore",
		stderr: "ignore",
	});

	expect(await smoke.exited).toBe(0);
	expect(lines).toHaveLength(6);
	expect(lines.filter((l) => !proven(l, ["bun test"]))).toEqual([]);
	expect(lines.filter((l) => proven(l, ["just lab"]))).toEqual([]);
});

test("Base Guard: a base context below the size target is a problem", () => {
	expect(baseProblem(19_167, 200_000)).toContain("below the target 200000");
	expect(baseProblem(221_898, 200_000)).toBeNull();
});

test("Compacted Base: the round stops before any fork, with no model call", async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), "probe-round-"));
	temp.push(root);
	let forks = 0;
	const start = (context: number) => ({
		id: "s",
		base,
		handoff: "",
		context,
	});
	const round = runAll(root, {
		base: async (_dir, size) => start(size === 200_000 ? 19_167 : 90_000),
		fork: async () => {
			forks += 1;
			throw new Error("a fork ran");
		},
	});

	await expect(round).rejects.toThrow("base 200k: context 19167");
	expect(forks).toBe(0);
});
