// The ports of the kernel: each interface that a CLI or a test replaces with an adapter or a fake.
// The adapters of the runtimes are in `src/kernel/node/`, and the domain code imports only these interfaces.

/** The options of a process run. */
export interface ProcessOptions {
  readonly cwd?: string;
  readonly timeout?: number;
}

/** The result of a process run, with the output as text. */
export interface ProcessResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * Reads files and folders. A missing file gives `null`, and a missing folder gives an empty list.
 * Each read is async, because the mod runtime reads files only async (`$.fs.read`).
 */
export interface FileReader {
  read(file: string): Promise<string | null>;
  list(dir: string): Promise<string[]>;
}

/** The current time, in milliseconds since the Unix epoch. */
export interface Clock {
  now(): number;
}

/** Runs a program with its arguments, and gives its exit code and output. */
export interface ProcessRunner {
  run(
    file: string,
    args: readonly string[],
    options?: ProcessOptions,
  ): ProcessResult;
}

/** Reads the environment variables. An unset variable gives `undefined`. */
export interface Env {
  get(name: string): string | undefined;
}
