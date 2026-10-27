// Fake programs for tests that put a program on `PATH`.
// A program is a file with a `#!` line.

import { chmod } from "node:fs/promises";
import path from "node:path";
import { write } from "bun";
import type { Env } from "./repo.ts";

/** Writes the program `name` into `dir`. `source` is CommonJS code that runs in Node. Gives the path of the file to run. */
export const writeProgram = async (
	dir: string,
	name: string,
	source: string,
): Promise<string> => {
	const file = path.join(dir, name);
	await write(file, `#!${process.execPath}\n${source}`);
	await chmod(file, 0o755);
	return file;
};

/** A copy of `env` with `dir` first on the search path. */
export const withPathFirst = (env: Env, dir: string): Env => ({
	...env,
	PATH: `${dir}${path.delimiter}${env["PATH"] ?? ""}`,
});
