// dotclaude-lab: the two runs of `runBoth`, with a fake process runner and a fake output.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  runBoth,
  withCostBound,
} from "../../plugins/dotclaude-lab/features/eval-compare/run.mjs";

/** A fake runner that gives each call the next status and records the folders and the arguments. */
function fake(...statuses) {
  const calls = [];
  const argvs = [];
  const lines = [];
  return {
    calls,
    argvs,
    lines,
    spawn: (_cmd, args) => {
      calls.push(args[2]);
      argvs.push(args);
      return { status: statuses[calls.length - 1] };
    },
    log: (line) => lines.push(line),
  };
}

test("two good runs return 0 and point to the comparison of the tables", () => {
  const f = fake(0, 0);
  assert.equal(runBoth("a", "b", [], f.spawn, f.log), 0);
  assert.equal(f.calls.length, 2);
  assert.ok(f.lines.some((l) => l.includes("Compare the WITH column")));
});

test("a failed run returns 1, names the arm, and gives no comparison", () => {
  const f = fake(0, 3);
  assert.equal(runBoth("a", "b", [], f.spawn, f.log), 1);
  const out = f.lines.join("\n");
  assert.match(out, /Arm B failed with exit code 3/);
  assert.doesNotMatch(out, /Arm A failed/);
  assert.ok(!out.includes("Compare the WITH column"));
});

test("a run with no status counts as a failure, and the second arm still runs", () => {
  const f = fake(undefined, 0);
  assert.equal(runBoth("a", "b", [], f.spawn, f.log), 1);
  assert.equal(f.calls.length, 2);
});

test("the runs grant no scaffold and no tools unless the options add them", () => {
  const f = fake(0, 0);
  runBoth("a", "b", [], f.spawn, f.log);
  for (const argv of f.argvs) {
    assert.ok(!argv.includes("--scaffold"));
    assert.ok(!argv.includes("--allow-tools"));
  }
  const g = fake(0, 0);
  runBoth("a", "b", ["--allow-tools", "Bash"], g.spawn, g.log);
  for (const argv of g.argvs) assert.ok(argv.includes("--allow-tools"));
});

test("the cost bound is added only when the options set none, in either form", () => {
  assert.deepEqual(withCostBound([]), ["--max-cost-usd", "5"]);
  assert.deepEqual(withCostBound(["--max-cost-usd", "20"]), [
    "--max-cost-usd",
    "20",
  ]);
  assert.deepEqual(withCostBound(["--max-cost-usd=20"]), ["--max-cost-usd=20"]);
});
