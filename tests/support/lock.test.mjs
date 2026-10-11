// Behavior of the eval lock: one run at a time, a stale lock is taken, and a failed check keeps the lock.
// Each test works in its own folder under `TMPDIR`.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { takeLock } from "../../tools/lock.mjs";

const lockIn = () =>
  path.join(
    fs.mkdtempSync(path.join(process.env.TMPDIR, "lock-")),
    "results/.eval.lock",
  );

test("a free lock is taken, and the release removes it", () => {
  const file = lockIn();
  const lock = takeLock(file, 4242);
  assert.ok("release" in lock);
  assert.match(fs.readFileSync(file, "utf8"), /^4242 /);
  lock.release();
  assert.equal(fs.existsSync(file), false);
});

test("a second run gets the holder while the first run is alive", () => {
  const file = lockIn();
  const first = takeLock(file, process.pid);
  const second = takeLock(file, 4242);
  assert.ok("holder" in second);
  assert.match(second.holder, new RegExp(`^${process.pid} `));
  assert.ok("release" in first);
  first.release();
});

test("a lock whose process is gone is stale, and the next run takes it", () => {
  const file = lockIn();
  const gone = spawnSync(process.execPath, ["-e", "0"]).pid;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${gone} 2026-10-10T00:00:00.000Z\n`);
  const lock = takeLock(file, 4242);
  assert.ok("release" in lock);
  assert.match(fs.readFileSync(file, "utf8"), /^4242 /);
});

test("a lock of another user's live process counts as held", () => {
  // Process 1 is alive, and a signal to it fails with `EPERM`, not `ESRCH`.
  // On Windows the live process of the system is 4.
  const file = lockIn();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const system = process.platform === "win32" ? 4 : 1;
  fs.writeFileSync(file, `${system} 2026-10-10T00:00:00.000Z\n`);
  assert.ok("holder" in takeLock(file, 4242));
});
