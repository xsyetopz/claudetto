// Finds the scratch folders that dev tools left in the temp roots, by name, kind, and age.

import { lstat, readdir, realpath } from "node:fs/promises";
import { join } from "node:path";
import { total } from "../total.ts";

/** The `mkdtemp` prefixes that dev tools use. */
export const PREFIXES: readonly string[] = [
	"claudetto-capture-",
	"claudetto-classifier-",
	"claudetto-eval-",
	"claudetto-prefix-",
	"claudekit-dump-",
];

const SUFFIX = /^[A-Za-z0-9]{6}$/;

/** True for a prefix of `PREFIXES` followed by exactly the 6 characters that `mkdtemp` adds. */
export const isScratchName = (name: string): boolean =>
	PREFIXES.some(
		(prefix) =>
			name.startsWith(prefix) && SUFFIX.test(name.slice(prefix.length)),
	);

export interface Scratch {
	readonly path: string;
	/** The newest modification time of the folder and its direct entries, in ms. */
	readonly newest: number;
}

/** The roots by `realpath`, once each, without those that do not exist. */
export const uniqueRoots = async (
	roots: readonly string[],
): Promise<string[]> => {
	const real = await Promise.all(
		roots.map((root) => realpath(root).catch(() => undefined)),
	);
	return [...new Set(real.filter((r): r is string => r !== undefined))];
};

const mtimeOf = async (path: string): Promise<number> => {
	const stat = await lstat(path).catch(() => undefined);
	return stat?.mtimeMs ?? 0;
};

const newestOf = async (dir: string, own: number): Promise<number> => {
	const names = await readdir(dir).catch(() => []);
	const times = await Promise.all(
		names.map((name) => mtimeOf(join(dir, name))),
	);
	return Math.max(own, ...times);
};

const scratchIn = async (root: string): Promise<Scratch[]> => {
	const names = (await readdir(root).catch(() => [])).filter(isScratchName);
	const found = await Promise.all(
		names.map(async (name): Promise<Scratch | undefined> => {
			const path = join(root, name);
			const stat = await lstat(path).catch(() => undefined);
			return stat?.isDirectory()
				? { path, newest: await newestOf(path, stat.mtimeMs) }
				: undefined;
		}),
	);
	return found.filter((f): f is Scratch => f !== undefined);
};

/** The real directories (not symlinks) of the right name under `roots`. Age is left to the caller. */
export const scratchFolders = async (
	roots: readonly string[],
): Promise<Scratch[]> => {
	const each = await Promise.all((await uniqueRoots(roots)).map(scratchIn));
	return each.flat();
};

/** The bytes under `path`, symlinks counted as themselves. */
export const sizeOf = async (path: string): Promise<number> => {
	const stat = await lstat(path).catch(() => undefined);
	if (stat === undefined) {
		return 0;
	}
	if (!stat.isDirectory()) {
		return stat.size;
	}
	const names = await readdir(path).catch(() => []);
	return total(await Promise.all(names.map((n) => sizeOf(join(path, n)))));
};
