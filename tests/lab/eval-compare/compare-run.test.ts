// dotclaude-lab: the two runs of `runBoth`, with a fake process runner and a fake output.

import { expect, test } from "bun:test";
import { runBoth as runBothOn } from "../../../src/plugins/dotclaude-lab/slices/eval-compare/adapters/eval-both.ts";
import type { RunResult } from "../../../src/plugins/dotclaude-lab/slices/eval-compare/adapters/run-program.ts";
import { withCostBound } from "../../../src/plugins/dotclaude-lab/slices/eval-compare/domain/compare.ts";
import { withPlatform } from "../../support/fake-program.ts";

// The fake runner reads the arguments as an array, which `runProgram` passes except on Windows, where it passes a command line.
// The Windows form is pinned in `tests/lab/run-program.test.ts`.
const runBoth = (...args: Parameters<typeof runBothOn>) =>
  withPlatform("linux", () => runBothOn(...args));

/** A fake runner that gives each call the next status and records the folders and the arguments. */
function fake(...statuses: (number | undefined)[]) {
  const calls: string[] = [];
  const argvs: string[][] = [];
  const lines: string[] = [];
  return {
    calls,
    argvs,
    lines,
    spawn: (_cmd: string, args: string[]) => {
      calls.push(args[2] as string);
      argvs.push(args);
      // A fake result with only `exitCode`, which `runBoth` reads.
      return { exitCode: statuses[calls.length - 1] } as unknown as RunResult;
    },
    log: (line: string) => lines.push(line),
  };
}

test("two good runs return 0 and point to the comparison of the tables", () => {
  const f = fake(0, 0);
  expect(runBoth("a", "b", [], f.spawn, f.log)).toBe(0);
  expect(f.calls.length).toBe(2);
});

test("a failed run returns 1, names the arm, and gives no comparison", () => {
  const f = fake(0, 3);
  expect(runBoth("a", "b", [], f.spawn, f.log)).toBe(1);
  const out = f.lines.join("\n");
  expect(out).toMatch(/Arm B failed with exit code 3/);
  expect(out).not.toMatch(/Arm A failed/);
});

test("a run with no status counts as a failure, and the second arm still runs", () => {
  const f = fake(undefined, 0);
  expect(runBoth("a", "b", [], f.spawn, f.log)).toBe(1);
  expect(f.calls.length).toBe(2);
});

test("the runs grant no scaffold and no tools unless the options add them", () => {
  const f = fake(0, 0);
  runBoth("a", "b", [], f.spawn, f.log);
  for (const argv of f.argvs) {
    expect(!argv.includes("--scaffold")).toBeTruthy();
    expect(!argv.includes("--allow-tools")).toBeTruthy();
  }
  const g = fake(0, 0);
  runBoth("a", "b", ["--allow-tools", "Bash"], g.spawn, g.log);
  for (const argv of g.argvs)
    expect(argv.includes("--allow-tools")).toBeTruthy();
});

test("the cost bound is added only when the options set none, in either form", () => {
  expect(withCostBound([])).toStrictEqual(["--max-cost-usd", "5"]);
  expect(withCostBound(["--max-cost-usd", "20"])).toStrictEqual([
    "--max-cost-usd",
    "20",
  ]);
  expect(withCostBound(["--max-cost-usd=20"])).toStrictEqual([
    "--max-cost-usd=20",
  ]);
});
