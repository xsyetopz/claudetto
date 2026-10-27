// The edits of the user: the changed files that no line of the edit ledger made (D6 of change `redesign-0-4-0`).
// The caller gives each read as a port, because the mod runtime follows `$` into no imported arrow function.

import { STAGE_FILES_MAX, STAGE_NAMES_MAX } from "../limits.ts";
import {
	GONE,
	hash64,
	ledgerPath,
	madeBy,
	parseLedger,
	statusPaths,
} from "./ledger.ts";

const TRAILING_SLASHES = /(.)\/+$/;

/** The folder of the edit ledger: `$TMPDIR`, or `/tmp` when it is not set or empty, with no end slash. */
export const ledgerTmp = (tmp: string | undefined): string =>
	(tmp || "/tmp").replace(TRAILING_SLASHES, "$1");

/** The reads of `userEdits`. `git` runs `git -C <dir>` with the arguments. */
export interface EditPorts {
	git: (args: string[]) => Promise<{ exitCode: number; stdout: string }>;
	read: (path: string) => Promise<string>;
	exists: (path: string) => Promise<boolean>;
	tmp: () => Promise<string | undefined>;
	root: () => Promise<string>;
}

/** The hash of the file at `path`, or `GONE` when the read fails. */
const hashOf = async (
	read: (path: string) => Promise<string>,
	path: string,
): Promise<string> => {
	try {
		return hash64(await read(path));
	} catch {
		return GONE;
	}
};

/** The changed files of the work tree that no line of the edit ledger holds with their hash now, relative to the root, or only the file `only` when given. A `git` run that fails gives none. */
export const userEdits = async (
	io: EditPorts,
	only?: string,
): Promise<string[]> => {
	const [status, top] = await Promise.all([
		io.git(["status", "--porcelain", "-z", "--untracked-files=all"]),
		io.git(["rev-parse", "--show-toplevel"]),
	]);
	if (status.exitCode !== 0 || top.exitCode !== 0) {
		return [];
	}
	const root = top.stdout.trim();
	const changed = statusPaths(status.stdout)
		.filter((rel) => only === undefined || `${root}/${rel}` === only)
		.slice(0, STAGE_FILES_MAX);
	if (changed.length === 0) {
		return [];
	}
	const tmp = ledgerTmp(await io.tmp().catch(() => undefined));
	const file = ledgerPath(tmp, await io.root());
	const lines = parseLedger(
		((await io.exists(file)) && (await io.read(file))) || "",
	);
	const isEdit = async (rel: string): Promise<boolean> => {
		const hash = await hashOf(io.read, `${root}/${rel}`);
		return hash !== GONE && madeBy(lines, `${root}/${rel}`, hash).length === 0;
	};
	// Batches in order keep the early stop: no read after the batch that fills `STAGE_NAMES_MAX`.
	const collect = async (from: number, found: string[]): Promise<string[]> => {
		if (found.length >= STAGE_NAMES_MAX || from >= changed.length) {
			return found.slice(0, STAGE_NAMES_MAX);
		}
		const batch = changed.slice(from, from + STAGE_NAMES_MAX - found.length);
		const flags = await Promise.all(batch.map(isEdit));
		return collect(from + batch.length, [
			...found,
			...batch.filter((_, i) => flags[i]),
		]);
	};
	return collect(0, []);
};
