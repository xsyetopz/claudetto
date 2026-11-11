import type { EngineInterface, On } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "./chain.ts";
import { atRoot } from "./handoff/layout.ts";
import { lineOf, pathOf } from "./handoff/transcript.ts";
import { isRecord, isWriter } from "./tools.ts";

/** One JSON line per delegated run, read by hand to set the delegation cut-offs and the subagent cache TTL. */
export const RUN_LOG = ".claude/claudetto/runs.jsonl";

// The engine takes one unmatched hook per event in a module, and `limits` holds those; each matcher here takes every value.
const BOTH = [true, false];
const ROOT_TURNS = 3;

const num = (value: unknown): number => (typeof value === "number" ? value : 0);

interface Stats {
	requests: number;
	cacheHitRate: number;
	maxGapSeconds: number;
	files: string[];
}

/** The paths that the writing tools of one assistant message name. */
const writtenIn = (message: Record<string, unknown>): string[] => {
	const content: unknown = message["content"];
	return (Array.isArray(content) ? content : []).flatMap((block: unknown) => {
		const path =
			isRecord(block) &&
			isWriter(String(block["name"])) &&
			isRecord(block["input"])
				? pathOf(block["input"])
				: undefined;
		return path === undefined ? [] : [path];
	});
};

/** The share of input tokens that the requests read from the cache, to two places. */
const cacheHitRateOf = (usages: readonly unknown[]): number => {
	let read = 0;
	let total = 0;
	for (const usage of usages) {
		const u = isRecord(usage) ? usage : {};
		read += num(u["cache_read_input_tokens"]);
		total +=
			num(u["input_tokens"]) +
			num(u["cache_creation_input_tokens"]) +
			num(u["cache_read_input_tokens"]);
	}
	return total === 0 ? 0 : Math.round((read / total) * 100) / 100;
};

/** A request spans one transcript line per content block, all with its message id: the first line dates it, and the last holds its usage. */
export const runStats = (
	jsonl: string,
	log: (message: string) => void,
): Stats => {
	const requests = new Map<string, { at: number; usage: unknown }>();
	const files = new Set<string>();
	for (const entry of jsonl.split("\n").map((item) => lineOf(item, log))) {
		const message = isRecord(entry) ? entry["message"] : undefined;
		if (
			!isRecord(entry) ||
			entry["type"] !== "assistant" ||
			!isRecord(message)
		) {
			continue;
		}
		const id = String(message["id"]);
		requests.set(id, {
			at: requests.get(id)?.at ?? Date.parse(String(entry["timestamp"])),
			usage: message["usage"],
		});
		for (const path of writtenIn(message)) {
			files.add(path);
		}
	}
	const times = [...requests.values()]
		.map((r) => r.at)
		.toSorted((a, b) => a - b);
	const gaps = times.slice(1).map((t, i) => t - (times[i] ?? t));
	return {
		requests: requests.size,
		cacheHitRate: cacheHitRateOf([...requests.values()].map((r) => r.usage)),
		maxGapSeconds: Math.round(Math.max(0, ...gaps) / 1000),
		files: [...files],
	};
};

interface Pending {
	readonly line: Record<string, unknown>;
	readonly files: readonly string[];
	turnsLeft: number;
	redone: boolean;
}

type Started = Map<string, { agent: string; model: string; at: number }>;

/** The delegated runs that started, and those that wait for the root's turns. */
export interface RunsState {
	readonly started: Started;
	readonly pending: Pending[];
}

/** Makes the run record of one session. */
export const runsState = (): RunsState => ({
	started: new Map(),
	pending: [],
});

const appendLine = async (
	$: EngineInterface,
	line: Record<string, unknown>,
): Promise<void> => {
	const path = atRoot(await $.session.root(), RUN_LOG);
	const held = await $.fs.read(path).catch((error: unknown) => {
		$.ui.log(`The run log was not read (${String(error)})`);
		return "";
	});
	await $.fs.write(path, `${held}${JSON.stringify(line)}\n`);
};

const trackSpawns = (on: On, started: Started): void => {
	on("agent.spawn", { fork: BOTH }, async ($, e, next) => {
		const out = await next(e);
		if (out.agentId !== undefined) {
			started.set(out.agentId, {
				agent: e.subagentType ?? "",
				model: out.model,
				at: await $.clock.now(),
			});
		}
		return out;
	});
};

const trackStops = (on: On, started: Started, pending: Pending[]): void => {
	on("classic.SubagentStop", { stop_hook_active: BOTH }, async ($, e, next) => {
		const out = await next(e);
		const run = started.get(e.agent_id);
		if (run === undefined || out.block !== undefined) {
			return out;
		}
		started.delete(e.agent_id);
		const stats = runStats(
			await $.fs.read(e.agent_transcript_path).catch((error: unknown) => {
				$.ui.log(`The agent transcript was not read (${String(error)})`);
				return "";
			}),
			(message) => {
				$.ui.log(message);
			},
		);
		pending.push({
			line: {
				agent: run.agent,
				model: run.model,
				durationSeconds: Math.round(((await $.clock.now()) - run.at) / 1000),
				...stats,
			},
			files: stats.files,
			turnsLeft: ROOT_TURNS,
			redone: false,
		});
		return out;
	});
};

/** Marks each pending run redone when the root edits a file that the run edited. */
export function runsCall(
	e: CallEvent,
	next: CallNext,
	state: RunsState,
): CallAnswer {
	if (e.tool !== "Edit" && e.tool !== "Write" && e.tool !== "NotebookEdit") {
		return next(e);
	}
	const path = pathOf(e);
	if (e.agentId === undefined && path !== undefined) {
		for (const run of state.pending.filter((p) => p.files.includes(path))) {
			run.redone = true;
		}
	}
	return next(e);
}

const flushRuns = (on: On, pending: Pending[]): void => {
	let writing = Promise.resolve();
	on("turn.complete", { isAborted: BOTH }, async ($, e, next) => {
		const out = await next(e);
		if (e.agentId !== undefined) {
			return out;
		}
		for (const p of pending) {
			p.turnsLeft--;
		}
		const done = pending.filter((p) => p.turnsLeft === 0);
		pending.splice(
			0,
			pending.length,
			...pending.filter((p) => p.turnsLeft > 0),
		);
		for (const p of done) {
			writing = writing
				.then(() =>
					appendLine($, { ...p.line, rootEditedWithin3Turns: p.redone }),
				)
				.catch((error: unknown) => {
					$.ui.log(`The run log was not written (${String(error)})`);
				});
		}
		await writing;
		return out;
	});
};

/** Logs each delegated run once the root has had 3 turns to redo it: an edit by the root of a file the run edited marks it redone. */
export const runs = (on: On, { started, pending }: RunsState): void => {
	trackSpawns(on, started);
	trackStops(on, started, pending);
	flushRuns(on, pending);
};
