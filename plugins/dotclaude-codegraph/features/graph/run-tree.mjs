// Runs a command with a time limit and ends the whole process tree at the limit.
// On Windows `codegraph` is a `.cmd` file that runs through `cmd.exe`, and a kill of `cmd.exe` leaves its child alive.
// The child would keep its working folder, and the hook would wait for the pipe that the child holds.
// The hook runs this file as a child process, because `spawnSync` cannot end a tree.

import { spawn, spawnSync } from "node:child_process";

/** Ends the process `pid` and its children with `taskkill`. The arguments are fixed, and no shell reads them. */
export function taskkill(pid, run = spawnSync) {
  return run("taskkill", ["/pid", String(pid), "/T", "/F"], {
    stdio: "ignore",
  });
}

/**
 * Runs `command` with `args`. At `timeout` ms it calls `kill(pid)`, which must end the tree.
 * Gives `{ status, stdout, timedOut, error }`. `status` is null after a timeout.
 */
export function runTree({
  command,
  args,
  cwd,
  env,
  timeout,
  shell = process.platform === "win32",
  kill = taskkill,
}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell,
      cwd,
      env,
      stdio: ["ignore", "pipe", "ignore"],
    });
    let stdout = "";
    let timedOut = false;
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      kill(child.pid);
    }, timeout);
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ status: null, stdout, timedOut, error });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ status: timedOut ? null : code, stdout, timedOut });
    });
  });
}

// Usage: node run-tree.mjs TIMEOUT_MS COMMAND ARGS...
// Prints the output of the command. Exits 124 after a timeout, and 1 when the command cannot start.
if (import.meta.main) {
  const [timeout, command, ...args] = process.argv.slice(2);
  const r = await runTree({
    command,
    args,
    cwd: process.cwd(),
    env: process.env,
    timeout: Number(timeout),
  });
  process.stdout.write(r.stdout);
  process.exit(r.timedOut ? 124 : r.error ? 1 : (r.status ?? 1));
}
