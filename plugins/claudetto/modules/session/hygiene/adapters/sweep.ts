// The cleanup of the `hygiene` slice at session start: the sweep of old session folders, the move of the old state folder, and its `.gitignore` entry.

import { withStateIgnore } from "../../../project/domain/gitignore.ts";
import { CLAUDE_DIR, CLAUDETTO_DIR } from "../../../project/domain/paths.ts";
import { tempDirs } from "../../../project/domain/tmp.ts";
import { cleanupArgv, parseCleanup } from "../domain/cleanup.ts";
import { removedNotice } from "../domain/notice.ts";
import { removedCount, sweepArgv } from "../domain/probes.ts";
import {
	DEFAULT_CLEANUP_DAYS,
	SWEEP_TIMEOUT_MS,
	WORKTREES_DIR,
} from "../limits.ts";

/** The calls that the helpers make. The mod gives each call, because the mod runtime follows `$` into no imported arrow function. */
export interface SweepPort {
	readonly settings: {
		read: (query: { key: "cleanupPeriodDays" }) => Promise<unknown>;
	};
	readonly env: Readonly<
		Record<
			"CLAUDE_CODE_TMPDIR" | "CLAUDE_CONFIG_DIR" | "HOME" | "TMPDIR",
			() => Promise<string | undefined>
		>
	>;
	readonly process: {
		run: (
			argv: string[],
			options: { timeoutMs: number },
		) => Promise<{ stdout: string; exitCode: number }>;
	};
	readonly fs: {
		stat: (path: string) => Promise<{ kind: string }>;
		realPath: (path: string) => Promise<string | undefined>;
		exists: (path: string) => Promise<boolean>;
		read: (path: string) => Promise<string>;
		write: (path: string, text: string) => Promise<unknown>;
	};
	readonly session: {
		root: () => Promise<string>;
		id: () => Promise<string>;
	};
	readonly ui: { log: (text: string) => unknown };
}

const TRAILING_SLASHES = /\/+$/;

/** `cleanupPeriodDays` of Claude Code, or 30 when it is not a whole number over 0. */
const daysOf = async (io: SweepPort): Promise<number> => {
	const days = await io.settings
		.read({ key: "cleanupPeriodDays" })
		.catch(() => undefined);
	return typeof days === "number" && Number.isInteger(days) && days > 0
		? days
		: DEFAULT_CLEANUP_DAYS;
};

/** The session files of Claude Code, in `CLAUDE_CONFIG_DIR` or `~/.claude`. */
const sessionsOf = async (io: SweepPort): Promise<string> => {
	const config = await io.env.CLAUDE_CONFIG_DIR().catch(() => undefined);
	const home = (await io.env.HOME().catch(() => undefined)) || "";
	return `${(config || `${home}/.claude`).replace(TRAILING_SLASHES, "")}/sessions`;
};

const outputOf = async (io: SweepPort, argv: string[]): Promise<string> => {
	try {
		return (await io.process.run(argv, { timeoutMs: SWEEP_TIMEOUT_MS })).stdout;
	} catch {
		return "";
	}
};

/** Removes the folders of ended sessions, the worktrees that keep no work, and the leftover probe folders (anthropics/claude-code#104170), and logs one line for them. */
export const sweep = async (io: SweepPort): Promise<void> => {
	const dirs = await tempDirs(
		{
			TMPDIR: await io.env.TMPDIR(),
			CLAUDE_CODE_TMPDIR: await io.env.CLAUDE_CODE_TMPDIR(),
		},
		async (path) => {
			try {
				return (await io.fs.realPath(path)) ?? path;
			} catch {
				return path;
			}
		},
	);
	const root = await io.session.root().catch(() => "");
	const roots = {
		sessions: await sessionsOf(io),
		worktrees: root
			? `${root.replace(TRAILING_SLASHES, "")}/${WORKTREES_DIR}`
			: "",
		days: await daysOf(io),
		current: await io.session.id(),
	};
	// The runs go one after the other, in order, and the worktrees only in the first run.
	const sweepFrom = async (
		tmps: readonly string[],
		isFirst: boolean,
	): Promise<{ probes: number; out: string }> => {
		const [tmp, ...rest] = tmps;
		if (tmp === undefined) {
			return { probes: 0, out: "" };
		}
		const found = removedCount(await outputOf(io, sweepArgv(tmp)));
		const cleaned = await outputOf(
			io,
			cleanupArgv({
				...roots,
				tmp,
				worktrees: isFirst ? roots.worktrees : "",
			}),
		);
		const after = await sweepFrom(rest, false);
		return { probes: found + after.probes, out: cleaned + after.out };
	};
	// Each real folder once (`/tmp` and `/private/tmp` count once).
	const { probes, out } = await sweepFrom(
		[...new Set(dirs.map((d) => d[1]))],
		true,
	);
	const report = parseCleanup(out);
	const notice = removedNotice({
		folders: report.folders,
		files: report.files,
		worktrees: report.worktrees.length,
		probes,
		bytes: report.bytes,
	});
	if (notice !== null) {
		io.ui.log(notice);
	}
};

/** Moves `.claudetto/` of an older version to `.claude/claudetto/` when only the old folder exists, and `.claudetto` is a folder. The file API has no rename, so `/bin/mv` runs, and the target is checked again just before, because `/bin/mv` moves into a folder that exists. A failed move leaves the old folder. */
export const moveState = async (io: SweepPort): Promise<void> => {
	const root = (await io.session.root()).replace(TRAILING_SLASHES, "");
	const old = `${root}/.claudetto`;
	const next = `${root}/${CLAUDETTO_DIR}`;
	if ((await io.fs.stat(old).catch(() => undefined))?.kind !== "dir") {
		return;
	}
	if (await io.fs.exists(next)) {
		return;
	}
	const run = (argv: string[]) =>
		io.process.run(argv, { timeoutMs: SWEEP_TIMEOUT_MS });
	if (
		(await run(["/bin/mkdir", "-p", `${root}/${CLAUDE_DIR}`])).exitCode === 0 &&
		!(await io.fs.exists(next))
	) {
		await run(["/bin/mv", old, next]);
	}
};

/** In a project with `.git`, writes `/.claude/claudetto/` to `.gitignore` when no entry covers the folder, and creates the file when it is missing. */
export const ignoreState = async (io: SweepPort): Promise<void> => {
	const root = (await io.session.root()).replace(TRAILING_SLASHES, "");
	if (!(await io.fs.exists(`${root}/.git`))) {
		return;
	}
	const file = `${root}/.gitignore`;
	const text = (await io.fs.exists(file)) ? await io.fs.read(file) : "";
	const next = withStateIgnore(text);
	if (next !== text) {
		await io.fs.write(file, next);
	}
};
