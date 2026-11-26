import type { EngineInterface } from "claude-code";

import type { FileOp } from "./parse";

/** The absolute, dot-free form of a path read from `cwd`. */
export const absolute = (cwd: string, path: string): string => {
	const parts: string[] = [];
	for (const part of (path.startsWith("/") ? path : `${cwd}/${path}`).split(
		"/"
	)) {
		if (part === "..") {
			parts.pop();
		} else if (part !== "" && part !== ".") {
			parts.push(part);
		}
	}
	return `/${parts.join("/")}`;
};

/** Whether `abs` is strictly inside `root`. */
export const isInside = (root: string, abs: string): boolean =>
	abs.startsWith(root.endsWith("/") ? root : `${root}/`);

/** Every path a patch names, source and move target alike. */
export const pathsOf = (ops: readonly FileOp[]): string[] =>
	ops.flatMap((op) =>
		op.kind === "update" && op.moveTo !== undefined
			? [op.path, op.moveTo]
			: [op.path]
	);

/** Where `abs` lands after symbolic links: its own real path, else its nearest existing folder's plus the rest. */
async function landing(
	$: EngineInterface,
	abs: string,
	rest = ""
): Promise<string | undefined> {
	if (abs === "" || abs === "/") {
		return undefined;
	}
	// A path that does not exist yet throws; the walk then resolves its parent, so the throw is the answer.
	const stat = await $.fs.stat(abs, { resolve: true }).catch(() => null);
	if (stat !== null) {
		return stat.realPath === undefined ? undefined : `${stat.realPath}${rest}`;
	}
	const cut = abs.lastIndexOf("/");
	return landing($, abs.slice(0, cut), `${abs.slice(cut)}${rest}`);
}

/** Whether `abs` is inside one of `roots`, by spelling and after symbolic links. */
async function isPlaced(
	$: EngineInterface,
	roots: readonly { root: string; real: string }[],
	abs: string
): Promise<boolean> {
	const home = roots.find(({ root }) => isInside(root, abs));
	if (home === undefined) {
		return false;
	}
	const to = await landing($, abs);
	return to !== undefined && isInside(home.real, to);
}

/**
 * Resolves each path a patch names against the shell's directory and refuses
 * any that lands outside the session's project root and outside `extra`, by
 * spelling (`../x`) or through a symbolic link. The root is the wall, because
 * a shell `cd` into a subfolder moves the directory but not the project.
 *
 * @param $ The engine.
 * @param place `cwd`, the directory relative paths start from, and `root`, the project root; both absolute.
 * @param paths The paths as the patch wrote them.
 * @param extra Other absolute folders patch may write in (the auto-memory folder).
 * @returns Per path, its absolute form or the reason it is refused.
 */
export async function placePaths(
	$: EngineInterface,
	{ cwd, root }: { cwd: string; root: string },
	paths: readonly string[],
	extra: readonly string[] = []
): Promise<Map<string, { abs: string } | { error: string }>> {
	const roots = await Promise.all(
		[root, ...extra].map(async (dir) => ({
			root: dir,
			real: (await landing($, dir)) ?? dir
		}))
	);
	const places = await Promise.all(
		paths.map(async (path) => {
			const abs = absolute(cwd, path);
			const place: { abs: string } | { error: string } = (await isPlaced(
				$,
				roots,
				abs
			))
				? { abs }
				: {
						error: `outside the session directory ${root}; patch edits files only inside it. Write a scratch file under $TMPDIR with Bash; a file in another project stays as it is and the reply names its path and the change`
					};
			return [path, place] as const;
		})
	);
	return new Map(places);
}
