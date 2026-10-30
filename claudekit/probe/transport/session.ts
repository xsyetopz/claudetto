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

const BASE_ENV = { DISABLE_AUTO_COMPACT: "1" };

const filesOf = (steps: Step[], names: string[]): Set<string> =>
	new Set(
		calls(steps.flatMap((s) => s.events))
			.filter(([c]) => names.includes(c))
			.map(([, f]) => f),
	);

const contextAfter = (steps: Step[]): number =>
	contextOf(steps.flatMap((s) => s.events));

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

export const paidRunners: Runners = { base: runBase, fork: runFork };
