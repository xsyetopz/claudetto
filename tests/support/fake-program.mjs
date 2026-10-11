// Fake programs for tests that put a program on `PATH`.
// POSIX runs a file with a `#!` line. Windows runs a file only with an extension from `PATHEXT`,
// so the program there is a `.cmd` launcher that runs a Node script, as npm installs a command.

import fs from "node:fs";
import path from "node:path";

/** Writes the program `name` into `dir`. `source` is CommonJS code that runs in Node. Gives the path of the file to run. */
export function writeProgram(dir, name, source) {
  if (process.platform !== "win32") {
    const file = path.join(dir, name);
    fs.writeFileSync(file, `#!${process.execPath}\n${source}`, {
      mode: 0o755,
    });
    return file;
  }
  fs.writeFileSync(path.join(dir, `${name}.cjs`), source);
  const file = path.join(dir, `${name}.cmd`);
  fs.writeFileSync(file, `@"${process.execPath}" "%~dp0${name}.cjs" %*\r\n`);
  return file;
}

/** A copy of `env` with `dir` first on the search path. Windows names the variable `Path`, so the key is found without case. */
export function withPathFirst(env, dir) {
  const key =
    Object.keys(env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  return { ...env, [key]: `${dir}${path.delimiter}${env[key] ?? ""}` };
}
