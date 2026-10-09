// The report of the router search (design D12): one section for each task class.
// A section lists the reference pair and each pair tried, with the paired runs,
// the resolve, over-claim, and policy-violation rates, the cost, and the decision line.
// `report.json` keeps the full report of each pair, and `runs.json` keeps all runs,
// labelled by class and pair, so that a later reader can recompute.

import fs from "node:fs";
import path from "node:path";
import { buildReport } from "./report.mjs";

const fmt = (v) =>
  v === null || v === undefined
    ? "not defined"
    : Number(v.toFixed(3)).toString();
const label = (p) => `${p.model} at ${p.effort}`;

/** The row of a pair: the rates and the cost come from the `measures` of its arm. */
function row(name, pair, arm, pairedRuns, verdict) {
  const m = arm.measures;
  return {
    pair: label(pair),
    name,
    pairedRuns,
    resolve: m.resolve,
    overClaim: m.overClaim,
    policyViolation: m.policyViolation,
    cost: m.cost,
    costPerResolved: arm.costPerResolved,
    verdict,
  };
}

/** The rows of one class: the reference first, then each pair tried. */
function classRows(r) {
  const ref = buildReport(r.referenceRuns, {
    arms: ["reference", "candidate"],
  }).arms.reference;
  return [
    row("reference", r.reference, ref, r.referenceRuns.length, ""),
    ...r.tried.map((t) =>
      row(
        "candidate",
        t.pair,
        t.report.arms.candidate,
        t.pairedRuns,
        t.losses.length ? `loss: ${t.losses.join(", ")}` : "no loss",
      ),
    ),
  ];
}

/** The JSON object and the Markdown text of a search. `meta` holds `{spent, limit}`. */
export function routerReport(results, meta = {}) {
  const L = ["# Router search report", ""];
  if (meta.limit !== undefined)
    L.push(`Spent ${fmt(meta.spent)} of ${fmt(meta.limit)} USD.`, "");
  const classes = {};
  for (const r of results) {
    const rows = classRows(r);
    classes[r.taskClass] = {
      decision: r.message,
      found: r.found,
      reference: r.reference,
      chosen: r.chosen,
      rows,
      reports: r.tried.map((t) => ({ pair: t.pair, report: t.report })),
    };
    L.push(
      `## ${r.taskClass}`,
      "",
      "| Pair | Role | Paired runs | Resolve | Over-claim | Policy violation | Cost per run | Cost per resolved | Result |",
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
      ...rows.map(
        (x) =>
          `| ${x.pair} | ${x.name} | ${x.pairedRuns} | ${fmt(x.resolve)} | ${fmt(x.overClaim)} | ${fmt(x.policyViolation)} | ${fmt(x.cost)} | ${fmt(x.costPerResolved)} | ${x.verdict} |`,
      ),
      "",
      `Decision: ${r.message}`,
      "",
    );
  }
  return { report: { meta, classes }, markdown: `${L.join("\n")}\n` };
}

/** All runs, labelled by class and pair. */
export function labelledRuns(results) {
  return results.flatMap((r) => [
    ...r.referenceRuns.map((x) => ({
      ...x,
      taskClass: r.taskClass,
      pair: r.reference,
    })),
    ...r.tried.flatMap((t) =>
      t.runs.map((x) => ({ ...x, taskClass: r.taskClass, pair: t.pair })),
    ),
  ]);
}

/** Write `report.md`, `report.json`, and `runs.json` to `out`. Returns the Markdown text. */
export function writeRouterResult(out, results, meta = {}) {
  const { report, markdown } = routerReport(results, meta);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(
    path.join(out, "report.json"),
    JSON.stringify(report, null, 2),
  );
  fs.writeFileSync(path.join(out, "report.md"), markdown);
  fs.writeFileSync(
    path.join(out, "runs.json"),
    JSON.stringify(labelledRuns(results), null, 2),
  );
  console.log(markdown);
  console.log(`Wrote ${out}`);
  return markdown;
}
