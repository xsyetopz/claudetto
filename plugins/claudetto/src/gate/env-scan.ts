// The scan for env files of the project, held for a while while no call that can make a file has run.

import { ENV_SCAN_CACHE_MS, ENV_SCAN_MS } from "./limits.ts";
import { ENV_FILE } from "./paths.ts";
import type { Run } from "./ports.ts";

/** What the scan needs: the time of the host and a program run. `mod.ts` builds it from `$`. */
export interface ScanIo {
	now: () => Promise<number>;
	run: Run;
}

/** The last answer of `hasEnvFile` for each place (`names` is `undefined` when the scan failed), with the time of the scan and the `mutations` count at the scan. */
const envFileHeld = new Map<
	string,
	{ at: number; names: string[] | undefined; mutations: number }
>();

/** The number of calls of `Bash`, `Monitor`, `Write`, `Edit`, and `NotebookEdit` that the gate has seen. Each of them can make a file, so a scan holds only while the count is the same. */
let mutations = 0;
const MUTATING = new Set(["Bash", "Monitor", "Write", "Edit", "NotebookEdit"]);

/** Counts the call of `tool` when it can make a file. */
export const countCall = (tool: string): void => {
	mutations += Number(MUTATING.has(tool));
};

/** The folders that `hasEnvFile` scans at depth 1: the session folder, each parent up to `/`, and the home folder. */
const nearFolders = (cwd: string, home: string): string[] => {
	const parts = cwd.split("/").filter(Boolean);
	const parents = parts.map(
		(_, i) => `/${parts.slice(0, parts.length - i).join("/")}`,
	);
	return [...new Set([...parents, "/", home])];
};

/** The `find` run for the folders `roots`: a file or a symlink with the name of an env file, with no walk into `node_modules` and `.git`. `depth` limits the walk. A run that fails or is cut gives `bad`. */
const envFind = async (
	run: Run,
	roots: string[],
	depth: string[],
): Promise<{ stdout: string; bad: boolean }> => {
	try {
		const out = await run(
			[
				...["find", ...roots, ...depth],
				...["-name", "node_modules", "-prune"],
				...["-o", "-name", ".git", "-prune", "-o"],
				...["(", "-type", "f", "-o", "-type", "l", ")"],
				...["(", "-name", ".env*", "-o", "-name", "*.env", ")", "-print"],
			],
			ENV_SCAN_MS,
		);
		return {
			stdout: out.stdout,
			bad: out.exitCode !== 0 || out.isStdoutTruncated === true,
		};
	} catch {
		return { stdout: "", bad: true };
	}
};

/** The base names of the env files (and symlinks with their names) in the folder `root` or a folder below it (except `node_modules` and `.git`), or in the session folder `cwd`, a parent of it, or `home` at depth 1, or `undefined` when `find` fails or its list is cut. A hold keeps the answer for `ENV_SCAN_CACHE_MS` while no call that can make a file has run. */
export const hasEnvFile = async (
	io: ScanIo,
	root: string,
	cwd: string,
	home: string,
): Promise<string[] | undefined> => {
	const now = await io.now();
	const key = `${root}\0${cwd}\0${home}`;
	const kept = envFileHeld.get(key);
	if (
		kept &&
		now - kept.at < ENV_SCAN_CACHE_MS &&
		kept.mutations === mutations
	) {
		return kept.names;
	}
	const stamp = mutations;
	const outs = await Promise.all([
		envFind(io.run, [root], []),
		envFind(io.run, nearFolders(cwd, home), ["-maxdepth", "1"]),
	]);
	const names = outs.some(({ bad }) => bad)
		? undefined
		: [
				...new Set(
					outs
						.flatMap(({ stdout }) => stdout.split("\n"))
						.map((l) => l.slice(l.lastIndexOf("/") + 1))
						.filter((name) => ENV_FILE.test(name)),
				),
			];
	envFileHeld.set(key, { at: now, names, mutations: stamp });
	return names;
};
