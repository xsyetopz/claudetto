// Runs a command with a time limit and ends the whole process tree at the limit.
// On Windows `codegraph` is a `.cmd` file that runs through `cmd.exe`, and a kill of `cmd.exe` leaves its child alive.
// The child would keep its working folder, and the hook would wait for the pipe that the child holds.
// The hook runs this file as a child process, because `spawnSync` cannot end a tree.

/** Runs `command` with `args` and waits. A program that does not start gives `{ error }`, and does not throw. */
export type FixedRun = (
  command: string,
  args: string[],
  options: { stdio: "ignore" },
) => unknown;

const runFixed: FixedRun = (command, args) => {
  try {
    return Bun.spawnSync({
      cmd: [command, ...args],
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
    });
  } catch (error) {
    return { error };
  }
};

/** Ends the process `pid` and its children with `taskkill`. The arguments are fixed, and no shell reads them. */
export function taskkill(pid: number | undefined, run: FixedRun = runFixed) {
  return run("taskkill", ["/pid", String(pid), "/T", "/F"], {
    stdio: "ignore",
  });
}

/**
 * Runs `command` with `args`. At `timeout` ms it calls `kill(pid)`, which must end the tree.
 * Gives `{ status, stdout, timedOut, error }`. `status` is null after a timeout.
 */
export interface RunTreeOptions {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeout: number;
  shell?: boolean;
  kill?: (pid: number | undefined) => unknown;
}

/** The result of `runTree`. */
export interface RunTreeResult {
  status: number | null;
  stdout: string;
  timedOut: boolean;
  error?: Error;
}

export function runTree({
  command,
  args,
  cwd,
  env,
  timeout,
  shell = process.platform === "win32",
  kill = taskkill,
}: RunTreeOptions): Promise<RunTreeResult> {
  // A shell runs the command line as text, as `cmd.exe /d /s /c` does for Node's `shell` option.
  const cmd = shell
    ? [
        process.env["ComSpec"] || "cmd.exe",
        "/d",
        "/s",
        "/c",
        [command, ...args].join(" "),
      ]
    : [command, ...args];
  let child: Bun.Subprocess<"ignore", "pipe", "ignore">;
  try {
    child = Bun.spawn({
      cmd,
      cwd,
      env,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "ignore",
    });
  } catch (error) {
    return Promise.resolve({
      status: null,
      stdout: "",
      timedOut: false,
      error: error as Error,
    });
  }
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    kill(child.pid);
  }, timeout);
  const stdout = new Response(child.stdout).text();
  return child.exited.then(async (code) => {
    clearTimeout(timer);
    return { status: timedOut ? null : code, stdout: await stdout, timedOut };
  });
}

// Usage: node run-tree.ts TIMEOUT_MS COMMAND ARGS...
// Prints the output of the command. Exits 124 after a timeout, and 1 when the command cannot start.
if (import.meta.main) {
  const [timeout, command, ...args] = process.argv.slice(2);
  const r = await runTree({
    // The usage requires a command, so the argument is a string.
    command: command as string,
    args,
    cwd: process.cwd(),
    env: process.env,
    timeout: Number(timeout),
  });
  process.stdout.write(r.stdout);
  process.exit(r.timedOut ? 124 : r.error ? 1 : (r.status ?? 1));
}
