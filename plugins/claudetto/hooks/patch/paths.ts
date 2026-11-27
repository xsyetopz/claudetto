import type { EngineInterface } from "claude-code";

import { fieldOf, stringsOf } from "../shared/field";
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

/** Whether `abs` is `entry` or inside it; in `entry`, `**` spans folders and `*` stays in one. */
const isUnder = (entry: string, abs: string): boolean => {
	const source = entry
		.split("**")
		.map((part) =>
			part
				.split("*")
				.map((run) => run.replaceAll(/[$()+.?[\\\]^{|}]/gu, String.raw`\$&`))
				.join("[^/]*")
		)
		.join(".*");
	return new RegExp(`^${source}(?:/.*)?$`, "su").test(abs);
};

/** The sandbox write deny list from the merged settings, `~` spelled out; empty when unread. */
async function writeDenied($: EngineInterface): Promise<string[]> {
	try {
		const [sandbox, home] = await Promise.all([
			$.settings.read({ key: "sandbox" }),
			$.env.get("HOME")
		]);
		return (
			stringsOf(fieldOf(fieldOf(sandbox, "filesystem"), "denyWrite")) ?? []
		).map((entry) =>
			entry.startsWith("~/") && home !== undefined
				? `${home}${entry.slice(1)}`
				: entry
		);
	} catch {
		// An unread list leaves the Edit and Write rules, which the check applies, as the only bound.
		return [];
	}
}

/**
 * Resolves each path a patch names against the shell's directory and refuses any that lands, by
 * spelling or through a symbolic link, in the sandbox write deny list (shell start-up files,
 * `~/.ssh`, plugin and hook folders, each wall), since `patch` writes outside the sandbox. Any
 * other path is the agent's to write, also in another project (ISSUES-part12).
 *
 * @param $ The engine.
 * @param cwd The directory relative paths start from, absolute.
 * @param paths The paths as the patch wrote them.
 * @returns Per path, its absolute form or the reason it is refused.
 */
export async function placePaths(
	$: EngineInterface,
	cwd: string,
	paths: readonly string[]
): Promise<Map<string, { abs: string } | { error: string }>> {
	const denied = await writeDenied($);
	const places = await Promise.all(
		paths.map(async (path) => {
			const abs = absolute(cwd, path);
			const real = (await landing($, abs)) ?? abs;
			const wall = denied.find(
				(entry) => isUnder(entry, abs) || isUnder(entry, real)
			);
			const place: { abs: string } | { error: string } =
				wall === undefined
					? { abs }
					: {
							error: `\`${abs}\` is under \`${wall}\`, which the sandbox write deny list holds`
						};
			return [path, place] as const;
		})
	);
	return new Map(places);
}
