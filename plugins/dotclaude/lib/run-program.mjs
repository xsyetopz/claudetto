// Runs a program that npm or an installer put on `PATH`, on every platform.

import { spawnSync } from "node:child_process";

/** Why a shell cannot take `word` as one safe word on Windows, or `undefined` when it can. */
export function refusal(word) {
  if (/[%!]/.test(word))
    return "it has `%` or `!`, which `cmd.exe` expands before it reads quotes";
  if (word.includes('"')) return 'it has a `"`, which ends the quote';
  if (/[\r\n\0]/.test(word))
    return "it has a line break or a NUL, which cuts the command line";
  if (word.endsWith("\\"))
    return "it ends in `\\`, which joins it to the next word";
  return undefined;
}

/**
 * Runs the program `file` with `args` and gives the result of `spawn`, which is `spawnSync` unless a test sets it.
 * On Windows, npm installs a command such as `claude` as a `.cmd` file, and Node runs a `.cmd` file only through a shell.
 * That path quotes each word, and it throws an `Error` that names the word and the reason when `refusal` finds one,
 * because quotes do not stop `cmd.exe` from reading `%` and `!` in a word.
 * A `file` with no folder is found by the shell on `PATH` with each extension of `PATHEXT`.
 * An `.exe` file and any other platform run with no shell and no check.
 */
export function runProgram(file, args, options, spawn = spawnSync) {
  if (process.platform !== "win32" || /\.exe$/i.test(file))
    return spawn(file, args, options);
  for (const word of [file, ...args]) {
    const why = refusal(word);
    if (why)
      throw new Error(
        `Cannot run ${file} through a shell: the word ${JSON.stringify(word)} is refused, because ${why}.`,
      );
  }
  return spawn([file, ...args].map((word) => `"${word}"`).join(" "), {
    ...options,
    shell: true,
  });
}
