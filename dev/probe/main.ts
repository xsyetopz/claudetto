#!/usr/bin/env -S bun --no-env-file
// The probe of the code-compaction change (task 3.1): 3 arms, 2 sizes, 3 runs (or `--runs N`), so 18 forks by default, on `claude-sonnet-5-5`.
//
//   bun dev/probe/main.ts --dry-run              lists the 18 forks and their commands, and makes no call
//   bun dev/probe/main.ts --run [--dir D] [--runs N]   runs them. This is a paid run, so run it only after the user approves its cost
//
// Each size has one base session (tasks 1 to 3, in a fixture of `dev/probe/fixture.ts`). Each fork resets the project to the end of the base, then runs `/compact` with its arm and 2 follow-ups.
// The forks of a size share one folder, because Claude Code finds a session by the folder. So they run one after the other.
// A step is a `claude -p` run, and the cost of a step is the difference of `total_cost_usd`, because a fork starts with the cost of its base (wiki `Handoff-Cost`).
// The measures come from the stream-json events and the files, with no judge model.
//
// H is the handover of today (`session/handoff/adapters/mod.ts`, `begin`): the handoff text of the base session is written to the handoff folder, and a new session starts with `HANDOVER_RESUME` and that text.
// The 2 follow-ups run in that session. The plugin does not hand over in a fresh `-p` process (`/compact` with the option `handover` runs the built-in summary, and `onStop` does not run),
// so the probe does the steps itself, with the same `handoffText` of the plugin. The base cost of H is 0, because a new session has none, and its first request is that of the resume turn.
// The resume turn also does the next task, so H does tasks 1.4 to 1.6 where B and C do 1.4 and 1.5.
//
// Facts of the cost, from Claude Code 2.1.310 (the strings of the installed binary, `~/.local/share/claude/versions/2.1.310`; reading only):
// - `--max-budget-usd` counts the cost of the run itself: the check uses `total - costLedger.restoredCostUSD()`, so a `--resume` step starts at 0.
// - `total_cost_usd` of the result is the cumulative total `Gh()`. A resume restores it from the `cost-state` line of the transcript (`costLedger.restore`; wiki and docs: `reference/transcript-format`).
//   Docs do not say that `--fork-session` copies that line, so `problem` checks at run time that each total is at least the one before, the base total first. A fork that fails it is invalid.
// - The cap of a step is `STEP_BUDGET_USD`, above what a normal step of 200k can cost (a cold write of the 200k, then a loop of warm requests), so it stops only a loop.

import { appendFile, mkdir, mkdtemp, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { handoffPath } from "../../plugins/claudetto/modules/session/handoff/compact.ts";
import {
	type HandoffInput,
	handoffText,
} from "../../plugins/claudetto/modules/session/handoff/handover.ts";
import { HANDOVER_RESUME } from "../../plugins/claudetto/modules/session/handoff/prompts.ts";
import { eachInOrder, mapInOrder } from "../../tools/ordered.ts";
import { $claude, CLAUDE_ENV } from "../../tools/telemetry.ts";
import {
	type Arm,
	MIN_RUNS,
	type Result,
	report,
	SIZES,
	verdict,
} from "./bar.ts";
import {
	basePrompts,
	brokenIn,
	buildFixture,
	git,
	hopPrompts,
	SOURCES,
} from "./fixture.ts";

const MODEL = "claude-sonnet-5-5";
/** An absolute path, because each run starts in a temp folder. */
const PLUGIN = path.join(import.meta.dir, "../../plugins/claudetto");
/** The `compaction` option of each arm. */
const OPTION: Record<Arm, string> = { B: "built-in", C: "code", H: "handover" };
/** A cap for each step, so that a loop stops (a safety stop, not the cost of a round). It counts the cost of the step only. */
const STEP_BUDGET_USD = "5";
const TASKS = "openspec/changes/demo/tasks.md";

export interface Fork {
	arm: Arm;
	size: number;
	run: number;
	commands: string[][];
}
interface Usage {
	input_tokens?: number;
	cache_read_input_tokens?: number;
	cache_creation_input_tokens?: number;
}
interface Block {
	type?: string;
	id?: string;
	name?: string;
	text?: string;
	input?: { file_path?: string };
}
/** The fields of a stream-json event that the probe reads. */
interface Event {
	type?: string;
	subtype?: string;
	is_error?: boolean;
	session_id?: string;
	total_cost_usd?: number;
	duration_ms?: number;
	compact_metadata?: { post_tokens?: number };
	message?: { id?: string; content?: Block[]; usage?: Usage };
}

export const flags = (arm: Arm): string[] => [
	"--model",
	MODEL,
	"--plugin-dir",
	PLUGIN,
	"--settings",
	JSON.stringify({
		pluginConfigs: {
			"claudetto@inline": { options: { compaction: OPTION[arm] } },
		},
	}),
	"--permission-mode",
	"acceptEdits",
	"--max-budget-usd",
	STEP_BUDGET_USD,
	"--output-format",
	"stream-json",
	"--verbose",
];

/** The follow-up prompts of `arm`. The resume turn of H does task 1.4, so H gets only the 1.5 prompt and does the same work as B and C. */
const hopsOf = (arm: Arm): string[] =>
	arm === "H" ? hopPrompts.slice(1) : hopPrompts;

/** The forks, `runs` of each arm and size. `$BASE` is the base session of the size, `$FORK` is the session that the last step ended in, and `$HANDOFF` is the resume prompt of H. */
export const plan = (runs = MIN_RUNS): Fork[] =>
	SIZES.flatMap((size) =>
		(["B", "C", "H"] as const).flatMap((arm) =>
			Array.from({ length: runs }, (_, i) => ({
				arm,
				size,
				run: i + 1,
				commands: [
					arm === "H"
						? ["-p", "$HANDOFF", ...flags(arm)]
						: [
								"-p",
								"/compact",
								"--resume",
								"$BASE",
								"--fork-session",
								...flags(arm),
							],
					...hopsOf(arm).map((p) => [
						"-p",
						p,
						"--resume",
						"$FORK",
						...flags(arm),
					]),
				],
			})),
		),
	);

const SHELL_SAFE = /^[\w@%+=:,./$-]+$/;

const quote = (s: string): string =>
	SHELL_SAFE.test(s) ? s : `'${s.replaceAll("'", "'\\''")}'`;

/** One `claude -p` run: its exit code, and its stream-json events. */
export interface Step {
	code: number;
	events: Event[];
}

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

const last = (events: Event[]): Event =>
	events.findLast((e) => e.type === "result") ?? {};
/** The tool calls of `events`, as `[name, file_path]`. */
const calls = (events: Event[]): [string, string][] =>
	events
		.filter((e) => e.type === "assistant")
		.flatMap((e) =>
			(e.message?.content ?? []).flatMap((b): [string, string][] =>
				b.type === "tool_use" && b.name && b.input?.file_path
					? [[b.name, b.input.file_path]]
					: [],
			),
		);
/** The usage of each request of `events`, once for each message id. */
const requests = (events: Event[]): Usage[] => [
	...new Map(
		events
			.filter((e) => e.type === "assistant" && e.message)
			.map((e) => [e.message?.id, e.message?.usage ?? {}]),
	).values(),
];
/** The cache read share of the requests `rs`. */
const readShare = (rs: Usage[]): number => {
	const sum = (k: keyof Usage) => {
		let total = 0;
		for (const u of rs) {
			total += u[k] ?? 0;
		}
		return total;
	};
	return (
		sum("cache_read_input_tokens") /
		(sum("cache_read_input_tokens") +
			sum("cache_creation_input_tokens") +
			sum("input_tokens") || 1)
	);
};

export interface Base {
	cost: number;
	read: Set<string>;
	edited: Set<string>;
}

/** The cause that one step is not valid, or `null`: a non-zero exit, no `result` event, `is_error`, a subtype other than success, or no `session_id`. */
const stepProblem = ({ code, events }: Step): string | null => {
	const r = events.findLast((e) => e.type === "result");
	if (code !== 0) {
		return `exit ${code}`;
	}
	if (!r) {
		return "no result event";
	}
	if (r.is_error) {
		return `is_error (${r.subtype})`;
	}
	if (r.subtype !== "success") {
		return `subtype ${r.subtype}`;
	}
	return r.session_id ? null : "no session_id";
};

/** The cause that the steps are not valid, or `null`: a step problem, or a total that is below the one before (`cost` is the total of the base). */
export const problem = (steps: Step[], cost: number): string | null => {
	let before = cost;
	for (const [i, step] of steps.entries()) {
		const total = last(step.events).total_cost_usd;
		const why =
			stepProblem(step) ??
			(typeof total === "number" ? null : "no total_cost_usd") ??
			(total !== undefined && total < before
				? `total_cost_usd fell from ${before} to ${total}`
				: null);
		if (why) {
			return `step ${i + 1}: ${why}`;
		}
		before = total ?? before;
	}
	return null;
};

const isSource = (file: string): boolean =>
	SOURCES.some((s) => file.endsWith(`/${s}`));

/** The measures of one fork from its steps (`/compact` and the 2 follow-ups, or for H the resume turn and 1 follow-up). */
export const measure = (
	arm: Arm,
	size: number,
	steps: Step[],
	base: Base,
	found: { broken: number; untested: number },
	tasksText: string,
): Result => {
	const want = hopsOf(arm).length + 1;
	const total = (i: number) =>
		last(steps[i]?.events ?? []).total_cost_usd ?? Number.NaN;
	const hops = steps.slice(1);
	// The turns after the compaction. H has none, so its resume turn is the first of them.
	const after = arm === "H" ? steps : hops;
	const done = after.flatMap((s) => calls(s.events));
	const first = requests(after[0]?.events ?? [])[0];
	const post = steps[0]?.events.find((e) => e.compact_metadata)
		?.compact_metadata?.post_tokens;
	return {
		arm,
		size,
		...found,
		cost: total(steps.length - 1) - base.cost,
		rereads: done.filter(([n, f]) => n === "Read" && base.read.has(f)).length,
		redone: done.filter(
			([n, f]) => n !== "Read" && base.edited.has(f) && isSource(f),
		).length,
		next: Number(tasksText.includes("[x] 1.4")),
		firstWrite: first?.cache_creation_input_tokens ?? Number.NaN,
		shares: hops.map((h) => readShare(requests(h.events))),
		compactCost: total(0) - base.cost,
		compactMs: last(steps[0]?.events ?? []).duration_ms ?? Number.NaN,
		context:
			post ??
			(first
				? (first.input_tokens ?? 0) +
					(first.cache_read_input_tokens ?? 0) +
					(first.cache_creation_input_tokens ?? 0)
				: Number.NaN),
		invalid:
			problem(steps, base.cost) ??
			(steps.length < want ? `${steps.length} of ${want} steps` : null),
	};
};

/** The messages of the base session as the handover reads them: each prompt, then the assistant messages of its step. */
export const messagesOf = (
	prompts: string[],
	steps: Event[][],
): HandoffInput["messages"] =>
	steps.flatMap((events, i) => [
		{ role: "user" as const, text: prompts[i] ?? "", toolUses: [] },
		...events
			.filter((e) => e.type === "assistant")
			.map((e) => {
				const content = e.message?.content ?? [];
				return {
					role: "assistant" as const,
					text: content.flatMap((b) => (b.text ? [b.text] : [])).join("\n"),
					toolUses: content.flatMap((b) =>
						b.type === "tool_use"
							? [
									{
										tool_use_id: b.id ?? "",
										tool: b.name ?? "",
										input: b.input ?? {},
									},
								]
							: [],
					),
				};
			}),
	]);

/** The handoff text of the base session, built by the code of the plugin with no model call. */
export const handoffOf = (
	messages: HandoffInput["messages"],
	tasks: string,
): string => handoffText({ messages, name: "demo", tasks });

/** The first prompt of the new session of H: the resume text of the handover, then the handoff. */
export const resumeOf = (text: string, file: string): string =>
	[HANDOVER_RESUME({ path: file }), "", text].join("\n");

export interface Start {
	id: string;
	base: Base;
	handoff: string;
	/** The context of the base session, in tokens: the input sum of its last request. */
	context: number;
}

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

const USAGE = `Usage: bun dev/probe/main.ts --dry-run | --run [--dir D] [--runs N], where N is a whole number of at least ${MIN_RUNS}`;

/** The value of `--runs` in `args`, `MIN_RUNS` without the flag, or `null` when it is not a whole number of at least `MIN_RUNS`. */
export const runsOf = (args: string[]): number | null => {
	const at = args.indexOf("--runs");
	if (at < 0) {
		return MIN_RUNS;
	}
	const n = Number(args[at + 1]);
	return Number.isInteger(n) && n >= MIN_RUNS ? n : null;
};

/** Runs the command line `args`, and gives the exit code. */
const main = async (args: string[]): Promise<number> => {
	const at = args.indexOf("--dir");
	const root =
		at < 0 ? path.join(os.tmpdir(), "claudetto-probe") : args[at + 1];
	const runs = runsOf(args);
	if (runs === null) {
		console.error(USAGE);
		return 2;
	}
	if (args.includes("--dry-run")) {
		for (const [i, f] of plan(runs).entries()) {
			process.stdout.write(
				`fork ${i + 1}: arm ${f.arm}, ${f.size / 1000}k, run ${f.run}\n`,
			);
			for (const c of f.commands) {
				process.stdout.write(`  claude ${c.map(quote).join(" ")}\n`);
			}
		}
		process.stdout.write(`${plan(runs).length} forks, no call made.\n`);
		return 0;
	}
	if (args.includes("--run") && root) {
		await mkdir(root, { recursive: true });
		try {
			process.stdout.write(
				`${report(verdict(await runAll(root, undefined, runs)))}\n`,
			);
		} catch (e) {
			console.error(e instanceof Error ? e.message : e);
			return 1;
		}
		return 0;
	}
	console.error(USAGE);
	return 2;
};

if (import.meta.main) {
	process.exitCode = await main(process.argv.slice(2));
}
