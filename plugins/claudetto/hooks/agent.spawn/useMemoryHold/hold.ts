import type { EngineInterface, On, PluginOptions } from "claude-code";

import type {
	CallAnswer,
	CallEvent,
	CallNext,
	CheckAnswer,
	CheckEvent,
	CheckNext,
} from "../../chain";
import { numberOption } from "../../options";
import { readOnly } from "../../shell/readonly";
import { parse, programOf } from "../../shell/shell-words";
import { deny, fieldOf } from "../../shell/verdict";
import {
	DENY_CALLS,
	MEMORY_SHORT,
	MEMORY_SPAWN_RETRY,
	MEMORY_STOPPED,
} from "../../texts";
import { withNote } from "../../tool.call/useBudgetRun/budget-run";
import { isRecord } from "../../tools";
import { descendants, type Row, sessionPid } from "./session-tree";

// These look at or stop what holds the memory, which is how the agent frees it.
const FREEING: ReadonlySet<string> = new Set(["kill", "ps"]);
const MEMINFO = "/proc/meminfo";
const WATCH_MS = 5000;
const PS = ["ps", "-axo", "pid=,ppid=,etime=,rss=,comm="];
const SYSCTL = ["/usr/sbin/sysctl", "-n", "hw.memsize"];

const kbOf = (text: string, key: string): number =>
	Number(new RegExp(`^${key}:\\s+(\\d+)`, "mu").exec(text)?.[1]);

async function readShare($: EngineInterface): Promise<number> {
	if (await $.fs.exists(MEMINFO)) {
		const text = await $.fs.read(MEMINFO);
		return (100 * kbOf(text, "MemAvailable")) / kbOf(text, "MemTotal");
	}
	if (await $.fs.exists("/usr/bin/memory_pressure")) {
		const { stdout } = await $.process.run(["/usr/bin/memory_pressure", "-Q"]);
		return Number(/(\d+)%/u.exec(stdout)?.[1]);
	}
	return Number.NaN;
}

// `ps` prints its elapsed time as `[[dd-]hh:]mm:ss`.
const secondsOf = (etime: string): number =>
	etime
		.split(/[-:]/u)
		.toReversed()
		.reduce(
			(sum, part, i) => sum + Number(part) * ([1, 60, 3600, 86_400][i] ?? 0),
			0,
		);

async function rowsOf($: EngineInterface): Promise<Row[]> {
	const { stdout } = await $.process.run(PS);
	return stdout
		.trim()
		.split("\n")
		.map((line) => {
			const [pid = "", ppid = "", etime = "0", rss = "0", ...name] = line
				.trim()
				.split(/\s+/u);
			return {
				pid,
				ppid,
				seconds: secondsOf(etime),
				kb: Number(rss),
				name: name.join(" "),
			};
		});
}

const gb = (kb: number): string => `${(kb / 1_048_576).toFixed(1)} GB`;

// The share comes from the operating system's text, so a form the parse does not know reads as none.
async function memoryShort(
	$: EngineInterface,
	limit: number,
): Promise<string | undefined> {
	const share = limit === 0 ? Number.NaN : await readShare($);
	if (!Number.isFinite(share) || share >= limit) {
		return undefined;
	}
	const rows = await rowsOf($);
	return MEMORY_SHORT(
		Math.floor(share),
		limit,
		rows
			.toSorted((a, b) => b.kb - a.kb)
			.slice(0, 5)
			.map((p) => `${p.pid} ${gb(p.kb)} ${p.name}`),
	);
}

const frees = (command: string): boolean =>
	readOnly(command) ||
	parse(command).commands.every((c) => FREEING.has(programOf(c).name));

/** Denies a new command while the machine's free memory share is under the limit. */
export async function memoryGuard(
	$: EngineInterface,
	e: CheckEvent,
	next: CheckNext,
	limit: number,
): Promise<Awaited<CheckAnswer>> {
	const command =
		e.tool_use_id !== undefined && (e.tool === "Bash" || e.tool === "Monitor")
			? fieldOf(e.input, "command")
			: undefined;
	if (command === undefined || frees(command)) {
		return next(e);
	}
	const short = await memoryShort($, limit);
	return short === undefined ? next(e) : deny(short);
}

async function totalKb($: EngineInterface): Promise<number> {
	if (await $.fs.exists(MEMINFO)) {
		return kbOf(await $.fs.read(MEMINFO), "MemTotal");
	}
	const { stdout } = await $.process.run(SYSCTL);
	return Number(stdout) / 1024;
}

async function stopGrown(
	$: EngineInterface,
	born: readonly Row[],
	percent: number,
): Promise<string | undefined> {
	const cap = ((await totalKb($)) * percent) / 100;
	const [grown] = born
		.filter((row) => row.kb > cap)
		.toSorted((a, b) => b.kb - a.kb);
	if (grown !== undefined) {
		await $.process.run(["kill", grown.pid]);
	}
	return grown === undefined
		? undefined
		: MEMORY_STOPPED(grown.pid, grown.name, gb(grown.kb), percent);
}

// Polls until it stops a process; once the call has gone to the background, also until the processes the call began have ended.
async function watchProcesses(
	$: EngineInterface,
	percent: number,
	call: { backgrounded: boolean },
	signal: AbortSignal,
): Promise<string | undefined> {
	const startedAt = await $.clock.now();
	const root = await sessionPid($);
	if (root === undefined) {
		$.ui.log("The memory watch found no record of this session");
		return undefined;
	}
	let tracked: Set<string> | undefined;
	let failed = false;
	const once = async () => {
		// Of the session's descendants, a process the call started shows an age within a second or two of the call's own.
		const age = ((await $.clock.now()) - startedAt) / 1000 + 2;
		const rows = descendants(await rowsOf($), root);
		const born = rows.filter((row) => row.seconds <= age);
		const note = await stopGrown($, born, percent);
		if (note !== undefined || !call.backgrounded) {
			return note === undefined ? null : { note };
		}
		tracked ??= new Set(born.map((row) => row.pid));
		const live = tracked;
		return born.some((row) => live.has(row.pid)) ? null : { note };
	};
	const poll = async (): Promise<string | undefined> => {
		await $.clock.sleep(WATCH_MS, { signal });
		const outcome = await once().catch((error: unknown) => {
			if (!failed) {
				failed = true;
				$.ui.log(`A memory watch poll failed (${String(error)})`);
			}
			return null;
		});
		return outcome === null ? poll() : outcome.note;
	};
	return poll();
}

/** While a `Bash` call runs, and after it goes to the background until its processes end, stops the largest process that began with it and holds more than `percent` of the machine's memory, because the hold at the start of a call cannot see a command that grows after it began. */
export async function memoryWatchCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
	percent: number,
): Promise<Awaited<CallAnswer>> {
	if (percent === 0 || e.tool !== "Bash") {
		return next(e);
	}
	const done = new AbortController();
	const call = { backgrounded: false };
	const watch = watchProcesses($, percent, call, done.signal).then(
		(note) => {
			// The call has returned, so a note can only go to the log.
			if (note !== undefined && call.backgrounded) {
				$.ui.log(note);
			}
			return note;
		},
		(error: unknown) => {
			if (!done.signal.aborted) {
				$.ui.log(`The memory watch stopped (${String(error)})`);
			}
		},
	);
	let answer: Awaited<CallAnswer>;
	try {
		answer = await next(e);
		// The command went on without this call: `run_in_background`, or a timeout that Claude Code moved to the background.
		call.backgrounded =
			isRecord(answer.result) &&
			typeof answer.result["backgroundTaskId"] === "string";
	} finally {
		if (!call.backgrounded) {
			done.abort();
		}
	}
	const note = call.backgrounded ? undefined : await watch;
	return note === undefined ? answer : withNote(answer, note);
}

/** The limits and call ledger of one registration, which the hook and the check guard share. */
export interface HoldState {
	readonly windowMs: number;
	readonly callCap: number;
	readonly heavyTokens: number;
	calls: readonly number[];
	readonly memory: number;
	readonly memoryProcessMax: number;
}

/** Makes the limits from `options` and an empty ledger. */
export const holdState = (options: PluginOptions): HoldState => ({
	windowMs: numberOption(options, "limitPeriodSeconds", 600) * 1000,
	callCap: numberOption(options, "maxHeavyToolCalls", 20),
	heavyTokens: numberOption(options, "heavyContextTokens", 400_000),
	calls: [],
	memory: numberOption(options, "memoryFreeMinPercent", 20, 0),
	memoryProcessMax: numberOption(options, "memoryProcessMaxPercent", 25, 0),
});

/** Denies a subagent start while the machine's free memory share is under the limit, and says when to retry. */
export const holdHooks = (on: On, state: HoldState): void => {
	on("agent.spawn", async ($, e, next) => {
		const short = await memoryShort($, state.memory);
		return short === undefined
			? next(e)
			: { deny: `${short}\n${MEMORY_SPAWN_RETRY}` };
	});
};

async function heavyTokens($: EngineInterface): Promise<number | null> {
	try {
		const { context } = await $.session.usage();
		return context.tokens ?? null;
	} catch (error) {
		$.ui.log(`The session usage was not read (${String(error)})`);
		return null;
	}
}

/** Denies a call over the rate limit while the context is heavy; a light context keeps no ledger. */
export async function holdCheck(
	$: EngineInterface,
	e: CheckEvent,
	next: CheckNext,
	state: HoldState,
): Promise<Awaited<CheckAnswer>> {
	// A query has no `tool_use_id` and is not a call, so it counts for nothing.
	if (e.tool_use_id === undefined) {
		return next(e);
	}
	const tokens = await heavyTokens($);
	if (tokens === null || tokens < state.heavyTokens) {
		state.calls = [];
		return next(e);
	}
	const now = await $.clock.now();
	const times = state.calls.filter((time) => now - time < state.windowMs);
	if (times.length >= state.callCap) {
		state.calls = times;
		return {
			decision: "deny",
			reason: DENY_CALLS({
				calls: times.length,
				cap: state.callCap,
				seconds: state.windowMs / 1000,
			}),
		};
	}
	state.calls = [...times, now];
	return next(e);
}
