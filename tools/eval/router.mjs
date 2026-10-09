// The router search (design D12): for one task class, try (model, effort) pairs
// from the cheapest, and stop at the first pair with no loss against the
// reference pair in resolve rate, over-claim rate, and policy-violation rate.
// The run function is a parameter, so a test gives fixed results with no live run.

import {
  HAIKU,
  NEVER,
  OPUS,
  SONNET,
  TABLE,
} from "../../plugins/dotclaude/features/router/data.mjs";
import { ALLOWED_EFFORTS } from "../../plugins/dotclaude/features/router/limits.mjs";
import { EVAL_ROUTER_MIN_PAIRS, EVAL_ROUTER_NOISE } from "../limits.mjs";
import { buildReport } from "./report.mjs";

/** The models from the cheapest to the dearest. Haiku 5.5 costs least, and Opus 5.5 most. */
const MODEL_ORDER = [HAIKU, SONNET, OPUS];
const EFFORTS = Object.fromEntries(
  Object.entries(ALLOWED_EFFORTS).map(([m, e]) => [m, e]),
);

/** True when the `never` row bans the pair. */
export function banned({ model, effort }) {
  return (
    NEVER.efforts.includes(effort) ||
    NEVER.pairs.some(([m, e]) => m === model && e === effort)
  );
}

/** Every allowed pair, from the cheapest to the dearest. A banned pair is left out. */
export function candidatePairs() {
  const out = [];
  for (const model of MODEL_ORDER)
    for (const effort of EFFORTS[model] ?? [])
      if (!banned({ model, effort })) out.push({ model, effort });
  return out;
}

const same = (a, b) => a.model === b.model && a.effort === b.effort;

/** The pairs that cost less than the reference, from the cheapest. */
export function cheaperThan(reference) {
  const all = candidatePairs();
  const at = all.findIndex((p) => same(p, reference));
  return at === -1 ? all : all.slice(0, at);
}

/**
 * The losses of a candidate against the reference, from the paired report.
 * A loss is an interval that reaches beyond the noise bound in the bad direction:
 * a lower bound of the resolve difference at or below `-noise`, or an upper bound of the
 * over-claim, policy-violation, or wrongful-revert difference at or above `noise`.
 * So each rate gets the same test, and a pair must show that it is as good as the reference.
 * A weak test is a loss too: a null measure, or fewer than `minPairs` paired runs (`pairedRuns`).
 * Every run records the resolve, over-claim, and policy-violation measures, so a null there is a fault.
 * Only the wrongful-revert rate is null in a class with no accusation case, so a null there is not a loss.
 */
export function losses(
  paired,
  noise = EVAL_ROUTER_NOISE,
  pairedRuns = 0,
  minPairs = EVAL_ROUTER_MIN_PAIRS,
) {
  const out = [];
  const resolve = paired.resolve;
  if (!resolve) out.push("resolve");
  else if (resolve.lo <= -noise) out.push("resolve");
  if (pairedRuns < minPairs) out.push("pairs");
  for (const name of ["overClaim", "policyViolation"])
    if (!paired[name] || paired[name].hi >= noise) out.push(name);
  const revert = paired.wrongfulRevert;
  if (revert && revert.hi >= noise) out.push("wrongfulRevert");
  return out;
}

const relabel = (runs, arm) => runs.map((r) => ({ ...r, arm }));

/**
 * Search one task class.
 * `run(taskClass, pair)` returns the runs of that pair (one record for each case and run).
 * The reference pair runs once, then each cheaper pair runs in order until one shows no loss.
 * Returns `{taskClass, reference, referenceRuns, chosen, tried, found, message}`.
Each entry of `tried` holds `{pair, losses, pairedRuns, report, runs}`.
 */
export async function searchClass(
  taskClass,
  run,
  { reference = TABLE[taskClass], noise = EVAL_ROUTER_NOISE, bootstrap } = {},
) {
  if (!reference) throw new Error(`No such task class: ${taskClass}.`);
  const refRuns = relabel(await run(taskClass, reference), "reference");
  const tried = [];
  for (const pair of cheaperThan(reference)) {
    const runs = relabel(await run(taskClass, pair), "candidate");
    const rep = buildReport([...runs, ...refRuns], {
      arms: ["candidate", "reference"],
      bootstrap,
    });
    const lost = losses(
      rep.paired,
      noise,
      Math.min(runs.length, refRuns.length),
    );
    // The report and the runs stay, so that `router-report.mjs` can write them.
    tried.push({
      pair,
      losses: lost,
      pairedRuns: Math.min(runs.length, refRuns.length),
      report: rep,
      runs,
    });
    if (lost.length === 0)
      return {
        taskClass,
        reference,
        referenceRuns: refRuns,
        chosen: pair,
        tried,
        found: true,
        message: `${taskClass}: ${pair.model} at ${pair.effort} shows no loss against ${reference.model} at ${reference.effort}.`,
      };
  }
  return {
    taskClass,
    reference,
    referenceRuns: refRuns,
    chosen: reference,
    tried,
    found: false,
    message: `${taskClass}: no cheaper pair passed, so the reference ${reference.model} at ${reference.effort} stays.`,
  };
}

/** Search the task classes one at a time. `classes` defaults to every class of the table. */
export async function searchRouter(
  run,
  { classes = Object.keys(TABLE), ...o } = {},
) {
  const results = [];
  for (const taskClass of classes)
    results.push(await searchClass(taskClass, run, o));
  return results;
}
