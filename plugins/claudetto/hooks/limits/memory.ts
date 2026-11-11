import type { EngineInterface, PluginOptions } from "claude-code";

import type { CheckAnswer, CheckEvent, CheckNext } from "../chain.ts";
import { readOnly } from "../gate/readonly.ts";
import { parse, programOf } from "../gate/shell-words.ts";
import { deny, fieldOf } from "../gate/verdict.ts";
import { numberOption } from "../options.ts";
import { MEMORY_SHORT } from "../texts.ts";

const COMMAND_TOOLS: ReadonlySet<string> = new Set(["Bash", "Monitor"]);
// These look at or stop what holds the memory, which is how the agent frees it.
const FREEING: ReadonlySet<string> = new Set(["kill", "ps"]);
const MEMINFO = "/proc/meminfo";
const MEMORY_PRESSURE = "/usr/bin/memory_pressure";
const SHOWN = 5;

/** The free share, in percent, below which new work is held; 0 turns the hold off. */
export const memoryLimitOf = (options: PluginOptions): number =>
	numberOption(options, "memoryFreeMinPercent", 20, 0);

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

async function largest($: EngineInterface): Promise<string[]> {
	const { stdout } = await $.process.run(["ps", "-axo", "pid=,rss=,comm="]);
	return stdout
		.trim()
		.split("\n")
		.map((line) => line.trim().split(/\s+/u))
		.map(([pid = "", rss = "0", ...name]) => ({
			pid,
			kb: Number(rss),
			name: name.join(" "),
		}))
		.toSorted((a, b) => b.kb - a.kb)
		.slice(0, SHOWN)
		.map((p) => `${p.pid} ${(p.kb / 1_048_576).toFixed(1)} GB ${p.name}`);
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
