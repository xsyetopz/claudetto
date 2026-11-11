import { readdir } from "node:fs/promises";
import { basename, join, sep } from "node:path";

import type { Log } from "./roots.ts";
import { type Held, output, tempRule, type Trash } from "./trash.ts";

export interface Candidate {
	readonly kind: string;
	readonly path: string;
	readonly limitMs: number;
}

export const MINUTE_MS = 60_000;
// 500 paths of a temp folder stay far under the 1 MiB that macOS allows a command line.
const BATCH = 500;

export const namesIn = (dir: string) =>
	readdir(dir, { withFileTypes: true }).then(
		(entries) => entries.filter((entry) => !entry.isSymbolicLink()),
		() => [],
	);

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
	const minutes = String(-Math.ceil(limitMs / MINUTE_MS));
	const idle = await Promise.all(
		batched(named).map(async (batch) => {
			const recent = await output(
				["find", ...batch.map((item) => item.path), "-mmin", minutes, "-print"],
				root,
			);
			if (recent === undefined) {
				log(`The temp entries of ${root} were not searched`);
				return [];
			}
			const changed = topsOf(root, recent.split("\n"));
			return batch.filter((item) => !changed.has(basename(item.path)));
		}),
	);
	return idle.flat();
};
