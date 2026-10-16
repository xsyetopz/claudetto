// Behavior of the eval lock: one run at a time, a stale lock is taken, and a failed check keeps the lock.
// Each test works in its own folder under `TMPDIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { pidsOf, takeLock } from "../../tools/lock.ts";
import { REPO } from "../support/repo.ts";

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
  await lock.release();
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
  await first.release();
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

test("two runs that find a stale lock at the same time give one owner (review row 122)", async () => {
  const file = lockIn();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const gone = Bun.spawnSync([process.execPath, "-e", "0"]).pid;
  await Bun.write(file, `${gone} 2026-10-10T00:00:00.000Z\n`);
  // Both process ids are alive, so the lock of the first run is not stale for the second run.
  const [a, b] = await Promise.all([
    takeLock(file, process.pid),
    takeLock(file, process.ppid),
  ]);
  expect(["release" in a, "release" in b].filter(Boolean)).toHaveLength(1);
  const run = `import { takeLock } from ${JSON.stringify(path.join(REPO, "tools/lock.ts"))};
const lock = await takeLock(${JSON.stringify(file)});
console.log("release" in lock ? "owner" : "holder");
if ("release" in lock) { await Bun.sleep(1000); await lock.release(); }`;
  await Bun.write(file, `${gone} 2026-10-10T00:00:00.000Z\n`);
  const runs = Array.from({ length: 6 }, () =>
    Bun.spawn([process.execPath, "-e", run], { stdout: "pipe" }),
  );
  const outs = await Promise.all(
    runs.map(async (r) => (await new Response(r.stdout).text()).trim()),
  );
  expect(outs.filter((out) => out === "owner")).toHaveLength(1);
});

test("a release removes only the lock of its own run (review row 122)", async () => {
  const file = lockIn();
  const first = await takeLock(file, 111);
  if (!("release" in first)) throw new Error("the lock has a holder");
  await Bun.write(file, `${process.pid} 2026-10-10T00:00:00.000Z\n`);
  await first.release();
  expect(fs.existsSync(file)).toBe(true);
});

test("the lock holds while the command of a stopped run lives (review row 123)", async () => {
  const file = lockIn();
  const run = `import { runLocked } from ${JSON.stringify(path.join(REPO, "tools/lock.ts"))};
process.exit(await runLocked(${JSON.stringify(file)}, [process.execPath, "-e", "await Bun.sleep(30000)"]));`;
  const wrapper = Bun.spawn([process.execPath, "-e", run]);
  let text = "";
  for (let i = 0; i < 100 && pidsOf(text).length < 2; i++) {
    await Bun.sleep(50);
    text = fs.existsSync(file) ? await Bun.file(file).text() : "";
  }
  const [, child] = pidsOf(text);
  if (child === undefined)
    throw new Error(`the lock names no command: ${text}`);
  try {
    wrapper.kill("SIGTERM");
    await wrapper.exited;
    expect("holder" in (await takeLock(file, 4242))).toBeTruthy();
  } finally {
    process.kill(child, "SIGTERM");
  }
});
