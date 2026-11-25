import type { Reader } from "./branch";
import { baseName } from "./format";

/** The machine's figures a status line can read in a few milliseconds; each is absent when its source is. */
export interface Resources {
	/** Memory in use, percent, by the kernel's own pressure figure. */
	readonly memPercent?: number;
	readonly memTotal?: number;
	/** Swap in use and its size, bytes. */
	readonly swapUsed?: number;
	readonly swapTotal?: number;
	/** The one-minute load average and the logical cores it compares to. */
	readonly load?: number;
	readonly cores?: number;
	/** Claude Code's own resident memory, bytes. */
	readonly claude?: number;
	/** Resident memory of Claude Code and every process under it (shells, MCP servers, hooks), bytes. */
	readonly tree?: number;
	readonly procs?: number;
	/** The process under Claude Code holding the most memory. */
	readonly top?: { readonly name: string; readonly rss: number };
}

/** What the status line command passes in to read the machine, so the parsing stays testable. */
export interface Host {
	readonly platform: string;
	/** The status line command's parent process: the shell Claude Code started it in. */
	readonly ppid: number;
	readonly loadavg: readonly number[];
	readonly cores: number;
	readonly totalmem: number;
	/** Runs `argv` and resolves its stdout, or `undefined` when it fails. */
	readonly exec: (argv: readonly string[]) => Promise<string | undefined>;
	readonly read: Reader;
}

const KIB = 1024;
const SWAP_UNITS: Readonly<Record<string, number>> = {
	K: KIB,
	M: KIB ** 2,
	G: KIB ** 3
};
const SWAP = /total = ([\d.]+)([KMG]).*used = ([\d.]+)([KMG])/u;
const MEMINFO = /^(\w+):\s+(\d+) kB$/gmu;
const PS_ROW = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/u;
/** The native installer keeps each Claude Code build at `.../claude/versions/<version>`, so `ps` names the process by its version. */
const CLAUDE_BUILD = /[\\/]claude[\\/]versions[\\/][^\\/]+$/u;
/** Parents walked up from the command to find Claude Code; bounds the walk. */
const MAX_ANCESTORS = 6;

const swapBytes = (
	value: string | undefined,
	unit: string | undefined
): number => Number(value) * (SWAP_UNITS[unit ?? ""] ?? 1);

/** `vm.swapusage` as macOS prints it: `total = 2048.00M  used = 1043.12M  free = ...`. */
export const swapOf = (
	text: string
): { swapUsed: number; swapTotal: number } | undefined => {
	const found = SWAP.exec(text);
	if (found === null) {
		return undefined;
	}
	return {
		swapTotal: swapBytes(found[1], found[2]),
		swapUsed: swapBytes(found[3], found[4])
	};
};

/** Memory and swap from Linux's `/proc/meminfo`, where `MemAvailable` is what the kernel can hand out. */
export const meminfoOf = (text: string): Resources => {
	const kb = new Map(
		[...text.matchAll(MEMINFO)].map((row) => [row[1], Number(row[2]) * KIB])
	);
	const total = kb.get("MemTotal");
	const available = kb.get("MemAvailable");
	const swapTotal = kb.get("SwapTotal");
	const swapFree = kb.get("SwapFree");
	return {
		...(total === undefined || available === undefined || total === 0
			? {}
			: { memPercent: 100 * (1 - available / total), memTotal: total }),
		...(swapTotal === undefined || swapFree === undefined
			? {}
			: { swapTotal, swapUsed: swapTotal - swapFree })
	};
};

interface Proc {
	readonly pid: number;
	readonly ppid: number;
	readonly rss: number;
	readonly name: string;
}

/** A process's short name: `claude` for any Claude Code build, else the last part of its path. */
const nameOf = (comm: string): string =>
	CLAUDE_BUILD.test(comm) ? "claude" : baseName(comm);

const procsOf = (text: string): Map<number, Proc> =>
	new Map(
		text.split("\n").flatMap((line): [number, Proc][] => {
			const row = PS_ROW.exec(line);
			if (row === null) {
				return [];
			}
			const pid = Number(row[1]);
			return [
				[
					pid,
					{
						pid,
						ppid: Number(row[2]),
						rss: Number(row[3]) * KIB,
						name: nameOf(row[4]?.trim() ?? "")
					}
				]
			];
		})
	);

/** The nearest process named `claude` at or above `pid`. */
const claudeAbove = (
	procs: ReadonlyMap<number, Proc>,
	pid: number
): Proc | undefined => {
	let proc = procs.get(pid);
	for (let step = 0; proc !== undefined && step < MAX_ANCESTORS; step++) {
		if (proc.name === "claude") {
			return proc;
		}
		proc = procs.get(proc.ppid);
	}
	return undefined;
};

/** Every process under `root`, from a `ps -A -o pid=,ppid=,rss=,comm=` table. */
const descendants = (
	procs: ReadonlyMap<number, Proc>,
	root: number
): Proc[] => {
	const children = new Map<number, Proc[]>();
	for (const proc of procs.values()) {
		children.set(proc.ppid, [...(children.get(proc.ppid) ?? []), proc]);
	}
	const found: Proc[] = [];
	const queue = [root];
	for (let pid = queue.shift(); pid !== undefined; pid = queue.shift()) {
		for (const child of children.get(pid) ?? []) {
			found.push(child);
			queue.push(child.pid);
		}
	}
	return found;
};

/** Claude Code's memory and its process tree's, from a `ps` table, starting the walk at `ppid`. */
export const treeOf = (text: string, ppid: number): Resources => {
	const procs = procsOf(text);
	const claude = claudeAbove(procs, ppid);
	if (claude === undefined) {
		return {};
	}
	const under = descendants(procs, claude.pid);
	let top: Proc | undefined;
	let tree = claude.rss;
	for (const proc of under) {
		tree += proc.rss;
		if (top === undefined || proc.rss > top.rss) {
			top = proc;
		}
	}
	return {
		claude: claude.rss,
		tree,
		procs: under.length,
		...(top === undefined ? {} : { top: { name: top.name, rss: top.rss } })
	};
};

const memoryOf = async (host: Host): Promise<Resources> => {
	if (host.platform === "linux") {
		const text = await host.read("/proc/meminfo");
		return text === undefined ? {} : meminfoOf(text);
	}
	if (host.platform !== "darwin") {
		return {};
	}
	// kern.memorystatus_level is the percent of memory free by the kernel's pressure measure.
	const text = await host.exec([
		"sysctl",
		"-n",
		"kern.memorystatus_level",
		"vm.swapusage"
	]);
	const [level, swap] = (text ?? "").split("\n");
	const free = Number(level);
	return {
		...(level === undefined || level === "" || !Number.isFinite(free)
			? {}
			: { memPercent: 100 - free, memTotal: host.totalmem }),
		...(swap === undefined ? {} : swapOf(swap))
	};
};

/** The machine's figures; a source that fails leaves its figures out, and nothing throws. */
export const probe = async (host: Host): Promise<Resources> => {
	const unix = host.platform === "darwin" || host.platform === "linux";
	const [memory, ps] = await Promise.all([
		memoryOf(host).catch(() => ({})),
		unix
			? host.exec(["ps", "-A", "-o", "pid=,ppid=,rss=,comm="]).catch(() => "")
			: undefined
	]);
	const load = host.loadavg[0];
	return {
		...memory,
		...(unix && load !== undefined && host.cores > 0
			? { load, cores: host.cores }
			: {}),
		...(ps === undefined ? {} : treeOf(ps, host.ppid))
	};
};
