import { lstat, readdir, readFile, rm, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { type MaxAge, STALE_PATHS } from "./paths.ts";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const SESSION_ID =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HANDOFF = /^handoff-.*\.md$/;
const PROBE = /^fswatch-probe-/;
const HANDOFF_DIR = ".claude/claudetto/handoffs";

/** `temp` is the root `claude-<uid>`, `sessions` is `~/.claude/sessions/`, `days` is `cleanupPeriodDays`, and `current` is the running session's id. */
export interface SweepRoots {
	readonly temp: string;
	readonly project: string;
	readonly sessions: string;
	readonly current: string;
	readonly days: number;
	readonly now: number;
	readonly dryRun: boolean;
}

/** One entry removed, or with `dryRun` one that would be. */
export interface Removed {
	readonly row: string;
	readonly path: string;
	readonly bytes: number;
}

/** What the sweep removed, in the order of `STALE_PATHS`. */
export interface SweepReport {
	readonly removed: readonly Removed[];
}

interface Entry {
	readonly path: string;
	readonly name: string;
	readonly isDir: boolean;
	readonly mtime: number;
}

const entriesOf = async (dir: string): Promise<Entry[]> => {
	const names = await readdir(dir).catch((): string[] => []);
	const entries = await Promise.all(
		names.map(async (name) => {
			const path = join(dir, name);
			const info = await lstat(path).catch(() => undefined);
			return info && !info.isSymbolicLink()
				? { path, name, isDir: info.isDirectory(), mtime: info.mtimeMs }
				: undefined;
		}),
	);
	return entries.filter((entry) => entry !== undefined);
};

const bytesOf = async (path: string): Promise<number> => {
	const info = await lstat(path).catch(() => undefined);
	if (!info || info.isSymbolicLink()) {
		return 0;
	}
	if (!info.isDirectory()) {
		return info.size;
	}
	const names = await readdir(path).catch((): string[] => []);
	let bytes = 0;
	for (const size of await Promise.all(
		names.map((name) => bytesOf(join(path, name))),
	)) {
		bytes += size;
	}
	return bytes;
};

const limitMs = (row: string, days: number): number => {
	const maxAge: MaxAge | undefined = STALE_PATHS.find(
		(path) => path.id === row,
	)?.maxAge;
	if (maxAge === undefined) {
		throw new Error(`no row ${row} in STALE_PATHS`);
	}
	return maxAge === "cleanupPeriodDays"
		? days * DAY_MS
		: maxAge.minutes * MINUTE_MS;
};

const liveSessions = async (roots: SweepRoots): Promise<Set<string>> => {
	const ids = new Set([roots.current]);
	const files = (await entriesOf(roots.sessions)).filter(
		(entry) => !entry.isDir && entry.name.endsWith(".json"),
	);
	const texts = await Promise.all(
		files.map((entry) => readFile(entry.path, "utf8").catch(() => "")),
	);
	for (const text of texts) {
		try {
			const id: unknown = JSON.parse(text)?.sessionId;
			if (typeof id === "string") {
				ids.add(id);
			}
		} catch {
			// A file being written mid-read names no session this time.
		}
	}
	return ids;
};

const probes = async (roots: SweepRoots): Promise<Entry[]> => {
	const cutoff = roots.now - limitMs("probe", roots.days);
	return (await entriesOf(roots.temp)).filter(
		(entry) => entry.isDir && PROBE.test(entry.name) && entry.mtime < cutoff,
	);
};

const sessionFolders = async (
	roots: SweepRoots,
): Promise<{ stale: Entry[]; parents: string[] }> => {
	const cutoff = roots.now - limitMs("session-temp", roots.days);
	const live = await liveSessions(roots);
	const projects = (await entriesOf(roots.temp)).filter(
		(entry) => entry.isDir && !PROBE.test(entry.name),
	);
	const listed = await Promise.all(
		projects.map((project) => entriesOf(project.path)),
	);
	const stale: Entry[] = [];
	const parents: string[] = [];
	for (const [at, project] of projects.entries()) {
		const found = (listed[at] ?? []).filter(
			(entry) =>
				entry.isDir &&
				SESSION_ID.test(entry.name) &&
				!live.has(entry.name) &&
				entry.mtime < cutoff,
		);
		if (found.length > 0) {
			stale.push(...found);
			parents.push(project.path);
		}
	}
	return { stale, parents };
};

const handoffs = async (roots: SweepRoots): Promise<Entry[]> => {
	const cutoff = roots.now - limitMs("handoff", roots.days);
	const all = (await entriesOf(join(roots.project, HANDOFF_DIR)))
		.filter((entry) => !entry.isDir && HANDOFF.test(entry.name))
		.sort((a, b) => a.mtime - b.mtime);
	return all.slice(0, -1).filter((entry) => entry.mtime < cutoff);
};

/** Removes every entry of `STALE_PATHS` past its age, or with `dryRun` only lists them. It never throws for a missing folder. */
export const sweep = async (roots: SweepRoots): Promise<SweepReport> => {
	const sessions = await sessionFolders(roots);
	const rows: [string, Entry[]][] = [
		["probe", await probes(roots)],
		["session-temp", sessions.stale],
		["handoff", await handoffs(roots)],
	];
	const removed = await Promise.all(
		rows.flatMap(([row, entries]) =>
			entries.map(async (entry): Promise<Removed> => {
				const bytes = await bytesOf(entry.path);
				if (!roots.dryRun) {
					await rm(entry.path, { recursive: true, force: true });
				}
				return { row, path: entry.path, bytes };
			}),
		),
	);
	if (!roots.dryRun) {
		// `rmdir` refuses a folder that still holds anything, so only an emptied project folder goes.
		await Promise.all(
			sessions.parents.map((dir) => rmdir(dir).catch(() => undefined)),
		);
	}
	return { removed };
};
