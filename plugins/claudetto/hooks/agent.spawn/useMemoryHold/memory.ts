import type { EngineInterface, PluginOptions } from "claude-code";

import type {
	CallAnswer,
	CallEvent,
	CallNext,
	CheckAnswer,
	CheckEvent,
	CheckNext,
} from "../../chain.ts";
import { numberOption } from "../../options.ts";
import { MEMORY_SHORT, MEMORY_STOPPED } from "../../texts.ts";
import { withNote } from "../../tool.call/useBudgetRun/result-note.ts";
import { readOnly } from "../../tool.check/useBashRules/readonly.ts";
import { parse, programOf } from "../../tool.check/useBashRules/shell-words.ts";
import { deny, fieldOf } from "../../tool.check/useBashRules/verdict.ts";

const COMMAND_TOOLS: ReadonlySet<string> = new Set(["Bash", "Monitor"]);
// These look at or stop what holds the memory, which is how the agent frees it.
const FREEING: ReadonlySet<string> = new Set(["kill", "ps"]);
const MEMINFO = "/proc/meminfo";
const MEMORY_PRESSURE = "/usr/bin/memory_pressure";
const SHOWN = 5;

/** The free share, in percent, below which new work is held; 0 turns the hold off. */
export const memoryLimitOf = (options: PluginOptions): number =>
	numberOption(options, "memoryFreeMinPercent", 20, 0);

/** The share of the machine's memory, in percent, that one process of a running command may hold before it is stopped; 0 turns the stop off. */
export const memoryProcessMaxOf = (options: PluginOptions): number =>
	numberOption(options, "memoryProcessMaxPercent", 25, 0);

const kbOf = (text: string, key: string): number =>
	Number(new RegExp(`^${key}:\\s+(\\d+)`, "mu").exec(text)?.[1]);

async function readShare($: EngineInterface): Promise<number> {
	if (await $.fs.exists(MEMINFO)) {
		const text = await $.fs.read(MEMINFO);
		return (100 * kbOf(text, "MemAvailable")) / kbOf(text, "MemTotal");
	}
	if (await $.fs.exists(MEMORY_PRESSURE)) {
		const { stdout } = await $.process.run([MEMORY_PRESSURE, "-Q"]);
		return Number(/(\d+)%/u.exec(stdout)?.[1]);
	}
	return Number.NaN;
}

// The share comes from the operating system's text, so a form the parse does not know reads as none.
async function freeShare($: EngineInterface): Promise<number | undefined> {
	const share = await readShare($);
	return Number.isFinite(share) ? share : undefined;
}

interface Row {
	readonly pid: string;
	readonly seconds: number;
	readonly kb: number;
	readonly name: string;
}

// `ps` prints its elapsed time as `[[dd-]hh:]mm:ss`.
const secondsOf = (etime: string): number => {
	const [days = "0", clock = ""] = etime.includes("-")
		? etime.split("-")
		: ["0", etime];
	return (
		Number(days) * 86_400 +
		clock.split(":").reduce((sum, part) => sum * 60 + Number(part), 0)
	);
};

async function rowsOf($: EngineInterface): Promise<Row[]> {
	const { stdout } = await $.process.run([
		"ps",
		"-axo",
		"pid=,etime=,rss=,comm=",
	]);
	return stdout
		.trim()
		.split("\n")
		.map((line) => line.trim().split(/\s+/u))
		.map(([pid = "", etime = "0", rss = "0", ...name]) => ({
			pid,
			seconds: secondsOf(etime),
			kb: Number(rss),
			name: name.join(" "),
		}));
}

const gb = (kb: number): string => `${(kb / 1_048_576).toFixed(1)} GB`;

async function largest($: EngineInterface): Promise<string[]> {
	const rows = await rowsOf($);
	return rows
		.toSorted((a, b) => b.kb - a.kb)
		.slice(0, SHOWN)
		.map((p) => `${p.pid} ${gb(p.kb)} ${p.name}`);
}

/** The reason to hold new work, or undefined when the machine has room or gives no share. */
export async function memoryShort(
	$: EngineInterface,
	limit: number,
): Promise<string | undefined> {
	if (limit === 0) {
		return undefined;
	}
	const share = await freeShare($);
	return share === undefined || share >= limit
		? undefined
		: MEMORY_SHORT(Math.floor(share), limit, await largest($));
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
	// A query has no `tool_use_id` and starts nothing.
	const command =
		e.tool_use_id !== undefined && COMMAND_TOOLS.has(e.tool)
			? fieldOf(e.input, "command")
			: undefined;
	if (command === undefined || frees(command)) {
		return next(e);
	}
	const short = await memoryShort($, limit);
	return short === undefined ? next(e) : deny(short);
}

const WATCH_MS = 5000;
// A process the call started shows an age within a second or two of the call's own.
const SLACK_SECONDS = 2;
const BYTES_PER_KB = 1024;

async function totalKb($: EngineInterface): Promise<number> {
	if (await $.fs.exists(MEMINFO)) {
		return kbOf(await $.fs.read(MEMINFO), "MemTotal");
	}
	const { stdout } = await $.process.run(["sysctl", "-n", "hw.memsize"]);
	return Number(stdout.trim()) / BYTES_PER_KB;
}

async function stopGrown(
	$: EngineInterface,
	startedAt: number,
	percent: number,
): Promise<string | undefined> {
	const cap = ((await totalKb($)) * percent) / 100;
	const age = ((await $.clock.now()) - startedAt) / 1000 + SLACK_SECONDS;
	const rows = await rowsOf($);
	const [grown] = rows
		.filter((row) => row.seconds <= age && row.kb > cap)
		.toSorted((a, b) => b.kb - a.kb);
	if (grown === undefined) {
		return undefined;
	}
	await $.process.run(["kill", grown.pid]);
	return MEMORY_STOPPED(grown.pid, grown.name, gb(grown.kb), percent);
}

/** While a `Bash` call runs, stops the largest process that began with it and holds more than `percent` of the machine's memory, because the hold at the start of a call cannot see a command that grows after it began. */
export async function memoryWatchCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
	percent: number,
): Promise<Awaited<CallAnswer>> {
	if (percent === 0 || e.tool !== "Bash") {
		return next(e);
	}
	const startedAt = await $.clock.now();
	const done = new AbortController();
	const poll = async (): Promise<string> => {
		await $.clock.sleep(WATCH_MS, { signal: done.signal });
		return (await stopGrown($, startedAt, percent)) ?? poll();
	};
	const watch = poll().catch((error: unknown) => {
		if (!done.signal.aborted) {
			$.ui.log(`The memory watch stopped (${String(error)})`);
		}
	});
	const answer = await next(e);
	done.abort();
	const note = await watch;
	return note === undefined ? answer : withNote(answer, note);
}
