// Fake programs for tests that put a program on `PATH`.
// POSIX runs a file with a `#!` line. Windows runs a file only with an extension from `PATHEXT`,
// so the program there is a `.cmd` launcher that runs a Node script by its full path (`%~dp0` is empty when `cmd` finds the launcher on `PATH`), as npm installs a command.

import fs from "node:fs";
import path from "node:path";
import type { Env } from "./repo.ts";

/** Writes the program `name` into `dir`. `source` is CommonJS code that runs in Node. Gives the path of the file to run. */
export const writeProgram = async (
  dir: string,
  name: string,
  source: string,
): Promise<string> => {
  if (process.platform !== "win32") {
    const file = path.join(dir, name);
    await Bun.write(file, `#!${process.execPath}\n${source}`);
    fs.chmodSync(file, 0o755);
    return file;
  }
  await Bun.write(path.join(dir, `${name}.cjs`), source);
  const file = path.join(dir, `${name}.cmd`);
  await Bun.write(
    file,
    `@"${process.execPath}" "${path.join(dir, `${name}.cjs`)}" %*\r\n`,
  );
  return file;
};

/** A copy of `env` with `dir` first on the search path. Windows names the variable `Path`, so the key is found without case. */
export const withPathFirst = (env: Env, dir: string): Env => {
  const key =
    Object.keys(env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  return { ...env, [key]: `${dir}${path.delimiter}${env[key] ?? ""}` };
};

const platform = Object.getOwnPropertyDescriptor(
  process,
  "platform",
) as PropertyDescriptor;

/** Runs `fn` with `process.platform` set to `name`, and restores it. */
export const withPlatform = <T>(name: string, fn: () => T): T => {
  Object.defineProperty(process, "platform", { value: name });
  try {
    return fn();
  } finally {
    Object.defineProperty(process, "platform", platform);
  }
};
