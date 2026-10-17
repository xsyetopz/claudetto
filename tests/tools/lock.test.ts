// Behavior of the eval lock: one run at a time, a stale lock is taken, and a failed check keeps the lock.
// Each test works in its own folder under `TMPDIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  HELD_CODE,
  LOCKS,
  pidsOf,
  runLocked,
  TOOL_ERROR_CODE,
  takeLock,
} from "../../tools/lock.ts";
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
  const file = lockIn();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await Bun.write(file, `1 2026-10-10T00:00:00.000Z\n`);
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

test("the lock file holds the PID and the owner, and a second run sees both (I17)", async () => {
  const file = lockIn();
  const first = await takeLock(file, process.pid, "check");
  if (!("release" in first)) throw new Error("the lock has a holder");
  const text = await Bun.file(file).text();
  expect(text).toMatch(new RegExp(`^${process.pid} \\S+ check\n$`));
  const second = await takeLock(file, 4242, "eval");
  if (!("holder" in second)) throw new Error("the second run took the lock");
  expect(second.holder).toMatch(/ check$/);
  await first.release();
});

test("the locks of `eval` and `check` are two files", () => {
  expect(Object.keys(LOCKS).sort()).toStrictEqual(["check", "eval"]);
  expect(LOCKS["check"]).not.toBe(LOCKS["eval"]);
});

test("a run that finds the lock held exits with `HELD_CODE`, and the command does not run", async () => {
  const file = lockIn();
  const first = await takeLock(file, process.pid, "check");
  if (!("release" in first)) throw new Error("the lock has a holder");
  const mark = `${file}.ran`;
  const code = await runLocked(file, ["touch", mark], "check");
  expect(code).toBe(HELD_CODE);
  expect(fs.existsSync(mark)).toBe(false);
  await first.release();
});

test("a command that cannot start is a tool error, not a result, and the lock is freed", async () => {
  const file = lockIn();
  const code = await runLocked(file, ["/no/such/command-claudetto"], "check");
  expect(code).toBe(TOOL_ERROR_CODE);
  expect(fs.existsSync(file)).toBe(false);
});

test("a command that fails keeps its own exit code", async () => {
  const code = await runLocked(
    lockIn(),
    [process.execPath, "-e", "process.exit(3)"],
    "check",
  );
  expect(code).toBe(3);
});
