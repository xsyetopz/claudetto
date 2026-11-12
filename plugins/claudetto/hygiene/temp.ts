import { readdir } from "node:fs/promises";
import { basename, join, sep } from "node:path";

import { spawn } from "bun";

import type { Log } from "./roots";
import { type Held, tempRule, type Trash } from "./trash";

export interface Candidate {
	readonly kind: string;
	readonly path: string;
	readonly limitMs: number;
}

export const MINUTE_MS = 60_000;
// 500 paths of a temp folder stay far under the 1 MiB that macOS allows a command line.
const BATCH = 500;

export const namesIn = async (dir: string) => {
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		return entries.filter((entry) => !entry.isSymbolicLink());
	} catch {
		return [];
	}
};

/** `items` in runs short enough for one command line, so thousands of temp entries cost a few processes. */
export const batched = <T>(items: readonly T[]): T[][] =>
	Array.from({ length: Math.ceil(items.length / BATCH) }, (_, i) =>
		items.slice(i * BATCH, (i + 1) * BATCH),
	);

/** The top-level names of `root` that hold one of `paths`. */
const topsOf = (root: string, paths: readonly string[]): Set<string> =>
	new Set(
		paths.flatMap((path) =>
			path.startsWith(root + sep)
				? [path.slice(root.length + 1).split(sep)[0] ?? ""]
				: [],
		),
	);

/**
 * The top-level names of `root` that hold a file changed within `minutes`, or that the search could not read. `find` exits 1 when another process removes a path under it, which says nothing
 * about the others, so that exit counts; any other error splits the paths until the one that fails stands alone, and that name counts as changed so its entry stays.
 */
export const changedTops = async (
	root: string,
	paths: readonly string[],
	minutes: number,
	log: Log,
): Promise<Set<string>> => {
	const child = spawn(["find", ...paths, "-mmin", String(-minutes), "-print"], {
		cwd: root,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [text, errors] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]).then(([out, err]): [string, string] => [out, err]);
	const failed = errors
		.split("\n")
		.some((line) => line !== "" && !line.endsWith("No such file or directory"));
	if (!failed && (child.exitCode === 0 || child.exitCode === 1)) {
		return topsOf(root, text.split("\n"));
	}
	const [head, ...rest] = paths;
	if (rest.length === 0) {
		log(`The temp entry ${head ?? ""} was not searched`);
		return topsOf(root, [head ?? ""]);
	}
	const middle = Math.ceil(paths.length / 2);
	const [first, second] = await Promise.all([
		changedTops(root, paths.slice(0, middle), minutes, log),
		changedTops(root, paths.slice(middle), minutes, log),
	]);
	return new Set([...first, ...second]);
};

/** Each top-level entry of a temp root that a temp rule names, that no process holds a file in, and in which nothing changed within the limit. */
export const idleTemp = async (
	root: string,
	trash: Trash,
	limitMs: number,
	held: Held,
	log: Log,
): Promise<Candidate[]> => {
	const busy = topsOf(root, [...held.cwds, ...held.files]);
	const entries = await namesIn(root);
	const named = entries.flatMap((entry) => {
		const rule = busy.has(entry.name) ? undefined : tempRule(trash, entry.name);
		return rule
			? [{ kind: rule.id, path: join(root, entry.name), limitMs }]
			: [];
	});
	const idle = await Promise.all(
		batched(named).map(async (batch) => {
			const changed = await changedTops(
				root,
				batch.map((item) => item.path),
				Math.ceil(limitMs / MINUTE_MS),
				log,
			);
			return batch.filter((item) => !changed.has(basename(item.path)));
		}),
	);
	return idle.flat();
};
