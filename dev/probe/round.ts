// The runs of the probe: the base session of a size, each fork of it, and the round of all sizes.

import { appendFile, mkdtemp, realpath } from "node:fs/promises";
import path from "node:path";
import { handoffPath } from "../../plugins/claudetto/modules/session/handoff/compact.ts";
import { eachInOrder, mapInOrder } from "../../tools/ordered.ts";
import { $claude, CLAUDE_ENV } from "../../tools/telemetry.ts";
import { MIN_RUNS, type Result, SIZES } from "./bar.ts";
import { calls, last, problem, requests, type Step } from "./events.ts";
import { basePrompts, brokenIn, buildFixture, git } from "./fixture.ts";
import { handoffOf, messagesOf, resumeOf, type Start } from "./handoff.ts";
import { measure } from "./measure.ts";
import { type Fork, flags, plan } from "./plan.ts";

const TASKS = "openspec/changes/demo/tasks.md";

/** Turns off automatic compaction (env var `DISABLE_AUTO_COMPACT`, "Context and Compaction" of the env vars), so the base session keeps the context that its size needs. */
const BASE_ENV = { DISABLE_AUTO_COMPACT: "1" };

/** The run of `claude` with `args` in `cwd`, with `env` added to the env of the process. */
const exec = async (
	args: string[],
	cwd: string,
	env: Record<string, string> = {},
): Promise<Step> => {
	const { stdout, exitCode } = await $claude().env({
		...process.env,
		...CLAUDE_ENV,
		...env,
	})`claude ${args}`
		.cwd(cwd)
		.nothrow()
		.quiet();
	return {
		code: exitCode,
		events: stdout
			.toString()
			.split("\n")
			.filter((l) => l.startsWith("{"))
			.map((l) => JSON.parse(l)),
	};
};

/** The cause that the base of `size` is too small for the round, or `null`: a context below the size target means that a compaction shrank the base. */
export const baseProblem = (context: number, size: number): string | null =>
	context < size
		? `base ${size / 1000}k: context ${context} tokens is below the target ${size}, so a compaction likely ran while the base was built, and no fork runs`
		: null;

/** Runs the base session of `size` in `dir`, tags the end of it, and builds its handoff for H. */
const runBase = async (dir: string, size: number): Promise<Start> => {
	await buildFixture(dir, size);
	const id = crypto.randomUUID();
	const steps: Step[] = [];
	await eachInOrder(basePrompts.entries(), async ([i, p]) => {
		steps.push(
			await exec(
				[
					"-p",
					p,
					...(i ? ["--resume", id] : ["--session-id", id]),
					...flags("B"),
				],
				dir,
				BASE_ENV,
			),
		);
		const why = problem(steps, 0);
		if (why) {
			throw new Error(`base ${size / 1000}k: ${why}`);
		}
	});
	const events = steps.flatMap((s) => s.events);
	const u = requests(events).at(-1) ?? {};
	const tokens =
		(u.input_tokens ?? 0) +
		(u.cache_read_input_tokens ?? 0) +
		(u.cache_creation_input_tokens ?? 0);
	process.stdout.write(`base ${size / 1000}k: context ${tokens} tokens\n`);
	await git(dir, "add", "-A");
	await git(dir, "commit", "-qm", "base", "--allow-empty");
	await git(dir, "tag", "-f", "base");
	const files = (n: string) =>
		new Set(
			calls(events)
				.filter(([c]) => c === n)
				.map(([, f]) => f),
		);
	const tasks = await globalThis.Bun.file(path.join(dir, TASKS)).text();
	return {
		id,
		context: tokens,
		base: {
			cost: last(events).total_cost_usd ?? 0,
			read: files("Read"),
			edited: new Set([...files("Edit"), ...files("Write")]),
		},
		handoff: handoffOf(
			messagesOf(
				basePrompts,
				steps.map((s) => s.events),
			),
			tasks,
		),
	};
};

/** Runs fork `f` in `dir` from the end of the base: the steps stop at the first one that is not valid. */
const runFork = async (f: Fork, dir: string, start: Start): Promise<Result> => {
	await git(dir, "reset", "-q", "--hard", "base");
	await git(dir, "clean", "-fdq");
	const file = handoffPath(new Date());
	// Only H gets the file, so B and C cannot read it.
	if (f.arm === "H") {
		await globalThis.Bun.write(path.join(dir, file), start.handoff);
	}
	const base = f.arm === "H" ? { ...start.base, cost: 0 } : start.base;
	const steps: Step[] = [];
	let fork = start.id;
	let stopped = false;
	await eachInOrder(f.commands, async (cmd) => {
		if (stopped) {
			return;
		}
		const swap: Record<string, string> = {
			$BASE: start.id,
			$FORK: fork,
			$HANDOFF: resumeOf(start.handoff, file),
		};
		steps.push(
			await exec(
				cmd.map((a) => swap[a] ?? a),
				dir,
			),
		);
		if (problem(steps, base.cost)) {
			stopped = true;
			return;
		}
		fork = last(steps.at(-1)?.events ?? []).session_id ?? fork;
	});
	const tasks = await globalThis.Bun.file(path.join(dir, TASKS)).text();
	return measure(f.arm, f.size, steps, base, await brokenIn(dir), tasks);
};

/** The steps of a round, so a test can stand in for the model calls. */
export interface Runners {
	base: (dir: string, size: number) => Promise<Start>;
	fork: (f: Fork, dir: string, start: Start) => Promise<Result>;
}

/** Builds each base first and stops at a base that is too small, so no fork runs on it. Then runs the forks of each size. */
export const runAll = async (
	root: string,
	run: Runners = { base: runBase, fork: runFork },
	runs = MIN_RUNS,
): Promise<Result[]> => {
	const bases = await mapInOrder(SIZES, async (size) => {
		const dir = await realpath(
			await mkdtemp(path.join(root, `${size / 1000}k-`)),
		);
		const start = await run.base(dir, size);
		const why = baseProblem(start.context, size);
		if (why) {
			throw new Error(why);
		}
		return { size, dir, start };
	});
	const results: Result[] = [];
	await eachInOrder(bases, ({ size, dir, start }) =>
		eachInOrder(
			plan(runs).filter((x) => x.size === size),
			async (f) => {
				const result = await run.fork(f, dir, start).catch(
					(e): Result => ({
						...measure(
							f.arm,
							f.size,
							[],
							start.base,
							{ broken: 0, untested: 0 },
							"",
						),
						invalid: `threw: ${e instanceof Error ? e.message : e}`,
					}),
				);
				results.push(result);
				const line = JSON.stringify({ run: f.run, ...result });
				// Each fork is saved when it ends, so a stop later in the round loses none.
				await appendFile(path.join(root, "results.jsonl"), `${line}\n`);
			},
		),
	);
	return results;
};
