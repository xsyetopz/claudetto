// Behavior of the eval lock: one run at a time, a stale lock is taken, and a failed check keeps the lock.
// Each test works in its own folder under `TMPDIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { takeLock } from "../../tools/lock.ts";

const lockIn = (): string =>
  path.join(
    fs.mkdtempSync(path.join(process.env["TMPDIR"] as string, "lock-")),
    "results/.eval.lock",
  );

test("a free lock is taken, and the release removes it", async () => {
  const file = lockIn();
  const lock = await takeLock(file, 4242);
  expect("release" in lock).toBeTruthy();
  if (!("release" in lock)) throw new Error("the lock has a holder");
  expect(await Bun.file(file).text()).toMatch(/^4242 /);
  lock.release();
  expect(fs.existsSync(file)).toBe(false);
});

test("a second run gets the holder while the first run is alive", async () => {
  const file = lockIn();
  const first = await takeLock(file, process.pid);
  const second = await takeLock(file, 4242);
  expect("holder" in second).toBeTruthy();
  if (!("holder" in second)) throw new Error("the second run took the lock");
  expect(second.holder).toMatch(new RegExp(`^${process.pid} `));
  expect("release" in first).toBeTruthy();
  if (!("release" in first)) throw new Error("the first run got a holder");
  first.release();
});

test("a lock whose process is gone is stale, and the next run takes it", async () => {
  const file = lockIn();
  const gone = Bun.spawnSync([process.execPath, "-e", "0"]).pid;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await Bun.write(file, `${gone} 2026-10-10T00:00:00.000Z\n`);
  const lock = await takeLock(file, 4242);
  expect("release" in lock).toBeTruthy();
  if (!("release" in lock)) throw new Error("the lock has a holder");
  expect(await Bun.file(file).text()).toMatch(/^4242 /);
});

test("a lock of another user's live process counts as held", async () => {
  // Process 1 is alive, and a signal to it fails with `EPERM`, not `ESRCH`.
  // On Windows the live process of the system is 4.
  const file = lockIn();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const system = process.platform === "win32" ? 4 : 1;
  await Bun.write(file, `${system} 2026-10-10T00:00:00.000Z\n`);
  expect("holder" in (await takeLock(file, 4242))).toBeTruthy();
});
