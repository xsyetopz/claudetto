import type { EngineInterface } from "claude-code";

import { isSpecFile, isTestFile, listPaths, wantedPaths } from "./paths";
import type { CheckInput } from "./spec";

/** Git with `core.quotePath=false`, so a non-ASCII path prints as itself, not as an octal escape. */
function git(args: string[]): string[] {
	return ["git", "-c", "core.quotePath=false", ...args];
}

/** The `git ls-files` argv that lists the tracked and untracked files a check reads. */
export const LIST_ARGV = git([
	"ls-files",
	"--cached",
	"--others",
	"--exclude-standard"
]);

/** The stdout of each `git show <ref>` that succeeds; a ref git cannot resolve has no entry. */
async function showAll(
	$: EngineInterface,
	refs: Map<string, string>
): Promise<Map<string, string>> {
	const shown = new Map<string, string>();
	await Promise.all(
		[...refs].map(async ([path, ref]) => {
			const out = await $.process.run(git(["show", ref]));
			if (out.exitCode === 0) {
				shown.set(path, out.stdout);
			}
		})
	);
	return shown;
}

/** Each path's work-tree text; a path that cannot be read has no entry. */
export async function readAll(
	$: EngineInterface,
	paths: string[]
): Promise<Map<string, string>> {
	const texts = new Map<string, string>();
	await Promise.all(
		paths.map(async (path) => {
			try {
				const text = await $.fs.read(path);
				if (typeof text === "string") {
					texts.set(path, text);
				}
			} catch {
				// A path git lists may be deleted or over the read limit; it counts as empty.
			}
		})
	);
	return texts;
}

/** The stdout of a git command whose failure leaves the answer empty. */
export async function gitOut(
	$: EngineInterface,
	args: string[]
): Promise<string> {
	const out = await $.process.run(git(args));
	return out.exitCode === 0 ? out.stdout : "";
}

/** Gathers the git outputs and file texts one check reads; `check` itself never shells out. */
export async function gather(
	$: EngineInterface,
	listing: string
): Promise<Omit<CheckInput, "path">> {
	const diff = await gitOut($, ["diff", "--name-only"]);
	const deleted = await gitOut($, ["diff", "--name-only", "--diff-filter=D"]);
	const listed = listPaths(listing);
	const gone = new Set(listPaths(deleted));
	const staged = listPaths(diff).filter((p) => isTestFile(p) && !gone.has(p));
	const [head, index, texts] = await Promise.all([
		showAll(
			$,
			new Map(listed.filter((p) => isSpecFile(p)).map((p) => [p, `HEAD:${p}`]))
		),
		showAll($, new Map(staged.map((p) => [p, `:${p}`]))),
		readAll($, wantedPaths(listing))
	]);
	return { listing, diff, deleted, head, index, texts };
}
