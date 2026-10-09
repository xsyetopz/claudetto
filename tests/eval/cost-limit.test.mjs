// The cost limit of the eval harness: the container stops on a timeout,
// a timed-out run is charged, and one budget covers a whole call.

import { expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { loadCases } from "../../tools/eval/cases.mjs";
import { dockerRunner } from "../../tools/eval/container.mjs";
import { runSuite } from "../../tools/eval/suite.mjs";
import { EVAL_TIMEOUT_CHARGE_USD } from "../../tools/limits.mjs";
import { done, EVALS, hostExec, init, plugin, say } from "./support.mjs";

/** A fake `spawn`: it records each call and returns a child that closes when it is killed. */
function fakeSpawn() {
  const calls = [];
  const children = [];
  const spawn = (cmd, args) => {
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.kill = () => child.emit("close", null);
    calls.push({ cmd, args });
    children.push(child);
    return child;
  };
  return { spawn, calls, children };
}

const job = {
  workDir: "/w",
  configDir: "/c",
  hookScript: "",
  rules: {},
  settings: {},
  claims: [],
  prompt: "p",
  plan: { env: {}, setup: [], args: [] },
};
const cfg = (spawn, timeoutS) => ({
  image: "img",
  pluginsDir: "/p",
  secrets: { CLAUDE_CODE_OAUTH_TOKEN: "t" },
  spawn,
  timeoutS,
});

test("a timeout kills the container by name, not only the docker client", async () => {
  const f = fakeSpawn();
  const out = await dockerRunner(cfg(f.spawn, 0.01))(job);
  expect(out.timedOut).toBe(true);
  const run = f.calls[0].args;
  const name = run[run.indexOf("--name") + 1];
  expect(name).toMatch(/^dotclaude-eval-/);
  expect(run).toContain("--rm");
  expect(f.calls[1]).toEqual({ cmd: "docker", args: ["kill", name] });
});

test("a run that ends in time sends no kill", async () => {
  const f = fakeSpawn();
  const p = dockerRunner(cfg(f.spawn, 60))(job);
  f.children[0].emit("close", 0);
  expect((await p).timedOut).toBe(false);
  expect(f.calls).toHaveLength(1);
});

test("a multibyte character split across two pieces is read whole", async () => {
  const f = fakeSpawn();
  const p = dockerRunner(cfg(f.spawn, 60))(job);
  const line = Buffer.from(`${JSON.stringify(say("café"))}\n`);
  const cut = line.indexOf(0xc3) + 1;
  f.children[0].stdout.write(line.subarray(0, cut));
  f.children[0].stdout.write(line.subarray(cut));
  await new Promise((r) => setTimeout(r, 10));
  f.children[0].emit("close", 0);
  const out = await p;
  expect(out.events[0].message.content[0].text).toBe("café");
});

test("a timed-out run is charged, marked, and reported", async () => {
  const cases = loadCases(EVALS, ["bugfix-range"]);
  const runner = async () => ({
    events: [init(plugin), say("working")],
    timedOut: true,
  });
  const r = await runSuite(cases, {
    runs: 1,
    limit: 99,
    model: "m",
    exec: hostExec,
    runner,
    expectedVersion: "2.1.295",
    arms: ["dotclaude"],
  });
  expect(r.runs[0].usage.cost).toBe(EVAL_TIMEOUT_CHARGE_USD);
  expect(r.runs[0].usage.estimated).toBe(true);
  expect(r.runs[0].timedOut).toBe(true);
  expect(r.report.meta.spent).toBe(EVAL_TIMEOUT_CHARGE_USD);
  expect(r.report.meta.timedOut).toBe(1);
  expect(r.markdown).toContain("1 runs timed out");
});

test("a run with a result event is charged its reported cost", async () => {
  const cases = loadCases(EVALS, ["bugfix-range"]);
  const runner = async () => ({
    events: [init(plugin), done("x", 0.25)],
    timedOut: false,
  });
  const r = await runSuite(cases, {
    runs: 1,
    limit: 99,
    model: "m",
    exec: hostExec,
    runner,
    expectedVersion: "2.1.295",
    arms: ["dotclaude"],
  });
  expect(r.runs[0].usage.cost).toBe(0.25);
  expect(r.runs[0].usage.estimated).toBe(false);
});

test("suites that share a budget stop at one limit", async () => {
  const cases = loadCases(EVALS, ["bugfix-range"]);
  const budget = { spent: 0 };
  const opts = {
    runs: 1,
    limit: 1,
    budget,
    model: "m",
    exec: hostExec,
    expectedVersion: "2.1.295",
    arms: ["dotclaude"],
    runner: async () => ({ events: [init(plugin), done("x", 1.5)] }),
  };
  const first = await runSuite(cases, opts);
  const second = await runSuite(cases, opts);
  expect(first.runs).toHaveLength(1);
  expect(second.runs).toHaveLength(0);
  expect(second.stopped).toBe("limit");
  expect(budget.spent).toBe(1.5);
});
