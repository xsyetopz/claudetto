// `tools/eval-compare/`: the two runs of `runBoth`, with a fake process runner and a fake output.

import { expect, test } from "bun:test";
import { closeSync, openSync, writeSync } from "node:fs";
import { runBoth as runBothOn } from "../../../tools/eval-compare/adapters/eval-both.ts";
import {
  armProblem,
  baselineProblem,
  modelOf,
  withCostBound,
} from "../../../tools/eval-compare/compare.ts";

const runBoth = runBothOn;

/** A valid result document: one case with a score, and the plugin at `plugin` that loaded under `model`. */
const good = (plugin = "/p", model?: string): string =>
  JSON.stringify({
    schemaVersion: 1,
    partial: false,
    suite: {
      plugins: [{ name: "p", path: plugin }],
      ...(model === undefined ? {} : { modelOverride: model }),
    },
    cases: [{ runsPerCase: 10, aggregates: { score: 1, scoreWithout: 0.5 } }],
  });

/** A result document for the plugin of the call that reads it. */
const GOOD = (plugin: string): string => good(plugin);

/**
 * A fake runner that gives each call the next status and records the folders and the arguments.
 * It writes `docs[n]` to the `--json` file of call `n` (`GOOD` by default), and writes nothing for `null`.
 */
const fake = (
  statuses: (number | undefined)[],
  docs: (string | ((plugin: string) => string) | null)[] = [],
) => {
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
      const plugin = args[2] as string;
      const given = docs[calls.length - 1];
      const doc =
        typeof given === "function"
          ? given(plugin)
          : (given ?? (calls.length <= docs.length ? null : good(plugin)));
      // The fake runner is sync, as `spawnSync` is, so it cannot wait for `Bun.write`.
      if (doc !== null) {
        const fd = openSync(args[args.indexOf("--json") + 1] as string, "w");
        writeSync(fd, doc);
        closeSync(fd);
      }
      // A fake result with only `exitCode`, which `runBoth` reads.
      return { exitCode: statuses[calls.length - 1] };
    },
    log: (line: string) => lines.push(line),
  };
};

test("two good runs return 0 and point to the comparison of the tables", async () => {
  const f = fake([0, 0]);
  expect(await runBoth("a", "b", [], f.spawn, f.log)).toBe(0);
  expect(f.calls.length).toBe(2);
});

test("a failed run returns 1, names the arm, and gives no comparison", async () => {
  const f = fake([0, 3]);
  expect(await runBoth("a", "b", [], f.spawn, f.log)).toBe(1);
  const out = f.lines.join("\n");
  expect(out).toMatch(/Arm B failed with exit code 3/);
  expect(out).not.toMatch(/Arm A failed/);
});

test("a run with no status counts as a failure, and the second arm still runs", async () => {
  const f = fake([undefined, 0]);
  expect(await runBoth("a", "b", [], f.spawn, f.log)).toBe(1);
  expect(f.calls.length).toBe(2);
});

test("the runs grant no scaffold and no tools unless the options add them", async () => {
  const f = fake([0, 0]);
  await runBoth("a", "b", [], f.spawn, f.log);
  for (const argv of f.argvs) {
    expect(!argv.includes("--scaffold")).toBeTruthy();
    expect(!argv.includes("--allow-tools")).toBeTruthy();
  }
  const g = fake([0, 0]);
  await runBoth("a", "b", ["--allow-tools", "Bash"], g.spawn, g.log);
  for (const argv of g.argvs)
    expect(argv.includes("--allow-tools")).toBeTruthy();
});

test("the cost bound is added only when the options set none, in either form", async () => {
  expect(withCostBound([])).toStrictEqual(["--max-cost-usd", "5"]);
  expect(withCostBound(["--max-cost-usd", "20"])).toStrictEqual([
    "--max-cost-usd",
    "20",
  ]);
  expect(withCostBound(["--max-cost-usd=20"])).toStrictEqual([
    "--max-cost-usd=20",
  ]);
});

test("an arm that exits with 0 and wrote no result fails the comparison and names the arm", async () => {
  const f = fake([0, 0], [GOOD, null]);
  expect(await runBoth("a", "b", [], f.spawn, f.log)).toBe(1);
  const out = f.lines.join("\n");
  expect(out).toMatch(/Arm B has no valid result: it wrote no result file/);
  expect(out).not.toMatch(/Arm A (failed|has)/);
  expect(out).not.toMatch(/Compare the WITH column/);
});

test("an arm with no case rows fails the comparison, also when the run exits with 0", async () => {
  const empty = JSON.stringify({ partial: false, cases: [] });
  const f = fake([0, 0], [empty, GOOD]);
  expect(await runBoth("a", "b", [], f.spawn, f.log)).toBe(1);
  expect(f.lines.join("\n")).toMatch(
    /Arm A has no valid result: its result has no case/,
  );
});

test("`--json` is the last argument of a run, because it takes the words after it", async () => {
  const f = fake([0, 0]);
  await runBoth("a", "b", ["--runs", "1"], f.spawn, f.log);
  for (const argv of f.argvs) expect(argv.at(-2)).toBe("--json");
});

test("`armProblem` names each way that a result is not valid", async () => {
  const doc = (x: object) =>
    JSON.stringify({ cases: [{ aggregates: { score: 1 } }], ...x });
  expect(armProblem(GOOD("/p"))).toBe(null);
  expect(armProblem("not json")).toMatch(/not JSON/);
  expect(armProblem("null")).toMatch(/not an object/);
  expect(armProblem(JSON.stringify({ cases: [{ aggregates: {} }] }))).toMatch(
    /no score/,
  );
  expect(armProblem(doc({ partial: true }))).toMatch(/partial/);
  expect(armProblem(doc({ suite: { plugins: [] } }))).toMatch(
    /no plugin loaded/,
  );
  expect(
    armProblem(
      doc({ suite: { plugins: [{ name: "p", problem: "will_not_load" }] } }),
    ),
  ).toMatch(/did not load/);
  // A problem that says nothing about loading does not block.
  expect(
    armProblem(
      doc({
        suite: { plugins: [{ name: "p", problem: "identity_unverified" }] },
      }),
    ),
  ).toBe(null);
});

test("a baseline at the maximum on each case fails the comparison and names the arm", async () => {
  const ceiling = JSON.stringify({
    cases: [{ aggregates: { score: 1, scoreWithout: 1 } }],
  });
  const f = fake([0, 0], [GOOD, ceiling]);
  expect(await runBoth("a", "b", [], f.spawn, f.log)).toBe(1);
  const out = f.lines.join("\n");
  expect(out).toMatch(/Arm B has no usable baseline: .*no gain can show/);
  expect(out).not.toMatch(/Arm A (failed|has)/);
  expect(out).not.toMatch(/Compare the WITH column/);
});

test("`baselineProblem` accepts one case below the maximum and names a missing score", () => {
  const doc = (...without: (number | undefined)[]) =>
    JSON.stringify({
      cases: without.map((w) => ({
        aggregates: { score: 1, scoreWithout: w },
      })),
    });
  expect(baselineProblem(doc(1, 0.67))).toBe(null);
  expect(baselineProblem(doc(1, 1))).toMatch(/maximum/);
  expect(baselineProblem(doc(0.5, undefined))).toMatch(/no baseline score/);
  expect(baselineProblem(null)).toBe(null);
});

test("an arm that loaded another plugin than the one it names fails the comparison", async () => {
  const f = fake([0, 0], [GOOD, () => good("/elsewhere")]);
  expect(await runBoth("a", "b", [], f.spawn, f.log)).toBe(1);
  const out = f.lines.join("\n");
  expect(out).toMatch(/Arm B has no valid result: the plugin of the arm/);
  expect(out).not.toMatch(/Arm A (failed|has)/);
});

test("an arm that served another model than `--model` fails the comparison", async () => {
  const f = fake([0, 0], [(p) => good(p, "haiku"), (p) => good(p, "sonnet")]);
  expect(await runBoth("a", "b", ["--model", "haiku"], f.spawn, f.log)).toBe(1);
  const out = f.lines.join("\n");
  expect(out).toMatch(/Arm B has no valid result: the model served is sonnet/);
  expect(out).not.toMatch(/Arm A (failed|has)/);
});

test("a result with no model override fails when `--model` names one, and passes with the model", async () => {
  const bad = fake([0, 0]);
  expect(await runBoth("a", "b", ["--model=haiku"], bad.spawn, bad.log)).toBe(
    1,
  );
  const ok = fake([0, 0], [(p) => good(p, "haiku"), (p) => good(p, "haiku")]);
  expect(await runBoth("a", "b", ["--model", "haiku"], ok.spawn, ok.log)).toBe(
    0,
  );
});

test("`modelOf` reads both forms of `--model`", () => {
  expect(modelOf(["--model", "haiku"])).toBe("haiku");
  expect(modelOf(["--model=haiku"])).toBe("haiku");
  expect(modelOf(["--runs", "1"])).toBe(undefined);
});

test("a baseline at the maximum says that the case does not separate the arms", () => {
  const ceiling = JSON.stringify({
    cases: [{ aggregates: { score: 1, scoreWithout: 1 } }],
  });
  expect(baselineProblem(ceiling)).toMatch(/does not separate the arms/);
});

test("a passing verdict gives the runs of each case next to it", async () => {
  const f = fake([0, 0]);
  expect(await runBoth("a", "b", [], f.spawn, f.log)).toBe(0);
  expect(f.lines.join("\n")).toMatch(
    /Runs of each case: 10 \(arm A\), 10 \(arm B\)/,
  );
});
