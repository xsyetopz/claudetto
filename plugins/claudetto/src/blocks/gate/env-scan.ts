import { ENV_SCAN_CACHE_MS, ENV_SCAN_MS } from "./limits.ts";
import { ENV_FILE } from "./paths.ts";
import type { Run } from "./ports.ts";

export interface ScanIo {
	now: () => Promise<number>;
	run: Run;
}

const envFileHeld = new Map<
	string,
	{ at: number; names: string[] | undefined; mutations: number }
>();

let mutations = 0;
const MUTATING = new Set(["Bash", "Monitor", "Write", "Edit", "NotebookEdit"]);

export const countCall = (tool: string): void => {
	mutations += Number(MUTATING.has(tool));
};

const nearFolders = (cwd: string, home: string): string[] => {
	const parts = cwd.split("/").filter(Boolean);
	const parents = parts.map(
		(_, i) => `/${parts.slice(0, parts.length - i).join("/")}`,
	);
	return [...new Set([...parents, "/", home])];
};

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
