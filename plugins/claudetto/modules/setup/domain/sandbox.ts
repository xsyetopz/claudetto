// The sandbox paths that setup writes: the lists of the gate (`gate/domain/paths.ts`) in the path form of `sandbox.filesystem`.
// A `.env` file has no entry: under a `**/.env` deny, `bun` exits 1 in a folder with a `.env` file (`srt` 0.0.81, 2026-10-26), and the gate stops each command that names one.
import path from "node:path";
import {
	HOME_SECRETS,
	SYSTEM_DIRS,
	SYSTEM_OPEN,
} from "../../gate/domain/paths.ts";
import { SANDBOX_MAX_CHILDREN } from "../limits.ts";

const TRAILING_SLASH = /\/$/;

const inside = (child: string, root: string): boolean =>
	!path.posix.relative(root, child).startsWith("..");

/** The entry names of `dir`, or none when the listing fails for any reason. */
const listOrNone = async (
	children: (dir: string) => Promise<string[]>,
	dir: string,
): Promise<string[]> => {
	try {
		return await children(dir);
	} catch {
		return [];
	}
};

/**
 * The paths of `SYSTEM_DIRS` for `denyWrite`. A folder with an open folder inside it, such as `/usr` with `/usr/local`,
 * gives its other entries, from `children`, because a deny of the folder also stops the open one (`denyWrite` wins over `allowWrite`).
 */
const systemPaths = async (
	children: (dir: string) => Promise<string[]>,
): Promise<string[]> =>
	(
		await Promise.all(
			SYSTEM_DIRS.map(async (dir) =>
				SYSTEM_OPEN.some((open) => inside(open, dir))
					? (
							await listOrNone(children, dir)
						)
							.slice(0, SANDBOX_MAX_CHILDREN)
							.map((name) => path.posix.join(dir, name))
							.filter(
								(child) => !SYSTEM_OPEN.some((open) => inside(child, open)),
							)
					: [dir],
			),
		)
	).flat();

/** The `sandbox` snippet: `denyRead` for the secret paths below `~`, and `denyWrite` for the system folders. `children` lists the entry names of a folder. */
export const sandboxSnippet = async (
	children: (dir: string) => Promise<string[]>,
) => ({
	filesystem: {
		denyRead: HOME_SECRETS.map(
			(secret) => `~/${secret.replace(TRAILING_SLASH, "")}`,
		),
		denyWrite: await systemPaths(children),
	},
});
