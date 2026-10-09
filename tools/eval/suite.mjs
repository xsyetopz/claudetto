// The suite loop: every case, on every arm, `runs` times, with a cost limit.
// When the spent cost reaches the limit, the loop starts no new run and the
// report is partial.

import { versionMismatch } from "./arms.mjs";
import { buildReport, renderReport } from "./report.mjs";
import { runCase } from "./run.mjs";

/**
 * A message when no run is valid, or null.
 * It names the call when every run is invalid, and an arm when only that arm has no valid run.
 * No run at all gives null, because the cost limit can stop a call before the first run.
 */
export function allInvalid(runs, arms) {
  if (runs.length === 0) return null;
  const valid = (r) => r.faults.length === 0;
  if (!runs.some(valid))
    return `Every run is invalid (${runs.length} of ${runs.length}), so the report holds no result.`;
  const none = arms.filter((a) => !runs.some((r) => r.arm === a && valid(r)));
  return none.length
    ? `No valid run for arm ${none.join(", ")}, so the report holds no result for it.`
    : null;
}

/** The report of the runs on `arms`, with the meta fields of `runSuite`. */
export function suiteReport(done, arms, opts, { stopped, spent }) {
  const report = buildReport(done, {
    arms,
    meta: {
      partial: stopped !== null,
      stopped,
      spent,
      timedOut: done.filter((d) => d.timedOut).length,
      estimated: done.filter((d) => d.usage.estimated).length,
      limit: opts.limit,
      model: opts.model,
    },
    bootstrap: opts.bootstrap,
  });
  return { report, markdown: renderReport(report) };
}

/**
 * `cases` is `[{def, dir}]`. `opts`: `arms`, `runs`, `limit`, `budget`, `concurrency`, plus the
 * options of `runCase`.
 * `budget` is `{spent}` and may be shared by several suites, so that one `just eval` has one cost limit.
 * `concurrency` (default 1) is the number of runs at the same time.
 * The limit stops new runs only, so the runs that are in progress can spend more than the limit.
 * Returns `{runs, report, markdown, stopped}`, with the runs in the order of the jobs.
 */
export async function runSuite(cases, opts) {
  const arms = opts.arms ?? ["dotclaude", "vanilla"];
  const jobs = [];
  for (let run = 0; run < opts.runs; run++)
    for (const { def, dir } of cases)
      for (const arm of arms) jobs.push({ def, dir, arm, run });
  const done = [];
  const budget = opts.budget ?? { spent: 0 };
  let spent = 0;
  let stopped = null;
  let next = 0;
  const worker = async () => {
    while (stopped === null && next < jobs.length) {
      if (budget.spent >= opts.limit) {
        stopped = "limit";
        return;
      }
      const index = next++;
      const { def, dir, arm, run } = jobs[index];
      const r = await runCase(def, { ...opts, arm, caseDir: dir, run });
      done.push({ index, r });
      spent += r.usage.cost;
      budget.spent += r.usage.cost;
      const mismatch = versionMismatch(done.map((d) => d.r.version));
      if (mismatch) stopped = mismatch;
    }
  };
  const width = Math.max(1, Math.min(opts.concurrency ?? 1, jobs.length));
  await Promise.all(Array.from({ length: width }, worker));
  const runs = done.sort((a, b) => a.index - b.index).map((d) => d.r);
  return {
    runs,
    ...suiteReport(runs, arms, opts, { stopped, spent }),
    stopped,
  };
}
