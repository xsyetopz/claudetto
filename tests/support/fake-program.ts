// Fake programs for tests that put a program on `PATH`.
// A program is a file with a `#!` line.

import fs from "node:fs";
import path from "node:path";
import type { Env } from "./repo.ts";

/** Writes the program `name` into `dir`. `source` is CommonJS code that runs in Node. Gives the path of the file to run. */
export const writeProgram = async (
  dir: string,
  name: string,
  source: string,
): Promise<string> => {
  const file = path.join(dir, name);
  await Bun.write(file, `#!${process.execPath}\n${source}`);
  fs.chmodSync(file, 0o755);
  return file;
};

/** A copy of `env` with `dir` first on the search path. */
export const withPathFirst = (env: Env, dir: string): Env => {
  return { ...env, PATH: `${dir}${path.delimiter}${env["PATH"] ?? ""}` };
};
