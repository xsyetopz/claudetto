#!/usr/bin/env -S bun --no-env-file
// The Claude Code types of the plugins, which `just typecheck` needs (wiki, "Types").
// Claude Code writes `.claude-plugin/types/` and a `tsconfig.json` into each plugin folder that an interactive session loads, and git ignores them.
// A linked worktree has none of these files, so this script copies each one that the worktree lacks from the main worktree.

import { cp, readdir } from "node:fs/promises";
import path from "node:path";
import { $, file } from "bun";
import { exists } from "./exists.ts";
import { mapInOrder } from "./ordered.ts";

/** The entries that Claude Code writes into a plugin folder. */
const WRITTEN = [path.join(".claude-plugin", "types"), "tsconfig.json"];

/** The types that the root `tsconfig.json` reads, relative to the repository. */
const NEEDED = path.join(
	"plugins",
	"claudetto",
	".claude-plugin",
	"types",
	"tsconfig.json",
);

/** The main worktree of the repository at `root`, or `null` when `root` is not a linked worktree. */
export const mainWorktree = async (root: string): Promise<string | null> => {
	const r =
		await $`git rev-parse --path-format=absolute --git-dir --git-common-dir`
			.cwd(root)
			.quiet()
			.nothrow();
	if (r.exitCode !== 0) {
		return null;
	}
	const [dir, common] = r.stdout.toString().trim().split("\n");
	if (!dir || !common || path.resolve(dir) === path.resolve(common)) {
		return null;
	}
	return path.dirname(path.resolve(common));
};

/** Copies each entry of `WRITTEN` that a plugin folder of `to` lacks and the same folder of `from` has. It gives the copied paths, relative to `to`. */
export const copyTypes = async (
	from: string,
	to: string,
): Promise<string[]> => {
	const entries = await readdir(path.join(to, "plugins"), {
		withFileTypes: true,
	}).catch(() => []);
	const rels = entries
		.filter((entry) => entry.isDirectory())
		.flatMap((entry) =>
			WRITTEN.map((part) => path.join("plugins", entry.name, part)),
		);
	const copied = await mapInOrder(rels, async (rel) => {
		if (
			(await exists(path.join(to, rel))) ||
			!(await exists(path.join(from, rel)))
		) {
			return [];
		}
		await cp(path.join(from, rel), path.join(to, rel), { recursive: true });
		return [rel];
	});
	return copied.flat();
};

if (process.argv[1] === import.meta.path) {
	const repo = path.resolve(import.meta.dir, "..");
	const main = await mainWorktree(repo);
	if (main) {
		for (const rel of await copyTypes(main, repo)) {
			process.stdout.write(`Copied ${rel} from ${main}\n`);
		}
	}
	if (!(await file(path.join(repo, NEEDED)).exists())) {
		console.error(
			`${NEEDED} is missing. Start an interactive Claude Code session that loads the plugins of this checkout, such as \`just sandbox\`, and run the type check again.`,
		);
		process.exitCode = 1;
	}
}
