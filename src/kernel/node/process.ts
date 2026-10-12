// Runs a program that npm or an installer put on `PATH`, on every platform.

import type { ProcessOptions, ProcessRunner } from "../ports.ts";

/** The options of `runProgram` that its callers give to `Bun.spawnSync`. */
export type ProgramOptions = {
  cwd?: string;
  timeout?: number;
  stdin?: "ignore" | "pipe" | "inherit";
  stdout?: "pipe" | "ignore" | "inherit";
  stderr?: "pipe" | "ignore" | "inherit";
};

/** Why a shell cannot take `word` as one safe word on Windows, or `undefined` when it can. */
export const refusal = (word: string): string | undefined => {
  if (/[%!]/.test(word))
    return "it has `%` or `!`, which `cmd.exe` expands before it reads quotes";
  if (word.includes('"')) return 'it has a `"`, which ends the quote';
  if (/[\r\n\0]/.test(word))
    return "it has a line break or a NUL, which cuts the command line";
  if (word.endsWith("\\"))
    return "it ends in `\\`, which joins it to the next word";
  return undefined;
};

/**
 * Runs the program `file` with `args` and gives the result of `spawn`, which is `Bun.spawnSync` unless a test sets it.
 * On Windows, npm installs a command such as `claude` as a `.cmd` file, and Node runs a `.cmd` file only through a shell.
 * That path quotes each word, and it throws an `Error` that names the word and the reason when `refusal` finds one,
 * because quotes do not stop `cmd.exe` from reading `%` and `!` in a word.
 * A `file` with no folder is found by the shell on `PATH` with each extension of `PATHEXT`.
 * An `.exe` file and any other platform run with no shell and no check.
 * `Bun.spawnSync` throws when `file` is missing, so a caller catches that error to treat the program as not found.
 */
export const runProgram = (
  file: string,
  args: string[],
  options: ProgramOptions,
  spawn = Bun.spawnSync,
) => {
  if (process.platform !== "win32" || /\.exe$/i.test(file))
    return spawn([file, ...args], options);
  for (const word of [file, ...args]) {
    const why = refusal(word);
    if (why)
      throw new Error(
        `Cannot run ${file} through a shell: the word ${JSON.stringify(word)} is refused, because ${why}.`,
      );
  }
  // Node wraps the line in one pair of quotes for `cmd.exe /s`, and passes it without escaping.
  // Bun escapes each `"` as `\"`, which `cmd.exe` does not read, so the name arrives with a backslash.
  const words = [file, ...args].map((word) => `"${word}"`).join(" ");
  return spawn(
    [Bun.env["ComSpec"] ?? "cmd.exe", "/d", "/s", "/c", `"${words}"`],
    { ...options, windowsVerbatimArguments: true },
  );
};

/** The `ProcessRunner` of Bun: it reads the output as text and gives a null exit code for a signal. */
export const processRunner: ProcessRunner = {
  run: (
    file: string,
    args: readonly string[],
    options: ProcessOptions = {},
  ) => {
    const result = runProgram(file, [...args], {
      ...options,
      stdout: "pipe",
      stderr: "pipe",
    });
    return {
      exitCode: result.exitCode,
      stdout: result.stdout?.toString() ?? "",
      stderr: result.stderr?.toString() ?? "",
    };
  },
};
