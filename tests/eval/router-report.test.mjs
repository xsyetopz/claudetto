// The report of the router search, on fixed data and with no live run.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { HAIKU, OPUS } from "../../plugins/dotclaude/features/router/data.mjs";
import { searchRouter } from "../../tools/eval/router.mjs";
import {
  routerReport,
  writeRouterResult,
} from "../../tools/eval/router-report.mjs";
import { EVAL_ROUTER_MIN_PAIRS } from "../../tools/limits.mjs";

const CASES = Array.from(
  { length: EVAL_ROUTER_MIN_PAIRS },
  (_, i) => `case-${i}`,
);
const runsOf = (cost, resolved) =>
  CASES.map((c) => ({
    case: c,
    arm: "x",
    resolved,
    overClaim: false,
    violation: false,
    wrongfulRevert: false,
    usage: {
      cost,
      turns: 1,
      ms: 1,
      input: 1,
      output: 1,
      cacheRead: 0,
      cacheWrite: 0,
    },
    faults: [],
  }));

// Fixed data: the reference costs 2 USD a run, Haiku at low fails, Haiku at medium passes.
const run = async (_taskClass, pair) => {
  if (pair.model === OPUS) return runsOf(2, true);
  return runsOf(pair.effort === "low" ? 0.1 : 0.2, pair.effort !== "low");
};

test("the report has a section, the rates, the cost, and the decision for each class", async () => {
  const results = await searchRouter(run, {
    classes: ["review"],
    reference: { model: OPUS, effort: "high" },
  });
  const { report, markdown } = routerReport(results, { spent: 3, limit: 10 });
  expect(markdown).toContain("## review");
  expect(markdown).toContain(`| ${OPUS} at high | reference |`);
  expect(markdown).toContain(`| ${HAIKU} at low | candidate |`);
  expect(markdown).toContain(`| ${HAIKU} at medium | candidate |`);
  expect(markdown).toContain(
    `| ${HAIKU} at low | candidate | ${CASES.length} | 0 | 0 | 0 | 0.1 |`,
  );
  expect(markdown).toContain("loss: resolve");
  expect(markdown).toContain(`Decision: ${results[0].message}`);
  const rows = report.classes.review.rows;
  expect(rows.map((r) => r.pair)).toEqual([
    `${OPUS} at high`,
    `${HAIKU} at low`,
    `${HAIKU} at medium`,
  ]);
  expect(rows[2]).toMatchObject({
    pairedRuns: CASES.length,
    resolve: 1,
    overClaim: 0,
    policyViolation: 0,
    verdict: "no loss",
  });
  expect(rows[2].cost).toBeCloseTo(0.2, 9);
  expect(report.classes.review.chosen).toEqual({
    model: HAIKU,
    effort: "medium",
  });
});

test("the writer puts the three files in the folder, with the runs labelled", async () => {
  const results = await searchRouter(run, {
    classes: ["review"],
    reference: { model: OPUS, effort: "high" },
  });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "router-report-"));
  const log = console.log;
  console.log = () => {};
  try {
    writeRouterResult(out, results, { spent: 1, limit: 2 });
  } finally {
    console.log = log;
  }
  const runs = JSON.parse(fs.readFileSync(path.join(out, "runs.json"), "utf8"));
  expect(runs).toHaveLength(CASES.length * 3);
  expect(runs.every((r) => r.taskClass === "review" && r.pair.model)).toBe(
    true,
  );
  expect(fs.readFileSync(path.join(out, "report.md"), "utf8")).toContain(
    "## review",
  );
  const json = JSON.parse(
    fs.readFileSync(path.join(out, "report.json"), "utf8"),
  );
  expect(json.classes.review.found).toBe(true);
  fs.rmSync(out, { recursive: true });
});
