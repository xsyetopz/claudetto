import type { EngineInterface, On } from "claude-code";
import { atRoot } from "./handoff/layout.ts";
import { isRecord, lineOf, pathOf, WRITING_TOOLS } from "./handoff/transcript.ts";

/** One JSON line per delegated run, read by hand to set the delegation cut-offs and the subagent cache TTL. */
export const RUN_LOG = ".claude/claudetto/runs.jsonl";

const WRITERS: ReadonlySet<string> = new Set(WRITING_TOOLS);
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

/** A request spans one transcript line per content block, all with its message id: the first line dates it, and the last holds its usage. */
export const runStats = (jsonl: string): Stats => {
	const requests = new Map<string, { at: number; usage: unknown }>();
	const files = new Set<string>();
	for (const entry of jsonl.split("\n").map(lineOf)) {
		const message = isRecord(entry) ? entry["message"] : undefined;
		if (!isRecord(entry) || entry["type"] !== "assistant" || !isRecord(message)) {
			continue;
		}
		const id = String(message["id"]);
		requests.set(id, {
			at: requests.get(id)?.at ?? Date.parse(String(entry["timestamp"])),
			usage: message["usage"],
		});
		for (const block of Array.isArray(message["content"]) ? message["content"] : []) {
			const path =
				isRecord(block) && WRITERS.has(String(block["name"])) && isRecord(block["input"])
					? pathOf(block["input"])
					: undefined;
			if (path !== undefined) {
				files.add(path);
			}
		}
	}
	let read = 0;
	let total = 0;
	for (const { usage } of requests.values()) {
		const u = isRecord(usage) ? usage : {};
		read += num(u["cache_read_input_tokens"]);
		total += num(u["input_tokens"]) + num(u["cache_creation_input_tokens"]) + num(u["cache_read_input_tokens"]);
	}
	const times = [...requests.values()].map((r) => r.at).sort((a, b) => a - b);
	const gaps = times.slice(1).map((t, i) => t - (times[i] ?? t));
	return {
		requests: requests.size,
		cacheHitRate: total === 0 ? 0 : Math.round((read / total) * 100) / 100,
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

const appendLine = async ($: EngineInterface, line: Record<string, unknown>): Promise<void> => {
	const path = atRoot(await $.session.root(), RUN_LOG);
	const held = await $.fs.read(path).catch(() => "");
	await $.fs.write(path, `${held}${JSON.stringify(line)}\n`);
};

/** Logs each delegated run once the root has had 3 turns to redo it: an edit by the root of a file the run edited marks it redone. */
export const runs = (on: On): void => {
	const started = new Map<string, { agent: string; model: string; at: number }>();
	const pending: Pending[] = [];
	let writing = Promise.resolve();

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

	on("classic.SubagentStop", { stop_hook_active: BOTH }, async ($, e, next) => {
		const out = await next(e);
		const run = started.get(e.agent_id);
		if (run === undefined || out.block !== undefined) {
			return out;
		}
		started.delete(e.agent_id);
		const stats = runStats(await $.fs.read(e.agent_transcript_path).catch(() => ""));
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

	on("tool.call", { tool: WRITING_TOOLS }, (_$, e, next) => {
		const path = pathOf(e);
		if (e.agentId === undefined && path !== undefined) {
			for (const run of pending.filter((p) => p.files.includes(path))) {
				run.redone = true;
			}
		}
		return next(e);
	});

	on("turn.complete", { isAborted: BOTH }, async ($, e, next) => {
		const out = await next(e);
		if (e.agentId !== undefined) {
			return out;
		}
		for (const p of pending) {
			p.turnsLeft--;
		}
		const done = pending.filter((p) => p.turnsLeft === 0);
		pending.splice(0, pending.length, ...pending.filter((p) => p.turnsLeft > 0));
		for (const p of done) {
			writing = writing
				.then(() => appendLine($, { ...p.line, rootEditedWithin3Turns: p.redone }))
				.catch((error: unknown) => $.ui.log(`The run log was not written (${error})`));
		}
		await writing;
		return out;
	});
};
