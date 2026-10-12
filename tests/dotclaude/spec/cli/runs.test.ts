// `runs`: prints the runs of a wave from the cap of the environment and the usage sample of the status line.

import { expect, test } from "bun:test";
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

test("runs exits with status 1 and prints no count for a corrupt sample", async () => {
  const root = await makeStore({ [RATE_LIMITS_FILE]: "{not json" });
  const r = await withCap("5", () => run(root, "runs"));
  expect(r.code).toBe(1);
  expect(r.out).toStrictEqual([]);
  expect(r.err.length).toBe(1);
});
