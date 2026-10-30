// The paid steps of the probe: the base session of a size, and one fork of it. Only `main.ts` on `--run` reaches this file.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { HANDOFF_TRIGGER_TOKENS } from "../../plugin.ts";
import {
	basePrompts,
	brokenIn,
	buildFixture,
	git,
	TASKS_FILE,
} from "../fixture/fixture.ts";
import { eachInOrder } from "../fixture/ordered.ts";
import { type Fork, flags } from "../plan/plan.ts";
import { measure } from "../round/measure.ts";
import type { Result } from "../round/result.ts";
import type { Runners, Start } from "../round/round.ts";
import { exec } from "./claude.ts";
import { calls, contextOf, last, problem, type Step } from "./events.ts";

/** Turns off automatic compaction, so the base session keeps the context that its size needs and compacts in no fork's place. */
const BASE_ENV = { DISABLE_AUTO_COMPACT: "1" };

const filesOf = (steps: Step[], names: string[]): Set<string> =>
	new Set(
		calls(steps.flatMap((s) => s.events))
			.filter(([c]) => names.includes(c))
			.map(([, f]) => f),
	);

/** The input sum of the last request of `steps`, which is the context of the base. */
const contextAfter = (steps: Step[]): number =>
	contextOf(steps.flatMap((s) => s.events));

/** Runs the base session of `size` in `dir` on `model`, and tags the end of it, which each fork resets to. */
const runBase = async (
	dir: string,
	size: number,
	model: string,
): Promise<Start> => {
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
					// Any threshold does for the base, which `BASE_ENV` stops from compacting at all. The
					// reference one keeps the base's settings the same as a `ref` fork's but for that switch.
					...flags(model, HANDOFF_TRIGGER_TOKENS),
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
	const context = contextAfter(steps);
	const cost = last(steps.at(-1)?.events ?? []).total_cost_usd ?? 0;
	// The cost is printed with the context, because `measure.ts` subtracts it from each fork and no other output holds it.
	process.stdout.write(
		`base ${size / 1000}k: context ${context} tokens, cost ${cost}\n`,
	);
	await git(dir, "add", "-A");
	await git(dir, "commit", "-qm", "base", "--allow-empty");
	await git(dir, "tag", "-f", "base");
	return {
		id,
		context,
		base: {
			cost,
			read: filesOf(steps, ["Read"]),
			edited: filesOf(steps, ["Edit", "Write"]),
		},
	};
};

/** Runs fork `f` in `dir` from the end of the base. */
const runFork = async (f: Fork, dir: string, start: Start): Promise<Result> => {
	await git(dir, "reset", "-q", "--hard", "base");
	await git(dir, "clean", "-fdq");
	const swap: Record<string, string> = { $BASE: start.id };
	const step = await exec(
		f.command.map((a) => swap[a] ?? a),
		dir,
		f.env,
	);
	const tasks = await readFile(path.join(dir, TASKS_FILE), "utf8");
	return measure(
		f.arm,
		f.size,
		f.run,
		[step],
		start.base,
		await brokenIn(dir),
		tasks,
	);
};

/** The runners that reach the provider. */
export const paidRunners: Runners = { base: runBase, fork: runFork };
