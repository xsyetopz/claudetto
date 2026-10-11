#!/usr/bin/env node
// Lets only one eval run of the checkout run at a time.
// Two runs at the same time cost twice, and they write over the logs and results of each other.
//
//   node tools/lock.mjs COMMAND [ARGS...]   run the command while the lock is held
//
// The lock is a file in `plugins/dotclaude/evals/results/`, which git ignores.
// It holds the process id and the start time of the run that has it.
// A lock whose process is gone is stale, and the next run takes it.
// When the check of the process fails for any other reason, the lock counts as held,
// because a failed check does not show that the run is gone.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const LOCK = path.join(
  REPO,
  "plugins/dotclaude/evals/results/.eval.lock",
);

/**
 * True unless the process is certainly gone (`ESRCH`).
 *
 * @param {number} pid
 */
function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return /** @type {NodeJS.ErrnoException} */ (e).code !== "ESRCH";
  }
}

/**
 * Takes the lock, or gives the holder when another live run has it.
 *
 * @param {string} file
 * @param {number} pid
 * @returns {{ release: () => void } | { holder: string }}
 */
export function takeLock(file, pid = process.pid) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (let i = 0; i < 2; i++) {
    try {
      fs.writeFileSync(file, `${pid} ${new Date().toISOString()}\n`, {
        flag: "wx",
      });
      return { release: () => fs.rmSync(file, { force: true }) };
    } catch (e) {
      if (/** @type {NodeJS.ErrnoException} */ (e).code !== "EEXIST") throw e;
    }
    const holder = fs.readFileSync(file, "utf8").trim();
    const other = Number.parseInt(holder, 10);
    if (Number.isInteger(other) && isAlive(other)) return { holder };
    fs.rmSync(file, { force: true });
  }
  return { holder: fs.readFileSync(file, "utf8").trim() };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    console.error("Usage: node tools/lock.mjs COMMAND [ARGS...]");
    process.exit(2);
  }
  const lock = takeLock(LOCK);
  if ("holder" in lock) {
    console.error(
      `An eval run is in progress (process and start: ${lock.holder}).\nWait for it to end, and do not start a second run.\nIf no run is in progress, remove ${LOCK}.`,
    );
    process.exit(1);
  }
  let status = 1;
  try {
    status = spawnSync(command, args, { stdio: "inherit" }).status ?? 1;
  } finally {
    lock.release();
  }
  process.exit(status);
}
