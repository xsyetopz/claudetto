import { realpath, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Where Claude Code may have made its `claude-<uid>` folder: `CLAUDE_CODE_TMPDIR`, `/tmp`, and the system temp folder. */
export const tempBases = (
	env: Readonly<Record<string, string | undefined>>,
): string[] => [
	...(env["CLAUDE_CODE_TMPDIR"] ? [env["CLAUDE_CODE_TMPDIR"]] : []),
	"/tmp",
	tmpdir(),
];

/** The real path of `claude-<uid>` under `base`, or nothing when it is missing or owned by another uid. */
const rootUnder = async (
	base: string,
	uid: number,
): Promise<string | undefined> => {
	try {
		const real = await realpath(join(base, `claude-${uid}`));
		return (await stat(real)).uid === uid ? real : undefined;
	} catch {
		return undefined;
	}
};

/** Each `claude-<uid>` folder that exists and that `uid` owns, once per real path. */
export const tempRoots = async (
	bases: readonly string[],
	uid: number,
): Promise<string[]> => {
	const found = await Promise.all(bases.map((base) => rootUnder(base, uid)));
	return [...new Set(found.filter((root) => root !== undefined))];
};
