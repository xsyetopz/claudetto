// Runs a program that npm or the installer put on `PATH`, on every platform.
// Bun has no `shell` option, so the Windows branch runs `ComSpec` with `/d /s /c`, which is what Node does for `shell: true`.

/** The options of `runProgram`: the `Bun.spawnSync` options, and the Node name `stdio`. */
export type RunOptions = Omit<
  NonNullable<Parameters<typeof Bun.spawnSync>[1]>,
  "stdio"
> & {
  stdio?: "inherit" | "pipe" | "ignore";
};

/** The result of a run, which `Bun.spawnSync` gives. */
export type RunResult = ReturnType<typeof Bun.spawnSync>;

/** A function that runs `file` with `args`, such as `spawnSyncOrNull`. */
export type Spawn = (
  file: string,
  args: string[],
  options?: RunOptions,
) => RunResult | null;

/**
 * Runs the program `file` with `args` through `Bun.spawnSync`, and gives `null` when `file` is absent.
 * `Bun.spawnSync` throws an `ENOENT` error for a missing program, where Node gave a result with no status.
 * The `null` keeps the old outcome, so a caller that reads `?.exitCode` gets `undefined` as before.
 */
export function spawnSyncOrNull(
  file: string,
  args: string[],
  options: RunOptions = {},
): RunResult | null {
  // Bun takes `stdin`, `stdout`, and `stderr` in place of Node's `stdio`.
  const { stdio, ...rest } = options;
  const io =
    stdio === undefined ? {} : { stdin: stdio, stdout: stdio, stderr: stdio };
  try {
    return Bun.spawnSync([file, ...args], { ...rest, ...io });
  } catch (err) {
    if ((err as { code?: string } | null | undefined)?.code === "ENOENT")
      return null;
    throw err;
  }
}

/** Why a shell cannot take `word` as one safe word on Windows, or `undefined` when it can. */
export function refusal(word: string): string | undefined {
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
 * Runs the program `file` with `args` and gives the result of `spawn`, which is `spawnSyncOrNull` unless a test sets it.
 * On Windows, npm installs a command such as `claude` as a `.cmd` file, and a `.cmd` file runs only through a shell.
 * That path quotes each word, and it throws an `Error` that names the word and the reason when `refusal` finds one,
 * because quotes do not stop `cmd.exe` from reading `%` and `!` in a word.
 * A `file` with no folder is found by the shell on `PATH` with each extension of `PATHEXT`.
 * An `.exe` file and any other platform run with no shell and no check.
 */
export function runProgram(
  file: string,
  args: string[],
  options: RunOptions,
  spawn: Spawn = spawnSyncOrNull,
): RunResult | null {
  if (process.platform !== "win32" || /\.exe$/i.test(file))
    return spawn(file, args, options);
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
    process.env["ComSpec"] || "cmd.exe",
    ["/d", "/s", "/c", `"${words}"`],
    { ...options, windowsVerbatimArguments: true },
  );
}
