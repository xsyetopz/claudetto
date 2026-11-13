import { lstat, readdir, readFile, realpath, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import type { Args } from "./args";
import {
	guardOf,
	type Log,
	logged,
	realOr,
	refusal,
	trashRoots,
} from "./roots";
import { batched, type Candidate, namesIn } from "./temp";
import {
	checkoutOf,
	type Held,
	heldPaths,
	keepReason,
	loadTrash,
	output,
	projectTrash,
	type Trash,
} from "./trash";

interface Host {
	readonly cwd: string;
	/** The project paths Claude Code lists in `.claude.json`. */
	readonly projects: readonly string[];
	readonly home: string;
	readonly now: number;
	readonly uid: number;
	/** The settings `cleanupPeriodDays`, or Claude Code's default of 30. */
	readonly days: number;
	/** `CLAUDE_CODE_TMPDIR`, `/tmp`, and the system temp folder. */
	readonly tempBases: readonly string[];
	readonly configDir: string;
	readonly log: Log;
	/** What `ps -o lstart= -p <pid>` prints, or `undefined` when no such process runs. */
	readonly procStart: (pid: number) => Promise<string | undefined>;
}

interface Removed {
	readonly kind: string;
	readonly path: string;
	readonly bytes: number;
}

interface Report {
	readonly removed: readonly Removed[];
	readonly refused: readonly string[];
}

const DAY_MS = 86_400_000;
// Mole's `mo purge` waits as long before it calls a build folder old (lib/clean/project.sh MIN_AGE_DAYS).
const TRASH_DAYS = 7;

/** Each `claude-<uid>` folder that exists and that `uid` owns, once per real path. */
const tempRoots = async (bases: readonly string[], uid: number, log: Log) => {
	const found = await Promise.all(
		bases.map(async (base) => {
			const real = await realpath(join(base, `claude-${uid}`)).catch(
				logged(log, `The temp folder under ${base} was not resolved`, void 0),
			);
			const info = real === undefined ? undefined : await stat(real);
			return info?.uid === uid ? real : undefined;
		}),
	);
	return [...new Set(found.filter((root) => root !== undefined))];
};

interface SessionRecord {
	readonly pid: number;
	readonly sessionId: string;
	readonly procStart: string;
}

const recordOf = (text: string): SessionRecord | undefined => {
	try {
		const value: unknown = JSON.parse(text);
		return typeof value === "object" &&
			value !== null &&
			"pid" in value &&
			typeof value.pid === "number" &&
			"sessionId" in value &&
			typeof value.sessionId === "string" &&
			"procStart" in value &&
			typeof value.procStart === "string"
			? {
					pid: value.pid,
					sessionId: value.sessionId,
					procStart: value.procStart,
				}
			: undefined;
	} catch {
		return undefined;
	}
};

// `ps` pads a day of the month below 10, and the record may not.
const spaced = (start: string) => start.split(/\s+/u).join(" ").trim();

/**
 * The ids of the sessions that a running process holds: a record names one when its pid runs with the start the record holds, so a pid that another process took over names none. `undefined` when
 * a record cannot be understood, because a folder must not go on a guess.
 */
const liveSessions = async (host: Host): Promise<Set<string> | undefined> => {
	const dir = join(host.configDir, "sessions");
	const listed = await namesIn(dir);
	const files = listed.filter((file) => file.name.endsWith(".json"));
	const ids = await Promise.all(
		files.map(async (file) => {
			const record = recordOf(
				await readFile(join(dir, file.name), "utf8").catch(() => ""),
			);
			if (record === undefined) {
				host.log(`The session file ${file.name} was not understood`);
				return null;
			}
			const start = await host.procStart(record.pid);
			return start !== undefined && spaced(start) === spaced(record.procStart)
				? record.sessionId
				: "";
		}),
	);
	return ids.includes(null)
		? undefined
		: new Set(ids.filter((id) => id !== null));
};

const inFolder = async (
	kind: string,
	dir: string,
	limitMs: number,
	wanted: (name: string) => boolean,
	isDir = false,
): Promise<Candidate[]> => {
	const entries = await namesIn(dir);
	return entries
		.filter((e) => (isDir ? e.isDirectory() : e.isFile()) && wanted(e.name))
		.map((e) => ({ kind, path: join(dir, e.name), limitMs }));
};

const tempOf = async (
	root: string,
	live: ReadonlySet<string>,
	args: Args,
	host: Host,
) => {
	const sessionMs = (args.sessionDays ?? args.days ?? host.days) * DAY_MS;
	// Claude Code names a project's temp folder for its path, with `-` for each `/`.
	const projects = await inFolder(
		"session-temp",
		root,
		0,
		(n) => n.startsWith("-"),
		true,
	);
	const sessions = await Promise.all(
		projects.map((project) =>
			inFolder(
				"session-temp",
				project.path,
				sessionMs,
				(n) => !live.has(n),
				true,
			),
		),
	);
	return sessions.flat();
};

/** Each folder a project rule names, under a root of `trashRoots`, that `keepReason` lets go. */
const builtTrash = async (
	trash: Trash,
	limitMs: number,
	held: Held,
	host: Host,
) => {
	const [own, realHome, roots] = await Promise.all([
		checkoutOf(host.cwd),
		realOr(host.home, host.log),
		trashRoots(host.cwd, host.projects, host.home, host.log),
	]);
	const walks = await Promise.all(
		roots.map((root) =>
			projectTrash(root, trash, (dir) =>
				guardOf(dir, realHome) === undefined
					? readdir(dir, { withFileTypes: true }).catch(
							logged(host.log, `The folder ${dir} was not listed`, []),
						)
					: Promise.resolve([]),
			),
		),
	);
	// A root inside another root is walked twice.
	const found = [
		...new Map(walks.flat().map((item) => [item.path, item])).values(),
	];
	const kept = await Promise.all(
		found.map(async (item) =>
			(await keepReason(item.path, limitMs, held, own)) === undefined
				? [{ kind: item.id, path: item.path, limitMs }]
				: [],
		),
	);
	return kept.flat();
};

const candidates = async (args: Args, host: Host): Promise<Candidate[]> => {
	const claudetto = join(host.cwd, ".claude/claudetto");
	const recorded = await liveSessions(host);
	const live =
		recorded === undefined
			? undefined
			: new Set([
					...recorded,
					...(args.session === undefined ? [] : [args.session]),
				]);
	const roots = await tempRoots(host.tempBases, host.uid, host.log);
	const trash = await loadTrash(host.cwd);
	const trashMs = (args.trashDays ?? TRASH_DAYS) * DAY_MS;
	// Nothing a process could hold goes when the open files cannot be read.
	const held = trashMs > 0 ? await heldPaths(host.uid) : undefined;
	const parts = await Promise.all([
		held === undefined ? [] : builtTrash(trash, trashMs, held, host),
		inFolder("heartbeat", join(claudetto, "heartbeat"), DAY_MS, () => true),
		...(live === undefined
			? []
			: roots.map((root) => tempOf(root, live, args, host))),
	]);
	return parts.flat().filter((item) => item.limitMs > 0);
};

/** The bytes that removing each folder frees, which `du` counts; a folder's own size is only its entry list. */
const folderBytes = async (paths: readonly string[]) => {
	const texts = await Promise.all(
		batched(paths).map((batch) => output(["du", "-sk", ...batch], "/")),
	);
	return new Map(
		texts.flatMap((text) =>
			(text ?? "").split("\n").map((line): [string, number] => {
				const [kb = "", path = ""] = line.split("\t");
				return [path, Number(kb) * 1024];
			}),
		),
	);
};

export const sweep = async (args: Args, host: Host): Promise<Report> => {
	const why = await refusal(host.cwd, host.home, host.log);
	if (why !== undefined) {
		return { removed: [], refused: [`hygiene refused ${host.cwd}: ${why}`] };
	}
	const listed = await candidates(args, host);
	const aged = await Promise.all(
		listed.map(async (item) => {
			// A Nix result link counts by its own time, and its store path may be gone.
			const info = await lstat(item.path).catch(
				logged(host.log, `The path ${item.path} was not read`, void 0),
			);
			return info !== undefined && host.now - info.mtimeMs > item.limitMs
				? [{ ...item, info }]
				: [];
		}),
	);
	const old = aged.flat();
	const bytes = await folderBytes(
		old.filter((item) => item.info.isDirectory()).map((item) => item.path),
	);
	const found = await Promise.all(
		old.map(async ({ kind, path, info }) =>
			args.dryRun ||
			(await rm(path, { recursive: true, force: true }).then(
				() => true,
				logged(host.log, `The path ${path} was not removed`, false),
			))
				? [{ kind, path, bytes: bytes.get(path) ?? info.size }]
				: [],
		),
	);
	return { removed: found.flat(), refused: [] };
};

export const reportText = (report: Report, dryRun: boolean): string => {
	let bytes = 0;
	for (const item of report.removed) {
		bytes += item.bytes;
	}
	return [
		...report.refused,
		...report.removed.map(
			(item) => `${item.kind}  ${item.path}  ${item.bytes} B`,
		),
		`hygiene ${dryRun ? "would remove" : "removed"} ${report.removed.length} entries, ${bytes} B.${dryRun ? " Nothing was removed." : ""}`,
	].join("\n");
};
