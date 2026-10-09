// The report: measures for each arm and the paired difference (dotclaude minus
// vanilla) with a bootstrap interval over cases.

import {
  costPerResolved,
  mean,
  pairedBootstrap,
  passK,
  turnsPerResolved,
} from "./stats.mjs";

/** Rate measures: `[name, pick]`, where pick returns true, false, or null. */
const RATES = [
  ["resolve", (r) => r.resolved],
  ["policyViolation", (r) => r.violation],
  ["overClaim", (r) => r.overClaim],
  ["recap", (r) => r.recap],
  ["wrongfulRevert", (r) => r.wrongfulRevert],
  ["falseConfession", (r) => r.falseConfession],
  ["warrantedFix", (r) => r.warrantedFix],
  ["tamper", (r) => Boolean(r.tamper)],
];
/** Count and size measures: the mean for each run. */
const NUMBERS = [
  ["repeatReads", (r) => r.repeatReads],
  ["agentCalls", (r) => r.agentCalls],
  ["unsourcedFigures", (r) => r.unsourced],
  [
    "multiSentenceShare",
    (r) => (r.chatLines ? r.chatMulti / r.chatLines : null),
  ],
  ["turns", (r) => r.usage.turns],
  ["seconds", (r) => r.usage.ms / 1000],
  ["inputTokens", (r) => r.usage.input],
  ["outputTokens", (r) => r.usage.output],
  ["cacheReadTokens", (r) => r.usage.cacheRead],
  ["cacheWriteTokens", (r) => r.usage.cacheWrite],
  ["cost", (r) => r.usage.cost],
];
const MEASURES = [...RATES, ...NUMBERS];

const by = (xs, key) => {
  const m = new Map();
  for (const x of xs) m.set(x[key], [...(m.get(x[key]) ?? []), x]);
  return m;
};

/** The mean of a measure over the applicable runs, or null. */
function value(runs, pick) {
  const xs = runs
    .map(pick)
    .filter((v) => v !== null && v !== undefined)
    .map(Number);
  return xs.length ? mean(xs) : null;
}

function armSummary(runs, k) {
  const perCase = [...by(runs, "case").values()].map((rs) => ({
    n: rs.length,
    c: rs.filter((r) => r.resolved).length,
  }));
  const out = {
    runs: runs.length,
    passAt1: passK(perCase, 1),
    passK: passK(perCase, k),
    costPerResolved: costPerResolved(runs),
    turnsPerResolved: turnsPerResolved(runs),
    measures: {},
  };
  for (const [name, pick] of MEASURES) out.measures[name] = value(runs, pick);
  return out;
}

/** The paired difference of each measure between two arms. */
function paired(runs, a, b, opts) {
  const out = {};
  const cases = [...by(runs, "case").entries()];
  for (const [name, pick] of MEASURES) {
    const pairs = [];
    for (const [, rs] of cases) {
      const va = value(
        rs.filter((r) => r.arm === a),
        pick,
      );
      const vb = value(
        rs.filter((r) => r.arm === b),
        pick,
      );
      if (va !== null && vb !== null) pairs.push([va, vb]);
    }
    const r = pairedBootstrap(pairs, opts);
    out[name] = r && {
      ...r,
      verdict: r.shown ? "shown" : "The difference is not shown.",
    };
  }
  return out;
}

const indent = (t) =>
  t
    .trimEnd()
    .split("\n")
    .map((l) => `    ${l}`);

/**
 * The report object.
 * `meta` holds `{partial, spent, limit, model}`. `arms` is `[a, b]`.
 * Uncalibrated grader scores go in `ungraded`, apart from the main measures.
 */
export function buildReport(
  runs,
  { arms = ["dotclaude", "vanilla"], k, meta = {}, bootstrap } = {},
) {
  const kk =
    k ??
    Math.max(
      1,
      ...[...by(runs, "case").values()].map((rs) =>
        Math.floor(rs.length / arms.length),
      ),
    );
  const summary = Object.fromEntries(
    arms.map((a) => [
      a,
      armSummary(
        runs.filter((r) => r.arm === a),
        kk,
      ),
    ]),
  );
  return {
    meta: { ...meta, k: kk, runs: runs.length },
    arms: summary,
    paired: paired(runs, arms[0], arms[1], bootstrap),
    invalid: runs
      .filter((r) => r.faults.length)
      .map((r) => ({
        case: r.case,
        arm: r.arm,
        faults: r.faults,
        stderr: r.stderr ?? "",
        stdoutTail: r.stdoutTail ?? "",
      })),
    ungraded: runs
      .filter((r) => r.neutral)
      .map((r) => ({
        case: r.case,
        arm: r.arm,
        neutral: r.neutral,
      })),
  };
}

const fmt = (v) =>
  v === null || v === undefined
    ? "not defined"
    : Number(v.toFixed(3)).toString();

/** The Markdown text of a report. */
export function renderReport(rep) {
  // The router search runs one arm, so the second arm may be missing.
  const [a, b = "none"] = Object.keys(rep.arms);
  const second = rep.arms[b] ?? { measures: {} };
  const L = [`# Eval report`, ""];
  if (rep.meta.partial) {
    L.push(
      `Partial report: the run stopped at the cost limit (spent ${fmt(rep.meta.spent)} of ${fmt(rep.meta.limit)} USD).`,
      "",
    );
  }
  if (rep.meta.timedOut) {
    L.push(
      `${rep.meta.timedOut} runs timed out. The suite charged ${rep.meta.estimated} of them an estimate of the cost, because a timed-out run has no result event.`,
      "",
    );
  }
  L.push(`Runs: ${rep.meta.runs}. k: ${rep.meta.k}.`, "");
  L.push(
    `| Measure | ${a} | ${b} | Difference | Interval |`,
    "| --- | --- | --- | --- | --- |",
  );
  L.push(
    `| pass^1 | ${fmt(rep.arms[a].passAt1)} | ${fmt(second.passAt1)} | | |`,
  );
  L.push(
    `| pass^${rep.meta.k} | ${fmt(rep.arms[a].passK)} | ${fmt(second.passK)} | | |`,
  );
  L.push(
    `| cost for each resolved task | ${fmt(rep.arms[a].costPerResolved)} | ${fmt(second.costPerResolved)} | | |`,
  );
  L.push(
    `| turns for each resolved task | ${fmt(rep.arms[a].turnsPerResolved)} | ${fmt(second.turnsPerResolved)} | | |`,
  );
  for (const [name] of MEASURES) {
    const p = rep.paired[name];
    const iv = p ? `${fmt(p.lo)} to ${fmt(p.hi)}: ${p.verdict}` : "not defined";
    L.push(
      `| ${name} | ${fmt(rep.arms[a].measures[name])} | ${fmt(second.measures[name])} | ${p ? fmt(p.diff) : "not defined"} | ${iv} |`,
    );
  }
  if (rep.invalid.length) {
    L.push(
      "",
      "Invalid runs:",
      ...rep.invalid.flatMap((i) => [
        `- ${i.case} on ${i.arm}: ${i.faults.join(" ")}`,
        ...(i.stderr ? ["  stderr:", ...indent(i.stderr)] : []),
        ...(i.stdoutTail ? ["  stdout tail:", ...indent(i.stdoutTail)] : []),
      ]),
    );
  }
  if (rep.ungraded.length) {
    L.push(
      "",
      "Neutral-question grades (code check, shown apart from the main measures):",
      ...rep.ungraded.map(
        (u) =>
          `- ${u.case} on ${u.arm}: ${u.neutral.pass ? "neutral" : "skewed"}`,
      ),
    );
  }
  return `${L.join("\n")}\n`;
}
