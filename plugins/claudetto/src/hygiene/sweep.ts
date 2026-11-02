import { lstat, readdir, readFile, rm, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { BOUND_OUTPUT_DIR } from "../blocks/bound-output/block.ts";
import { HANDOFF_DIR } from "../blocks/handoff/handoff.ts";
import { newestHandoff } from "../blocks/handoff/read-back.ts";
import { type Refusal, refusal } from "./guard.ts";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const SESSION_ID =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HANDOFF = /^handoff-.*\.md$/;
const PROBE = /^fswatch-probe-/;
const BOUND_OUTPUT = /^output-.*\.txt$/;
const BOUND_OUTPUT_MINUTES = 1440;

/** `temps` are the roots `claude-<uid>`, `sessions` is `~/.claude/sessions/`, and `current` is the running session's id. A limit of 0 turns its kind off. */
export interface SweepRoots {
	readonly temps: readonly string[];
	readonly project: string;
	readonly sessions: string;
	readonly current: string;
	readonly handoffDays: number;
	readonly sessionDays: number;
	readonly probeMinutes: number;
	readonly home: string;
	readonly now: number;
	readonly dryRun: boolean;
}

/** One entry removed, or with `dryRun` one that would be. */
export interface Removed {
	readonly row: string;
	readonly path: string;
	readonly bytes: number;
}

/** What the sweep removed, in the order of `STALE_PATHS`, and the roots it refused. */
export interface SweepReport {
	readonly removed: readonly Removed[];
	readonly refused: readonly Refusal[];
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

const probes = async (temp: string, roots: SweepRoots): Promise<Entry[]> => {
	if (roots.probeMinutes <= 0) {
		return [];
	}
	const cutoff = roots.now - roots.probeMinutes * MINUTE_MS;
	return (await entriesOf(temp)).filter(
		(entry) => entry.isDir && PROBE.test(entry.name) && entry.mtime < cutoff,
	);
};

const sessionFolders = async (
	temp: string,
	roots: SweepRoots,
	live: ReadonlySet<string>,
): Promise<{ stale: Entry[]; parents: string[] }> => {
	const stale: Entry[] = [];
	const parents: string[] = [];
	if (roots.sessionDays <= 0) {
		return { stale, parents };
	}
	const cutoff = roots.now - roots.sessionDays * DAY_MS;
	const projects = (await entriesOf(temp)).filter(
		(entry) => entry.isDir && !PROBE.test(entry.name),
	);
	const listed = await Promise.all(
		projects.map((project) => entriesOf(project.path)),
	);
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

const handoffs = async (
	project: string,
	roots: SweepRoots,
): Promise<Entry[]> => {
	if (roots.handoffDays <= 0) {
		return [];
	}
	const cutoff = roots.now - roots.handoffDays * DAY_MS;
	const all = (await entriesOf(join(project, HANDOFF_DIR))).filter(
		(entry) => !entry.isDir && HANDOFF.test(entry.name),
	);
	const read = newestHandoff(all.map((entry) => entry.name));
	return all.filter((entry) => entry.name !== read && entry.mtime < cutoff);
};

const boundOutputs = async (
	project: string,
	roots: SweepRoots,
): Promise<Entry[]> => {
	const cutoff = roots.now - BOUND_OUTPUT_MINUTES * MINUTE_MS;
	return (await entriesOf(join(project, BOUND_OUTPUT_DIR))).filter(
		(entry) =>
			!entry.isDir && BOUND_OUTPUT.test(entry.name) && entry.mtime < cutoff,
	);
};

/** Removes every entry of `STALE_PATHS` past its age, or with `dryRun` only lists them. A root that the guard refuses is skipped and reported. It never throws for a missing folder. */
export const sweep = async (roots: SweepRoots): Promise<SweepReport> => {
	const [projectRefusal, tempRefusals, live] = await Promise.all([
		refusal(roots.project, roots.home),
		Promise.all(roots.temps.map((temp) => refusal(temp, roots.home))),
		liveSessions(roots),
	]);
	const temps = roots.temps.filter((_, at) => tempRefusals[at] === undefined);
	const folders = await Promise.all(
		temps.map((temp) => sessionFolders(temp, roots, live)),
	);
	const probed = await Promise.all(temps.map((temp) => probes(temp, roots)));
	const rows: [string, Entry[]][] = [
		["probe", probed.flat()],
		["session-temp", folders.flatMap((found) => found.stale)],
		["handoff", projectRefusal ? [] : await handoffs(roots.project, roots)],
		[
			"bound-output",
			projectRefusal ? [] : await boundOutputs(roots.project, roots),
		],
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
			folders
				.flatMap((found) => found.parents)
				.map((dir) => rmdir(dir).catch(() => undefined)),
		);
	}
	return {
		removed,
		refused: [
			...(projectRefusal ? [projectRefusal] : []),
			...tempRefusals.filter((found) => found !== undefined),
		],
	};
};
