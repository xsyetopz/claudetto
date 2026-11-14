import type { EngineInterface } from "claude-code";

import { configDir } from "../../command.run/useSetup/engine";
import { isRecord } from "../../tools";

/** One line of `ps`: a process, its parent, its age, and its memory. */
export interface Row {
	readonly pid: string;
	readonly ppid: string;
	readonly seconds: number;
	readonly kb: number;
	readonly name: string;
}

/** The gap between two polls of the memory watch. */
export const WATCH_MS = 5000;
const PS = ["ps", "-axo", "pid=,ppid=,etime=,rss=,comm="];

// `ps` prints its elapsed time as `[[dd-]hh:]mm:ss`.
const secondsOf = (etime: string): number =>
	etime
		.split(/[-:]/u)
		.toReversed()
		.reduce(
			(sum, part, i) => sum + Number(part) * ([1, 60, 3600, 86_400][i] ?? 0),
			0,
		);

/** The machine's processes; `ps` gets one poll's gap, so a stalled run ends before the next poll. */
export async function rowsOf($: EngineInterface): Promise<Row[]> {
	const { stdout } = await $.process.run(PS, { timeoutMs: WATCH_MS });
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

// Claude Code records each session at `sessions/<pid>.json`, and `$.session.id()` names the record that is this session's.
/** The pid of this session's Claude Code process, or `undefined` when no record names it. */
export async function sessionPid(
	$: EngineInterface,
): Promise<string | undefined> {
	const dir = `${await configDir($)}/sessions`;
	const id = await $.session.id();
	const files = await $.fs.list(dir);
	const pids = await Promise.all(
		files
			.filter((file) => file.name.endsWith(".json"))
			.map(async (file) => {
				const record: unknown = JSON.parse(
					await $.fs.read(`${dir}/${file.name}`),
				);
				return isRecord(record) && record["sessionId"] === id
					? file.name.slice(0, -".json".length)
					: undefined;
			}),
	);
	return pids.find((pid) => pid !== undefined);
}

/** The rows below `root` in the process tree, `root` not among them. */
export function descendants(rows: readonly Row[], root: string): Row[] {
	const pids = new Set([root]);
	let size = 0;
	while (pids.size > size) {
		size = pids.size;
		for (const row of rows.filter((r) => pids.has(r.ppid))) {
			pids.add(row.pid);
		}
	}
	return rows.filter((row) => row.pid !== root && pids.has(row.pid));
}
