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
	const stat = await $.fs.stat(abs, { resolve: true }).catch(() => null);
	if (stat !== null) {
		return stat.realPath === undefined ? undefined : `${stat.realPath}${rest}`;
	}
	const cut = abs.lastIndexOf("/");
	return landing($, abs.slice(0, cut), `${abs.slice(cut)}${rest}`);
}

/**
 * Resolves each path a patch names against the session directory and refuses
 * any that lands outside it, by spelling (`../x`) or through a symbolic link.
 *
 * @param $ The engine.
 * @param cwd The session directory, absolute.
 * @param paths The paths as the patch wrote them.
 * @returns Per path, its absolute form or the reason it is refused.
 */
export async function placePaths(
	$: EngineInterface,
	cwd: string,
	paths: readonly string[]
): Promise<Map<string, { abs: string } | { error: string }>> {
	const real = (await landing($, cwd)) ?? cwd;
	const places = await Promise.all(
		paths.map(async (path) => {
			const abs = absolute(cwd, path);
			const to = isInside(cwd, abs) ? await landing($, abs) : undefined;
			const place: { abs: string } | { error: string } =
				to !== undefined && isInside(real, to)
					? { abs }
					: {
							error: `outside the session directory ${cwd}; patch edits files only inside it, so give the path and the change in your reply instead`
						};
			return [path, place] as const;
		})
	);
	return new Map(places);
}
