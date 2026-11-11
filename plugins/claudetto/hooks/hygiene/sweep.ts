import type { Stats } from "node:fs";
import { lstat, readdir, readFile, realpath, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import { MARKER } from "../gate/processes.ts";
import { HANDOFF_NAME } from "../handoff/layout.ts";
import type { Args } from "./args.ts";
import {
	guardOf,
	type Log,
	logged,
	realOr,
	refusal,
	trashRoots,
} from "./roots.ts";
import {
	checkoutOf,
	heldPaths,
	keepReason,
	loadTrash,
	output,
	projectTrash,
	tempRule,
	type Trash,
} from "./trash.ts";

interface Host {
	readonly cwd: string;
	readonly home: string;
	readonly now: number;
	readonly uid: number;
	/** The settings `cleanupPeriodDays`, or Claude Code's default of 30. */
	readonly days: number;
	/** `CLAUDE_CODE_TMPDIR`, `/tmp`, and the system temp folder. */
	readonly tempBases: readonly string[];
	readonly configDir: string;
	readonly log: Log;
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

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
// Mole's `mo purge` waits as long before it calls a build folder old (lib/clean/project.sh MIN_AGE_DAYS).
const TRASH_DAYS = 7;

const namesIn = (dir: string) =>
	readdir(dir, { withFileTypes: true }).then(
		(entries) => entries.filter((entry) => !entry.isSymbolicLink()),
		() => [],
	);

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

/** The text of `~/.claude/sessions`: a session id in it is alive. */
const liveSessions = async (configDir: string, log: Log): Promise<string> => {
	const dir = join(configDir, "sessions");
	const files = await namesIn(dir);
	const texts = await Promise.all(
		files.map((file) =>
			readFile(join(dir, file.name), "utf8").catch(
				logged(log, `The session file ${file.name} was not read`, ""),
			),
		),
	);
	return texts.join("\n");
};

interface Candidate {
	readonly kind: string;
	readonly path: string;
	readonly limitMs: number;
}

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

/** The newest handoff by name stays: the resume reads that one back. */
const handoffsOf = async (dir: string, limitMs: number) => {
	const all = await inFolder("handoff", dir, limitMs, (n) =>
		HANDOFF_NAME.test(n),
	);
	return all.toSorted((a, b) => a.path.localeCompare(b.path)).slice(0, -1);
};

const tempOf = async (root: string, live: string, args: Args, host: Host) => {
	const sessionMs = (args.sessionDays ?? args.days ?? host.days) * DAY_MS;
	const probeMs = (args.probeMinutes ?? 60) * MINUTE_MS;
	const projects = await inFolder(
		"session-temp",
		root,
		0,
		(n) => !n.startsWith("fswatch-probe-"),
		true,
	);
	const sessions = await Promise.all(
		projects.map((project) =>
			inFolder(
				"session-temp",
				project.path,
				sessionMs,
				(n) => !live.includes(n),
				true,
			),
		),
	);
	return [
		...(await inFolder(
			"probe",
			root,
			probeMs,
			(n) => n.startsWith("fswatch-probe-"),
			true,
		)),
		...sessions.flat(),
	];
};

/** Each top-level temp folder a temp rule names whose marker names a session that is no longer alive. */
const markedTemp = async (
	trash: Trash,
	live: string,
	limitMs: number,
	host: Host,
) => {
	const bases = [
		...new Set(
			await Promise.all(host.tempBases.map((base) => realOr(base, host.log))),
		),
	];
	const found = await Promise.all(
		bases.map(async (base) => {
			const entries = await namesIn(base);
			const items = await Promise.all(
				entries
					.filter((entry) => entry.isDirectory())
					.map(async (entry) => {
						const rule = tempRule(trash, entry.name);
						const path = join(base, entry.name);
						const marker = await readFile(join(path, MARKER), "utf8").catch(
							logged(host.log, `The marker of ${path} was not read`, ""),
						);
						// A missing marker reads as "", which every text includes, so an unmarked folder stays.
						return rule && !live.includes(marker.trim())
							? [{ kind: rule.id, path, limitMs }]
							: [];
					}),
			);
			return items.flat();
		}),
	);
	return found.flat();
};

/** Each folder a project rule names, under the project or a Mole purge path, that `keepReason` lets go; nothing when the running processes cannot be read. */
const builtTrash = async (trash: Trash, limitMs: number, host: Host) => {
	const held = limitMs > 0 ? await heldPaths(host.uid) : undefined;
	if (held === undefined) {
		return [];
	}
	const [own, realHome, roots] = await Promise.all([
		checkoutOf(host.cwd),
		realOr(host.home, host.log),
		trashRoots(host.cwd, host.home, host.log),
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
	const handoffMs = (args.handoffDays ?? args.days ?? host.days) * DAY_MS;
	const claudetto = join(host.cwd, ".claude/claudetto");
	const live = `${args.session ?? ""}\n${await liveSessions(host.configDir, host.log)}`;
	const roots = await tempRoots(host.tempBases, host.uid, host.log);
	const trash = await loadTrash(host.cwd);
	const parts = await Promise.all([
		builtTrash(trash, (args.trashDays ?? TRASH_DAYS) * DAY_MS, host),
		markedTemp(trash, live, (args.probeMinutes ?? 60) * MINUTE_MS, host),
		handoffsOf(join(claudetto, "handoffs"), handoffMs),
		inFolder("bound-output", join(claudetto, "output"), DAY_MS, (n) =>
			n.startsWith("output-"),
		),
		inFolder("heartbeat", join(claudetto, "heartbeat"), DAY_MS, () => true),
		...roots.map((root) => tempOf(root, live, args, host)),
	]);
	return parts.flat().filter((item) => item.limitMs > 0);
};

// A folder's own size is its entry list; `du` counts what removing it frees.
const sizeOf = async (path: string, info: Stats): Promise<number> => {
	if (!info.isDirectory()) {
		return info.size;
	}
	const du = await output(["du", "-sk", path], "/");
	return Number(du?.split("\t")[0] ?? 0) * 1024;
};

export const sweep = async (args: Args, host: Host): Promise<Report> => {
	const why = await refusal(host.cwd, host.home, host.log);
	if (why !== undefined) {
		return { removed: [], refused: [`hygiene refused ${host.cwd}: ${why}`] };
	}
	const listed = await candidates(args, host);
	const found = await Promise.all(
		listed.map(async (item) => {
			// A Nix result link counts by its own time, and its store path may be gone.
			const info = await lstat(item.path).catch(
				logged(host.log, `The path ${item.path} was not read`, void 0),
			);
			return info !== undefined && host.now - info.mtimeMs > item.limitMs
				? [
						{
							kind: item.kind,
							path: item.path,
							bytes: await sizeOf(item.path, info),
						},
					]
				: [];
		}),
	);
	const removed = found.flat();
	if (!args.dryRun) {
		await Promise.all(
			removed.map((item) => rm(item.path, { recursive: true, force: true })),
		);
	}
	return { removed, refused: [] };
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
