// The files that `git status` lists in the `hygiene` slice, with their modification times, and the ledger lines of a `Bash` call.

import {
	GONE,
	type LedgerLine,
	statusPaths,
} from "../../../project/domain/ledger.ts";
import {
	BASH_CHANGE_MAX_MS,
	BASH_CHANGE_SLACK_MS,
	GIT_TIMEOUT_MS,
	WHO_FILES_MAX,
} from "../limits.ts";
import { hashOf } from "./ledger-file.ts";

/** The calls that the helpers make. The mod gives each call, because the mod runtime follows `$` into no imported arrow function. */
export interface WorkPort {
	readonly clock: { now: () => Promise<number> };
	readonly fs: {
		read: (path: string) => Promise<string>;
		stat: (path: string) => Promise<{ kind: string; mtimeMs: number }>;
	};
	readonly process: {
		run: (
			argv: string[],
			options: { cwd: string; timeoutMs: number },
		) => Promise<{ stdout: string; exitCode: number }>;
	};
	readonly session: { cwd: () => Promise<string> };
}

/** The files that `git status` lists, with their modification times. */
export const workFiles = async (
	io: WorkPort,
): Promise<{ path: string; mtimeMs: number }[]> => {
	const cwd = await io.session.cwd();
	const run = (argv: string[]) =>
		io.process.run(argv, { cwd, timeoutMs: GIT_TIMEOUT_MS });
	// `--untracked-files=all` lists a new file in a new folder, which `-z` alone shows as the folder.
	const [status, top] = await Promise.all([
		run(["git", "status", "--porcelain", "-z", "--untracked-files=all"]),
		run(["git", "rev-parse", "--show-toplevel"]),
	]);
	if (status.exitCode !== 0 || top.exitCode !== 0) {
		return [];
	}
	const root = top.stdout.trim();
	const stats = await Promise.all(
		statusPaths(status.stdout)
			.slice(0, WHO_FILES_MAX)
			.map(async (rel) => {
				const path = `${root}/${rel}`;
				return { path, stat: await io.fs.stat(path).catch(() => undefined) };
			}),
	);
	return stats.flatMap(({ path, stat }) =>
		stat?.kind === "file" ? [{ path, mtimeMs: stat.mtimeMs }] : [],
	);
};

/** The ledger lines for the files of `git status` that changed after the start of a `Bash` call. */
export const bashLines = async (
	io: WorkPort,
	session: string,
	agent: string,
	tookMs: number | undefined,
): Promise<LedgerLine[]> => {
	const now = await io.clock.now();
	const since =
		now -
		Math.min(tookMs ?? BASH_CHANGE_MAX_MS, BASH_CHANGE_MAX_MS) -
		BASH_CHANGE_SLACK_MS;
	const recent = (await workFiles(io)).filter(
		({ mtimeMs }) => mtimeMs >= since,
	);
	const hashed = await Promise.all(
		recent.map(async ({ path }) => ({ path, hash: await hashOf(io, path) })),
	);
	return hashed.flatMap(({ path, hash }) =>
		hash === GONE ? [] : [{ path, hash, session, agent, via: "bash" as const }],
	);
};
