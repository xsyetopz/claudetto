// The shared parts of the scripts that the `just` recipes run in place of shell-only syntax.
// Each script runs its commands with `Bun.$` in the repository folder.
// So the same recipe runs on Linux and macOS.

import { access, readdir } from "node:fs/promises";
import path from "node:path";
import type { $ } from "bun";

/** A command of `Bun.$` that has not run yet. */
type Command = ReturnType<typeof $>;

/** The root folder of the repository. */
export const REPO = path.resolve(import.meta.dir, "..");

/** Each folder of `plugins/`, relative to the repository and sorted, as the `plugins/*` glob of a shell gives them. */
export const pluginDirs = async (): Promise<string[]> => {
	const entries = await readdir(path.join(REPO, "plugins"), {
		withFileTypes: true,
	});
	return entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join("plugins", entry.name))
		.sort();
};

/** True when the folder `dir` of the repository has the entry `parts`. */
const has = async (dir: string, ...parts: string[]): Promise<boolean> => {
	try {
		await access(path.join(REPO, dir, ...parts));
		return true;
	} catch {
		return false;
	}
};

/** Each folder of `pluginDirs` that has the entry `parts`. */
export const pluginDirsWith = async (...parts: string[]): Promise<string[]> => {
	const dirs = await pluginDirs();
	const found = await Promise.all(dirs.map((dir) => has(dir, ...parts)));
	return dirs.filter((_, i) => found[i]);
};

/** A failed command: the script ends with its exit code after each `finally` block runs. */
class CommandFailed extends Error {
	readonly code: number;
	constructor(code: number) {
		super(`A command failed with exit code ${code}.`);
		this.code = code;
	}
}

/** Ends the script with the exit code `code`, after each `finally` block runs. */
export const fail = (code: number): never => {
	throw new CommandFailed(code);
};

/** Runs `command` in the repository folder, and gives its output. A failure ends the script with the exit code of the command. */
export const must = async (command: Command) => {
	const out = await command.cwd(REPO).nothrow();
	if (out.exitCode !== 0) {
		throw new CommandFailed(out.exitCode);
	}
	return out;
};

/** Runs `command` in the repository folder with no output on the terminal, and gives its standard output. A failure prints the output of the command and ends the script with its exit code. */
export const output = async (command: Command): Promise<string> => {
	const out = await command.cwd(REPO).quiet().nothrow();
	if (out.exitCode !== 0) {
		process.stderr.write(out.stdout);
		process.stderr.write(out.stderr);
		throw new CommandFailed(out.exitCode);
	}
	return out.stdout.toString();
};

/** Runs the body of a script, and exits with the code of a failed command. */
export const recipe = async (body: () => Promise<void>): Promise<void> => {
	try {
		await body();
	} catch (err) {
		if (!(err instanceof CommandFailed)) {
			throw err;
		}
		process.exitCode = err.code;
	}
};
