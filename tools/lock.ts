#!/usr/bin/env -S bun --no-env-file
// Lets only one eval run of the checkout run at a time.
// Two runs at the same time cost twice, and they write over the logs and results of each other.
//
//   node tools/lock.ts COMMAND [ARGS...]   run the command while the lock is held
//
// The lock is a file in `plugins/dotclaude/evals/results/`, which git ignores.
// It holds the process id and the start time of the run that has it.
// A lock whose process is gone is stale, and the next run takes it.
// When the check of the process fails for any other reason, the lock counts as held,
// because a failed check does not show that the run is gone.

import fs from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dir, "..");
export const LOCK = path.join(
  REPO,
  "plugins/dotclaude/evals/results/.eval.lock",
);

/** True unless the process is certainly gone (`ESRCH`). */
const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code !== "ESRCH";
  }
};

/** Takes the lock, or gives the holder when another live run has it. */
export const takeLock = async (
  file: string,
  pid: number = process.pid,
): Promise<{ release: () => void } | { holder: string }> => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (let i = 0; i < 2; i++) {
    try {
      // `wx` fails with `EEXIST` when the lock is held, which `Bun.write` cannot ask for.
      const fd = fs.openSync(file, "wx");
      try {
        fs.writeSync(fd, `${pid} ${new Date().toISOString()}\n`);
      } finally {
        fs.closeSync(fd);
      }
      return { release: () => fs.rmSync(file, { force: true }) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    const holder = (await Bun.file(file).text()).trim();
    const other = Number.parseInt(holder, 10);
    if (Number.isInteger(other) && isAlive(other)) return { holder };
    fs.rmSync(file, { force: true });
  }
  return { holder: (await Bun.file(file).text()).trim() };
};

if (process.argv[1] === import.meta.path) {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    console.error("Usage: node tools/lock.ts COMMAND [ARGS...]");
    process.exit(2);
  }
  const lock = await takeLock(LOCK);
  if ("holder" in lock) {
    console.error(
      `An eval run is in progress (process and start: ${lock.holder}).\nWait for it to end, and do not start a second run.\nIf no run is in progress, remove ${LOCK}.`,
    );
    process.exit(1);
  }
  let status = 1;
  try {
    status =
      Bun.spawnSync([command, ...args], {
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      }).exitCode ?? 1;
  } finally {
    lock.release();
  }
  process.exit(status);
}
