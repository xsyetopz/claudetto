// The time limit of a `codegraph` call on Windows: at the limit the whole process tree ends (`run-tree.mjs`).
// `taskkill` is tested with a fake runner. The timeout is tested with a real child and a kill that ends it.

import { expect, test } from "bun:test";
import {
  runTree,
  taskkill,
} from "../../plugins/dotclaude-codegraph/slices/graph/adapters/run-tree.ts";

test("`taskkill` ends the pid and its children with fixed arguments and no shell", () => {
  const seen: unknown[] = [];
  taskkill(4242, (...a) => seen.push(a));
  expect(seen).toStrictEqual([
    ["taskkill", ["/pid", "4242", "/T", "/F"], { stdio: "ignore" }],
  ]);
});

test("at the limit, `runTree` calls the tree kill with the pid of the child and returns", async () => {
  const killed: number[] = [];
  const started = Date.now();
  const r = await runTree({
    command: process.execPath,
    args: ["-e", "setTimeout(() => {}, 30000)"],
    cwd: process.cwd(),
    env: process.env,
    timeout: 300,
    shell: false,
    // A stand-in for `taskkill`: end the one process that the test started.
    kill: (pid) => {
      killed.push(pid as number);
      process.kill(pid as number);
    },
  });
  expect(killed.length).toBe(1);
  expect(Number.isInteger(killed[0]) && (killed[0] as number) > 0).toBeTruthy();
  expect(r.timedOut).toBe(true);
  expect(r.status).toBe(null);
  expect(Date.now() - started < 5000).toBeTruthy();
});

test("a command that ends before the limit gives its output and status, and no kill", async () => {
  const killed: number[] = [];
  const r = await runTree({
    command: process.execPath,
    args: ["-e", "console.log('hi'); process.exit(3)"],
    cwd: process.cwd(),
    env: process.env,
    timeout: 5000,
    shell: false,
    kill: (pid) => killed.push(pid as number),
  });
  expect([r.status, r.stdout.trim(), r.timedOut, killed]).toStrictEqual([
    3,
    "hi",
    false,
    [],
  ]);
});
