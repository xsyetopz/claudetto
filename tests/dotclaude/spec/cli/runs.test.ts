// `runs`: prints the runs of a wave from the cap of the environment and the usage sample of the status line.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { RATE_LIMITS_FILE } from "../../../../src/kernel/paths.ts";
import { makeStore, run, TODAY } from "./helpers.ts";

const CAP = "CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS";
const NOW = Date.parse(`${TODAY}T10:00:00.000Z`);

/** Runs `fn` with the cap `value` in the environment, and restores the environment after it. */
const withCap = async <T>(value: string, fn: () => Promise<T>): Promise<T> => {
  const before = process.env[CAP];
  process.env[CAP] = value;
  try {
    return await fn();
  } finally {
    if (before === undefined) Reflect.deleteProperty(process.env, CAP);
    else process.env[CAP] = before;
  }
};

/** A usage sample that was read `ageMs` before `NOW`, with the 5h window at `used` percent. */
const sample = (ageMs: number, used: number): string =>
  JSON.stringify({
    savedAt: NOW - ageMs,
    rate_limits: { five_hour: { used_percentage: used } },
  });

test("runs prints the cap when the status line has kept no sample", async () => {
  const root = await makeStore();
  const r = await withCap("5", () => run(root, "runs"));
  expect(r.code).toBe(0);
  expect(r.out).toStrictEqual(["5"]);
  expect(r.err).toStrictEqual([]);
});

test("runs prints the runs that a fresh sample allows under the cap", async () => {
  const root = await makeStore({
    [RATE_LIMITS_FILE]: sample(60_000, 50),
  });
  const r = await withCap("5", () => run(root, "runs"));
  expect(r.code).toBe(0);
  expect(r.out).toStrictEqual(["2"]);
});

test("runs prints one run for a stale sample", async () => {
  const root = await makeStore({
    [RATE_LIMITS_FILE]: sample(11 * 60_000, 0),
  });
  const r = await withCap("5", () => run(root, "runs"));
  expect(r.code).toBe(0);
  expect(r.out).toStrictEqual(["1"]);
});

test("runs prints one run and exits 0 for a corrupt sample", async () => {
  const root = await makeStore({ [RATE_LIMITS_FILE]: "{not json" });
  const r = await withCap("5", () => run(root, "runs"));
  expect(r.code).toBe(0);
  expect(r.out).toStrictEqual(["1"]);
  expect(r.err).toStrictEqual([]);
});

test("runs prints one run and exits 0 for an unreadable sample", async () => {
  const root = await makeStore();
  fs.mkdirSync(path.join(root, RATE_LIMITS_FILE), { recursive: true });
  const r = await withCap("5", () => run(root, "runs"));
  expect(r.code).toBe(0);
  expect(r.out).toStrictEqual(["1"]);
  expect(r.err).toStrictEqual([]);
});

test("runs prints one run for 81 percent used, and the reset time with a count of 0", async () => {
  const root = await makeStore({ [RATE_LIMITS_FILE]: sample(60_000, 81) });
  const low = await withCap("5", () => run(root, "runs"));
  expect(low.out).toStrictEqual(["1"]);

  const resets = NOW / 1000 + 3600;
  const full = await makeStore({
    [RATE_LIMITS_FILE]: JSON.stringify({
      savedAt: NOW,
      rate_limits: {
        five_hour: { used_percentage: 100, resets_at: resets },
      },
    }),
  });
  const none = await withCap("5", () => run(full, "runs"));
  expect(none.code).toBe(0);
  expect(none.out).toStrictEqual(["0", "2026-10-12T11:00:00.000Z"]);
});

test("runs reads the sample of the project root from a subfolder", async () => {
  const root = await makeStore({ [RATE_LIMITS_FILE]: sample(60_000, 50) });
  Bun.spawnSync(["git", "init", "-q"], { cwd: root });
  const sub = path.join(root, "packages", "app");
  fs.mkdirSync(sub, { recursive: true });
  const r = await withCap("5", () => run(sub, "runs"));
  expect(r.code).toBe(0);
  expect(r.out).toStrictEqual(["2"]);
});
