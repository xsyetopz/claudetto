// The ports of the kernel: each interface that a CLI or a test replaces with an adapter or a fake.

export interface ProcessOptions {
  readonly cwd?: string;
  readonly timeout?: number;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

interface ProcessResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly signal?: string;
  readonly timedOut?: boolean;
}

/** A missing file gives `null`, and a missing folder gives an empty list. Any other error rejects. Async, as `$.fs.read` is. */
export interface FileReader {
  read(file: string): Promise<string | null>;
  list(dir: string): Promise<string[]>;
}

export interface ProcessRunner {
  run(
    file: string,
    args: readonly string[],
    options?: ProcessOptions,
  ): ProcessResult;
}
