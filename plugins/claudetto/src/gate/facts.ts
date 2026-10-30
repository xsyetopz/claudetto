// The facts of the session for the gate: the folders, the temp folders, and the lazy `git`, env-file, and ledger reads.

import { userEdits } from "../project/edits.ts";
import { projectRoot } from "../project/session.ts";
import { tempDirs } from "../project/tmp.ts";
import { type ConfigIo, gitConfigOf } from "./alias-facts.ts";
import { hasEnvFile, type ScanIo } from "./env-scan.ts";
import type { Facts } from "./gate.ts";
import { GIT_TIMEOUT_MS } from "./limits.ts";
import { gitState } from "./tree-state.ts";

/** The temp folders for each pair of env values, kept for the life of the mod, so each call after the first makes no `stat`. */
const temps = new Map<string, Promise<string[]>>();
const TRAILING_SLASHES = /\/+$/;

/** The values of the environment and the session that the facts read. `mod.ts` reads them with `$.env.get` and a literal name. */
export interface FactsEnv {
	cwd: string;
	home: string | undefined;
	tmp: string | undefined;
	claudeTmp: string | undefined;
	xdg: string | undefined;
}

/** What the facts read later, each on demand. `mod.ts` builds it from `$`. */
export interface FactsIo extends ConfigIo, ScanIo {
	exists: (path: string) => Promise<boolean>;
	/** The real path of `path`, or `undefined` when `stat` cannot resolve it. */
	realPath: (path: string) => Promise<string | undefined>;
	projectDir: () => Promise<string | undefined>;
	/** The stored value of the ledger key. */
	ledger: (key: string) => Promise<unknown>;
	root: () => Promise<string>;
}

/** The temp folders of the pair of env values, each with its real path when `stat` can resolve it. */
const tempsOf = async (
	io: FactsIo,
	tmp: string | undefined,
	claudeTmp: string | undefined,
): Promise<string[]> => {
	const pairs = await tempDirs(
		{ TMPDIR: tmp, CLAUDE_CODE_TMPDIR: claudeTmp },
		async (path) => (await io.realPath(path)) ?? path,
	);
	return pairs.flat();
};

/** Builds the `Facts` of one call from the environment values and the I/O. Every fact is read on demand, except the temp folders, which `temps` caches by the pair of env values; an unset `home` becomes `/nonexistent` and an unset `tmp` becomes `/tmp`. */
export const factsFrom = async (
	{ cwd, home, tmp, claudeTmp, xdg }: FactsEnv,
	io: FactsIo,
): Promise<Facts> => {
	const key = `${tmp}\0${claudeTmp}`;
	const dirs = temps.get(key) ?? tempsOf(io, tmp, claudeTmp);
	temps.set(key, dirs);
	return {
		cwd,
		gitConfig: () => gitConfigOf(io, cwd, home ?? "/nonexistent", xdg),
		hasEnvFile: async () =>
			hasEnvFile(
				io,
				(
					await projectRoot({
						dir: io.projectDir,
						root: io.root,
					})
				).replace(TRAILING_SLASHES, "") || cwd,
				cwd,
				(home ?? "/nonexistent").replace(TRAILING_SLASHES, ""),
			),
		home: home ?? "/nonexistent",
		tmp: (tmp ?? "/tmp").replace(TRAILING_SLASHES, ""),
		temps: await dirs,
		git: gitState(io.run),
		userEdits: (dir) =>
			userEdits({
				git: (args) => io.run(["git", "-C", dir, ...args], GIT_TIMEOUT_MS),
				read: io.read,
				ledger: io.ledger,
				root: io.root,
			}),
	};
};
