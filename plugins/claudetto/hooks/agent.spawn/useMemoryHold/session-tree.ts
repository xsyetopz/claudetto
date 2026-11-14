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
