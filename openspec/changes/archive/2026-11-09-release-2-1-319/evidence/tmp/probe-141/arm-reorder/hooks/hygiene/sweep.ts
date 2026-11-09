import { readdir, readFile, realpath, rm, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { HANDOFF_NAME } from "../handoff/layout.ts";

interface Args {
	readonly dryRun: boolean;
	readonly session?: string;
	readonly days?: number;
	readonly handoffDays?: number;
	readonly sessionDays?: number;
	readonly probeMinutes?: number;
}

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
const NUMBER_FLAGS = new Map<
	string,
	"days" | "handoffDays" | "sessionDays" | "probeMinutes"
>([
	["--days", "days"],
	["--handoff-days", "handoffDays"],
	["--session-days", "sessionDays"],
	["--probe-minutes", "probeMinutes"],
]);

const numberArg = (flag: string, value: string | undefined): number => {
	const n = Number(value);
	if (!Number.isInteger(n) || n < (flag === "--days" ? 1 : 0)) {
		throw new Error(`${flag} needs a whole number, and 0 turns a kind off`);
	}
	return n;
};

export const parseArgs = (argv: readonly string[]): Args => {
	let args: Args = { dryRun: false };
	const rest = [...argv];
	for (let arg = rest.shift(); arg !== undefined; arg = rest.shift()) {
		const key = NUMBER_FLAGS.get(arg);
		switch (arg) {
			case "--dry-run":
				args = { ...args, dryRun: true };
				break;
			case "--session":
				args = { ...args, session: rest.shift() ?? "" };
				break;
			default:
				if (key === undefined) {
					throw new Error(`Unknown argument ${arg}`);
				}
				args = { ...args, [key]: numberArg(arg, rest.shift()) };
		}
	}
	return args;
};

const namesIn = async (dir: string) =>
	(await readdir(dir, { withFileTypes: true }).catch(() => [])).filter(
		(entry) => !entry.isSymbolicLink(),
	);

const within = (path: string, parent: string): boolean =>
	path === parent || path.startsWith(parent + sep);

const realOr = (path: string): Promise<string> =>
	realpath(path).catch(() => resolve(path));

/** Why `root` must not be swept, or nothing. */
const refusal = async (root: string, home: string) => {
	const [real, realHome] = await Promise.all([realOr(root), realOr(home)]);
	if (real === realHome) {
		return "is the home folder";
	}
	return ["projects", "plugins"]
		.filter((part) => within(real, join(realHome, ".claude", part)))
		.map((part) => `is inside ~/.claude/${part}`)[0];
};

/** Each `claude-<uid>` folder that exists and that `uid` owns, once per real path. */
const tempRoots = async (bases: readonly string[], uid: number) => {
	const found = await Promise.all(
		bases.map(async (base) => {
			const real = await realpath(join(base, `claude-${uid}`)).catch(
				() => undefined,
			);
			return real !== undefined && (await stat(real)).uid === uid
				? real
				: undefined;
		}),
	);
	return [...new Set(found.filter((root) => root !== undefined))];
};

/** The text of `~/.claude/sessions`: a session id in it is alive. */
const liveSessions = async (configDir: string): Promise<string> => {
	const dir = join(configDir, "sessions");
	const files = await namesIn(dir);
	const texts = await Promise.all(
		files.map((file) => readFile(join(dir, file.name), "utf8").catch(() => "")),
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
): Promise<Candidate[]> =>
	(await namesIn(dir))
		.filter((e) => (isDir ? e.isDirectory() : e.isFile()) && wanted(e.name))
		.map((e) => ({ kind, path: join(dir, e.name), limitMs }));

/** The newest handoff by name stays: the resume reads that one back. */
const handoffsOf = async (dir: string, limitMs: number) =>
	(await inFolder("handoff", dir, limitMs, (n) => HANDOFF_NAME.test(n)))
		.sort((a, b) => a.path.localeCompare(b.path))
		.slice(0, -1);

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

const candidates = async (args: Args, host: Host): Promise<Candidate[]> => {
	const handoffMs = (args.handoffDays ?? args.days ?? host.days) * DAY_MS;
	const claudetto = join(host.cwd, ".claude/claudetto");
	const live = `${args.session ?? ""}\n${await liveSessions(host.configDir)}`;
	const roots = await tempRoots(host.tempBases, host.uid);
	const parts = await Promise.all([
		handoffsOf(join(claudetto, "handoffs"), handoffMs),
		inFolder("bound-output", join(claudetto, "output"), DAY_MS, (n) =>
			n.startsWith("output-"),
		),
		inFolder("heartbeat", join(claudetto, "heartbeat"), DAY_MS, () => true),
		...roots.map((root) => tempOf(root, live, args, host)),
	]);
	return parts.flat().filter((item) => item.limitMs > 0);
};

export const sweep = async (args: Args, host: Host): Promise<Report> => {
	const why = await refusal(host.cwd, host.home);
	if (why !== undefined) {
		return { removed: [], refused: [`hygiene refused ${host.cwd}: ${why}`] };
	}
	const found = await Promise.all(
		(await candidates(args, host)).map(async (item) => {
			const info = await stat(item.path).catch(() => undefined);
			return info !== undefined && host.now - info.mtimeMs > item.limitMs
				? [{ kind: item.kind, path: item.path, bytes: info.size }]
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
