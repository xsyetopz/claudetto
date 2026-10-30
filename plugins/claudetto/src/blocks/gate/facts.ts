import { type ConfigIo, gitConfigOf } from "./alias-facts.ts";
import { hasEnvFile, type ScanIo } from "./env-scan.ts";
import type { Facts } from "./gate.ts";
import { GIT_TIMEOUT_MS } from "./limits.ts";
import { userEdits } from "./project/edits.ts";
import { projectRoot } from "./project/session.ts";
import { tempDirs } from "./project/tmp.ts";
import { gitState } from "./tree-state.ts";

const temps = new Map<string, Promise<string[]>>();
const TRAILING_SLASHES = /\/+$/;

export interface FactsEnv {
	cwd: string;
	home: string | undefined;
	tmp: string | undefined;
	claudeTmp: string | undefined;
	xdg: string | undefined;
}

export interface FactsIo extends ConfigIo, ScanIo {
	exists: (path: string) => Promise<boolean>;
	realPath: (path: string) => Promise<string | undefined>;
	projectDir: () => Promise<string | undefined>;
	ledger: (key: string) => Promise<unknown>;
	root: () => Promise<string>;
}

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
