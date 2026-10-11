// The time limit of a `codegraph` call on Windows: at the limit the whole process tree ends (`run-tree.mjs`).
// `taskkill` is tested with a fake runner. The timeout is tested with a real child and a kill that ends it.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  runTree,
  taskkill,
} from "../../plugins/dotclaude-codegraph/features/graph/run-tree.mjs";

test("`taskkill` ends the pid and its children with fixed arguments and no shell", () => {
  const seen = [];
  taskkill(4242, (...a) => seen.push(a));
  assert.deepEqual(seen, [
    ["taskkill", ["/pid", "4242", "/T", "/F"], { stdio: "ignore" }],
  ]);
});

test("at the limit, `runTree` calls the tree kill with the pid of the child and returns", async () => {
  const killed = [];
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
      killed.push(pid);
      process.kill(pid);
    },
  });
  assert.equal(killed.length, 1);
  assert.ok(Number.isInteger(killed[0]) && killed[0] > 0);
  assert.equal(r.timedOut, true);
  assert.equal(r.status, null);
  assert.ok(Date.now() - started < 5000);
});

test("a command that ends before the limit gives its output and status, and no kill", async () => {
  const killed = [];
  const r = await runTree({
    command: process.execPath,
    args: ["-e", "console.log('hi'); process.exit(3)"],
    cwd: process.cwd(),
    env: process.env,
    timeout: 5000,
    shell: false,
    kill: (pid) => killed.push(pid),
  });
  assert.deepEqual(
    [r.status, r.stdout.trim(), r.timedOut, killed],
    [3, "hi", false, []],
  );
});
