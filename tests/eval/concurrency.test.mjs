// The runs of a suite at the same time: the bound, the order of the records, and the cost limit.

import { expect, test } from "bun:test";
import { loadCases } from "../../tools/eval/cases.mjs";
import { runSuite } from "../../tools/eval/suite.mjs";
import { done, EVALS, hostExec, init, plugin } from "./support.mjs";

const cases = loadCases(EVALS, ["bugfix-range"]);
const base = {
  model: "m",
  exec: hostExec,
  expectedVersion: "2.1.295",
  arms: ["dotclaude", "vanilla"],
};

/** A fake runner that counts the runs in progress and ends each run after `ms`. */
function countingRunner(ms, cost = 0.1) {
  const seen = { now: 0, most: 0 };
  const runner = async () => {
    seen.now++;
    seen.most = Math.max(seen.most, seen.now);
    await new Promise((r) => setTimeout(r, ms));
    seen.now--;
    return { events: [init(plugin), done("x", cost)], timedOut: false };
  };
  return { runner, seen };
}

test("`concurrency` bounds the runs in progress", async () => {
  const { runner, seen } = countingRunner(20);
  const r = await runSuite(cases, {
    ...base,
    runs: 3,
    limit: 99,
    concurrency: 4,
    runner,
  });
  expect(r.runs).toHaveLength(6);
  expect(seen.most).toBe(4);
});

test("no `concurrency` runs one run at a time", async () => {
  const { runner, seen } = countingRunner(5);
  await runSuite(cases, { ...base, runs: 2, limit: 99, runner });
  expect(seen.most).toBe(1);
});

test("the records keep the order of the jobs when later runs end first", async () => {
  let n = 0;
  const runner = async () => {
    const wait = 40 - 10 * n++;
    await new Promise((r) => setTimeout(r, wait));
    return { events: [init(plugin), done("x", 0.1)], timedOut: false };
  };
  const r = await runSuite(cases, {
    ...base,
    runs: 2,
    limit: 99,
    concurrency: 4,
    runner,
  });
  expect(r.runs.map((x) => [x.arm, x.run])).toEqual([
    ["dotclaude", 0],
    ["vanilla", 0],
    ["dotclaude", 1],
    ["vanilla", 1],
  ]);
});

test("the cost limit stops new runs, and the runs in progress end", async () => {
  const { runner } = countingRunner(10, 1);
  const r = await runSuite(cases, {
    ...base,
    runs: 5,
    limit: 1,
    concurrency: 2,
    runner,
  });
  expect(r.stopped).toBe("limit");
  expect(r.runs).toHaveLength(2);
  expect(r.report.meta.spent).toBe(2);
});
